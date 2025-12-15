/**
 * Conversational AI Plugin
 * 
 * Provides intelligent conversational capabilities with contextual memory,
 * natural language understanding, and modular extensibility.
 * 
 * Features:
 * - Natural conversation with AI
 * - Short-term memory (rolling window)
 * - Semantic memory (long-term, persistent)
 * - Passive triggers (code blocks, errors, long messages)
 * - Prefix commands (!, ?, .)
 * - Personality-aware responses
 * - Context reconstruction with token budgeting
 * 
 * @module plugins/conversational-ai
 */

import { Plugin } from '../../src/core/plugin-system.js';
import { createLogger } from '../../src/logging/logger.js';
import { ShortTermMemory } from './memory/short-term.js';
import { MessageRouter } from './router/message-router.js';
import { loadConfig } from './config.js';

export default class ConversationalAIPlugin extends Plugin {
  constructor() {
    super('conversational-ai', '2.0.0', 'Intelligent conversational AI with contextual memory', {
      optionalDependencies: ['personality'],
      category: 'ai',
      author: 'Discord Maid Bot',
      keywords: ['chat', 'ai', 'conversation', 'gemini', 'memory', 'context']
    });
    this.logger = createLogger('conversational-ai');
    
    // Components (initialized in onLoad)
    this.config = null;
    this.shortTermMemory = null;
    this.messageRouter = null;
    this.client = null;
  }

  async onLoad() {
    this.logger.info('🧠 Loading Conversational AI plugin...');
    
    // Load configuration
    this.config = loadConfig();
    this.logger.info(`   Config: maxTokens=${this.config.shortTermMaxTokens}, maxMessages=${this.config.shortTermMaxMessages}`);
    
    // Initialize short-term memory
    this.shortTermMemory = new ShortTermMemory({
      maxTokens: this.config.shortTermMaxTokens,
      maxMessages: this.config.shortTermMaxMessages
    });
    
    // Initialize message router
    this.messageRouter = new MessageRouter({
      prefixEnabled: this.config.prefixCommandsEnabled,
      passiveEnabled: this.config.passiveTriggersEnabled,
      mentionRequired: this.config.mentionRequired
    });
    
    this.logger.info('✅ Conversational AI plugin loaded');
  }

  async onUnload() {
    this.logger.info('🧠 Unloading Conversational AI plugin...');
    
    // Clear memory
    if (this.shortTermMemory) {
      this.shortTermMemory.clearAll();
    }
    
    this.logger.info('✅ Conversational AI plugin unloaded');
  }

  /**
   * Set Discord client reference
   * @param {Object} client - Discord.js client
   */
  setClient(client) {
    this.client = client;
    if (client?.user?.id) {
      this.messageRouter.setBotId(client.user.id);
    }
  }

  /**
   * Get short-term memory instance
   * @returns {ShortTermMemory}
   */
  getShortTermMemory() {
    return this.shortTermMemory;
  }

  /**
   * Get message router instance
   * @returns {MessageRouter}
   */
  getMessageRouter() {
    return this.messageRouter;
  }

  /**
   * Get current configuration
   * @returns {Object}
   */
  getConfig() {
    return this.config;
  }

  /**
   * Add message to short-term memory
   * @param {string} channelId - Channel ID
   * @param {Object} message - Message data
   */
  addToMemory(channelId, message) {
    if (this.shortTermMemory) {
      this.shortTermMemory.addMessage(channelId, message);
    }
  }

  /**
   * Get context for a channel
   * @param {string} channelId - Channel ID
   * @param {number} [maxTokens] - Max tokens
   * @returns {Array} Messages
   */
  getContext(channelId, maxTokens) {
    if (!this.shortTermMemory) return [];
    return this.shortTermMemory.getContext(channelId, maxTokens);
  }

  /**
   * Clear memory for a channel
   * @param {string} channelId - Channel ID
   */
  clearMemory(channelId) {
    if (this.shortTermMemory) {
      this.shortTermMemory.clear(channelId);
    }
  }

  /**
   * Classify a message
   * @param {Object} message - Discord message
   * @returns {Object} Classification result
   */
  classifyMessage(message) {
    if (!this.messageRouter) return { type: 'ignore', priority: 0 };
    return this.messageRouter.classify(message);
  }

  /**
   * Get memory statistics
   * @returns {Object} Stats
   */
  getMemoryStats() {
    if (!this.shortTermMemory) return { channelCount: 0, totalMessages: 0, totalTokens: 0 };
    return this.shortTermMemory.getStats();
  }
}
