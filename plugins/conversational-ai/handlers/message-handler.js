/**
 * Message Event Handler
 * 
 * Handles incoming Discord messages and routes them appropriately.
 * Integrates with MessageRouter, ResponseHandler, PrefixHandler, TriggerSystem, and ResponseFilter.
 * 
 * @module plugins/conversational-ai/handlers/message-handler
 */

import { EmbedBuilder } from 'discord.js';
import { createLogger } from '../../../src/logging/logger.js';
import { PrefixHandler } from '../router/prefix-handler.js';
import { TriggerSystem } from '../triggers/trigger-system.js';
import { ResponseFilter } from '../router/response-filter.js';
import { ActionExecutor } from '../actions/action-executor.js';

const logger = createLogger('message-handler');

/**
 * Message Handler class
 * Processes incoming messages based on classification
 */
export class MessageHandler {
  /**
   * @param {Object} options - Handler options
   * @param {Object} options.plugin - ConversationalAI plugin instance
   * @param {Object} options.responseHandler - ResponseHandler instance
   */
  constructor({ plugin, responseHandler }) {
    this.plugin = plugin;
    this.responseHandler = responseHandler;
    this.prefixHandler = new PrefixHandler();
    this.triggerSystem = new TriggerSystem({
      enabled: plugin.getConfig().passiveTriggersEnabled
    });
    
    // Initialize response filter for smart response decisions
    const config = plugin.getConfig();
    this.responseFilter = new ResponseFilter({
      attentionWindowMs: config.attentionWindowMs,
      smartResponseEnabled: config.smartResponseEnabled,
      respondToReplies: config.respondToReplies,
      minConfidenceToRespond: config.minConfidenceToRespond,
      botId: plugin.client?.user?.id
    });
    
    // Initialize action executor for performing bot actions
    this.actionExecutor = new ActionExecutor({
      enabled: true,
      client: plugin.client
    });
    
    // Bind the handlers
    this.handleMessage = this.handleMessage.bind(this);
    this.handleMessageUpdate = this.handleMessageUpdate.bind(this);
    
    // Track bot responses to user messages for edit handling
    // Map: userMessageId -> botReplyMessageId
    this.botReplies = new Map();
  }

