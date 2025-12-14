import { createLogger } from '../logging/logger.js';

/**
 * Event Router
 * Routes Discord events to appropriate handlers (core or plugins)
 */
export class EventRouter {
  constructor(bot) {
    this.bot = bot;
    this.logger = createLogger('event-router');
  }

  /**
   * Route interaction events (slash commands, autocomplete, etc.)
   */
  async routeInteraction(interaction) {
    try {
      // Handle autocomplete
      if (interaction.isAutocomplete()) {
        await this.handleAutocomplete(interaction);
        return;
      }

      // Handle chat input commands
      if (interaction.isChatInputCommand()) {
        await this.handleCommand(interaction);
        return;
      }

      // Other interaction types can be added here
    } catch (error) {
      this.logger.error('Error routing interaction:', error);
      await this.handleInteractionError(interaction, error);
    }
  }

  /**
   * Route message events
   */
  async routeMessage(message) {
    try {
      // Ignore bot messages
      if (message.author.bot) return;

      // Handle legacy text commands (backward compatibility)
      if (message.content.startsWith('!')) {
        await message.reply('✨ I now use slash commands! Type `/help` to see all available commands~');
        return;
      }

      // Future: Route to conversational AI plugin
    } catch (error) {
      this.logger.error('Error routing message:', error);
    }
  }

  /**
   * Handle autocomplete interactions
   * Routes to command bridge
   */
  async handleAutocomplete(interaction) {
    const { handleAutocompleteInteraction } = await import('./command-bridge.js');
    await handleAutocompleteInteraction(interaction);
  }

  /**
   * Handle command interactions
   * Routes to plugins or bridge handler
   */
  async handleCommand(interaction) {
    const { commandName } = interaction;
    const subcommand = interaction.options.getSubcommand(false);
    
    // Check if this is a standalone plugin command
    const pluginHandler = await this.getPluginCommandHandler(commandName);
    
    if (pluginHandler) {
      // Route to plugin - pass commandName and subcommand for standalone commands
      try {
        await pluginHandler.handleCommand(interaction, commandName, subcommand);
        return;
      } catch (error) {
        this.logger.error(`Plugin command error (${commandName}):`, error);
        await this.handleInteractionError(interaction, error);
        return;
      }
    }
    
    // Otherwise, route to command bridge
    const { handleCommandInteraction } = await import('./command-bridge.js');
    await handleCommandInteraction(interaction);
  }

  /**
   * Get plugin command handler for a command name
   */
  async getPluginCommandHandler(commandName) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const { pathToFileURL } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const pluginsDir = path.join(__dirname, '../../plugins');
      
      const files = await fs.readdir(pluginsDir);
      
      for (const file of files) {
        const filePath = path.join(pluginsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          const commandsPath = path.join(filePath, 'commands.js');
          try {
            await fs.access(commandsPath);
            
            const commandsUrl = pathToFileURL(commandsPath).href;
            const commandsModule = await import(`${commandsUrl}?t=${Date.now()}`);
            
            // Check if this plugin has standalone commands (parentCommand = null)
            if (commandsModule.parentCommand === null) {
              let hasCommand = false;
              
              // Check if commands array exists and contains this command
              if (commandsModule.commands) {
                hasCommand = commandsModule.commands.some(cmd => cmd.name === commandName);
              }
              // Or check if commandGroup is a single command with matching name
              else if (commandsModule.commandGroup && commandsModule.commandGroup.name === commandName) {
                hasCommand = true;
              }
              
              if (hasCommand) {
                // Get the plugin instance
                const { getPlugin } = await import('./plugin-system.js');
                const plugin = getPlugin(file);
                
                return {
                  plugin,
                  handleCommand: commandsModule.handleCommand,
                  handleAutocomplete: commandsModule.handleAutocomplete
                };
              }
            }
          } catch (err) {
            // Skip
          }
        }
      }
    } catch (error) {
      this.logger.error('Error getting plugin command handler:', error);
    }
    
    return null;
  }

  /**
   * Handle interaction errors
   */
  async handleInteractionError(interaction, error) {
    const errorMessage = `❌ An error occurred: ${error.message}\n\nI apologize for the inconvenience, Master!`;

    try {
      if (interaction.deferred) {
        await interaction.editReply(errorMessage);
      } else if (interaction.replied) {
        // Already replied, can't do anything
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      this.logger.error('Failed to send error message:', replyError);
    }
  }
}
