/**
 * Semantic Memory System
 * 
 * Persistent storage of summarized conversation fragments for long-term recall.
 * Uses SQLite for storage.
 * 
 * @module plugins/conversational-ai/memory/semantic
 */

/**
 * @typedef {Object} SemanticMemoryEntry
 * @property {number} id - Database ID
 * @property {string} channelId - Discord channel ID
 * @property {string} guildId - Discord guild ID
 * @property {string} summary - Conversation summary
 * @property {string[]} topics - Extracted topics
 * @property {string[]} participants - User IDs who participated
 * @property {number} messageCount - Number of messages summarized
 * @property {number} startTimestamp - First message timestamp
 * @property {number} endTimestamp - Last message timestamp
 * @property {Date} createdAt - When entry was created
 */

/**
 * @typedef {Object} SemanticConfig
 * @property {boolean} enabled - Whether semantic memory is enabled
 * @property {number} retentionDays - Days to retain memories
 * @property {number} searchLimit - Max search results
 */

const DEFAULT_CONFIG = {
  enabled: true,
  retentionDays: 90,
  searchLimit: 5
};

// SQL for creating the semantic_memory table
const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS semantic_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    topics TEXT,
    participants TEXT,
    message_count INTEGER,
    start_timestamp INTEGER,
    end_timestamp INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

const CREATE_INDEX_CHANNEL_SQL = `
  CREATE INDEX IF NOT EXISTS idx_semantic_channel ON semantic_memory(channel_id)
`;

const CREATE_INDEX_TIMESTAMP_SQL = `
  CREATE INDEX IF NOT EXISTS idx_semantic_timestamp ON semantic_memory(end_timestamp DESC)
`;

/**
 * Semantic Memory class
 * Stores and retrieves long-term conversation summaries
 */
export class SemanticMemory {
  /**
   * @param {Object} db - Better-sqlite3 database instance
   * @param {SemanticConfig} config - Configuration
   */
  constructor(db, config = {}) {
    this.db = db;
    this.enabled = config.enabled !== false;
    this.retentionDays = config.retentionDays || DEFAULT_CONFIG.retentionDays;
    this.searchLimit = config.searchLimit || DEFAULT_CONFIG.searchLimit;
    this.initialized = false;
  }

  /**
   * Initialize the database schema
   */
  initialize() {
    if (!this.db || this.initialized) return;
    
    try {
      this.db.exec(CREATE_TABLE_SQL);
      this.db.exec(CREATE_INDEX_CHANNEL_SQL);
      this.db.exec(CREATE_INDEX_TIMESTAMP_SQL);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize semantic memory schema:', error);
    }
  }

  /**
   * Check if semantic memory is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled && this.initialized;
  }

  /**
   * Store a conversation summary
   * @param {Object} data - Memory data
   * @param {string} data.channelId - Channel ID
   * @param {string} data.guildId - Guild ID
   * @param {string} data.summary - Conversation summary
   * @param {string[]} data.topics - Extracted topics
   * @param {string[]} data.participants - Participant user IDs
   * @param {number} data.messageCount - Number of messages
   * @param {number} data.startTimestamp - Start timestamp
   * @param {number} data.endTimestamp - End timestamp
   * @returns {number|null} Inserted row ID or null
   */
  store(data) {
    if (!this.isEnabled()) return null;
    
    try {
      const stmt = this.db.prepare(`
        INSERT INTO semantic_memory 
        (channel_id, guild_id, summary, topics, participants, message_count, start_timestamp, end_timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        data.channelId,
        data.guildId,
        data.summary,
        JSON.stringify(data.topics || []),
        JSON.stringify(data.participants || []),
        data.messageCount || 0,
        data.startTimestamp || Date.now(),
        data.endTimestamp || Date.now()
      );
      
      return result.lastInsertRowid;
    } catch (error) {
      console.error('Failed to store semantic memory:', error);
      return null;
    }
  }

  /**
   * Search semantic memory by query
   * @param {string} query - Search query
   * @param {string} channelId - Channel ID to search in
   * @param {number} [limit] - Max results
   * @returns {SemanticMemoryEntry[]} Matching entries
   */
  search(query, channelId, limit) {
    if (!this.isEnabled()) return [];
    
    const maxResults = limit || this.searchLimit;
    
    try {
      // Simple keyword search in summary and topics
      const stmt = this.db.prepare(`
        SELECT * FROM semantic_memory
        WHERE channel_id = ?
        AND (summary LIKE ? OR topics LIKE ?)
        ORDER BY end_timestamp DESC
        LIMIT ?
      `);
      
      const searchPattern = `%${query}%`;
      const rows = stmt.all(channelId, searchPattern, searchPattern, maxResults);
      
      return rows.map(row => this.parseRow(row));
    } catch (error) {
      console.error('Failed to search semantic memory:', error);
      return [];
    }
  }

  /**
   * Get recent memories for a channel
   * @param {string} channelId - Channel ID
   * @param {number} [limit] - Max results
   * @returns {SemanticMemoryEntry[]}
   */
  getRecent(channelId, limit) {
    if (!this.isEnabled()) return [];
    
    const maxResults = limit || this.searchLimit;
    
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM semantic_memory
        WHERE channel_id = ?
        ORDER BY end_timestamp DESC
        LIMIT ?
      `);
      
      const rows = stmt.all(channelId, maxResults);
      return rows.map(row => this.parseRow(row));
    } catch (error) {
      console.error('Failed to get recent memories:', error);
      return [];
    }
  }