  /**
   * Handle incoming message
   * @param {Object} message - Discord message object
   */
  async handleMessage(message) {
    try {
      // Ignore bot messages
      if (message.author.bot) return;
      
      // Check if this is a profile setup channel or user is in setup mode
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const profilePlugin = getPlugin('user-profiles');
        if (profilePlugin) {
          const { handleProfileMessage } = await import('../../user-profiles/profile-handler.js');
          const handled = await handleProfileMessage(message, profilePlugin);
          if (handled) return; // Profile handler took care of it
        }
      } catch (e) {
        // Profile plugin not available, continue normally
      }
      
      // Classify the message
      const classification = this.plugin.classifyMessage(message);
      
      // Track all non-ignored messages in memory
      if (classification.type !== 'ignore') {
        this.plugin.addToMemory(message.channelId, {
          userId: message.author.id,
          username: message.author.username,
          content: message.content,
          timestamp: message.createdTimestamp,
          isBot: false,
          guildId: message.guild?.id // For memory settings check
        });
      }
      
      // Route based on classification
      switch (classification.type) {
        case 'prefix':
          await this.handlePrefix(message, classification);
          break;
        case 'mention':
          await this.handleMention(message);
          break;
        case 'natural':
          await this.handleNatural(message);
          break;
        case 'passive':
          await this.handlePassive(message, classification);
          break;
        case 'ignore':
        default:
          // Do nothing
          break;
      }
    } catch (error) {
      logger.error('Error handling message:', error);
    }
  }

  /**
   * Handle message edit - re-respond when user edits their message
   * @param {Object} oldMessage - Original message (may be partial)
   * @param {Object} newMessage - Edited message
   */
  async handleMessageUpdate(oldMessage, newMessage) {
    try {
      // Fetch the full message if it's a partial
      if (newMessage.partial) {
        try {
          newMessage = await newMessage.fetch();
        } catch (e) {
          logger.debug('Could not fetch partial message:', e.message);
          return;
        }
      }
      
      // Ignore bot messages
      if (newMessage.author?.bot) return;
      
      // Ignore empty messages
      if (!newMessage.content || newMessage.content.trim() === '') return;
      
      // Ignore if content didn't change (could be embed update, etc.)
      // oldMessage might be partial, so only compare if we have content
      if (oldMessage.content && oldMessage.content === newMessage.content) return;
      
      // Check if we have a bot reply to this message that we can edit
      const botReplyId = this.botReplies.get(newMessage.id);
      
      // Check if this is a channel where we should respond
      const classification = this.plugin.classifyMessage(newMessage);
      
      // Only re-respond for messages we would normally respond to
      if (classification.type === 'ignore') {
        // But still check if it's an NSFW channel or AI chat channel
        const guildId = newMessage.guild?.id;
        const channelId = newMessage.channelId;
        
        let shouldRespond = false;
        
        // Check NSFW channel
        if (guildId) {
          try {
            const { isNsfwChannel } = await import('../utils/nsfw-manager.js');
            if (isNsfwChannel(guildId, channelId)) {
              shouldRespond = true;
            }
          } catch (e) {
            // NSFW manager not available
          }
        }
        
        // Check AI chat channel
        if (!shouldRespond) {
          try {
            const { isAIChatChannel } = await import('../utils/channel-helper.js');
            if (await isAIChatChannel(guildId, channelId)) {
              shouldRespond = true;
            }
          } catch (e) {
            // Channel helper not available
          }
        }
        
        if (!shouldRespond) return;
      }
      
      logger.info(`Message edited by ${newMessage.author?.username} in ${newMessage.channel?.name || channelId}, re-generating response`);
      
      // Show typing indicator
      try {
        await newMessage.channel.sendTyping();
      } catch (e) {
        // Ignore typing errors
      }
      
      // If we have a previous bot reply, try to edit it
      if (botReplyId) {
        try {
          const botReply = await newMessage.channel.messages.fetch(botReplyId);
          if (botReply && botReply.author.id === this.plugin.client?.user?.id) {
            // Generate new response
            const result = await this.generateEditResponse(newMessage);
            
            if (result.response && result.response.trim() !== '') {
              // Edit the bot's reply
              const embed = new EmbedBuilder()
                .setColor('#FFB6C1')
                .setDescription(result.response)
                .setFooter({
                  text: result.stats
                    ? `Context: ${result.stats.shortTermMessages} msgs | ${result.stats.budgetUsed} | ✏️ Edited`
                    : `Personality: ${result.personalityKey} | ✏️ Edited`
                })
                .setTimestamp();
              
              await botReply.edit({ embeds: [embed] });
              logger.debug('Edited bot reply for edited user message');
              return;
            }
          }
        } catch (e) {
          logger.debug('Could not edit previous bot reply:', e.message);
          // Fall through to send new reply
        }
      }
      
      // Send a new reply if we couldn't edit
      await this.generateAndReplyForEdit(newMessage);
      
    } catch (error) {
      logger.error('Error handling message edit:', error);
    }
  }

  /**
   * Generate response for an edited message
   * @param {Object} message - The edited message
   * @returns {Promise<Object>} Response result
   */
  async generateEditResponse(message) {
    const content = message.content;
    
    // Get reply context if this is a reply
    const replyContext = await this.extractReplyContext(message);
    
    // Generate response
    return await this.responseHandler.generateResponse({
      channelId: message.channelId,
      userId: message.author.id,
      username: message.author.username,
      content: content,
      replyContext,
      guildId: message.guild?.id
    });
  }

  /**
   * Generate and send reply for edited message
   * @param {Object} message - The edited message
   */
  async generateAndReplyForEdit(message) {
    try {
      const result = await this.generateEditResponse(message);
      
      // Handle empty response
      if (!result.response || result.response.trim() === '') {
        logger.warn('Empty response from AI for edited message, sending fallback');
        const reply = await message.reply({
          content: '💭 *I got a bit tongue-tied there... could you say that again?*',
          allowedMentions: { repliedUser: false }
        });
        this.botReplies.set(message.id, reply.id);
        return;
      }
      
      // Build embed response
      const embed = new EmbedBuilder()
        .setColor('#FFB6C1')
        .setDescription(result.response)
        .setFooter({
          text: result.stats
            ? `Context: ${result.stats.shortTermMessages} msgs | ${result.stats.budgetUsed}`
            : `Personality: ${result.personalityKey}`
        })
        .setTimestamp();
      
      const reply = await message.reply({ embeds: [embed] });
      
      // Track this reply for future edits
      this.botReplies.set(message.id, reply.id);
      
      // Record bot message for attention tracking
      this.responseFilter.recordBotMessage(message.channelId);
      
    } catch (error) {
      logger.error('Error generating response for edit:', error);
      
      await message.reply({
        content: '❌ Sorry, I encountered an error processing your edited message.',
        allowedMentions: { repliedUser: false }
      });
    }
  }

  /**
   * Handle prefix command
   * @param {Object} message - Discord message
   * @param {Object} classification - Classification result
   */
  async handlePrefix(message, classification) {
    const { command, args, prefixType } = classification;
    
    // Parse and execute prefix command
    const parsed = this.prefixHandler.parse(message.content);
    if (!parsed) return;
    
    const result = await this.prefixHandler.execute(parsed, message);
    
    if (result.response) {
      await message.reply(result.response);
    }
  }

  /**
   * Handle mention-based message
   * @param {Object} message - Discord message
   */
  async handleMention(message) {
    // Record the mention to start attention window
    this.responseFilter.recordMention(message.channelId);
    
    // Remove the mention from content for cleaner processing
    const botId = this.plugin.client?.user?.id;
    let content = message.content;
    
    if (botId) {
      content = content.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim();
    }
    
    // If no content after removing mention, send help
    if (!content) {
      const embed = new EmbedBuilder()
        .setColor('#FFB6C1')
        .setTitle('👋 Hello!')
        .setDescription('You mentioned me! How can I help you?\n\n' +
          '**Commands:**\n' +
          '• `/chat <message>` - Chat with me\n' +
          '• `/memory view` - View conversation memory\n' +
          '• `/ai settings` - View AI settings\n\n' +
          '**Prefix Commands:**\n' +
          '• `!help` - Get help\n' +
          '• `?status` - Check status\n' +
          '• `.ping` - Quick ping')
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      // Still record bot message for attention tracking
      this.responseFilter.recordBotMessage(message.channelId);
      return;
    }
    
    // Generate response with context
    await this.generateAndReply(message, content);
  }

  /**
   * Handle natural language message
   * @param {Object} message - Discord message
   */
  async handleNatural(message) {
    // Only respond in DMs or when mention not required
    const config = this.plugin.getConfig();
    const isDM = !message.guild;
    
    if (!isDM && config.mentionRequired) {
      // Should not reach here due to router, but safety check
      return;
    }
    
    // Check if this is a reply to the bot (always respond to direct replies)
    if (message.reference?.messageId && config.respondToReplies) {
      try {
        const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
        const botId = this.plugin.client?.user?.id;
        if (referencedMessage && botId && referencedMessage.author.id === botId) {
          logger.debug('Responding to direct reply to bot');
          await this.generateAndReply(message, message.content);
          return;
        }
      } catch (e) {
        // Ignore fetch errors
      }
    }
    
    // Use smart response filter to decide if we should respond
    const classification = { type: 'natural' };
    const decision = await this.responseFilter.shouldRespond(message, classification);
    
    if (!decision.respond) {
      logger.debug(`Skipping natural message: ${decision.reason} (confidence: ${decision.confidence?.toFixed(2) || 'N/A'})`);
      return;
    }
    
    logger.debug(`Responding to natural message: ${decision.reason}${decision.reason === 'ai_chat_channel' ? ' (auto-chat channel)' : ''}`);
    await this.generateAndReply(message, message.content);
  }

  /**
   * Handle passive trigger
   * @param {Object} message - Discord message
   * @param {Object} classification - Classification result
   */
  async handlePassive(message, classification) {
    const { triggers } = classification;
    
    // Detect triggers and get suggestions
    const detected = this.triggerSystem.detect(message.content);
    
    if (detected.length === 0) return;
    
    // Build suggestion message
    const suggestions = detected.map(t => t.suggestion).filter(Boolean);
    
    if (suggestions.length > 0) {
      const embed = new EmbedBuilder()
        .setColor('#3498DB')
        .setTitle('💡 I noticed something!')
        .setDescription(suggestions.join('\n\n'))
        .setFooter({ text: 'React with 👍 if you\'d like help' })
        .setTimestamp();
      
      const reply = await message.reply({ embeds: [embed] });
      
      // Add reaction for user to confirm
      try {
        await reply.react('👍');
      } catch (e) {
        // Ignore reaction errors
      }
    }
  }

  /**
   * Extract reply context from a message
   * @param {Object} message - Discord message
   * @returns {Promise<Object|null>} Reply context or null
   */
  async extractReplyContext(message) {
    // Check if this message is a reply to another message
    if (!message.reference?.messageId) {
      return null;
    }

    try {
      // Fetch the referenced message
      const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
      
      if (!referencedMessage) return null;

      // Check if this is a reply to the bot
      const botId = this.plugin.client?.user?.id;
      const isReplyToBot = botId && referencedMessage.author.id === botId;

      // Extract content from the referenced message
      let referencedContent = referencedMessage.content || '';
      
      // If the referenced message has embeds (like bot responses), extract that content too
      if (referencedMessage.embeds?.length > 0) {
        const embedContents = referencedMessage.embeds
          .map(embed => {
            const parts = [];
            if (embed.title) parts.push(`**${embed.title}**`);
            if (embed.description) parts.push(embed.description);
            if (embed.fields?.length > 0) {
              parts.push(embed.fields.map(f => `${f.name}: ${f.value}`).join('\n'));
            }
            return parts.join('\n');
          })
          .filter(Boolean);
        
        if (embedContents.length > 0) {
          referencedContent = embedContents.join('\n\n');
        }
      }

      // Truncate if too long
      if (referencedContent.length > 2000) {
        referencedContent = referencedContent.slice(0, 2000) + '...';
      }

      return {
        messageId: referencedMessage.id,
        authorId: referencedMessage.author.id,
        authorUsername: referencedMessage.author.username,
        isBot: referencedMessage.author.bot,
        isReplyToBot,
        content: referencedContent,
        timestamp: referencedMessage.createdTimestamp
      };
    } catch (error) {
      logger.debug('Could not fetch referenced message:', error.message);
      return null;
    }
  }

  /**
   * Generate AI response and reply
   * @param {Object} message - Discord message
   * @param {string} content - Message content to process
   */
  async generateAndReply(message, content) {
    if (!this.responseHandler) {
      logger.warn('Response handler not available');
      return;
    }
    
    try {
      // Show typing indicator
      await message.channel.sendTyping();
      
      // Check if this is an NSFW channel - if so, skip action execution (chat only)
      let isNsfwChannel = false;
      if (message.guild?.id) {
        try {
          const { isNsfwChannel: checkNsfw } = await import('../utils/nsfw-manager.js');
          isNsfwChannel = checkNsfw(message.guild.id, message.channelId);
        } catch (e) {
          // NSFW manager not available
        }
      }
      
      let actionResult = null;
      let actionContext = null;
      
      // Check for allowed actions in NSFW channels
      const isAllowedNsfwAction = this.isAllowedNsfwAction(content);
      
      // Only check for actions if NOT in NSFW channel, OR if it's an allowed NSFW action
      // NSFW channels allow: personality changes, nsfw toggle, kick/ban/invite
      if (!isNsfwChannel || isAllowedNsfwAction) {
        // First, check if this is an actionable request
        actionResult = await this.actionExecutor.processQuery(content, {
          message,
          channelId: message.channelId,
          userId: message.author.id,
          username: message.author.username,
          guild: message.guild,
          member: message.member,
          isNsfwChannel // Pass this so personality changes can be channel-specific
        });
        
        // If action was executed successfully, show the result
        if (actionResult?.executed && actionResult?.success) {
          logger.info(`Action executed: ${actionResult.actionId}`);
          
          const embed = new EmbedBuilder()
            .setColor('#90EE90')
            .setTitle(`✨ ${actionResult.description || 'Action Complete'}`)
            .setDescription(actionResult.formatted)
            .setFooter({ text: `Action: ${actionResult.actionId}` })
            .setTimestamp();
          
          await message.reply({ embeds: [embed] });
          this.responseFilter.recordBotMessage(message.channelId);
          return;
        }
        
        // If action was detected but failed, include error context
        if (actionResult?.detected && !actionResult?.success) {
          actionContext = `Note: I tried to ${actionResult.description || 'perform an action'} but encountered an issue: ${actionResult.error}`;
        }
      } else {
        logger.debug(`Skipping action execution in NSFW channel ${message.channelId} (not a personality request)`);
      }
      
      // Extract reply context if this is a reply to another message
      const replyContext = await this.extractReplyContext(message);
      
      // Generate response with reply context
      const result = await this.responseHandler.generateResponse({
        channelId: message.channelId,
        userId: message.author.id,
        username: message.author.username,
        content: actionContext ? `${content}\n\n[${actionContext}]` : content,
        replyContext,
        guildId: message.guild?.id
      });
      
      // Handle empty response (can happen with rate limits or content filtering)
      if (!result.response || result.response.trim() === '') {
        logger.warn('Empty response from AI, sending fallback');
        await message.reply({
          content: '💭 *I got a bit tongue-tied there... could you say that again?*',
          allowedMentions: { repliedUser: false }
        });
        return;
      }
      
      // Build embed response
      const embed = new EmbedBuilder()
        .setColor('#FFB6C1')
        .setDescription(result.response)
        .setFooter({ 
          text: result.stats 
            ? `Context: ${result.stats.shortTermMessages} msgs | ${result.stats.budgetUsed}`
            : `Personality: ${result.personalityKey}`
        })
        .setTimestamp();
      
      const reply = await message.reply({ embeds: [embed] });
      
      // Track this reply for edit handling
      this.botReplies.set(message.id, reply.id);
      
      // Clean up old entries (keep last 100)
      if (this.botReplies.size > 100) {
        const keys = Array.from(this.botReplies.keys());
        for (let i = 0; i < keys.length - 100; i++) {
          this.botReplies.delete(keys[i]);
        }
      }
      
      // Record bot message for attention tracking
      this.responseFilter.recordBotMessage(message.channelId);
      
    } catch (error) {
      logger.error('Error generating response:', error);
      
      await message.reply({
        content: '❌ Sorry, I encountered an error processing your message.',
        allowedMentions: { repliedUser: false }
      });
    }
  }

  /**
   * Check if a message is requesting an action allowed in NSFW channels
   * Allowed: personality changes, nsfw toggle, kick/ban/invite users
   * @param {string} content - Message content
   * @returns {boolean}
   */
  isAllowedNsfwAction(content) {
    const lowerContent = content.toLowerCase();
    
    // Personality change keywords
    const personalityKeywords = [
      'change personality', 'switch personality', 'be more', 'act like',
      'personality to', 'set personality', 'use personality',
      'be a maid', 'be tsundere', 'be yandere', 'be kuudere', 'be dandere',
      'be sassy', 'be flirty', 'be dominant', 'be submissive',
      'maid mode', 'tsundere mode', 'change to', 'switch to',
      'different personality', 'another personality'
    ];
    
    // NSFW toggle keywords
    const nsfwKeywords = [
      'enable nsfw', 'disable nsfw', 'nsfw on', 'nsfw off',
      'unlock nsfw', 'lock nsfw', 'adult mode'
    ];
    
    // Moderation keywords (kick/ban/invite)
    const moderationKeywords = [
      'kick', 'ban', 'unban', 'invite', 'remove user', 'boot',
      'kick user', 'ban user', 'invite user'
    ];
    
    const allAllowedKeywords = [...personalityKeywords, ...nsfwKeywords, ...moderationKeywords];
    
    return allAllowedKeywords.some(kw => lowerContent.includes(kw));
  }

  /**
   * Register event listener with Discord client
   * @param {Object} client - Discord.js client
   */
  register(client) {
    // Set bot ID for response filter
    if (client.user?.id) {
      this.responseFilter.setBotId(client.user.id);
    }
    
    // Set client for action executor
    this.actionExecutor.setClient(client);
    
    client.on('messageCreate', this.handleMessage);
    client.on('messageUpdate', this.handleMessageUpdate);
    logger.info('Message handler registered (with edit support)');
  }

  /**
   * Unregister event listener
   * @param {Object} client - Discord.js client
   */
  unregister(client) {
    client.off('messageCreate', this.handleMessage);
    client.off('messageUpdate', this.handleMessageUpdate);
    logger.info('Message handler unregistered');
  }
}

export default MessageHandler;
