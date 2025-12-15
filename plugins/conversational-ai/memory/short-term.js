/**
 * Short-Term Memory System
 * 
 * In-memory rolling window of recent messages per channel for conversational continuity.
 * Ephemeral - cleared on restart.
 * 
 * @module plugins/conversational-ai/memory/short-term
 */

/**
 * @typedef {Object} StoredMessage
 * @property {string} userId - Discord user ID
 * @property {string} username - Discord username
 * @property {string} content - Message content
 * @property {number} timestamp - Unix timestamp
 * @property {number} tokens - Estimated token count
 * @property {boolean} isBot - Whether message is from bot
 */

/**
 * @typedef {Object} ShortTermConfig
 * @property {number} maxTokens - Maximum tokens per channel (default: 4000)
 * @property {number} maxMessages - Maximum messages per channel (default: 50)
 */

const DEFAULT_CONFIG = {
  maxTokens: 4000,
  maxMessages: 50
};

/**
 * Short-Term Memory class
 * Maintains rolling window of recent messages per channel
 */
export class ShortTermMemory {
  /**
   * @param {ShortTermConfig} config - Configuration options
   */
  constructor(config = {}) {
    /** @type {Map<string, StoredMessage[]>} */
    this.channelContexts = new Map();
    this.maxTokens = config.maxTokens || DEFAULT_CONFIG.maxTokens;
    this.maxMessages = config.maxMessages || DEFAULT_CONFIG.maxMessages;
  }

  /**
   * Estimate token count for text
   * Rough estimate: ~4 chars per token
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Add a message to channel context
   * @param {string} channelId - Discord channel ID
   * @param {Object} message - Message data
   * @param {string} message.userId - User ID
   * @param {string} message.username - Username
   * @param {string} message.content - Message content
   * @param {number} [message.timestamp] - Timestamp (defaults to now)
   * @param {boolean} [message.isBot] - Whether from bot
   */
  addMessage(channelId, message) {
    let context = this.channelContexts.get(channelId) || [];
    
    const storedMessage = {
      userId: message.userId,
      username: message.username,
      content: message.content,
      timestamp: message.timestamp || Date.now(),
      tokens: this.estimateTokens(message.content),
      isBot: message.isBot || false
    };
    
    context.push(storedMessage);
    
    // Trim to token budget
    context = this.trimToTokenBudget(context, this.maxTokens);
    
    // Hard limit on message count
    if (context.length > this.maxMessages) {
      context = context.slice(-this.maxMessages);
    }
    
    this.channelContexts.set(channelId, context);
  }

  /**
   * Get context for a channel within token budget
   * @param {string} channelId - Discord channel ID
   * @param {number} [maxTokens] - Maximum tokens to return (default: 2000)
   * @returns {StoredMessage[]} Messages within budget, most recent prioritized
   */
  getContext(channelId, maxTokens = 2000) {
    const context = this.channelContexts.get(channelId) || [];
    return this.trimToTokenBudget(context, maxTokens);
  }

  /**
   * Clear context for a channel
   * @param {string} channelId - Discord channel ID
   */
  clear(channelId) {
    this.channelContexts.delete(channelId);
  }

  /**
   * Clear all contexts
   */
  clearAll() {
    this.channelContexts.clear();
  }

  /**
   * Trim messages to fit within token budget
   * Prioritizes most recent messages
   * @param {StoredMessage[]} messages - Messages to trim
   * @param {number} budget - Token budget
   * @returns {StoredMessage[]} Trimmed messages
   */
  trimToTokenBudget(messages, budget) {
    let totalTokens = 0;
    const result = [];
    
    // Work backwards from most recent
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (totalTokens + msg.tokens > budget) break;
      
      totalTokens += msg.tokens;
      result.unshift(msg);
    }
    
    return result;
  }

  /**
   * Get total token count for a channel
   * @param {string} channelId - Discord channel ID
   * @returns {number} Total tokens
   */
  getTotalTokens(channelId) {
    const context = this.channelContexts.get(channelId) || [];
    return context.reduce((sum, msg) => sum + msg.tokens, 0);
  }

  /**
   * Get message count for a channel
   * @param {string} channelId - Discord channel ID
   * @returns {number} Message count
   */
  getMessageCount(channelId) {
    const context = this.channelContexts.get(channelId) || [];
    return context.length;
  }

  /**
   * Get statistics for all channels
   * @returns {Object} Statistics
   */
  getStats() {
    const stats = {
      channelCount: this.channelContexts.size,
      totalMessages: 0,
      totalTokens: 0
    };
    
    for (const context of this.channelContexts.values()) {
      stats.totalMessages += context.length;
      stats.totalTokens += context.reduce((sum, msg) => sum + msg.tokens, 0);
    }
    
    return stats;
  }
}

export default ShortTermMemory;
