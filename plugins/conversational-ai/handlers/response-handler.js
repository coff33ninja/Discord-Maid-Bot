/**
 * Conversational Response Handler
 * 
 * Handles AI response generation with full context integration.
 * Integrates short-term memory, semantic memory, and personality.
 * 
 * @module plugins/conversational-ai/handlers/response-handler
 */

import { createLogger } from '../../../src/logging/logger.js';
import { ContextReconstructor } from '../context/context-reconstructor.js';

const logger = createLogger('response-handler');

/**
 * @typedef {Object} ReplyContext
 * @property {string} messageId - Referenced message ID
 * @property {string} authorId - Original author ID
 * @property {string} authorUsername - Original author username
 * @property {boolean} isBot - Whether original author is bot
 * @property {string} content - Referenced message content
 * @property {number} timestamp - Referenced message timestamp
 */

/**
 * @typedef {Object} ResponseOptions
 * @property {string} channelId - Discord channel ID
 * @property {string} userId - Discord user ID
 * @property {string} username - Discord username
 * @property {string} content - Message content
 * @property {Object} [networkContext] - Optional network context
 * @property {ReplyContext} [replyContext] - Context from replied-to message
 */

/**
 * @typedef {Object} ResponseResult
 * @property {string} response - AI response text
 * @property {Object} context - Context used for generation
 * @property {Object} stats - Context statistics
 */

/**
 * Response Handler class
 * Generates AI responses with full context integration
 */
export class ResponseHandler {
  /**
   * @param {Object} options - Handler options
   * @param {Object} options.shortTermMemory - ShortTermMemory instance
   * @param {Object} [options.semanticMemory] - SemanticMemory instance
   * @param {Function} options.generateFn - AI generation function
   * @param {Object} [options.config] - Configuration
   */
  constructor({ shortTermMemory, semanticMemory = null, generateFn, config = {} }) {
    this.shortTermMemory = shortTermMemory;
    this.semanticMemory = semanticMemory;
    this.generateFn = generateFn;
    this.config = {
      maxContextTokens: config.maxContextTokens || 6000,
      shortTermBudget: config.shortTermBudget || 2000,
      semanticLimit: config.semanticLimit || 3,
      ...config
    };
    
    // Initialize context reconstructor
    this.contextReconstructor = new ContextReconstructor(
      shortTermMemory,
      semanticMemory,
      {
        maxTokens: this.config.maxContextTokens,
        shortTermBudget: this.config.shortTermBudget,
        semanticLimit: this.config.semanticLimit
      }
    );
  }

  /**
   * Get personality plugin (soft dependency)
   * @returns {Promise<Object|null>}
   */
  async getPersonalityPlugin() {
    try {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      return getPlugin('personality');
    } catch (e) {
      return null;
    }
  }

  /**
   * Get user's preferred personality
   * @param {string} userId - User ID
   * @returns {Promise<string>}
   */
  async getUserPersonality(userId) {
    const personalityPlugin = await this.getPersonalityPlugin();
    if (personalityPlugin?.getUserPersonality) {
      return personalityPlugin.getUserPersonality(userId);
    }
    return 'maid';
  }

  /**
   * Get personality configuration
   * @param {string} key - Personality key
   * @returns {Promise<Object>}
   */
  async getPersonality(key) {
    const personalityPlugin = await this.getPersonalityPlugin();
    if (personalityPlugin?.getPersonality) {
      return personalityPlugin.getPersonality(key);
    }
    
    // Fallback personality
    return {
      name: 'Maid',
      emoji: '🌸',
      description: 'Polite and helpful',
      prompt: 'You are a helpful AI assistant with a friendly, maid-like personality. Be polite, helpful, and occasionally use endearing terms.'
    };
  }

  /**
   * Build prompt with context
   * @param {string} userMessage - User's message
   * @param {Object} context - Reconstructed context
   * @param {Object} personality - Personality config
   * @param {Object} [extras] - Extra context (network, replyContext, etc.)
   * @returns {string}
   */
  buildPrompt(userMessage, context, personality, extras = {}) {
    const parts = [];
    
    // System prompt from personality
    parts.push(personality.prompt);
    parts.push('');
    
    // Add context from reconstructor
    const contextText = this.contextReconstructor.formatForPrompt(context);
    if (contextText) {
      parts.push(contextText);
    }
    
    // Add reply context if user is replying to another message
    if (extras.replyContext) {
      const rc = extras.replyContext;
      const authorLabel = rc.isBot ? 'Bot' : rc.authorUsername;
      parts.push('**Message Being Replied To:**');
      parts.push(`From: ${authorLabel}`);
      parts.push(`Content: ${rc.content}`);
      parts.push('');
      parts.push('(The user is asking about or responding to the above message. Consider this context in your response.)');
      parts.push('');
    }
    
    // Add extra context (network, etc.)
    if (extras.networkContext) {
      parts.push(`**Current Network Status:** ${extras.networkContext.deviceCount} devices online`);
      parts.push('');
    }
    
    // Current message
    parts.push(`**Current Message from ${extras.username || 'User'}:**`);
    parts.push(userMessage);
    parts.push('');
    parts.push('Respond in character. Be concise but maintain your personality!');
    
    return parts.join('\n');
  }

  /**
   * Generate response with full context
   * @param {ResponseOptions} options - Response options
   * @returns {Promise<ResponseResult>}
   */
  async generateResponse(options) {
    const { channelId, userId, username, content, networkContext, replyContext } = options;
    
    // 1. Reconstruct context
    const context = this.contextReconstructor.reconstruct({
      channelId,
      userId,
      content
    });
    
    // 2. Get personality
    const personalityKey = await this.getUserPersonality(userId);
    const personality = await this.getPersonality(personalityKey);
    
    // 3. Build prompt with reply context
    const prompt = this.buildPrompt(content, context, personality, {
      networkContext,
      username,
      replyContext
    });
    
    // 4. Generate response
    const response = await this.generateFn(prompt);
    
    // 5. Update short-term memory with user message (include reply reference)
    const userMessageContent = replyContext 
      ? `[Replying to ${replyContext.isBot ? 'Bot' : replyContext.authorUsername}] ${content}`
      : content;
    
    this.shortTermMemory.addMessage(channelId, {
      userId,
      username,
      content: userMessageContent,
      timestamp: Date.now(),
      isBot: false
    });
    
    // 6. Update short-term memory with bot response
    this.shortTermMemory.addMessage(channelId, {
      userId: 'bot',
      username: 'Bot',
      content: response,
      timestamp: Date.now(),
      isBot: true
    });
    
    // 7. Get stats
    const stats = this.contextReconstructor.getStats(context);
    
    return {
      response,
      context,
      stats,
      personalityKey,
      hadReplyContext: !!replyContext
    };
  }

  /**
   * Add message to memory without generating response
   * Useful for tracking messages in channels
   * @param {string} channelId - Channel ID
   * @param {Object} message - Message data
   */
  trackMessage(channelId, message) {
    this.shortTermMemory.addMessage(channelId, {
      userId: message.userId,
      username: message.username,
      content: message.content,
      timestamp: message.timestamp || Date.now(),
      isBot: message.isBot || false
    });
  }

  /**
   * Get context statistics for a channel
   * @param {string} channelId - Channel ID
   * @returns {Object}
   */
  getChannelStats(channelId) {
    return {
      messageCount: this.shortTermMemory.getMessageCount(channelId),
      tokenCount: this.shortTermMemory.getTotalTokens(channelId)
    };
  }
}

export default ResponseHandler;
