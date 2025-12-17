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
import { initializeHandler } from './commands.js';
import { ResponseHandler } from './handlers/response-handler.js';
import { MessageHandler } from './handlers/message-handler.js';

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
    this.semanticMemory = null;
    this.messageRouter = null;
    this.responseHandler = null;
    this.messageHandler = null;
    this.client = null;
  }

  async onLoad() {
    this.logger.info('🧠 Loading Conversational AI plugin...');
    
    // Load configuration
    this.config = loadConfig();
    this.logger.info(`   Config: maxTokens=${this.config.shortTermMaxTokens}, maxMessages=${this.config.shortTermMaxMessages}`);
    
    // Initialize NSFW manager (loads configOps reference for sync access)
    try {
      const { initNsfwManager } = await import('./utils/nsfw-manager.js');
      await initNsfwManager();
      this.logger.info('   NSFW manager initialized');
    } catch (e) {
      this.logger.warn('   Could not initialize NSFW manager:', e.message);
    }
    
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
    
    // Initialize response handler with context integration
    initializeHandler(this);
    
    // Create response handler for message events
    this.responseHandler = new ResponseHandler({
      shortTermMemory: this.shortTermMemory,
      semanticMemory: this.semanticMemory,
      generateFn: async (prompt, options = {}) => {
        const { result } = await this.requestFromCore('gemini-generate', { 
          prompt, 
          options: { nsfw: options.nsfw || false }
        });
        return result.response.text();
      },
      config: this.config
    });
    
    // Create message handler (will be registered when client is set)
    this.messageHandler = new MessageHandler({
      plugin: this,
      responseHandler: this.responseHandler
    });
    
    this.logger.info('✅ Conversational AI plugin loaded');
  }

  async onUnload() {
    this.logger.info('🧠 Unloading Conversational AI plugin...');
    
    // Unregister message handler
    if (this.messageHandler && this.client) {
      this.messageHandler.unregister(this.client);
    }
    
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
      
      // Register message handler
      if (this.messageHandler) {
        this.messageHandler.register(client);
        this.logger.info('📨 Message event handler registered');
      }
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
   * Get semantic memory instance
   * @returns {Object|null}
   */
  getSemanticMemory() {
    return this.semanticMemory;
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

  /**
   * Get response handler instance
   * @returns {ResponseHandler|null}
   */
  getResponseHandler() {
    return this.responseHandler;
  }

  /**
   * Generate a response with context (public API for other plugins)
   * @param {Object} options - Response options
   * @param {string} options.channelId - Channel ID
   * @param {string} options.userId - User ID
   * @param {string} options.username - Username
   * @param {string} options.content - Message content
   * @returns {Promise<Object>} Response result
   */
  async generateResponse(options) {
    if (!this.responseHandler) {
      throw new Error('Response handler not initialized');
    }
    return this.responseHandler.generateResponse(options);
  }

  /**
   * Track a message in memory without generating response
   * @param {string} channelId - Channel ID
   * @param {Object} message - Message data
   */
  trackMessage(channelId, message) {
    if (this.responseHandler) {
      this.responseHandler.trackMessage(channelId, message);
    } else {
      this.addToMemory(channelId, message);
    }
  }
}
