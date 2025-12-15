/**
 * Server Admin Slash Commands
 * 
 * Discord slash commands for server and Discord administration.
 * 
 * @module plugins/server-admin/commands
 */

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';
import { handleDiscordAdmin, formatResult } from './discord-admin.js';
import { parseAdminIntent } from './nlp-parser.js';

const logger = createLogger('server-admin:commands');

/**
 * Slash command definitions
 */
export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName('admin')
      .setDescription('Server and Discord administration commands')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      
      // Server subcommand group
      .addSubcommandGroup(group =>
        group
          .setName('server')
          .setDescription('Linux/Windows/macOS server management')
          .addSubcommand(sub =>
            sub
              .setName('status')
              .setDescription('Check server and bot status')
          )
          .addSubcommand(sub =>
            sub
              .setName('logs')
              .setDescription('View recent bot logs')
              .addIntegerOption(opt =>
                opt
                  .setName('lines')
                  .setDescription('Number of lines to show (default: 20)')
                  .setMinValue(1)
                  .setMaxValue(100)
              )
          )
          .addSubcommand(sub =>
            sub
              .setName('restart')
              .setDescription('Restart the bot service')
          )
          .addSubcommand(sub =>
            sub
              .setName('deploy')
              .setDescription('Deploy latest code from git')
          )
          .addSubcommand(sub =>
            sub
              .setName('disk')
              .setDescription('Check disk space usage')
          )
      )
      
      // Natural language subcommand
      .addSubcommand(sub =>
        sub
          .setName('do')
          .setDescription('Execute admin command using natural language')
          .addStringOption(opt =>
            opt
              .setName('query')
              .setDescription('What do you want to do? (e.g., "restart the bot", "lock this channel")')
              .setRequired(true)
          )
      )
      
      // Discord subcommand group
      .addSubcommandGroup(group =>
        group
          .setName('discord')
          .setDescription('Discord server management')
          .addSubcommand(sub =>
            sub
              .setName('info')
              .setDescription('Show server information')
          )
          .addSubcommand(sub =>
            sub
              .setName('roles')
              .setDescription('List all server roles')
          )
          .addSubcommand(sub =>
            sub
              .setName('channels')
              .setDescription('List all server channels')
          )
          .addSubcommand(sub =>
            sub
              .setName('lock')
              .setDescription('Lock the current channel')
          )
          .addSubcommand(sub =>
            sub
              .setName('unlock')
              .setDescription('Unlock the current channel')
          )
          .addSubcommand(sub =>
            sub
              .setName('slowmode')
              .setDescription('Set slowmode for current channel')
              .addIntegerOption(opt =>
                opt
                  .setName('seconds')
                  .setDescription('Slowmode duration in seconds (0 to disable)')
                  .setRequired(true)
                  .setMinValue(0)
                  .setMaxValue(21600)
              )
          )
      ),
    
    async execute(interaction) {
      const group = interaction.options.getSubcommandGroup(false);
      const subcommand = interaction.options.getSubcommand();
      
      logger.info(`Admin command: ${group || 'root'} ${subcommand}`);
      
      await interaction.deferReply({ ephemeral: true });
      
      try {
        // Handle natural language command
        if (subcommand === 'do') {
          await handleNaturalLanguageCommand(interaction);
        } else if (group === 'server') {
          await handleServerCommand(interaction, subcommand);
        } else if (group === 'discord') {
          await handleDiscordCommand(interaction, subcommand);
        }
      } catch (error) {
        logger.error(`Admin command error: ${error.message}`);
        await interaction.editReply({ content: `❌ Error: ${error.message}` });
      }
    }
  }
];

/**
 * Handle natural language admin commands
 */
async function handleNaturalLanguageCommand(interaction) {
  const query = interaction.options.getString('query');
  
  logger.info(`Natural language admin query: ${query}`);
  
  // Parse the natural language query
  const intent = parseAdminIntent(query);
  
  if (intent.action === 'unknown') {
    await interaction.editReply({
      content: `❓ I didn't understand that command.\n\nTry something like:\n` +
        `• "restart the bot"\n` +
        `• "show server status"\n` +
        `• "lock this channel"\n` +
        `• "give @user the admin role"\n` +
        `• "kick @user for spamming"`
    });
    return;
  }

  const context = {
    guild: interaction.guild,
    channel: interaction.channel,
    executorId: interaction.user.id,
    executorName: interaction.user.username
  };

  // Route to appropriate handler based on intent type
  if (intent.type === 'discord_roles' || intent.type === 'discord_channels' || 
      intent.type === 'discord_members' || intent.type === 'discord_settings') {
    const result = await handleDiscordAdmin({ action: intent.action, params: intent.params }, context);
    await interaction.editReply({ content: formatResult(result, intent.action) });
  } else {
    // Server management commands
    await interaction.editReply({
      content: `🔧 **Detected Intent:** ${intent.action}\n` +
        `**Confidence:** ${Math.round(intent.confidence * 100)}%\n\n` +
        `_Server commands require confirmation. Please use the specific subcommand._`
    });
  }
}

