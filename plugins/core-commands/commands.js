/**
 * Core Commands - Command Definitions and Handlers
 * 
 * This file defines the slash commands for the core-commands plugin
 * and handles their execution.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';
import { deviceOps, speedTestOps, chatOps, taskOps } from '../../src/database/db.js';
import { checkUserPermission } from '../../src/core/permission-manager.js';
import { PERMISSIONS } from '../../src/auth/auth.js';
import { 
  getLoadedPlugins, 
  enablePlugin, 
  disablePlugin, 
  reloadPlugin, 
  getPluginStats 
} from '../../src/core/plugin-system.js';

const logger = createLogger('core-commands');

/**
 * Command group configuration
 * This tells the plugin system where to inject these commands
 */
export const commandGroup = {
  name: 'core',
  description: 'Core bot commands'
};

// These commands will be registered as top-level commands, not subcommands
export const parentCommand = null; // null means standalone commands

// Commands this plugin handles (for routing)
// Handles both standalone commands and /bot subcommands
export const handlesCommands = ['help', 'stats', 'ping', 'dashboard', 'plugin', 'bot'];

/**
 * Define slash commands
 */
export const commands = [
  // HELP command
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands and bot information'),

  // STATS command
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Display bot statistics'),

  // PING command
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and response time'),

  // DASHBOARD command
  new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Get web dashboard URL and information'),

  // PLUGIN command (admin only)
  new SlashCommandBuilder()
    .setName('plugin')
    .setDescription('Manage bot plugins (admin only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all loaded plugins'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable a plugin')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Plugin name')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable a plugin')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Plugin name')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reload')
        .setDescription('Reload a plugin')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Plugin name')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('Show plugin statistics'))
];

/**
 * Handle command execution
 */
