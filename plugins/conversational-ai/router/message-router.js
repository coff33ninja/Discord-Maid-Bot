/**
 * Message Router
 * 
 * Classifies incoming messages and routes them to appropriate handlers.
 * 
 * @module plugins/conversational-ai/router/message-router
 */

/**
 * @typedef {Object} MessageClassification
 * @property {'slash'|'prefix'|'mention'|'natural'|'passive'} type - Classification type
 * @property {number} priority - Priority (higher = more important)
 * @property {'command'|'query'|'quick'} [prefixType] - Type of prefix command
 * @property {string[]} [triggers] - Matched passive triggers
 * @property {string} [command] - Extracted command (for prefix)
 * @property {string[]} [args] - Command arguments
 */

/**
 * @typedef {Object} RouterConfig
 * @property {boolean} prefixEnabled - Enable prefix commands (default: true)
 * @property {boolean} passiveEnabled - Enable passive triggers (default: true)
 * @property {boolean} mentionRequired - Require mention in guild channels (default: false)
 * @property {string} botId - Bot's user ID for mention detection
 */

const PREFIX_PATTERNS = {
  '!': 'command',
  '?': 'query',
  '.': 'quick'
};

const PASSIVE_TRIGGERS = {
  'code-block': /```[\s\S]+```/,
  'error-log': /\b(error|exception|failed|traceback|stack\s*trace)\b/i,
  'long-message': null // Handled by length check
};

const LONG_MESSAGE_THRESHOLD = 1000;

/**
 * Message Router class
 * Classifies and routes messages to appropriate handlers
 */
export class MessageRouter {
  /**
   * @param {RouterConfig} config - Configuration options
   */
  constructor(config = {}) {
    this.prefixEnabled = config.prefixEnabled !== false;
    this.passiveEnabled = config.passiveEnabled !== false;
    this.mentionRequired = config.mentionRequired || false;
    this.botId = config.botId || null;
  }

  /**
   * Set bot ID for mention detection
   * @param {string} botId - Bot's user ID
   */
  setBotId(botId) {
    this.botId = botId;
  }

  /**
   * Classify a message
   * @param {Object} message - Discord message object
   * @param {string} message.content - Message content
   * @param {Object} message.author - Message author
   * @param {boolean} message.author.bot - Whether author is a bot
   * @param {Object} [message.channel] - Channel object
   * @param {string} [message.channel.type] - Channel type (DM, GUILD_TEXT, etc.)
   * @param {Object} [message.mentions] - Mentions in message
   * @returns {MessageClassification} Classification result
   */
  classify(message) {
    // Ignore bot messages
    if (message.author?.bot) {
      return { type: 'ignore', priority: 0 };
    }

    const content = message.content || '';
    const isDM = message.channel?.type === 1 || message.channel?.type === 'DM';
    const hasMention = this.hasBotMention(message);

    // Check for prefix command first (highest priority for explicit commands)
    if (this.prefixEnabled) {
      const prefixResult = this.detectPrefix(content);
      if (prefixResult) {
        return {
          type: 'prefix',
          priority: 90,
          prefixType: prefixResult.type,
          command: prefixResult.command,
          args: prefixResult.args
        };
      }
    }

    // Check for bot mention (high priority)
    if (hasMention) {
      return {
        type: 'mention',
        priority: 80
      };
    }

    // Check for passive triggers
    if (this.passiveEnabled) {
      const triggers = this.detectPassiveTriggers(content);
      if (triggers.length > 0) {
        return {
          type: 'passive',
          priority: 30,
          triggers
        };
      }
    }

    // Natural language in DM or when mention not required
    if (isDM || !this.mentionRequired) {
      return {
        type: 'natural',
        priority: 50
      };
    }

    // No classification - ignore
    return { type: 'ignore', priority: 0 };
  }

  /**
   * Check if message contains bot mention
   * @param {Object} message - Discord message
   * @returns {boolean} Whether bot is mentioned
   */
  hasBotMention(message) {
    if (!this.botId) return false;
    
    // Check mentions collection
    if (message.mentions?.users?.has?.(this.botId)) {
      return true;
    }
    
    // Check content for mention pattern
    const mentionPattern = new RegExp(`<@!?${this.botId}>`);
    return mentionPattern.test(message.content || '');
  }

  /**
   * Detect prefix command
   * @param {string} content - Message content
   * @returns {Object|null} Prefix detection result or null
   */
  detectPrefix(content) {
    if (!content || content.length < 2) return null;
    
    const firstChar = content[0];
    const prefixType = PREFIX_PATTERNS[firstChar];
    
    if (!prefixType) return null;
    
    const rest = content.slice(1).trim();
    
    // Must have actual content after prefix
    if (!rest || rest.length === 0) return null;
    
    const parts = rest.split(/\s+/).filter(p => p.length > 0);
    const command = parts[0]?.toLowerCase() || '';
    const args = parts.slice(1);
    
    // Command must be non-empty
    if (!command) return null;
    
    return {
      type: prefixType,
      command,
      args
    };
  }

  /**
   * Detect passive triggers in content
   * @param {string} content - Message content
   * @returns {string[]} Array of triggered pattern names
   */
  detectPassiveTriggers(content) {
    if (!content) return [];
    
    const triggers = [];
    
    // Check regex patterns
    for (const [name, pattern] of Object.entries(PASSIVE_TRIGGERS)) {
      if (pattern && pattern.test(content)) {
        triggers.push(name);
      }
    }
    
    // Check long message
    if (content.length > LONG_MESSAGE_THRESHOLD) {
      triggers.push('long-message');
    }
    
    return triggers;
  }

  /**
   * Check if classification should respond
   * @param {MessageClassification} classification - Classification result
   * @returns {boolean} Whether to respond
   */
  shouldRespond(classification) {
    return classification.type !== 'ignore' && classification.priority > 0;
  }
}

export default MessageRouter;
