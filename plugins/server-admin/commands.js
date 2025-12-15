/**
 * Server Admin Slash Commands
 * 
 * Discord slash commands for server and Discord administration.
 * This plugin handles the 'server' and 'discord' subcommand groups of /admin.
 * 
 * @module plugins/server-admin/commands
 */

import { SlashCommandSubcommandGroupBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';
import { handleDiscordAdmin, formatResult } from './discord-admin.js';
import { parseAdminIntent } from './nlp-parser.js';

const logger = createLogger('server-admin:commands');

// Inject into existing /admin command
export const parentCommand = 'admin';

/**
 * Command group - server management
 * Note: We export the first group as commandGroup for the plugin system
 * The second group will be added via additionalGroups
 */
export const commandGroup = new SlashCommandSubcommandGroupBuilder()
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
  );

/**
 * Additional command groups to inject
 * The plugin system will also inject these
 */
export const additionalGroups = [
  new SlashCommandSubcommandGroupBuilder()
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
];

/**
 * Handle admin commands for server-admin plugin
 * @param {Object} interaction - Discord interaction
 * @param {Object} plugin - Plugin instance (optional)
 * @returns {Promise<boolean>} True if handled
 */
export async function handleCommand(interaction, plugin) {
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();
  
  // Only handle server and discord subcommand groups
  if (group !== 'server' && group !== 'discord') {
    return false;
  }
  
  logger.info(`Admin command: ${group} ${sub}`);
  
  await interaction.deferReply({ ephemeral: true });
  
  try {
    if (group === 'server') {
      await handleServerCommand(interaction, sub);
    } else if (group === 'discord') {
      await handleDiscordCommand(interaction, sub);
    }
    return true;
  } catch (error) {
    logger.error(`Admin command error: ${error.message}`);
    await interaction.editReply({ content: `❌ Error: ${error.message}` });
    return true;
  }
}

/**
 * Handle server management commands
 */
async function handleServerCommand(interaction, subcommand) {
  const { executeCommand } = await import('./command-executor.js');
  const { generateCommand, detectPlatform } = await import('./command-generator.js');
  
  const platform = detectPlatform();
  
  switch (subcommand) {
    case 'status': {
      const cmd = generateCommand({ action: 'server_stats', params: {} }, platform);
      const result = await executeCommand(cmd.command);
      
      if (!result.success) {
        await interaction.editReply({ content: `❌ ${result.error || 'Failed to get server status'}` });
      } else {
        const embed = new EmbedBuilder()
          .setColor('#667eea')
          .setTitle('📊 Server Status')
          .setDescription('```\n' + (result.output || 'No output').substring(0, 1000) + '\n```')
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
      break;
    }
    
    case 'logs': {
      const lines = interaction.options.getInteger('lines') || 20;
      const cmd = generateCommand({ action: 'view_logs', params: { lines } }, platform);
      const result = await executeCommand(cmd.command);
      
      if (!result.success) {
        await interaction.editReply({ content: `❌ ${result.error || 'Failed to get logs'}` });
      } else {
        const output = (result.output || 'No logs available').substring(0, 1800);
        await interaction.editReply({
          content: `**📜 Recent Logs (${lines} lines)**\n\`\`\`\n${output}\n\`\`\``
        });
      }
      break;
    }
    
    case 'restart': {
      // Import approval manager for confirmation
      const { createApprovalRequest } = await import('./approval-manager.js');
      const cmd = generateCommand({ action: 'service_restart', params: {} }, platform);
      
      const approvalMessage = await createApprovalRequest(cmd, {
        userId: interaction.user.id,
        username: interaction.user.username,
        channel: interaction.channel
      });
      
      await interaction.editReply(approvalMessage);
      break;
    }
    
    case 'deploy': {
      const { createApprovalRequest } = await import('./approval-manager.js');
      const cmd = generateCommand({ action: 'deploy', params: {} }, platform);
      
      const approvalMessage = await createApprovalRequest(cmd, {
        userId: interaction.user.id,
        username: interaction.user.username,
        channel: interaction.channel
      });
      
      await interaction.editReply(approvalMessage);
      break;
    }
    
    case 'disk': {
      const cmd = generateCommand({ action: 'disk_check', params: {} }, platform);
      const result = await executeCommand(cmd.command);
      
      if (!result.success) {
        await interaction.editReply({ content: `❌ ${result.error || 'Failed to check disk space'}` });
      } else {
        const embed = new EmbedBuilder()
          .setColor('#667eea')
          .setTitle('💿 Disk Usage')
          .setDescription('```\n' + (result.output || 'No output').substring(0, 1000) + '\n```')
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
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
        const embed = new EmbedBuilder()
          .setColor('#667eea')
          .setTitle(`🏠 ${server.name}`)
          .addFields(
            { name: '👥 Members', value: `${server.memberCount}`, inline: true },
            { name: '💬 Channels', value: `${server.channels?.total || 'N/A'}`, inline: true },
            { name: '🎭 Roles', value: `${server.roleCount}`, inline: true },
            { name: '😀 Emojis', value: `${server.emojiCount}`, inline: true },
            { name: '🚀 Boost Level', value: `${server.boostLevel}`, inline: true },
            { name: '💎 Boosts', value: `${server.boostCount}`, inline: true }
          )
          .setTimestamp();
        
        if (server.iconURL) {
          embed.setThumbnail(server.iconURL);
        }
        
        await interaction.editReply({ embeds: [embed] });
      }
      break;
    }
    
    case 'roles': {
      const result = await handleDiscordAdmin({ action: 'role_list', params: {} }, context);
      if (!result.success) {
        await interaction.editReply({ content: `❌ ${result.error}` });
      } else {
        const roleList = result.roles.slice(0, 20).map(r => `• ${r.name} (${r.memberCount} members)`).join('\n');
        const embed = new EmbedBuilder()
          .setColor('#667eea')
          .setTitle(`🎭 Server Roles (${result.totalCount})`)
          .setDescription(roleList || 'No roles found')
          .setTimestamp();
        
        if (result.totalCount > 20) {
          embed.setFooter({ text: `...and ${result.totalCount - 20} more` });
        }
        
        await interaction.editReply({ embeds: [embed] });
      }
      break;
    }
    
    case 'channels': {
      const result = await handleDiscordAdmin({ action: 'channel_list', params: {} }, context);
      if (!result.success) {
        await interaction.editReply({ content: `❌ ${result.error}` });
      } else {
        const channelList = result.channels.slice(0, 20).map(c => `• #${c.name} (${c.type})`).join('\n');
        const embed = new EmbedBuilder()
          .setColor('#667eea')
          .setTitle(`💬 Server Channels (${result.totalCount})`)
          .setDescription(channelList || 'No channels found')
          .setTimestamp();
        
        if (result.totalCount > 20) {
          embed.setFooter({ text: `...and ${result.totalCount - 20} more` });
        }
        
        await interaction.editReply({ embeds: [embed] });
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

/**
 * Handle autocomplete for admin commands
 * @param {Object} interaction - Discord interaction
 * @returns {Promise<void>}
 */
export async function handleAutocomplete(interaction) {
  // No autocomplete needed for current commands
  await interaction.respond([]);
}

export default { commandGroup, additionalGroups, handleCommand, handleAutocomplete, parentCommand };
