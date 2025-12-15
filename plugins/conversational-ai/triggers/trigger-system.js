/**
 * Passive Trigger System
 * 
 * Detects patterns in messages and offers helpful interventions.
 * 
 * @module plugins/conversational-ai/triggers/trigger-system
 */

/**
 * @typedef {Object} PassiveTrigger
 * @property {string} name - Trigger name
 * @property {string} description - What this trigger does
 * @property {RegExp|Function} pattern - Detection pattern or function
 * @property {Function} handler - Handler function returning suggestion
 * @property {boolean} enabled - Whether trigger is active
 * @property {number} priority - Higher = checked first
 */

/**
 * @typedef {Object} TriggerResult
 * @property {string} name - Trigger name
 * @property {string} suggestion - Suggested response
 * @property {boolean} isQuestion - Whether suggestion is a question
 */

// Built-in trigger patterns
const BUILT_IN_TRIGGERS = {
  'code-block': {
    name: 'code-block',
    description: 'Detects code blocks and offers analysis',
    pattern: /```[\s\S]{10,}```/,
    priority: 80,
    handler: (message) => ({
      suggestion: "I noticed you shared some code. Would you like me to review it or explain what it does?",
      isQuestion: true
    })
  },
  
  'error-log': {
    name: 'error-log',
    description: 'Detects error messages and offers troubleshooting',
    pattern: /\b(error|exception|failed|traceback|stack\s*trace|undefined is not|cannot read|null pointer|segmentation fault)\b/i,
    priority: 90,
    handler: (message) => ({
      suggestion: "I see an error message. Would you like help troubleshooting?",
      isQuestion: true
    })
  },
  
  'long-message': {
    name: 'long-message',
    description: 'Detects long messages and offers summarization',
    pattern: (content) => content.length > 1000,
    priority: 30,
    handler: (message) => ({
      suggestion: "That's quite a lot of text! Would you like me to summarize it?",
      isQuestion: true
    })
  },
  
  'json-data': {
    name: 'json-data',
    description: 'Detects JSON data and offers formatting/analysis',
    pattern: /\{[\s\S]*"[\w]+"[\s\S]*:[\s\S]*\}/,
    priority: 70,
    handler: (message) => ({
      suggestion: "I see some JSON data. Would you like me to format or analyze it?",
      isQuestion: true
    })
  },
  
  'url-shared': {
    name: 'url-shared',
    description: 'Detects URLs and offers to fetch/summarize',
    pattern: /https?:\/\/[^\s]+/,
    priority: 40,
    handler: (message) => ({
      suggestion: "I see you shared a link. Would you like me to summarize what's there?",
      isQuestion: true
    })
  },
  
  'question-pattern': {
    name: 'question-pattern',
    description: 'Detects questions that might need answering',
    pattern: /\b(how|what|why|when|where|who|can|could|would|should|is|are|do|does)\b.*\?$/i,
    priority: 50,
    handler: (message) => ({
      suggestion: null, // Don't suggest, just flag for natural response
      isQuestion: false
    })
  }
};

/**
 * Trigger System class
 * Manages passive triggers for automatic message detection
 */
export class TriggerSystem {
  /**
   * @param {Object} config - Configuration
   * @param {boolean} config.enabled - Whether triggers are enabled
   */
  constructor(config = {}) {
    this.enabled = config.enabled !== false;
    
    /** @type {Map<string, PassiveTrigger>} */
    this.triggers = new Map();
    
    // Register built-in triggers
    for (const [name, trigger] of Object.entries(BUILT_IN_TRIGGERS)) {
      this.triggers.set(name, { ...trigger, enabled: true });
    }
  }

  /**
   * Enable or disable the entire trigger system
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Check if system is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Register a custom trigger
   * @param {PassiveTrigger} trigger - Trigger configuration
   */
  register(trigger) {
    if (!trigger.name || !trigger.pattern) {
      throw new Error('Trigger must have name and pattern');
    }
    
    this.triggers.set(trigger.name, {
      ...trigger,
      enabled: trigger.enabled !== false,
      priority: trigger.priority || 50
    });
  }

  /**
   * Unregister a trigger
   * @param {string} name - Trigger name
   * @returns {boolean} Whether trigger was removed
   */
  unregister(name) {
    return this.triggers.delete(name);
  }

  /**
   * Enable a specific trigger
   * @param {string} name - Trigger name
   */
  enableTrigger(name) {
    const trigger = this.triggers.get(name);
    if (trigger) {
      trigger.enabled = true;
    }
  }

  /**
   * Disable a specific trigger
   * @param {string} name - Trigger name
   */
  disableTrigger(name) {
    const trigger = this.triggers.get(name);
    if (trigger) {
      trigger.enabled = false;
    }
  }

  /**
   * Check if a trigger is enabled
   * @param {string} name - Trigger name
   * @returns {boolean}
   */
  isTriggerEnabled(name) {
    const trigger = this.triggers.get(name);
    return trigger?.enabled || false;
  }

  /**
   * Detect triggers in message content
   * @param {string} content - Message content
   * @returns {string[]} Array of triggered pattern names
   */
  detect(content) {
    if (!this.enabled || !content) return [];
    
    const triggered = [];
    
    // Sort triggers by priority (highest first)
    const sortedTriggers = Array.from(this.triggers.values())
      .filter(t => t.enabled)
      .sort((a, b) => b.priority - a.priority);
    
    for (const trigger of sortedTriggers) {
      if (this.matchesPattern(content, trigger.pattern)) {
        triggered.push(trigger.name);
      }
    }
    
    return triggered;
  }

  /**
   * Check if content matches a pattern
   * @param {string} content - Content to check
   * @param {RegExp|Function} pattern - Pattern to match
   * @returns {boolean}
   */
  matchesPattern(content, pattern) {
    if (typeof pattern === 'function') {
      return pattern(content);
    }
    if (pattern instanceof RegExp) {
      return pattern.test(content);
    }
    return false;
  }

  /**
   * Get trigger results with suggestions
   * @param {string} content - Message content
   * @returns {TriggerResult[]} Array of trigger results
   */
  getResults(content) {
    if (!this.enabled || !content) return [];
    
    const triggered = this.detect(content);
    const results = [];
    
    for (const name of triggered) {
      const trigger = this.triggers.get(name);
      if (trigger && trigger.handler) {
        const result = trigger.handler({ content });
        if (result && result.suggestion) {
          results.push({
            name,
            suggestion: result.suggestion,
            isQuestion: result.isQuestion || false
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Get the highest priority trigger result
   * @param {string} content - Message content
   * @returns {TriggerResult|null}
   */
  getTopResult(content) {
    const results = this.getResults(content);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get all registered triggers
   * @returns {PassiveTrigger[]}
   */
  getAllTriggers() {
    return Array.from(this.triggers.values());
  }

  /**
   * Get trigger by name
   * @param {string} name - Trigger name
   * @returns {PassiveTrigger|null}
   */
  getTrigger(name) {
    return this.triggers.get(name) || null;
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    const all = this.getAllTriggers();
    return {
      total: all.length,
      enabled: all.filter(t => t.enabled).length,
      disabled: all.filter(t => !t.enabled).length,
      systemEnabled: this.enabled
    };
  }
}

export default TriggerSystem;
