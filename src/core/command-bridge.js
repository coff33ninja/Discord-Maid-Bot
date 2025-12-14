/**
 * Command Bridge
 * 
 * Bridges between the old monolithic command handlers and the new plugin system.
 * This file will be gradually phased out as commands move to plugins.
 */

import { createLogger } from '../logging/logger.js';
import { deviceOps } from '../database/db.js';

const logger = createLogger('command-bridge');

/**
 * Handle autocomplete interactions
 * Routes autocomplete to appropriate handlers
 */
export async function handleAutocompleteInteraction(interaction) {
  const { commandName } = interaction;
  const focusedOption = interaction.options.getFocused(true);
  const focusedValue = focusedOption.value.toLowerCase();
  const subcommand = interaction.options.getSubcommand(false);
  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  
  try {
    // Device autocomplete (used by multiple commands)
    if (focusedOption.name === 'device' || focusedOption.name.startsWith('device')) {
      const devices = deviceOps.getAll();
      
      // Score-based filtering and sorting
      const scored = devices.map(d => {
        const hostname = (d.hostname || '').toLowerCase();
        const ip = d.ip.toLowerCase();
        const name = (d.name || '').toLowerCase();
        
        let score = 0;
        if (!focusedValue) {
          // No input - prioritize online devices and those with names
          score = (d.online ? 100 : 0) + (d.name || d.hostname ? 50 : 0);
        } else {
          // Exact match gets highest score
          if (name === focusedValue || hostname === focusedValue) score = 1000;
          else if (name.startsWith(focusedValue) || hostname.startsWith(focusedValue)) score = 500;
          else if (name.includes(focusedValue) || hostname.includes(focusedValue)) score = 200;
          else if (ip.startsWith(focusedValue)) score = 150;
          else if (ip.includes(focusedValue)) score = 50;
        }
        
        return { device: d, score };
      });
      
      // Sort by score and take top 25
      const filtered = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 25);
      
      const choices = filtered.map(s => {
        const d = s.device;
        const emoji = d.emoji || '';
        const displayName = d.name || d.hostname || d.ip;
        const status = d.online ? '🟢' : '🔴';
        
        return {
          name: `${emoji} ${displayName} ${status} (${d.ip})`.substring(0, 100),
          value: d.mac
        };
      });
      
      await interaction.respond(choices);
      return;
    }
    
    // Group autocomplete
    if (focusedOption.name === 'group') {
      const groups = deviceOps.getAllGroups();
      const filtered = groups
        .filter(g => g.toLowerCase().includes(focusedValue))
        .slice(0, 25);
      
      const choices = filtered.map(g => ({
        name: g,
        value: g
      }));
      
      await interaction.respond(choices);
      return;
    }
    
    // Default: no suggestions
    await interaction.respond([]);
    
  } catch (error) {
    logger.error('Autocomplete error:', error);
    await interaction.respond([]);
  }
}

/**
 * Handle command interactions
 * Routes commands to appropriate handlers (plugins or legacy)
 * 
 * Note: This is a fallback handler. Most commands should be handled by plugins.
 */
export async function handleCommandInteraction(interaction) {
  const { commandName } = interaction;
  
  try {
    // Check if this is a plugin command
    const { handlePluginCommand } = await import('./plugin-system.js');
    
    // Try to route to plugin first
    if (commandName.startsWith('plugin:')) {
      const pluginName = commandName.replace('plugin:', '');
      await handlePluginCommand(pluginName, interaction);
      return;
    }
    
    // All commands should be handled by plugins now
    // If we reach here, the command wasn't handled by any plugin
    logger.warn(`Unhandled command: ${commandName}`);
    
    await interaction.reply({
      content: `❌ Command handler not found for: \`/${commandName}\`\n\nThis command may not be implemented yet or the plugin may be disabled.`,
      ephemeral: true
    });
    
  } catch (error) {
    logger.error(`Command error (${commandName}):`, error);
    
    const errorMessage = `❌ An error occurred: ${error.message}\n\nI apologize for the inconvenience, Master!`;
    
    try {
      if (interaction.deferred) {
        await interaction.editReply(errorMessage);
      } else if (!interaction.replied) {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      logger.error('Failed to send error message:', replyError);
    }
  }
}
