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
    
    // Bind the handler
    this.handleMessage = this.handleMessage.bind(this);
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
          isBot: false
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
          isNsfwChannel = await checkNsfw(message.guild.id, message.channelId);
        } catch (e) {
          // NSFW manager not available
        }
      }
      
      let actionResult = null;
      let actionContext = null;
      
      // Only check for actions if NOT in NSFW channel
      // NSFW channels are for chat/roleplay only, not bot commands
      if (!isNsfwChannel) {
        // First, check if this is an actionable request
        actionResult = await this.actionExecutor.processQuery(content, {
          message,
          channelId: message.channelId,
          userId: message.author.id,
          username: message.author.username,
          guild: message.guild,
          member: message.member
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
        logger.debug(`Skipping action execution in NSFW channel ${message.channelId}`);
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
      
      await message.reply({ embeds: [embed] });
      
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
    logger.info('Message handler registered');
  }

  /**
   * Unregister event listener
   * @param {Object} client - Discord.js client
   */
  unregister(client) {
    client.off('messageCreate', this.handleMessage);
    logger.info('Message handler unregistered');
  }
}

export default MessageHandler;
