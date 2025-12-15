/**
 * Prefix Handler
 * 
 * Handles prefix commands (!, ?, .) for quick interactions.
 * 
 * @module plugins/conversational-ai/router/prefix-handler
 */

/**
 * @typedef {Object} PrefixCommand
 * @property {string} prefix - The prefix character
 * @property {'command'|'query'|'quick'} type - Type of prefix command
 * @property {string} command - The command name
 * @property {string[]} args - Command arguments
 */

/**
 * @typedef {Object} CommandHandler
 * @property {string} name - Command name
 * @property {string} description - Command description
 * @property {string[]} aliases - Alternative names
 * @property {Function} execute - Handler function
 */

const PREFIX_TYPES = {
  '!': 'command',
  '?': 'query',
  '.': 'quick'
};

// Built-in commands registry
const BUILT_IN_COMMANDS = {
  // ! commands (actions)
  help: { type: 'command', description: 'Show help', aliases: ['h'] },
  status: { type: 'command', description: 'Show bot status', aliases: ['s'] },
  ping: { type: 'command', description: 'Check bot latency', aliases: ['p'] },
  clear: { type: 'command', description: 'Clear memory', aliases: ['c'] },
  
  // ? queries (information)
  weather: { type: 'query', description: 'Get weather info', aliases: ['w'] },
  devices: { type: 'query', description: 'List devices', aliases: ['d'] },
  time: { type: 'query', description: 'Get current time', aliases: ['t'] },
  
  // . quick actions
  scan: { type: 'quick', description: 'Quick network scan', aliases: [] },
  wake: { type: 'quick', description: 'Wake device', aliases: ['wol'] },
  speed: { type: 'quick', description: 'Speed test', aliases: ['st'] }
};

/**
 * Prefix Handler class
 * Parses and executes prefix commands
 */
export class PrefixHandler {
  constructor() {
    /** @type {Map<string, CommandHandler>} */
    this.commands = new Map();
    
    // Register built-in commands
    for (const [name, config] of Object.entries(BUILT_IN_COMMANDS)) {
      this.commands.set(name, { name, ...config, execute: null });
      
      // Register aliases
      for (const alias of config.aliases || []) {
        this.commands.set(alias, { name, ...config, execute: null, isAlias: true });
      }
    }
  }

  /**
   * Parse a message into a prefix command
   * @param {string} content - Message content
   * @returns {PrefixCommand|null} Parsed command or null
   */
  parse(content) {
    if (!content || content.length < 2) return null;
    
    const prefix = content[0];
    const type = PREFIX_TYPES[prefix];
    
    if (!type) return null;
    
    const rest = content.slice(1).trim();
    if (!rest) return null;
    
    const parts = rest.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    return {
      prefix,
      type,
      command,
      args
    };
  }

  /**
   * Check if a command exists
   * @param {string} command - Command name
   * @returns {boolean}
   */
  hasCommand(command) {
    return this.commands.has(command.toLowerCase());
  }

  /**
   * Get command info
   * @param {string} command - Command name
   * @returns {CommandHandler|null}
   */
  getCommand(command) {
    return this.commands.get(command.toLowerCase()) || null;
  }

  /**
   * Register a custom command handler
   * @param {string} name - Command name
   * @param {Object} config - Command configuration
   * @param {Function} handler - Handler function
   */
  registerCommand(name, config, handler) {
    this.commands.set(name.toLowerCase(), {
      name,
      ...config,
      execute: handler
    });
    
    // Register aliases
    for (const alias of config.aliases || []) {
      this.commands.set(alias.toLowerCase(), {
        name,
        ...config,
        execute: handler,
        isAlias: true
      });
    }
  }

  /**
   * Execute a prefix command
   * @param {PrefixCommand} parsed - Parsed command
   * @param {Object} context - Execution context (message, channel, etc.)
   * @returns {Promise<Object>} Execution result
   */
  async execute(parsed, context) {
    const commandInfo = this.getCommand(parsed.command);
    
    if (!commandInfo) {
      return {
        success: false,
        error: 'unknown_command',
        suggestions: this.getSuggestions(parsed.command)
      };
    }
    
    // Check if command type matches prefix type
    if (commandInfo.type !== parsed.type) {
      const correctPrefix = Object.entries(PREFIX_TYPES)
        .find(([, t]) => t === commandInfo.type)?.[0] || '!';
      
      return {
        success: false,
        error: 'wrong_prefix',
        message: `Use \`${correctPrefix}${parsed.command}\` instead`,
        suggestions: [`${correctPrefix}${parsed.command}`]
      };
    }
    
    // Execute if handler exists
    if (commandInfo.execute) {
      try {
        const result = await commandInfo.execute(parsed.args, context);
        return { success: true, result };
      } catch (error) {
        return {
          success: false,
          error: 'execution_error',
          message: error.message
        };
      }
    }
    
    // No handler - return info about the command
    return {
      success: true,
      result: {
        command: commandInfo.name,
        description: commandInfo.description,
        type: commandInfo.type,
        noHandler: true
      }
    };
  }

  /**
   * Get suggestions for an invalid command
   * @param {string} invalidCommand - The invalid command
   * @returns {string[]} Suggested commands
   */
  getSuggestions(invalidCommand) {
    const suggestions = [];
    const input = invalidCommand.toLowerCase();
    
    for (const [name, config] of this.commands.entries()) {
      // Skip aliases in suggestions
      if (config.isAlias) continue;
      
      // Check for partial match
      if (name.startsWith(input) || input.startsWith(name)) {
        suggestions.push(name);
      }
      
      // Check for similar commands (Levenshtein distance <= 2)
      if (this.levenshteinDistance(input, name) <= 2) {
        if (!suggestions.includes(name)) {
          suggestions.push(name);
        }
      }
    }
    
    return suggestions.slice(0, 5);
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} Distance
   */
  levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }

  /**
   * Get all commands of a specific type
   * @param {'command'|'query'|'quick'} type - Command type
   * @returns {CommandHandler[]}
   */
  getCommandsByType(type) {
    const commands = [];
    for (const [name, config] of this.commands.entries()) {
      if (config.type === type && !config.isAlias) {
        commands.push({ name, ...config });
      }
    }
    return commands;
  }

  /**
   * Get help text for all commands
   * @returns {string}
   */
  getHelpText() {
    const lines = ['**Prefix Commands**\n'];
    
    const types = [
      { prefix: '!', type: 'command', label: 'Commands (!)' },
      { prefix: '?', type: 'query', label: 'Queries (?)' },
      { prefix: '.', type: 'quick', label: 'Quick Actions (.)' }
    ];
    
    for (const { prefix, type, label } of types) {
      lines.push(`**${label}**`);
      const commands = this.getCommandsByType(type);
      for (const cmd of commands) {
        const aliases = cmd.aliases?.length ? ` (${cmd.aliases.join(', ')})` : '';
        lines.push(`  \`${prefix}${cmd.name}\`${aliases} - ${cmd.description}`);
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }
}

export default PrefixHandler;
