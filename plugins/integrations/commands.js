/**
 * Integrations Commands
 * 
 * Aggregates commands from sub-plugins: weather, speedtest, homeassistant
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';

const logger = createLogger('integrations');

// Import sub-plugin handlers
import * as weatherCommands from './weather/commands.js';
import * as speedtestCommands from './speedtest/commands.js';
import * as homeassistantCommands from './homeassistant/commands.js';

// Export standalone commands from sub-plugins
export const commands = [
  // Weather standalone command
  ...(weatherCommands.commands || [])
];

// This plugin has both standalone commands AND handles subcommands
export const parentCommand = null;
export const commandGroup = null;

// List of commands this plugin handles (for routing)
export const handlesCommands = ['weather', 'network', 'homeassistant'];

/**
 * Handle command execution - delegates to appropriate sub-plugin
 */
export async function handleCommand(interaction, commandName, subcommand) {
  logger.debug(`Integrations handling: ${commandName} ${subcommand || ''}`);
  
  // Weather standalone command
  if (commandName === 'weather') {
    return await weatherCommands.handleCommand(interaction, commandName, subcommand);
  }
  
  // Network subcommands (speedtest, speedhistory)
  if (commandName === 'network' && (subcommand === 'speedtest' || subcommand === 'speedhistory')) {
    return await speedtestCommands.handleCommand(interaction, commandName, subcommand);
  }
  
  // Home Assistant commands
  if (commandName === 'homeassistant') {
    return await homeassistantCommands.handleCommand(interaction, commandName, subcommand);
  }
  
  return false;
}

/**
 * Handle autocomplete
 */
export async function handleAutocomplete(interaction) {
  const { commandName } = interaction;
  
  // Home Assistant autocomplete
  if (commandName === 'homeassistant') {
    return await homeassistantCommands.handleAutocomplete(interaction);
  }
  
  // Default: no suggestions
  await interaction.respond([]);
}
