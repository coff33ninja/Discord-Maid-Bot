import { createLogger } from '../logging/logger.js';

const logger = createLogger('command-registry');

/**
 * Command Registry
 * Manages command registration and routing
 */
export class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.routers = new Map();
  }

  /**
   * Register a command
   * @param {string} name - Command name
   * @param {Function} handler - Command handler function
   * @param {Object} options - Command options
   */
  registerCommand(name, handler, options = {}) {
    this.commands.set(name, {
      handler,
      ...options
    });
    logger.info(`Registered command: ${name}`);
  }

  /**
   * Register a command router
   * Routes parent commands to subcommands
   * @param {string} parentCommand - Parent command name
   * @param {Function} router - Router function
   */
  registerRouter(parentCommand, router) {
    this.routers.set(parentCommand, router);
    logger.info(`Registered router for: ${parentCommand}`);
  }

  /**
   * Route a command interaction
   * @param {Object} interaction - Discord interaction
   * @returns {Object} Routed command info
   */
  routeCommand(interaction) {
    const { commandName } = interaction;

    // Check if there's a router for this command
    const router = this.routers.get(commandName);
    if (router) {
      return router(interaction);
    }

    // Check for plugin commands
    const subcommandGroup = interaction.options.getSubcommandGroup(false);
    if (subcommandGroup) {
      return {
        type: 'plugin',
        commandName,
        subcommandGroup
      };
    }

    // Direct command
    return {
      type: 'direct',
      commandName
    };
  }

  /**
   * Get command handler
   * @param {string} commandName - Command name
   * @returns {Function|null}
   */
  getHandler(commandName) {
    const command = this.commands.get(commandName);
    return command ? command.handler : null;
  }

  /**
   * Check if command exists
   * @param {string} commandName - Command name
   * @returns {boolean}
   */
  hasCommand(commandName) {
    return this.commands.has(commandName);
  }

  /**
   * Get all registered commands
   * @returns {Array}
   */
  getAllCommands() {
    return Array.from(this.commands.keys());
  }
}

// Export singleton instance
export const commandRegistry = new CommandRegistry();
