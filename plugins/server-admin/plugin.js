/**
 * Server Admin Plugin
 * 
 * AI-powered administration for both Linux/Windows/macOS servers
 * and Discord server management through natural language.
 * 
 * Features:
 * - Server status monitoring (CPU, memory, disk, uptime)
 * - Service management (restart, stop, start)
 * - Deployment automation (git pull, npm install, restart)
 * - System maintenance (package updates, reboot)
 * - Discord role management
 * - Discord channel management
 * - Discord member moderation
 * - Discord server settings
 * 
 * @module plugins/server-admin
 */

import { Plugin } from '../../src/core/plugin-system.js';
import { createLogger } from '../../src/logging/logger.js';
import { PERMISSIONS } from '../../src/auth/auth.js';

const logger = createLogger('server-admin');

/**
 * AI Actions Export
 * 
 * These actions are automatically registered with the conversational AI
 * when the plugin loads.
 */
export const aiActions = [
  // Server Status Actions
  {
    id: 'server-status',
    keywords: ['is the bot running', 'bot status', 'server status', 'check server', 'is server up'],
    plugin: 'server-admin',
    description: 'Check if the bot service is running',
    permission: PERMISSIONS.SERVER_STATUS,
    async execute(context) {
      const { checkServiceStatus } = await import('./command-executor.js');
      return await checkServiceStatus();
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      const status = result.running ? '🟢 Running' : '🔴 Stopped';
      return `**Bot Service Status:** ${status}\n${result.details || ''}`;
    }
  },
  {
    id: 'server-stats',
    keywords: ['show server status', 'server stats', 'system status', 'cpu usage', 'memory usage', 'disk space'],
    plugin: 'server-admin',
    description: 'Show server statistics (CPU, memory, disk, uptime)',
    permission: PERMISSIONS.SERVER_STATUS,
    async execute(context) {
      const { getServerStats } = await import('./command-executor.js');
      return await getServerStats();
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      return `**📊 Server Statistics**\n\n` +
        `🖥️ **CPU:** ${result.cpu || 'N/A'}\n` +
        `💾 **Memory:** ${result.memory || 'N/A'}\n` +
        `💿 **Disk:** ${result.disk || 'N/A'}\n` +
        `⏱️ **Uptime:** ${result.uptime || 'N/A'}`;
    }
  },
  {
    id: 'view-logs',
    keywords: ['show logs', 'view logs', 'bot logs', 'last logs', 'recent logs'],
    plugin: 'server-admin',
    description: 'View recent bot logs',
    permission: PERMISSIONS.SERVER_STATUS,
    async execute(context) {
      const { viewLogs } = await import('./command-executor.js');
      // Extract line count from query (default 20)
      const match = context.query?.match(/(\d+)\s*(?:lines?|logs?)/i);
      const lines = match ? parseInt(match[1]) : 20;
      return await viewLogs(Math.min(lines, 100)); // Cap at 100 lines
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      return `**📜 Recent Logs (${result.lines} lines)**\n\`\`\`\n${result.output}\n\`\`\``;
    }
  },
  
  // Service Management Actions
  {
    id: 'restart-bot',
    keywords: ['restart the bot', 'restart bot', 'reboot bot', 'restart service'],
    plugin: 'server-admin',
    description: 'Restart the bot service',
    permission: PERMISSIONS.SERVER_SERVICE,
    requiresConfirmation: true,
    async execute(context) {
      const { restartService } = await import('./command-executor.js');
      return await restartService();
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      if (result.needsApproval) return result.message;
      return `✅ **Bot Restarted Successfully**\n${result.message || ''}`;
    }
  },
  {
    id: 'stop-bot',
    keywords: ['stop the bot', 'stop bot', 'shutdown bot'],
    plugin: 'server-admin',
    description: 'Stop the bot service',
    permission: PERMISSIONS.SERVER_SERVICE,
    requiresConfirmation: true,
    async execute(context) {
      const { stopService } = await import('./command-executor.js');
      return await stopService();
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      if (result.needsApproval) return result.message;
      return `⏹️ **Bot Stopped**\n${result.message || ''}`;
    }
  },
  
  // Deployment Actions
  {
    id: 'deploy-code',
    keywords: ['deploy', 'deploy latest', 'deploy code', 'update bot', 'git pull'],
    plugin: 'server-admin',
    description: 'Deploy latest code (git pull, npm install, restart)',
    permission: PERMISSIONS.SERVER_DEPLOY,
    requiresConfirmation: true,
    async execute(context) {
      const { deployCode } = await import('./command-executor.js');
      return await deployCode();
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      if (result.needsApproval) return result.message;
      if (result.noChanges) return `ℹ️ **No Changes to Deploy**\nCode is already up to date.`;
      return `🚀 **Deployment Complete**\n\n` +
        `📦 **Commit:** ${result.commit || 'N/A'}\n` +
        `📝 **Changes:** ${result.changes || 'N/A'}`;
    }
  },
  
  // System Maintenance Actions
  {
    id: 'check-disk',
    keywords: ['check disk', 'disk space', 'disk usage', 'storage space'],
    plugin: 'server-admin',
    description: 'Check disk space usage',
    permission: PERMISSIONS.SERVER_STATUS,
    async execute(context) {
      const { checkDiskSpace } = await import('./command-executor.js');
      return await checkDiskSpace();
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      return `**💿 Disk Usage**\n\`\`\`\n${result.output}\n\`\`\``;
    }
  },
  {
    id: 'update-packages',
    keywords: ['update packages', 'update system', 'system update', 'apt update', 'upgrade packages'],
    plugin: 'server-admin',
    description: 'Update system packages',
    permission: PERMISSIONS.SERVER_MAINTENANCE,
    requiresConfirmation: true,
    async execute(context) {
      const { updatePackages } = await import('./command-executor.js');
      return await updatePackages();
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      if (result.needsApproval) return result.message;
      return `✅ **System Updated**\n${result.output || ''}`;
    }
  },
  {
    id: 'reboot-server',
    keywords: ['reboot server', 'restart server', 'reboot machine'],
    plugin: 'server-admin',
    description: 'Reboot the server (requires double confirmation)',
    permission: PERMISSIONS.SERVER_MAINTENANCE,
    requiresConfirmation: true,
    requiresDoubleConfirmation: true,
    async execute(context) {
      const { rebootServer } = await import('./command-executor.js');
      return await rebootServer();
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      if (result.needsApproval) return result.message;
      return `🔄 **Server Rebooting**\n⚠️ Server will restart in ${result.delay || 2} minutes.`;
    }
  },
  
  // Discord Role Management
  {
    id: 'discord-add-role',
    keywords: ['give role', 'add role', 'assign role'],
    plugin: 'server-admin',
    description: 'Add a role to a user',
    permission: PERMISSIONS.DISCORD_MANAGE_ROLES,
    async execute(context) {
      const { addRole } = await import('./discord/role-manager.js');
      return await addRole(context.guild, context.targetUserId, context.roleName);
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      return `✅ Added role **${result.role}** to **${result.member}**`;
    }
  },
  {
    id: 'discord-remove-role',
    keywords: ['remove role', 'take role', 'revoke role'],
    plugin: 'server-admin',
    description: 'Remove a role from a user',
    permission: PERMISSIONS.DISCORD_MANAGE_ROLES,
    async execute(context) {
      const { removeRole } = await import('./discord/role-manager.js');
      return await removeRole(context.guild, context.targetUserId, context.roleName);
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      return `✅ Removed role **${result.role}** from **${result.member}**`;
    }
  },
  
  // Discord Member Management
  {
    id: 'discord-kick',
    keywords: ['kick user', 'kick member'],
    plugin: 'server-admin',
    description: 'Kick a member from the server',
    permission: PERMISSIONS.DISCORD_MODERATE_MEMBERS,
    requiresConfirmation: true,
    async execute(context) {
      const { kickMember } = await import('./discord/member-manager.js');
      return await kickMember(context.guild, context.targetUserId, context.reason);
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      if (result.needsApproval) return result.message;
      return `👢 Kicked **${result.member}**\nReason: ${result.reason || 'No reason provided'}`;
    }
  },
  {
    id: 'discord-ban',
    keywords: ['ban user', 'ban member'],
    plugin: 'server-admin',
    description: 'Ban a member from the server',
    permission: PERMISSIONS.DISCORD_MODERATE_MEMBERS,
    requiresConfirmation: true,
    async execute(context) {
      const { banMember } = await import('./discord/member-manager.js');
      return await banMember(context.guild, context.targetUserId, context.reason);
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      if (result.needsApproval) return result.message;
      return `🔨 Banned **${result.user}**\nReason: ${result.reason || 'No reason provided'}`;
    }
  },
  {
    id: 'discord-timeout',
    keywords: ['timeout user', 'mute user', 'timeout member'],
    plugin: 'server-admin',
    description: 'Timeout a member',
    permission: PERMISSIONS.DISCORD_MODERATE_MEMBERS,
    async execute(context) {
      const { timeoutMember } = await import('./discord/member-manager.js');
      return await timeoutMember(context.guild, context.targetUserId, context.duration, context.reason);
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      return `⏰ Timed out **${result.member}** for ${result.duration}\nReason: ${result.reason || 'No reason provided'}`;
    }
  },
  
  // Discord Channel Management
  {
    id: 'discord-create-channel',
    keywords: ['create channel', 'make channel', 'new channel', 'add channel'],
    plugin: 'server-admin',
    description: 'Create a new Discord channel',
    permission: PERMISSIONS.DISCORD_MANAGE_CHANNELS,
    async execute(context) {
      const { createChannel } = await import('./discord/channel-manager.js');
      return await createChannel(context.guild, context.channelName, context.channelType || 'text', null, context);
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      return `✅ Created channel **#${result.channel?.name}**`;
    }
  },
  {
    id: 'discord-delete-channel',
    keywords: ['delete channel', 'remove channel'],
    plugin: 'server-admin',
    description: 'Delete a Discord channel',
    permission: PERMISSIONS.DISCORD_MANAGE_CHANNELS,
    async execute(context) {
      const { deleteChannel } = await import('./discord/channel-manager.js');
      return await deleteChannel(context.guild, context.channelIdentifier, context);
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      return `🗑️ Deleted channel **#${result.deletedChannel?.name}**`;
    }
  },
  {
    id: 'discord-lock-channel',
    keywords: ['lock channel', 'lock this channel'],
    plugin: 'server-admin',
    description: 'Lock a channel (prevent messages)',
    permission: PERMISSIONS.DISCORD_MANAGE_CHANNELS,
    async execute(context) {
      const { lockChannel } = await import('./discord/channel-manager.js');
      return await lockChannel(context.channel);
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      return `🔒 Channel **${result.channel}** has been locked.`;
    }
  },
  {
    id: 'discord-unlock-channel',
    keywords: ['unlock channel', 'unlock this channel'],
    plugin: 'server-admin',
    description: 'Unlock a channel (allow messages)',
    permission: PERMISSIONS.DISCORD_MANAGE_CHANNELS,
    async execute(context) {
      const { unlockChannel } = await import('./discord/channel-manager.js');
      return await unlockChannel(context.channel);
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      return `🔓 Channel **${result.channel}** has been unlocked.`;
    }
  },
  
  // Discord Server Info
  {
    id: 'discord-server-info',
    keywords: ['server info', 'show server info', 'guild info'],
    plugin: 'server-admin',
    description: 'Show Discord server information',
    permission: PERMISSIONS.SERVER_STATUS,
    async execute(context) {
      const { getServerInfo } = await import('./discord/server-settings.js');
      return await getServerInfo(context.guild);
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      return `**🏠 Server Info: ${result.name}**\n\n` +
        `👥 **Members:** ${result.memberCount}\n` +
        `💬 **Channels:** ${result.channelCount}\n` +
        `🎭 **Roles:** ${result.roleCount}\n` +
        `📅 **Created:** ${result.createdAt}`;
    }
  }
];

