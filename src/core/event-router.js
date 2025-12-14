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
   * Routes to the old autocomplete handler temporarily
   */
  async handleAutocomplete(interaction) {
    // Import the old handler temporarily
    // This will be moved to plugins in later phases
    const { handleAutocompleteInteraction } = await import('../../index-handlers.js');
    await handleAutocompleteInteraction(interaction);
  }

  /**
   * Handle command interactions
   * Routes to the old command handler temporarily
   */
  async handleCommand(interaction) {
    // Import the old handler temporarily
    // This will be moved to plugins in later phases
    const { handleCommandInteraction } = await import('../../index-handlers.js');
    await handleCommandInteraction(interaction);
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
