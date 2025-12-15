/**
 * Discord Admin Handler
 * 
 * Main handler for Discord server administration commands.
 * Routes intents to appropriate managers and formats responses.
 * 
 * @module plugins/server-admin/discord-admin
 */

import { createLogger } from '../../src/logging/logger.js';
import * as roleManager from './discord/role-manager.js';
import * as channelManager from './discord/channel-manager.js';
import * as memberManager from './discord/member-manager.js';
import * as serverSettings from './discord/server-settings.js';

const logger = createLogger('server-admin:discord');

// Actions that require confirmation before execution
const CONFIRMATION_REQUIRED = [
  'role_delete',
  'channel_delete',
  'member_kick',
  'member_ban',
  'server_name'
];

/**
 * Handle Discord admin intent
 * @param {Object} intent - Parsed Discord admin intent
 * @param {Object} context - Execution context with guild, member, etc.
 * @returns {Object} Execution result
 */
export async function handleDiscordAdmin(intent, context) {
  const { action, params } = intent;
  const { guild, executorId, executorName } = context;

  logger.info(`Handling Discord admin action: ${action}`);

  if (!guild) {
    return { success: false, error: 'Guild not available' };
  }

  const execContext = { executorId, executorName };

  try {
    switch (action) {
      // Role Management
      case 'role_add':
        return await roleManager.addRole(guild, params.userId, params.roleName, execContext);
      
      case 'role_remove':
        return await roleManager.removeRole(guild, params.userId, params.roleName, execContext);
      
      case 'role_create':
        return await roleManager.createRole(guild, params.roleName, params.options || {}, execContext);
      
      case 'role_delete':
        return await roleManager.deleteRole(guild, params.roleName, execContext);
      
      case 'role_list':
        return await roleManager.listRoles(guild);
      
      case 'role_info':
        return await roleManager.getRoleInfo(guild, params.roleName);

      // Channel Management
      case 'channel_create':
        return await channelManager.createChannel(guild, params.channelName, params.channelType || 'text', params.categoryId, execContext);
      
      case 'channel_delete':
        return await channelManager.deleteChannel(guild, params.channelName, execContext);
      
      case 'channel_rename':
        const channelToRename = channelManager.findChannel(guild, params.channelName);
        if (!channelToRename) {
          return { success: false, error: `Channel "${params.channelName}" not found` };
        }
        return await channelManager.renameChannel(channelToRename, params.newName, execContext);
      
      case 'channel_move':
        const channelToMove = channelManager.findChannel(guild, params.channelName);
        if (!channelToMove) {
          return { success: false, error: `Channel "${params.channelName}" not found` };
        }
        return await channelManager.moveChannel(channelToMove, params.categoryId, execContext);
      
      case 'channel_topic':
        const channelForTopic = channelManager.findChannel(guild, params.channelName) || context.channel;
        if (!channelForTopic) {
          return { success: false, error: 'Channel not found' };
        }
        return await channelManager.setTopic(channelForTopic, params.topic, execContext);
      
      case 'channel_lock':
        const channelToLock = channelManager.findChannel(guild, params.channelName) || context.channel;
        if (!channelToLock) {
          return { success: false, error: 'Channel not found' };
        }
        return await channelManager.lockChannel(channelToLock, execContext);
      
      case 'channel_unlock':
        const channelToUnlock = channelManager.findChannel(guild, params.channelName) || context.channel;
        if (!channelToUnlock) {
          return { success: false, error: 'Channel not found' };
        }
        return await channelManager.unlockChannel(channelToUnlock, execContext);
      
      case 'slowmode':
        const channelForSlowmode = channelManager.findChannel(guild, params.channelName) || context.channel;
        if (!channelForSlowmode) {
          return { success: false, error: 'Channel not found' };
        }
        return await channelManager.setSlowmode(channelForSlowmode, params.seconds, execContext);
      
      case 'channel_list':
        return await channelManager.listChannels(guild);

      // Member Management
      case 'member_kick':
        return await memberManager.kickMember(guild, params.userId, params.reason, execContext);
      
      case 'member_ban':
        return await memberManager.banMember(guild, params.userId, params.reason, params.deleteMessageDays || 0, execContext);
      
      case 'member_timeout':
        return await memberManager.timeoutMember(guild, params.userId, params.duration, params.reason, execContext);
      
      case 'member_untimeout':
        return await memberManager.removeTimeout(guild, params.userId, execContext);
      
      case 'member_unban':
        return await memberManager.unbanMember(guild, params.userId, execContext);
      
      case 'member_info':
        return await memberManager.getMemberInfo(guild, params.userId);

      // Server Settings
      case 'server_info':
        return await serverSettings.getServerInfo(guild);
      
      case 'server_name':
        return await serverSettings.setServerName(guild, params.name, execContext);
      
      case 'server_stats':
        return await serverSettings.getServerStats(guild);
      
      case 'ban_list':
        return await serverSettings.getBanList(guild, params.limit);

      default:
        return { success: false, error: `Unknown Discord admin action: ${action}` };
    }
  } catch (error) {
    logger.error(`Discord admin error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Check if an action requires confirmation
 * @param {string} action - Action type
 * @returns {boolean} True if confirmation required
 */
export function requiresConfirmation(action) {
  return CONFIRMATION_REQUIRED.includes(action);
}

/**
 * Format result for Discord message
 * @param {Object} result - Action result
 * @param {string} action - Action type
 * @returns {string} Formatted message
 */
export function formatResult(result, action) {
  if (!result.success) {
    return `❌ **Error:** ${result.error}`;
  }

  if (result.message) {
    return `✅ ${result.message}`;
  }

  return `✅ Action completed successfully`;
}

export default {
  handleDiscordAdmin,
  requiresConfirmation,
  formatResult
};
