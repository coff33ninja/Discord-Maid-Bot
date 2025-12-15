/**
 * Context Reconstructor
 * 
 * Assembles relevant context from multiple memory sources for AI prompts.
 * Manages token budgets and prioritizes context sources.
 * 
 * @module plugins/conversational-ai/context/context-reconstructor
 */

/**
 * @typedef {Object} ReconstructedContext
 * @property {Array} shortTerm - Short-term memory messages
 * @property {Array} semantic - Semantic memory entries
 * @property {Object|null} userPrefs - User preferences
 * @property {number} totalTokens - Total token count
 */

/**
 * @typedef {Object} ContextConfig
 * @property {number} maxTokens - Maximum total tokens (default: 6000)
 * @property {number} shortTermBudget - Tokens for short-term (default: 2000)
 * @property {number} semanticLimit - Max semantic memories (default: 3)
 */

const DEFAULT_CONFIG = {
  maxTokens: 6000,
  shortTermBudget: 2000,
  semanticLimit: 3
};

// Patterns that indicate need for historical context
const HISTORY_TRIGGERS = [
  /\bremember\b/i,
  /\bearlier\b/i,
  /\bbefore\b/i,
  /\blast\s+(week|month|time|conversation)\b/i,
  /\bthat\s+(project|discussion|conversation|thing)\b/i,
  /\bwe\s+(talked|discussed|decided|mentioned)\b/i,
  /\byou\s+(said|mentioned|told)\b/i,
  /\bwhat\s+did\s+(we|you|i)\b/i,
  /\bwhen\s+did\s+(we|you|i)\b/i,
  /\bpreviously\b/i,
  /\bago\b/i
];

/**
 * Context Reconstructor class
 * Assembles context from multiple sources with token budgeting
 */
export class ContextReconstructor {
  /**
   * @param {Object} shortTermMemory - ShortTermMemory instance
   * @param {Object} semanticMemory - SemanticMemory instance (optional)
   * @param {ContextConfig} config - Configuration
   */
  constructor(shortTermMemory, semanticMemory = null, config = {}) {
    this.shortTermMemory = shortTermMemory;
    this.semanticMemory = semanticMemory;
    this.maxTokens = config.maxTokens || DEFAULT_CONFIG.maxTokens;
    this.shortTermBudget = config.shortTermBudget || DEFAULT_CONFIG.shortTermBudget;
    this.semanticLimit = config.semanticLimit || DEFAULT_CONFIG.semanticLimit;
  }

  /**
   * Estimate tokens for text
   * @param {string} text - Text to estimate
   * @returns {number}
   */
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate tokens for an array of objects
   * @param {Array} items - Items to estimate
   * @returns {number}
   */
  estimateArrayTokens(items) {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((sum, item) => {
      if (typeof item === 'string') return sum + this.estimateTokens(item);
      if (item.content) return sum + this.estimateTokens(item.content);
      if (item.summary) return sum + this.estimateTokens(item.summary);
      return sum + this.estimateTokens(JSON.stringify(item));
    }, 0);
  }

  /**
   * Detect if message content needs historical context
   * @param {string} content - Message content
   * @returns {boolean}
   */
  detectHistoryNeed(content) {
    if (!content) return false;
    return HISTORY_TRIGGERS.some(pattern => pattern.test(content));
  }

  /**
   * Reconstruct context for a message
   * @param {Object} options - Reconstruction options
   * @param {string} options.channelId - Channel ID
   * @param {string} options.userId - User ID
   * @param {string} options.content - Message content
   * @param {Object} [options.userPrefs] - User preferences
   * @returns {ReconstructedContext}
   */
  reconstruct({ channelId, userId, content, userPrefs = null }) {
    const context = {
      shortTerm: [],
      semantic: [],
      userPrefs: null,
      totalTokens: 0
    };

    // 1. Always include short-term context (highest priority)
    if (this.shortTermMemory) {
      context.shortTerm = this.shortTermMemory.getContext(channelId, this.shortTermBudget);
      context.totalTokens += this.estimateArrayTokens(context.shortTerm);
    }

    // 2. Check if semantic memory is needed
    const needsHistory = this.detectHistoryNeed(content);
    
    if (needsHistory && this.semanticMemory && this.semanticMemory.isEnabled()) {
      // Search semantic memory for relevant context
      const semanticResults = this.semanticMemory.searchWithScores(
        content,
        channelId,
        this.semanticLimit
      );
      
      context.semantic = semanticResults.map(r => r.memory);
      context.totalTokens += this.estimateArrayTokens(context.semantic);
    }

    // 3. Include user preferences if available
    if (userPrefs) {
      context.userPrefs = userPrefs;
      context.totalTokens += this.estimateTokens(JSON.stringify(userPrefs));
    }

    // 4. Compress if over budget
    if (context.totalTokens > this.maxTokens) {
      return this.compress(context, this.maxTokens);
    }

    return context;
  }

