/**
 * Short-Term Memory System
 * 
 * Rolling window of recent messages per channel for conversational continuity.
 * Now persists to database and survives bot restarts.
 * 
 * @module plugins/conversational-ai/memory/short-term
 */

import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('short-term-memory');

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
 * @property {boolean} persist - Whether to persist to database (default: true)
 * @property {number} persistMaxAge - Max age in ms to load from DB (default: 24 hours)
 */

const DEFAULT_CONFIG = {
  maxTokens: 4000,
  maxMessages: 50,
  persist: true,
  persistMaxAge: 24 * 60 * 60 * 1000 // 24 hours
};

// Database table name for conversation history
const CONVERSATION_TABLE = 'conversation_history';

/**
 * Short-Term Memory class
 * Maintains rolling window of recent messages per channel
 * Persists to database for continuity across restarts
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
    this.persist = config.persist !== false; // Default true
    this.persistMaxAge = config.persistMaxAge || DEFAULT_CONFIG.persistMaxAge;
    this.dbInitialized = false;
    this.loadedChannels = new Set(); // Track which channels we've loaded from DB
    
    // Initialize database table
    if (this.persist) {
      this.initDatabase().catch(err => {
        logger.error('Failed to initialize conversation history table:', err.message);
      });
    }
  }

  /**
   * Initialize the database table for conversation history
   */
  async initDatabase() {
    try {
      const { getDb } = await import('../../../src/database/db.js');
      const db = getDb();
      
      // Create conversation history table if it doesn't exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS ${CONVERSATION_TABLE} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          channel_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          content TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          tokens INTEGER NOT NULL,
          is_bot INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create index for faster lookups
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_conversation_channel_time 
        ON ${CONVERSATION_TABLE} (channel_id, timestamp DESC)
      `);
      
      this.dbInitialized = true;
      logger.info('Conversation history table initialized');
    } catch (error) {
      logger.error('Database initialization failed:', error.message);
      this.persist = false; // Disable persistence on failure
    }
  }

  /**
   * Load conversation history from database for a channel
   * @param {string} channelId - Discord channel ID
   */
  async loadFromDatabase(channelId) {
    if (!this.persist || !this.dbInitialized || this.loadedChannels.has(channelId)) {
      return;
    }
    
    try {
      const { getDb } = await import('../../../src/database/db.js');
      const db = getDb();
      
      const cutoffTime = Date.now() - this.persistMaxAge;
      
      // Load recent messages within max age, limited by maxMessages
      const rows = db.prepare(`
        SELECT user_id, username, content, timestamp, tokens, is_bot
        FROM ${CONVERSATION_TABLE}
        WHERE channel_id = ? AND timestamp > ?
        ORDER BY timestamp DESC
        LIMIT ?
      `).all(channelId, cutoffTime, this.maxMessages);
      
      if (rows.length > 0) {
        // Reverse to get chronological order
        const messages = rows.reverse().map(row => ({
          userId: row.user_id,
          username: row.username,
          content: row.content,
          timestamp: row.timestamp,
          tokens: row.tokens,
          isBot: row.is_bot === 1
        }));
        
        // Trim to token budget
        const trimmed = this.trimToTokenBudget(messages, this.maxTokens);
        this.channelContexts.set(channelId, trimmed);
        
        logger.debug(`Loaded ${trimmed.length} messages for channel ${channelId} from database`);
      }
      
      this.loadedChannels.add(channelId);
    } catch (error) {
      logger.error(`Failed to load conversation history for ${channelId}:`, error.message);
    }
  }

  /**
   * Save a message to the database
   * @param {string} channelId - Discord channel ID
   * @param {StoredMessage} message - Message to save
   */
  async saveToDatabase(channelId, message) {
    if (!this.persist || !this.dbInitialized) return;
    
    try {
      const { getDb } = await import('../../../src/database/db.js');
      const db = getDb();
      
      db.prepare(`
        INSERT INTO ${CONVERSATION_TABLE} 
        (channel_id, user_id, username, content, timestamp, tokens, is_bot)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        channelId,
        message.userId,
        message.username,
        message.content,
        message.timestamp,
        message.tokens,
        message.isBot ? 1 : 0
      );
      
      // Cleanup old messages periodically (every 100 inserts)
      if (Math.random() < 0.01) {
        this.cleanupOldMessages();
      }
    } catch (error) {
      logger.error('Failed to save message to database:', error.message);
    }
  }

  /**
   * Cleanup old messages from database
   */
  async cleanupOldMessages() {
    if (!this.persist || !this.dbInitialized) return;
    
    try {
      const { getDb } = await import('../../../src/database/db.js');
      const db = getDb();
      
      const cutoffTime = Date.now() - this.persistMaxAge;
      
      const result = db.prepare(`
        DELETE FROM ${CONVERSATION_TABLE}
        WHERE timestamp < ?
      `).run(cutoffTime);
      
      if (result.changes > 0) {
        logger.debug(`Cleaned up ${result.changes} old conversation messages`);
      }
    } catch (error) {
      logger.error('Failed to cleanup old messages:', error.message);
    }
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
    // Ensure we've loaded existing history first
    if (!this.loadedChannels.has(channelId)) {
      this.loadFromDatabase(channelId).catch(() => {});
    }
    
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
    
    // Persist to database (async, don't wait)
    this.saveToDatabase(channelId, storedMessage).catch(() => {});
  }

  /**
   * Get context for a channel within token budget
   * Loads from database if not already loaded
   * @param {string} channelId - Discord channel ID
   * @param {number} [maxTokens] - Maximum tokens to return (default: 2000)
   * @returns {StoredMessage[]} Messages within budget, most recent prioritized
   */
  getContext(channelId, maxTokens = 2000) {
    // Load from database if not already loaded (sync check, async load)
    if (!this.loadedChannels.has(channelId)) {
      // For sync access, we can't await - but we trigger the load
      this.loadFromDatabase(channelId).catch(() => {});
    }
    
    const context = this.channelContexts.get(channelId) || [];
    return this.trimToTokenBudget(context, maxTokens);
  }

  /**
   * Get context for a channel (async version that ensures DB is loaded)
   * @param {string} channelId - Discord channel ID
   * @param {number} [maxTokens] - Maximum tokens to return (default: 2000)
   * @returns {Promise<StoredMessage[]>} Messages within budget
   */
  async getContextAsync(channelId, maxTokens = 2000) {
    // Ensure loaded from database
    if (!this.loadedChannels.has(channelId)) {
      await this.loadFromDatabase(channelId);
    }
    
    const context = this.channelContexts.get(channelId) || [];
    return this.trimToTokenBudget(context, maxTokens);
  }

  /**
   * Clear context for a channel
   * @param {string} channelId - Discord channel ID
   * @param {boolean} [clearDb=false] - Also clear from database
   */
  clear(channelId, clearDb = false) {
    this.channelContexts.delete(channelId);
    this.loadedChannels.delete(channelId);
    
    if (clearDb && this.persist && this.dbInitialized) {
      this.clearFromDatabase(channelId).catch(() => {});
    }
  }

  /**
   * Clear conversation history from database for a channel
   * @param {string} channelId - Discord channel ID
   */
  async clearFromDatabase(channelId) {
    try {
      const { getDb } = await import('../../../src/database/db.js');
      const db = getDb();
      
      db.prepare(`DELETE FROM ${CONVERSATION_TABLE} WHERE channel_id = ?`).run(channelId);
      logger.debug(`Cleared conversation history for channel ${channelId}`);
    } catch (error) {
      logger.error('Failed to clear conversation history:', error.message);
    }
  }

  /**
   * Clear all contexts
   * @param {boolean} [clearDb=false] - Also clear from database
   */
  clearAll(clearDb = false) {
    this.channelContexts.clear();
    this.loadedChannels.clear();
    
    if (clearDb && this.persist && this.dbInitialized) {
      this.clearAllFromDatabase().catch(() => {});
    }
  }

  /**
   * Clear all conversation history from database
   */
  async clearAllFromDatabase() {
    try {
      const { getDb } = await import('../../../src/database/db.js');
      const db = getDb();
      
      db.prepare(`DELETE FROM ${CONVERSATION_TABLE}`).run();
      logger.info('Cleared all conversation history from database');
    } catch (error) {
      logger.error('Failed to clear all conversation history:', error.message);
    }
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
