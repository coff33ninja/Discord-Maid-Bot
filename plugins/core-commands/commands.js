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
// Handles standalone commands, /bot subcommands, and /admin
export const handlesCommands = ['help', 'stats', 'ping', 'dashboard', 'plugin', 'bot', 'admin'];

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
        .setDescription('Show plugin statistics')),

  // BOT command - Bot management
  new SlashCommandBuilder()
    .setName('bot')
    .setDescription('🤖 Bot management and settings')
    .addSubcommand(sub => sub.setName('chat').setDescription('Chat with AI assistant')
      .addStringOption(opt => opt.setName('message').setDescription('Your message').setRequired(true)))
    .addSubcommand(sub => sub.setName('stats').setDescription('View bot statistics'))
    .addSubcommand(sub => sub.setName('dashboard').setDescription('Get web dashboard URL'))
    .addSubcommand(sub => sub.setName('help').setDescription('Show help and available commands'))
    .addSubcommandGroup(grp => grp.setName('logs').setDescription('View system logs')
      .addSubcommand(sub => sub.setName('recent').setDescription('View recent logs')
        .addStringOption(opt => opt.setName('level').setDescription('Filter by level')
          .addChoices(
            { name: 'All', value: 'all' }, { name: 'Debug', value: 'debug' },
            { name: 'Info', value: 'info' }, { name: 'Warning', value: 'warn' },
            { name: 'Error', value: 'error' }, { name: 'Critical', value: 'critical' }
          ))
        .addIntegerOption(opt => opt.setName('limit').setDescription('Number of logs').setMinValue(1).setMaxValue(50)))
      .addSubcommand(sub => sub.setName('search').setDescription('Search logs')
        .addStringOption(opt => opt.setName('query').setDescription('Search query').setRequired(true))
        .addIntegerOption(opt => opt.setName('limit').setDescription('Number of results').setMinValue(1).setMaxValue(50)))
      .addSubcommand(sub => sub.setName('stats').setDescription('View log statistics'))
      .addSubcommand(sub => sub.setName('errors').setDescription('View recent errors')
        .addIntegerOption(opt => opt.setName('limit').setDescription('Number of errors').setMinValue(1).setMaxValue(50))))
    .addSubcommandGroup(grp => grp.setName('plugin').setDescription('Plugin management')
      .addSubcommand(sub => sub.setName('list').setDescription('List all plugins'))
      .addSubcommand(sub => sub.setName('enable').setDescription('Enable a plugin')
        .addStringOption(opt => opt.setName('name').setDescription('Plugin name').setRequired(true)))
      .addSubcommand(sub => sub.setName('disable').setDescription('Disable a plugin')
        .addStringOption(opt => opt.setName('name').setDescription('Plugin name').setRequired(true)))
      .addSubcommand(sub => sub.setName('reload').setDescription('Reload a plugin')
        .addStringOption(opt => opt.setName('name').setDescription('Plugin name').setRequired(true)))
      .addSubcommand(sub => sub.setName('stats').setDescription('View plugin statistics'))),

  // ADMIN command - Administration
  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('👑 Administration (Admin only)')
    .addSubcommandGroup(grp => grp.setName('permissions').setDescription('Permission management')
      .addSubcommand(sub => sub.setName('list').setDescription('List all users and permissions'))
      .addSubcommand(sub => sub.setName('set').setDescription('Set user role')
        .addUserOption(opt => opt.setName('user').setDescription('User to modify').setRequired(true))
        .addStringOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true)
          .addChoices({ name: 'Admin', value: 'admin' }, { name: 'Operator', value: 'operator' }, { name: 'User', value: 'user' })))
      .addSubcommand(sub => sub.setName('grant').setDescription('Grant specific permission')
        .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
        .addStringOption(opt => opt.setName('permission').setDescription('Permission').setRequired(true)))
      .addSubcommand(sub => sub.setName('revoke').setDescription('Revoke specific permission')
        .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
        .addStringOption(opt => opt.setName('permission').setDescription('Permission').setRequired(true))))
    .addSubcommandGroup(grp => grp.setName('config').setDescription('Bot configuration')
      .addSubcommand(sub => sub.setName('view').setDescription('View configuration')
        .addStringOption(opt => opt.setName('section').setDescription('Config section')
          .addChoices({ name: 'SMB Storage', value: 'smb' }, { name: 'Home Assistant', value: 'homeassistant' }, { name: 'Gemini API', value: 'gemini' })))
      .addSubcommand(sub => sub.setName('set').setDescription('Set configuration value')
        .addStringOption(opt => opt.setName('key').setDescription('Configuration key').setRequired(true))
        .addStringOption(opt => opt.setName('value').setDescription('Configuration value').setRequired(true))))
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

    // ADMIN command
    if (cmdName === 'admin') {
      return await handleAdminCommand(interaction, subcommand, subcommandGroup, userId);
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
 * Dynamically generates help from loaded plugins
 */
async function handleHelp(interaction) {
  const plugins = getLoadedPlugins();
  
  // Core commands (always shown first)
  const coreCommands = [
    { name: '📊 Core Commands', value: '`/help` - Show this help\n`/stats` - Bot statistics\n`/ping` - Check latency\n`/dashboard` - Web dashboard URL', inline: false },
    { name: '🤖 Bot Management', value: '`/bot stats` - Statistics\n`/bot dashboard` - Dashboard\n`/bot help` - Help\n`/bot plugin list` - List plugins', inline: false },
    { name: '👑 Admin', value: '`/admin permissions` - Manage permissions\n`/admin config` - Bot configuration\n`/plugin` - Plugin management', inline: false }
  ];
  
  // Plugin command categories with their icons
  const pluginCategories = {
    'conversational-ai': { icon: '💬', name: 'AI Chat', commands: [] },
    'personality': { icon: '🎭', name: 'Personality', commands: [] },
    'network-management': { icon: '🌐', name: 'Network', commands: [] },
    'device-management': { icon: '📱', name: 'Devices', commands: [] },
    'power-management': { icon: '⚡', name: 'Power', commands: [] },
    'games': { icon: '🎮', name: 'Games', commands: [] },
    'research': { icon: '🔎', name: 'Research', commands: [] },
    'integrations': { icon: '🏠', name: 'Integrations', commands: [] },
    'automation': { icon: '⚙️', name: 'Automation', commands: [] },
    'smart-reminders': { icon: '⏰', name: 'Reminders', commands: [] }
  };
  
  // Collect commands from each plugin
  for (const plugin of plugins) {
    if (!plugin.enabled) continue;
    
    const category = pluginCategories[plugin.name];
    if (category) {
      // Try to get commands from the plugin
      try {
        const pluginModule = await import(`../${plugin.name}/commands.js`).catch(() => null);
        if (pluginModule?.commands) {
          for (const cmd of pluginModule.commands) {
            if (cmd.name) {
              category.commands.push(`\`/${cmd.name}\``);
            }
          }
        } else if (pluginModule?.commandGroup?.name) {
          category.commands.push(`\`/${pluginModule.commandGroup.name}\``);
        }
      } catch (e) {
        // Plugin might not have commands.js or different structure
      }
    }
  }
  
  // Build plugin fields
  const pluginFields = [];
  for (const [pluginName, category] of Object.entries(pluginCategories)) {
    const plugin = plugins.find(p => p.name === pluginName);
    if (plugin?.enabled && category.commands.length > 0) {
      // Get unique commands and limit display
      const uniqueCommands = [...new Set(category.commands)];
      let commandList = uniqueCommands.slice(0, 5).join(' ');
      if (uniqueCommands.length > 5) {
        commandList += ` +${uniqueCommands.length - 5} more`;
      }
      pluginFields.push({
        name: `${category.icon} ${category.name}`,
        value: commandList || 'No commands',
        inline: true
      });
    }
  }
  
  // Add special handling for known plugins with subcommands
  const specialPlugins = [];
  
  // Games plugin - show game count
  const gamesPlugin = plugins.find(p => p.name === 'games' && p.enabled);
  if (gamesPlugin) {
    specialPlugins.push({
      name: '🎮 Games',
      value: '`/game play` - Play a game\n`/game list` - 18 games available!\n`/game stats` - Your stats',
      inline: true
    });
  }
  
  // Integrations
  const integrationsPlugin = plugins.find(p => p.name === 'integrations' && p.enabled);
  if (integrationsPlugin) {
    specialPlugins.push({
      name: '🏠 Smart Home',
      value: '`/homeassistant` - Home Assistant\n`/weather` - Weather info\n`/speedtest` - Internet speed',
      inline: true
    });
  }
  
  // Network
  const networkPlugin = plugins.find(p => p.name === 'network-management' && p.enabled);
  if (networkPlugin) {
    specialPlugins.push({
      name: '🌐 Network',
      value: '`/network scan` - Scan network\n`/network devices` - List devices\n`/network wol` - Wake on LAN',
      inline: true
    });
  }
  
  // AI Chat
  const aiPlugin = plugins.find(p => p.name === 'conversational-ai' && p.enabled);
  if (aiPlugin) {
    specialPlugins.push({
      name: '💬 AI Chat',
      value: '`/chat` - Chat with AI\n`/memory` - View/manage memory\n`/ai` - AI settings',
      inline: true
    });
  }
  
  // Research
  const researchPlugin = plugins.find(p => p.name === 'research' && p.enabled);
  if (researchPlugin) {
    specialPlugins.push({
      name: '🔎 Research',
      value: '`/research query` - AI research\n`/research web` - Web search\n`/research history` - Past research',
      inline: true
    });
  }
  
  // Build the embed
  const embed = new EmbedBuilder()
    .setColor('#FFB6C1')
    .setTitle('🌸 Maid Bot Commands 🌸')
    .setDescription(`At your service, Master! Here\'s what I can do:\n\n**${plugins.filter(p => p.enabled).length} plugins loaded**`)
    .addFields(...coreCommands);
  
  // Add special plugin fields (curated)
  if (specialPlugins.length > 0) {
    embed.addFields({ name: '\u200B', value: '**📦 Plugin Commands**', inline: false });
    embed.addFields(...specialPlugins);
  }
  
  // Show disabled plugins hint
  const disabledCount = plugins.filter(p => !p.enabled).length;
  if (disabledCount > 0) {
    embed.addFields({
      name: '💤 Disabled Plugins',
      value: `${disabledCount} plugin(s) disabled. Use \`/plugin list\` to see all.`,
      inline: false
    });
  }
  
  embed.setFooter({ text: 'Use /plugin list for detailed plugin info • Plugin-First Architecture ✨' })
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
 * Handle /admin command
 */
async function handleAdminCommand(interaction, subcommand, subcommandGroup, userId) {
  // Check admin permission
  const hasPermission = await checkUserPermission(userId, PERMISSIONS.ADMIN);
  if (!hasPermission) {
    await interaction.reply({ content: '❌ Admin permission required!', ephemeral: true });
    return true;
  }

  if (subcommandGroup === 'permissions') {
    if (subcommand === 'list') {
      await interaction.reply({ content: '📋 Permission listing coming soon!\n\nUse the dashboard for now.', ephemeral: true });
      return true;
    }
    if (subcommand === 'set') {
      const user = interaction.options.getUser('user');
      const role = interaction.options.getString('role');
      await interaction.reply({ content: `✅ Set **${user.username}** role to **${role}**\n\n(Feature in development)`, ephemeral: true });
      return true;
    }
    if (subcommand === 'grant' || subcommand === 'revoke') {
      await interaction.reply({ content: `🚧 Permission ${subcommand} coming soon!`, ephemeral: true });
      return true;
    }
  }

  if (subcommandGroup === 'config') {
    const { configOps } = await import('../../src/database/db.js');
    
    if (subcommand === 'view') {
      const section = interaction.options.getString('section');
      const embed = new EmbedBuilder()
        .setColor('#667eea')
        .setTitle(`⚙️ Configuration: ${section || 'All'}`)
        .setDescription('Configuration viewing available on dashboard.')
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return true;
    }
    if (subcommand === 'set') {
      const key = interaction.options.getString('key');
      const value = interaction.options.getString('value');
      configOps.set(key, value);
      await interaction.reply({ content: `✅ Set **${key}** = \`${value}\``, ephemeral: true });
      return true;
    }
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
