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
    .addSubcommand(sub =>
      sub
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('User to kick')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('reason')
            .setDescription('Reason for kick')
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('User to ban')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('reason')
            .setDescription('Reason for ban')
        )
        .addIntegerOption(opt =>
          opt
            .setName('delete_days')
            .setDescription('Days of messages to delete (0-7)')
            .setMinValue(0)
            .setMaxValue(7)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('unban')
        .setDescription('Unban a user from the server')
        .addStringOption(opt =>
          opt
            .setName('user_id')
            .setDescription('User ID to unban')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('timeout')
        .setDescription('Timeout a member')
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('User to timeout')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('duration')
            .setDescription('Duration (e.g., 5m, 1h, 1d)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('reason')
            .setDescription('Reason for timeout')
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('untimeout')
        .setDescription('Remove timeout from a member')
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('User to remove timeout from')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('giverole')
        .setDescription('Give a role to a member')
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('User to give role to')
            .setRequired(true)
        )
        .addRoleOption(opt =>
          opt
            .setName('role')
            .setDescription('Role to give')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('removerole')
        .setDescription('Remove a role from a member')
        .addUserOption(opt =>
          opt
            .setName('user')
            .setDescription('User to remove role from')
            .setRequired(true)
        )
        .addRoleOption(opt =>
          opt
            .setName('role')
            .setDescription('Role to remove')
            .setRequired(true)
        )
    ),
  
  // SSH/Credential management subcommand group
  new SlashCommandSubcommandGroupBuilder()
    .setName('ssh')
    .setDescription('SSH credential and remote server management')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add SSH credentials for a server')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Server name/identifier')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('host')
            .setDescription('Server hostname or IP')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('username')
            .setDescription('SSH username')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('password')
            .setDescription('SSH password (stored encrypted)')
        )
        .addIntegerOption(opt =>
          opt
            .setName('port')
            .setDescription('SSH port (default: 22)')
            .setMinValue(1)
            .setMaxValue(65535)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all configured SSH servers')
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove SSH credentials for a server')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Server name to remove')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('test')
        .setDescription('Test SSH connection to a server')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Server name to test')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('exec')
        .setDescription('Execute command on remote server')
        .addStringOption(opt =>
          opt
            .setName('server')
            .setDescription('Server to execute on')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt
            .setName('command')
            .setDescription('Command to execute')
            .setRequired(true)
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
  
  // Only handle server, discord, and ssh subcommand groups
  if (group !== 'server' && group !== 'discord' && group !== 'ssh') {
    return false;
  }
  
  logger.info(`Admin command: ${group} ${sub}`);
  
  await interaction.deferReply({ ephemeral: true });
  
  try {
    if (group === 'server') {
      await handleServerCommand(interaction, sub);
    } else if (group === 'discord') {
      await handleDiscordCommand(interaction, sub);
    } else if (group === 'ssh') {
      await handleSSHCommand(interaction, sub);
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
  const { createApprovalRequest } = await import('./approval-manager.js');
  const { storePendingApproval } = await import('./button-handler.js');
  
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
      const cmd = generateCommand({ action: 'service_restart', params: {} }, platform);
      const approvalMessage = createApprovalRequest(cmd, {
        userId: interaction.user.id,
        username: interaction.user.username
      });
      
      const reply = await interaction.editReply(approvalMessage);
      
      // Store pending approval for button handler
      storePendingApproval(reply.id, {
        command: cmd,
        action: 'service_restart',
        userId: interaction.user.id,
        username: interaction.user.username
      });
      break;
    }
    
    case 'deploy': {
      const cmd = generateCommand({ action: 'deploy', params: {} }, platform);
      const approvalMessage = createApprovalRequest(cmd, {
        userId: interaction.user.id,
        username: interaction.user.username
      });
      
      const reply = await interaction.editReply(approvalMessage);
      
      // Store pending approval for button handler
      storePendingApproval(reply.id, {
        command: cmd,
        action: 'deploy',
        userId: interaction.user.id,
        username: interaction.user.username
      });
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
    
    // Moderation commands
    case 'kick': {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const result = await handleDiscordAdmin({ 
        action: 'member_kick', 
        params: { userId: user.id, reason } 
      }, context);
      
      if (result.success) {
        const embed = new EmbedBuilder()
          .setColor('#ff6b6b')
          .setTitle('👢 Member Kicked')
          .addFields(
            { name: 'User', value: `${result.member?.username || user.username}`, inline: true },
            { name: 'Reason', value: reason, inline: true },
            { name: 'By', value: interaction.user.username, inline: true }
          )
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply({ content: `❌ ${result.error}` });
      }
      break;
    }
    
    case 'ban': {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const deleteDays = interaction.options.getInteger('delete_days') || 0;
      const result = await handleDiscordAdmin({ 
        action: 'member_ban', 
        params: { userId: user.id, reason, deleteMessageDays: deleteDays } 
      }, context);
      
      if (result.success) {
        const embed = new EmbedBuilder()
          .setColor('#e74c3c')
          .setTitle('🔨 Member Banned')
          .addFields(
            { name: 'User', value: `${result.user?.username || user.username}`, inline: true },
            { name: 'Reason', value: reason, inline: true },
            { name: 'By', value: interaction.user.username, inline: true }
          )
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply({ content: `❌ ${result.error}` });
      }
      break;
    }
    
    case 'unban': {
      const userId = interaction.options.getString('user_id');
      const result = await handleDiscordAdmin({ 
        action: 'member_unban', 
        params: { userId } 
      }, context);
      
      if (result.success) {
        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('✅ User Unbanned')
          .addFields(
            { name: 'User', value: `${result.user?.username || userId}`, inline: true },
            { name: 'By', value: interaction.user.username, inline: true }
          )
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply({ content: `❌ ${result.error}` });
      }
      break;
    }
    
    case 'timeout': {
      const user = interaction.options.getUser('user');
      const duration = interaction.options.getString('duration');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const result = await handleDiscordAdmin({ 
        action: 'member_timeout', 
        params: { userId: user.id, duration, reason } 
      }, context);
      
      if (result.success) {
        const embed = new EmbedBuilder()
          .setColor('#f39c12')
          .setTitle('⏰ Member Timed Out')
          .addFields(
            { name: 'User', value: `${result.member?.username || user.username}`, inline: true },
            { name: 'Duration', value: result.duration || duration, inline: true },
            { name: 'Reason', value: reason, inline: true },
            { name: 'By', value: interaction.user.username, inline: true }
          )
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply({ content: `❌ ${result.error}` });
      }
      break;
    }
    
    case 'untimeout': {
      const user = interaction.options.getUser('user');
      const result = await handleDiscordAdmin({ 
        action: 'member_untimeout', 
        params: { userId: user.id } 
      }, context);
      
      if (result.success) {
        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('✅ Timeout Removed')
          .addFields(
            { name: 'User', value: `${result.member?.username || user.username}`, inline: true },
            { name: 'By', value: interaction.user.username, inline: true }
          )
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply({ content: `❌ ${result.error}` });
      }
      break;
    }
    
    case 'giverole': {
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      const result = await handleDiscordAdmin({ 
        action: 'role_add', 
        params: { userId: user.id, roleName: role.name } 
      }, context);
      
      if (result.success) {
        const embed = new EmbedBuilder()
          .setColor('#9b59b6')
          .setTitle('🎭 Role Added')
          .addFields(
            { name: 'User', value: user.username, inline: true },
            { name: 'Role', value: role.name, inline: true },
            { name: 'By', value: interaction.user.username, inline: true }
          )
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply({ content: `❌ ${result.error}` });
      }
      break;
    }
    
    case 'removerole': {
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      const result = await handleDiscordAdmin({ 
        action: 'role_remove', 
        params: { userId: user.id, roleName: role.name } 
      }, context);
      
      if (result.success) {
        const embed = new EmbedBuilder()
          .setColor('#9b59b6')
          .setTitle('🎭 Role Removed')
          .addFields(
            { name: 'User', value: user.username, inline: true },
            { name: 'Role', value: role.name, inline: true },
            { name: 'By', value: interaction.user.username, inline: true }
          )
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply({ content: `❌ ${result.error}` });
      }
      break;
    }
  }
}

/**
 * Handle SSH management commands
 */
async function handleSSHCommand(interaction, subcommand) {
  const { 
    storeSSHCredentials, 
    getSSHCredentials, 
    deleteCredentials, 
    listCredentials 
  } = await import('./credential-store.js');
  const { testSSHConnection, executeCommand } = await import('./command-executor.js');
  const { validateCommand } = await import('./command-validator.js');
  
  switch (subcommand) {
    case 'add': {
      const name = interaction.options.getString('name');
      const host = interaction.options.getString('host');
      const username = interaction.options.getString('username');
      const password = interaction.options.getString('password');
      const port = interaction.options.getInteger('port') || 22;
      
      const result = storeSSHCredentials(name, {
        host,
        port,
        username,
        password
      });
      
      if (result.success) {
        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('✅ SSH Credentials Added')
          .addFields(
            { name: 'Server', value: name, inline: true },
            { name: 'Host', value: host, inline: true },
            { name: 'Port', value: `${port}`, inline: true },
            { name: 'Username', value: username, inline: true }
          )
          .setFooter({ text: 'Password stored encrypted' })
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply({ content: `❌ ${result.error}` });
      }
      break;
    }
    
    case 'list': {
      const result = listCredentials();
      
      if (!result.success) {
        await interaction.editReply({ content: `❌ ${result.error}` });
        return;
      }
      
      if (result.servers.length === 0) {
        await interaction.editReply({ content: '📭 No SSH servers configured yet.\n\nUse `/admin ssh add` to add a server.' });
        return;
      }
      
      const serverList = result.servers.map(s => 
        `• **${s.serverId}** - ${s.username}@${s.host}:${s.port}`
      ).join('\n');
      
      const embed = new EmbedBuilder()
        .setColor('#667eea')
        .setTitle('🖥️ Configured SSH Servers')
        .setDescription(serverList)
        .setFooter({ text: `${result.servers.length} server(s) configured` })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      break;
    }
    
    case 'remove': {
      const name = interaction.options.getString('name');
      const result = deleteCredentials(name, 'ssh');
      
      if (result.success) {
        await interaction.editReply({ content: `✅ Removed SSH credentials for **${name}**` });
      } else {
        await interaction.editReply({ content: `❌ ${result.error}` });
      }
      break;
    }
    
    case 'test': {
      const name = interaction.options.getString('name');
      const credResult = getSSHCredentials(name);
      
      if (!credResult.success) {
        await interaction.editReply({ content: `❌ ${credResult.error}` });
        return;
      }
      
      const creds = credResult.credentials;
      await interaction.editReply({ content: `⏳ Testing connection to **${name}** (${creds.host})...` });
      
      const testResult = await testSSHConnection({
        sshHost: creds.host,
        sshPort: creds.port,
        sshUser: creds.username,
        useSSH: true
      });
      
      if (testResult.success) {
        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('✅ Connection Successful')
          .addFields(
            { name: 'Server', value: name, inline: true },
            { name: 'Host', value: `${creds.host}:${creds.port}`, inline: true }
          )
          .setTimestamp();
        await interaction.editReply({ content: '', embeds: [embed] });
      } else {
        await interaction.editReply({ content: `❌ Connection failed: ${testResult.message}` });
      }
      break;
    }
    
    case 'exec': {
      const serverName = interaction.options.getString('server');
      const command = interaction.options.getString('command');
      
      // Validate command first
      const validation = validateCommand(command, interaction.user.id);
      if (!validation.valid) {
        await interaction.editReply({ content: `❌ Command blocked: ${validation.reason}` });
        return;
      }
      
      // Get credentials
      const credResult = getSSHCredentials(serverName);
      if (!credResult.success) {
        await interaction.editReply({ content: `❌ ${credResult.error}` });
        return;
      }
      
      const creds = credResult.credentials;
      await interaction.editReply({ content: `⏳ Executing on **${serverName}**...\n\`\`\`\n${command}\n\`\`\`` });
      
      // Execute via SSH
      const result = await executeCommand(command, {
        useSSH: true,
        sshHost: creds.host,
        sshPort: creds.port,
        sshUser: creds.username
      });
      
      if (result.success) {
        const output = (result.output || 'No output').substring(0, 1500);
        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('✅ Command Executed')
          .addFields(
            { name: 'Server', value: serverName, inline: true },
            { name: 'Duration', value: `${result.duration}ms`, inline: true }
          )
          .setDescription(`\`\`\`\n${output}\n\`\`\``)
          .setTimestamp();
        await interaction.editReply({ content: '', embeds: [embed] });
      } else {
        await interaction.editReply({ 
          content: `❌ Command failed on **${serverName}**\n\`\`\`\n${result.error || result.output || 'Unknown error'}\n\`\`\`` 
        });
      }
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
  const focused = interaction.options.getFocused(true);
  const group = interaction.options.getSubcommandGroup(false);
  
  // SSH server autocomplete
  if (group === 'ssh' && (focused.name === 'name' || focused.name === 'server')) {
    try {
      const { listCredentials } = await import('./credential-store.js');
      const result = listCredentials();
      
      if (result.success && result.servers.length > 0) {
        const query = focused.value.toLowerCase();
        const matches = result.servers
          .filter(s => s.serverId.toLowerCase().includes(query))
          .slice(0, 25)
          .map(s => ({
            name: `${s.serverId} (${s.host})`,
            value: s.serverId
          }));
        
        await interaction.respond(matches);
        return;
      }
    } catch (error) {
      logger.error('Autocomplete error:', error);
    }
  }
  
  await interaction.respond([]);
}

export default { commandGroup, additionalGroups, handleCommand, handleAutocomplete, parentCommand };
