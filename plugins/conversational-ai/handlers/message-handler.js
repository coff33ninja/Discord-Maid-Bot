/**
 * Message Event Handler
 * 
 * Handles incoming Discord messages and routes them appropriately.
 * Integrates with MessageRouter, ResponseHandler, PrefixHandler, and TriggerSystem.
 * 
 * @module plugins/conversational-ai/handlers/message-handler
 */

import { EmbedBuilder } from 'discord.js';
import { createLogger } from '../../../src/logging/logger.js';
import { PrefixHandler } from '../router/prefix-handler.js';
import { TriggerSystem } from '../triggers/trigger-system.js';

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
      
      // Generate response
      const result = await this.responseHandler.generateResponse({
        channelId: message.channelId,
        userId: message.author.id,
        username: message.author.username,
        content
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