  /**
   * Compress context to fit within token budget
   * Priority: short-term > semantic > user preferences
   * @param {ReconstructedContext} context - Context to compress
   * @param {number} maxTokens - Token budget
   * @returns {ReconstructedContext}
   */
  compress(context, maxTokens) {
    const compressed = { ...context };
    let remaining = maxTokens;

    // 1. Keep short-term (highest priority) - trim if needed
    const shortTermTokens = this.estimateArrayTokens(compressed.shortTerm);
    if (shortTermTokens > remaining * 0.6) {
      // Trim short-term to 60% of budget
      compressed.shortTerm = this.trimToTokens(compressed.shortTerm, Math.floor(remaining * 0.6));
    }
    remaining -= this.estimateArrayTokens(compressed.shortTerm);

    // 2. Trim semantic memories
    if (remaining > 0 && compressed.semantic.length > 0) {
      const semanticTokens = this.estimateArrayTokens(compressed.semantic);
      if (semanticTokens > remaining * 0.8) {
        // Reduce number of semantic memories
        while (compressed.semantic.length > 0 && 
               this.estimateArrayTokens(compressed.semantic) > remaining * 0.8) {
          compressed.semantic.pop();
        }
      }
      remaining -= this.estimateArrayTokens(compressed.semantic);
    } else {
      compressed.semantic = [];
    }

    // 3. Remove user prefs if no room
    if (remaining < 100) {
      compressed.userPrefs = null;
    }

    // Recalculate total
    compressed.totalTokens = 
      this.estimateArrayTokens(compressed.shortTerm) +
      this.estimateArrayTokens(compressed.semantic) +
      (compressed.userPrefs ? this.estimateTokens(JSON.stringify(compressed.userPrefs)) : 0);

    return compressed;
  }

  /**
   * Trim array to fit within token budget
   * Keeps most recent items
   * @param {Array} items - Items to trim
   * @param {number} maxTokens - Token budget
   * @returns {Array}
   */
  trimToTokens(items, maxTokens) {
    if (!items || items.length === 0) return [];
    
    const result = [];
    let tokens = 0;
    
    // Work backwards (most recent first)
    for (let i = items.length - 1; i >= 0; i--) {
      const itemTokens = this.estimateTokens(
        items[i].content || items[i].summary || JSON.stringify(items[i])
      );
      
      if (tokens + itemTokens > maxTokens) break;
      
      tokens += itemTokens;
      result.unshift(items[i]);
    }
    
    return result;
  }

  /**
   * Format context for AI prompt
   * @param {ReconstructedContext} context - Reconstructed context
   * @returns {string}
   */
  formatForPrompt(context) {
    const parts = [];

    // Format short-term memory
    if (context.shortTerm.length > 0) {
      parts.push('**Recent Conversation:**');
      for (const msg of context.shortTerm) {
        const role = msg.isBot ? 'Assistant' : msg.username || 'User';
        parts.push(`${role}: ${msg.content}`);
      }
      parts.push('');
    }

    // Format semantic memories
    if (context.semantic.length > 0) {
      parts.push('**Relevant Past Conversations:**');
      for (const mem of context.semantic) {
        const date = new Date(mem.endTimestamp).toLocaleDateString();
        parts.push(`[${date}] ${mem.summary}`);
      }
      parts.push('');
    }

    // Format user preferences
    if (context.userPrefs) {
      parts.push('**User Preferences:**');
      if (context.userPrefs.personality) {
        parts.push(`Preferred personality: ${context.userPrefs.personality}`);
      }
      if (context.userPrefs.timezone) {
        parts.push(`Timezone: ${context.userPrefs.timezone}`);
      }
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Get statistics about context reconstruction
   * @param {ReconstructedContext} context - Context to analyze
   * @returns {Object}
   */
  getStats(context) {
    return {
      shortTermMessages: context.shortTerm.length,
      shortTermTokens: this.estimateArrayTokens(context.shortTerm),
      semanticMemories: context.semantic.length,
      semanticTokens: this.estimateArrayTokens(context.semantic),
      hasUserPrefs: !!context.userPrefs,
      totalTokens: context.totalTokens,
      budgetUsed: Math.round((context.totalTokens / this.maxTokens) * 100) + '%'
    };
  }
}

export default ContextReconstructor;