/**
 * Handle server management commands
 */
async function handleServerCommand(interaction, subcommand) {
  const { getServerStats, viewLogs, checkDiskSpace } = await import('./command-executor.js');
  
  switch (subcommand) {
    case 'status': {
      const result = await getServerStats();
      if (result.error) {
        await interaction.editReply({ content: `❌ ${result.error}` });
      } else {
        await interaction.editReply({
          content: `**📊 Server Status**\n\n` +
            `🖥️ **CPU:** ${result.cpu || 'N/A'}\n` +
            `💾 **Memory:** ${result.memory || 'N/A'}\n` +
            `💿 **Disk:** ${result.disk || 'N/A'}\n` +
            `⏱️ **Uptime:** ${result.uptime || 'N/A'}`
        });
      }
      break;
    }
    
    case 'logs': {
      const lines = interaction.options.getInteger('lines') || 20;
      const result = await viewLogs(lines);
      if (result.error) {
        await interaction.editReply({ content: `❌ ${result.error}` });
      } else {
        const output = result.output?.substring(0, 1900) || 'No logs available';
        await interaction.editReply({
          content: `**📜 Recent Logs (${lines} lines)**\n\`\`\`\n${output}\n\`\`\``
        });
      }
      break;
    }
    
    case 'restart': {
      await interaction.editReply({
        content: `⚠️ **Restart Bot?**\n\nThis will restart the bot service. Use natural language to confirm:\n> "yes, restart the bot"`
      });
      break;
    }
    
    case 'deploy': {
      await interaction.editReply({
        content: `⚠️ **Deploy Code?**\n\nThis will pull latest code and restart. Use natural language to confirm:\n> "yes, deploy the code"`
      });
      break;
    }
    
    case 'disk': {
      const result = await checkDiskSpace();
      if (result.error) {
        await interaction.editReply({ content: `❌ ${result.error}` });
      } else {
        await interaction.editReply({
          content: `**💿 Disk Usage**\n\`\`\`\n${result.output}\n\`\`\``
        });
      }
      break;
    }
  }
}

/**
 * Handle Discord management commands
 */
async function handleDiscordCommand(interaction, subcommand) {
  const context = {
    guild: interaction.guild,
    channel: interaction.channel,
    executorId: interaction.user.id,
    executorName: interaction.user.username
  };
  
  switch (subcommand) {
    case 'info': {
      const result = await handleDiscordAdmin({ action: 'server_info', params: {} }, context);
      if (!result.success) {
        await interaction.editReply({ content: `❌ ${result.error}` });
      } else {
        const server = result.server;
        await interaction.editReply({
          content: `**🏠 Server Info: ${server.name}**\n\n` +
            `👥 **Members:** ${server.memberCount}\n` +
            `💬 **Channels:** ${server.channels.total} (${server.channels.text} text, ${server.channels.voice} voice)\n` +
            `🎭 **Roles:** ${server.roleCount}\n` +
            `😀 **Emojis:** ${server.emojiCount}\n` +
            `🚀 **Boost Level:** ${server.boostLevel} (${server.boostCount} boosts)\n` +
            `📅 **Created:** ${server.createdAt?.toLocaleDateString() || 'N/A'}`
        });
      }
      break;
    }
    
    case 'roles': {
      const result = await handleDiscordAdmin({ action: 'role_list', params: {} }, context);
      if (!result.success) {
        await interaction.editReply({ content: `❌ ${result.error}` });
      } else {
        const roleList = result.roles.slice(0, 20).map(r => `• ${r.name} (${r.memberCount} members)`).join('\n');
        await interaction.editReply({
          content: `**🎭 Server Roles (${result.totalCount})**\n\n${roleList}${result.totalCount > 20 ? '\n\n_...and more_' : ''}`
        });
      }
      break;
    }
    
    case 'channels': {
      const result = await handleDiscordAdmin({ action: 'channel_list', params: {} }, context);
      if (!result.success) {
        await interaction.editReply({ content: `❌ ${result.error}` });
      } else {
        const channelList = result.channels.slice(0, 20).map(c => `• #${c.name} (${c.type})`).join('\n');
        await interaction.editReply({
          content: `**💬 Server Channels (${result.totalCount})**\n\n${channelList}${result.totalCount > 20 ? '\n\n_...and more_' : ''}`
        });
      }
      break;
    }
    
    case 'lock': {
      const result = await handleDiscordAdmin({ action: 'channel_lock', params: {} }, context);
      await interaction.editReply({ content: formatResult(result, 'channel_lock') });
      break;
    }
    
    case 'unlock': {
      const result = await handleDiscordAdmin({ action: 'channel_unlock', params: {} }, context);
      await interaction.editReply({ content: formatResult(result, 'channel_unlock') });
      break;
    }
    
    case 'slowmode': {
      const seconds = interaction.options.getInteger('seconds');
      const result = await handleDiscordAdmin({ action: 'slowmode', params: { seconds } }, context);
      await interaction.editReply({ content: formatResult(result, 'slowmode') });
      break;
    }
  }
}

export default commands;