  /**
   * Get memory by ID
   * @param {number} id - Memory ID
   * @returns {SemanticMemoryEntry|null}
   */
  getById(id) {
    if (!this.isEnabled()) return null;
    
    try {
      const stmt = this.db.prepare('SELECT * FROM semantic_memory WHERE id = ?');
      const row = stmt.get(id);
      return row ? this.parseRow(row) : null;
    } catch (error) {
      console.error('Failed to get memory by ID:', error);
      return null;
    }
  }

  /**
   * Delete a memory entry
   * @param {number} id - Memory ID
   * @returns {boolean} Whether deletion succeeded
   */
  delete(id) {
    if (!this.isEnabled()) return false;
    
    try {
      const stmt = this.db.prepare('DELETE FROM semantic_memory WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('Failed to delete memory:', error);
      return false;
    }
  }

  /**
   * Clean up old memories based on retention policy
   * @param {number} [retentionDays] - Days to retain (default: config value)
   * @returns {number} Number of deleted entries
   */
  cleanup(retentionDays) {
    if (!this.isEnabled()) return 0;
    
    const days = retentionDays || this.retentionDays;
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    try {
      const stmt = this.db.prepare(`
        DELETE FROM semantic_memory
        WHERE end_timestamp < ?
      `);
      
      const result = stmt.run(cutoffTime);
      return result.changes;
    } catch (error) {
      console.error('Failed to cleanup semantic memory:', error);
      return 0;
    }
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    if (!this.isEnabled()) {
      return { enabled: false, total: 0, channels: 0 };
    }
    
    try {
      const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM semantic_memory');
      const channelStmt = this.db.prepare('SELECT COUNT(DISTINCT channel_id) as count FROM semantic_memory');
      
      const total = totalStmt.get()?.count || 0;
      const channels = channelStmt.get()?.count || 0;
      
      return {
        enabled: true,
        total,
        channels,
        retentionDays: this.retentionDays
      };
    } catch (error) {
      console.error('Failed to get semantic memory stats:', error);
      return { enabled: true, total: 0, channels: 0, error: error.message };
    }
  }

  /**
   * Parse a database row into SemanticMemoryEntry
   * @param {Object} row - Database row
   * @returns {SemanticMemoryEntry}
   */
  parseRow(row) {
    return {
      id: row.id,
      channelId: row.channel_id,
      guildId: row.guild_id,
      summary: row.summary,
      topics: JSON.parse(row.topics || '[]'),
      participants: JSON.parse(row.participants || '[]'),
      messageCount: row.message_count,
      startTimestamp: row.start_timestamp,
      endTimestamp: row.end_timestamp,
      createdAt: new Date(row.created_at)
    };
  }

  /**
   * Calculate relevance score between query and memory
   * Simple keyword matching for now
   * @param {string} query - Search query
   * @param {SemanticMemoryEntry} memory - Memory entry
   * @returns {number} Score 0-1
   */
  calculateRelevance(query, memory) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const summaryWords = memory.summary.toLowerCase().split(/\s+/);
    const topicWords = memory.topics.map(t => t.toLowerCase());
    
    let matches = 0;
    for (const word of queryWords) {
      if (summaryWords.includes(word) || topicWords.includes(word)) {
        matches++;
      }
    }
    
    return queryWords.length > 0 ? matches / queryWords.length : 0;
  }

  /**
   * Search with relevance scoring
   * @param {string} query - Search query
   * @param {string} channelId - Channel ID
   * @param {number} [limit] - Max results
   * @returns {Array<{memory: SemanticMemoryEntry, score: number}>}
   */
  searchWithScores(query, channelId, limit) {
    const memories = this.search(query, channelId, (limit || this.searchLimit) * 2);
    
    const scored = memories.map(memory => ({
      memory,
      score: this.calculateRelevance(query, memory)
    }));
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    return scored.slice(0, limit || this.searchLimit);
  }
}

export default SemanticMemory;