/**
 * Server Admin Plugin Class
 */
export default class ServerAdminPlugin extends Plugin {
  constructor() {
    super(
      'server-admin',
      '1.0.0',
      'AI-powered server and Discord administration'
    );
    this.logger = logger;
  }

  async onLoad() {
    this.logger.info('🖥️ Server Admin plugin loaded');
    
    // Register AI actions
    await this.registerAIActions();
  }

  async onEnable() {
    this.logger.info('✅ Server Admin plugin enabled');
  }

  async onDisable() {
    this.logger.info('⏸️ Server Admin plugin disabled');
  }

  async onUnload() {
    this.logger.info('👋 Server Admin plugin unloaded');
    
    // Unregister AI actions
    await this.unregisterAIActions();
  }

  /**
   * Register AI actions with the conversational AI
   */
  async registerAIActions() {
    try {
      const { registerAction, registerCapabilities } = await import('../conversational-ai/context/action-registry.js');
      
      // Register each action
      for (const action of aiActions) {
        registerAction(action.id, action);
      }
      
      // Register plugin capabilities
      registerCapabilities('server-admin', {
        description: 'AI-powered server and Discord administration',
        features: [
          'Server status monitoring',
          'Service management (restart, stop)',
          'Deployment automation',
          'System maintenance',
          'Discord role management',
          'Discord channel management',
          'Discord member moderation',
          'Discord server settings'
        ],
        commands: [
          { name: '/admin server status', description: 'Check server status' },
          { name: '/admin server logs', description: 'View bot logs' },
          { name: '/admin server restart', description: 'Restart the bot' },
          { name: '/admin server deploy', description: 'Deploy latest code' },
          { name: '/admin discord roles', description: 'Manage roles' },
          { name: '/admin discord channels', description: 'Manage channels' },
          { name: '/admin discord members', description: 'Moderate members' }
        ],
        naturalLanguage: [
          { triggers: ['is the bot running', 'server status'], action: 'Check server status' },
          { triggers: ['restart the bot'], action: 'Restart bot service' },
          { triggers: ['deploy', 'update bot'], action: 'Deploy latest code' },
          { triggers: ['give role', 'add role'], action: 'Add role to user' },
          { triggers: ['kick', 'ban'], action: 'Moderate members' },
          { triggers: ['lock channel'], action: 'Lock/unlock channels' }
        ]
      });
      
      this.logger.info(`Registered ${aiActions.length} AI actions`);
    } catch (e) {
      this.logger.debug('Conversational AI not available, skipping action registration');
    }
  }

  /**
   * Unregister AI actions
   */
  async unregisterAIActions() {
    try {
      const { unregisterPluginActions, unregisterCapabilities } = await import('../conversational-ai/context/action-registry.js');
      const removed = unregisterPluginActions('server-admin');
      unregisterCapabilities('server-admin');
      this.logger.info(`Unregistered ${removed} AI actions`);
    } catch (e) {
      // Conversational AI not available
    }
  }
}