export async function handleCommand(interaction, commandName, subcommand) {
  // commandName is passed in, but we can also get it from interaction
  const cmdName = commandName || interaction.commandName;
  const userId = interaction.user.id;
  const username = interaction.user.username;
  const subcommandGroup = interaction.options.getSubcommandGroup(false);

  try {
    // Handle /bot command with subcommands
    if (cmdName === 'bot') {
      // /bot chat - delegate to conversational-ai plugin
      if (subcommand === 'chat') {
        try {
          const { handleChatMessage } = await import('../conversational-ai/commands.js');
          return await handleChatMessage(interaction);
        } catch (error) {
          logger.error('Failed to delegate to conversational-ai:', error);
          await interaction.reply({ content: '❌ Chat functionality not available.', ephemeral: true });
          return true;
        }
      }
      
      // /bot personality - delegate to personality plugin
      if (subcommand === 'personality') {
        try {
          const personalityCommands = await import('../personality/commands.js');
          return await personalityCommands.handleCommand(interaction, 'bot', 'personality');
        } catch (error) {
          logger.error('Failed to delegate to personality:', error);
          await interaction.reply({ content: '❌ Personality functionality not available.', ephemeral: true });
          return true;
        }
      }
      
      // /bot stats
      if (subcommand === 'stats') {
        return await handleStats(interaction);
      }
      
      // /bot dashboard
      if (subcommand === 'dashboard') {
        return await handleDashboard(interaction);
      }
      
      // /bot help
      if (subcommand === 'help') {
        return await handleHelp(interaction);
      }
      
      // /bot logs subcommand group
      if (subcommandGroup === 'logs') {
        return await handleLogs(interaction, subcommand);
      }
      
      // /bot plugin subcommand group
      if (subcommandGroup === 'plugin') {
        return await handlePluginCommand(interaction, subcommand, userId);
      }
      
      return false;
    }

    // HELP command (standalone)
    if (cmdName === 'help') {
      return await handleHelp(interaction);
    }

    // STATS command (standalone)
    if (cmdName === 'stats') {
      return await handleStats(interaction);
    }

    // PING command
    if (cmdName === 'ping') {
      return await handlePing(interaction);
    }

    // DASHBOARD command (standalone)
    if (cmdName === 'dashboard') {
      return await handleDashboard(interaction);
    }

    // PLUGIN command (standalone, admin only)
    if (cmdName === 'plugin') {
      const sub = interaction.options.getSubcommand();
      return await handlePluginCommand(interaction, sub, userId);
    }

  } catch (error) {
    logger.error('Core command error:', error);
    const errorMessage = `❌ An error occurred: ${error.message}`;
    
    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}

/**
 * Handle /help or /bot help
 */
async function handleHelp(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#FFB6C1')
    .setTitle('🌸 Maid Bot Commands 🌸')
    .setDescription('At your service, Master! Here\'s what I can do:')
    .addFields(
      { name: '💬 Chat', value: '`/chat` or `/bot chat` - Chat with AI\n`/bot personality` - Change personality', inline: false },
      { name: '🌐 Network', value: '`/network scan` - Scan network\n`/network devices` - List devices\n`/network wol` - Wake on LAN', inline: false },
      { name: '🏠 Smart Home', value: '`/homeassistant` - Control Home Assistant\n`/weather` - Weather info', inline: false },
      { name: '🎮 Games', value: '`/game trivia` - Trivia\n`/game hangman` - Hangman\n... and 16 more games!', inline: false },
      { name: '🔎 Research', value: '`/research query` - AI research\n`/research web` - Web search', inline: false },
      { name: '📊 Bot Management', value: '`/bot stats` - Statistics\n`/bot dashboard` - Web dashboard\n`/bot plugin list` - List plugins', inline: false }
    )
    .setFooter({ text: 'Plugin-First Architecture ✨' })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
  return true;
}

/**
 * Handle /stats or /bot stats
 */
async function handleStats(interaction) {
  const devices = deviceOps.getAll();
  const onlineDevices = devices.filter(d => d.online);
  const speedStats = speedTestOps.getStats();
  const tasks = taskOps.getAll();
  const plugins = getLoadedPlugins();
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('📊 Bot Statistics')
    .addFields(
      { name: '📡 Total Devices', value: `${devices.length}`, inline: true },
      { name: '🟢 Online', value: `${onlineDevices.length}`, inline: true },
      { name: '🔴 Offline', value: `${devices.length - onlineDevices.length}`, inline: true },
      { name: '� Speed Tests',  value: `${speedStats.total_tests || 0}`, inline: true },
      { name: '⏰ Scheduled Tasks', value: `${tasks.length}`, inline: true },
      { name: '💬 Chat Messages', value: `${chatOps.getRecent(1000).length}`, inline: true },
      { name: '🔌 Plugins Loaded', value: `${plugins.length}`, inline: true },
      { name: '✅ Plugins Enabled', value: `${plugins.filter(p => p.enabled).length}`, inline: true },
      { name: '🏗️ Architecture', value: 'Plugin-First', inline: true }
    )
    .setFooter({ text: 'View detailed stats on the dashboard!' })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
  return true;
}

/**
 * Handle /ping
 */
async function handlePing(interaction) {
  const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  const apiLatency = Math.round(interaction.client.ws.ping);
  
  const embed = new EmbedBuilder()
    .setColor('#90EE90')
    .setTitle('🏓 Pong!')
    .addFields(
      { name: '⏱️ Roundtrip Latency', value: `${latency}ms`, inline: true },
      { name: '💓 WebSocket Heartbeat', value: `${apiLatency}ms`, inline: true }
    )
    .setFooter({ text: 'Bot is responsive!' })
    .setTimestamp();
  
  await interaction.editReply({ content: null, embeds: [embed] });
  return true;
}

/**
 * Handle /dashboard or /bot dashboard
 */
async function handleDashboard(interaction) {
  const dashboardPort = process.env.DASHBOARD_PORT || 3000;
  const dashboardUrl = `http://localhost:${dashboardPort}`;
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('🌐 Web Dashboard')
    .setDescription('Access the web dashboard for detailed statistics and management!')
    .addFields(
      { name: '🔗 URL', value: dashboardUrl, inline: false },
      { name: '📊 Features', value: '• Real-time device monitoring\n• Speed test history graphs\n• Scheduled task management\n• Plugin management\n• Log viewing (admin)', inline: false },
      { name: '🔐 Default Login', value: 'Username: `admin`\nPassword: `admin123`\n\n⚠️ **Change the default password!**', inline: false }
    )
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
  return true;
}

/**
 * Handle /bot logs subcommands
 * Note: Log viewing is available on the web dashboard for detailed logs
 */
async function handleLogs(interaction, subcommand) {
  try {
    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle('📋 Log Viewing')
      .setDescription('For detailed log viewing, please use the web dashboard.')
      .addFields(
        { name: '🌐 Dashboard', value: 'Access logs at the web dashboard under the Logs section', inline: false },
        { name: '📁 Log Files', value: 'Logs are also stored in the `logs/` directory on the server', inline: false },
        { name: '🔧 Server Logs', value: 'Use `journalctl -u discord-maid-bot -f` on the server for live logs', inline: false }
      )
      .setFooter({ text: 'Use /bot dashboard to get the dashboard URL' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return true;
  } catch (error) {
    logger.error('Logs command error:', error);
    await interaction.reply({ content: `❌ Failed to get logs: ${error.message}`, ephemeral: true });
    return true;
  }
}

/**
 * Handle /plugin or /bot plugin subcommands
 */
async function handlePluginCommand(interaction, subcommand, userId) {
  // Check permission for enable/disable/reload (admin only)
  if (['enable', 'disable', 'reload'].includes(subcommand)) {
    const hasPermission = await checkUserPermission(userId, PERMISSIONS.MODIFY_CONFIG);
    
    if (!hasPermission) {
      await interaction.reply({ 
        content: '❌ You do not have permission to manage plugins. This command is restricted to administrators only.', 
        ephemeral: true 
      });
      return true;
    }
  }
  
  if (subcommand === 'list') {
    const plugins = getLoadedPlugins();
    
    if (plugins.length === 0) {
      await interaction.reply('⚠️ No plugins loaded.');
      return true;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle('🔌 Loaded Plugins')
      .setDescription(`${plugins.length} plugins loaded`)
      .setTimestamp();
    
    plugins.forEach(plugin => {
      const status = plugin.enabled ? '✅ Enabled' : '❌ Disabled';
      let value = `${plugin.description}\n${status}`;
      
      if (plugin.dependencies && plugin.dependencies.length > 0) {
        value += `\n📦 Requires: ${plugin.dependencies.join(', ')}`;
      }
      if (plugin.optionalDependencies && plugin.optionalDependencies.length > 0) {
        value += `\n⚙️ Optional: ${plugin.optionalDependencies.join(', ')}`;
      }
      
      embed.addFields({
        name: `${plugin.name} v${plugin.version}`,
        value,
        inline: false
      });
    });
    
    await interaction.reply({ embeds: [embed] });
    return true;
  }
  
  if (subcommand === 'enable') {
    const name = interaction.options.getString('name');
    
    try {
      const result = await enablePlugin(name);
      
      if (result) {
        await interaction.reply(`✅ Plugin **${name}** enabled!`);
      } else {
        await interaction.reply(`❌ Plugin **${name}** not found.`);
      }
    } catch (error) {
      await interaction.reply(`❌ Failed to enable plugin: ${error.message}`);
    }
    return true;
  }
  
  if (subcommand === 'disable') {
    const name = interaction.options.getString('name');
    
    try {
      const result = await disablePlugin(name);
      
      if (result) {
        await interaction.reply(`⏸️ Plugin **${name}** disabled!`);
      } else {
        await interaction.reply(`❌ Plugin **${name}** not found.`);
      }
    } catch (error) {
      await interaction.reply(`❌ Failed to disable plugin: ${error.message}`);
    }
    return true;
  }
  
  if (subcommand === 'reload') {
    const name = interaction.options.getString('name');
    
    await interaction.deferReply();
    
    try {
      const result = await reloadPlugin(name);
      
      if (result) {
        await interaction.editReply(`🔄 Plugin **${name}** reloaded!`);
      } else {
        await interaction.editReply(`❌ Plugin **${name}** not found.`);
      }
    } catch (error) {
      await interaction.editReply(`❌ Failed to reload plugin: ${error.message}`);
    }
    return true;
  }
  
  if (subcommand === 'stats') {
    const stats = getPluginStats();
    
    const embed = new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle('📊 Plugin Statistics')
      .addFields(
        { name: '📦 Total Plugins', value: stats.total.toString(), inline: true },
        { name: '✅ Enabled', value: stats.enabled.toString(), inline: true },
        { name: '❌ Disabled', value: stats.disabled.toString(), inline: true },
        { name: '📋 With Commands', value: stats.withCommands.toString(), inline: true }
      )
      .setFooter({ text: 'Use /plugin list to see all plugins' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    return true;
  }
  
  return false;
}

/**
 * Handle autocomplete (if needed)
 */
export async function handleAutocomplete(interaction) {
  // No autocomplete needed for these commands yet
  await interaction.respond([]);
}
