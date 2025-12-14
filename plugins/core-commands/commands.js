/**
 * Core Commands - Command Definitions and Handlers
 * 
 * This file defines the slash commands for the core-commands plugin
 * and handles their execution.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
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
export async function handleCommand(interaction, plugin) {
  const { commandName } = interaction;
  const userId = interaction.user.id;
  const username = interaction.user.username;

  try {
    // HELP command
    if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setColor('#FFB6C1')
        .setTitle('🌸 Maid Bot Commands 🌸')
        .setDescription('At your service, Master! Here\'s what I can do:')
        .addFields(
          { name: '📋 Core Commands', value: '`/help` - This command\n`/stats` - Bot statistics\n`/ping` - Check latency\n`/dashboard` - Web dashboard info', inline: false },
          { name: '🔌 Plugin Commands', value: '`/plugin list` - List plugins\n`/plugin stats` - Plugin statistics', inline: false },
          { name: '🚧 More Commands', value: 'Additional commands are being migrated to plugins.\nCheck `/help` regularly for updates!', inline: false }
        )
        .setFooter({ text: 'Plugin-First Architecture - Phase 2 Complete! ✨' })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // STATS command
    if (commandName === 'stats') {
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
          { name: '🚀 Speed Tests', value: `${speedStats.total_tests || 0}`, inline: true },
          { name: '⏰ Scheduled Tasks', value: `${tasks.length}`, inline: true },
          { name: '💬 Chat Messages', value: `${chatOps.getRecent(1000).length}`, inline: true },
          { name: '🔌 Plugins Loaded', value: `${plugins.length}`, inline: true },
          { name: '✅ Plugins Enabled', value: `${plugins.filter(p => p.enabled).length}`, inline: true },
          { name: '🏗️ Architecture', value: 'Plugin-First (Phase 2)', inline: true }
        )
        .setFooter({ text: 'View detailed stats on the dashboard!' })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // PING command
    if (commandName === 'ping') {
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
      return;
    }

    // DASHBOARD command
    if (commandName === 'dashboard') {
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
      return;
    }

    // PLUGIN command (admin only)
    if (commandName === 'plugin') {
      const subcommand = interaction.options.getSubcommand();
      
      // Check permission for enable/disable/reload (admin only)
      if (['enable', 'disable', 'reload'].includes(subcommand)) {
        const hasPermission = await checkUserPermission(userId, PERMISSIONS.MODIFY_CONFIG);
        
        if (!hasPermission) {
          await interaction.reply({ 
            content: '❌ You do not have permission to manage plugins. This command is restricted to administrators only.', 
            ephemeral: true 
          });
          return;
        }
      }
      
      if (subcommand === 'list') {
        const plugins = getLoadedPlugins();
        
        if (plugins.length === 0) {
          await interaction.reply('⚠️ No plugins loaded.');
          return;
        }
        
        const embed = new EmbedBuilder()
          .setColor('#9370DB')
          .setTitle('🔌 Loaded Plugins')
          .setDescription(`${plugins.length} plugins loaded`)
          .setTimestamp();
        
        plugins.forEach(plugin => {
          const status = plugin.enabled ? '✅ Enabled' : '❌ Disabled';
          embed.addFields({
            name: `${plugin.name} v${plugin.version}`,
            value: `${plugin.description}\n${status}`,
            inline: false
          });
        });
        
        await interaction.reply({ embeds: [embed] });
      }
      else if (subcommand === 'enable') {
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
      }
      else if (subcommand === 'disable') {
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
      }
      else if (subcommand === 'reload') {
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
      }
      else if (subcommand === 'stats') {
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
      }
    }

  } catch (error) {
    console.error('Core command error:', error);
    const errorMessage = `❌ An error occurred: ${error.message}`;
    
    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}

/**
 * Handle autocomplete (if needed)
 */
export async function handleAutocomplete(interaction, plugin) {
  // No autocomplete needed for these commands yet
  await interaction.respond([]);
}
