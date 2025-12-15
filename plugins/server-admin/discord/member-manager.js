/**
 * Discord Member Manager
 * 
 * Manages Discord server members through natural language commands.
 * Implements kick, ban, timeout, unban, and member info.
 * 
 * @module plugins/server-admin/discord/member-manager
 */

import { createLogger } from '../../../src/logging/logger.js';
import { logAudit } from '../audit-logger.js';

const logger = createLogger('server-admin:members');

/**
 * Parse duration string to milliseconds
 * @param {string|number} duration - Duration like "1h", "30m", "1d", or seconds
 * @returns {number} Duration in milliseconds
 */
function parseDuration(duration) {
  if (typeof duration === 'number') {
    return duration * 1000; // Assume seconds
  }
  
  const match = String(duration).match(/^(\d+)\s*(s|m|h|d|w)?$/i);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  
  const multipliers = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
    'w': 7 * 24 * 60 * 60 * 1000
  };
  
  return value * (multipliers[unit] || 1000);
}

/**
 * Format duration for display
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Human-readable duration
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours`;
  const days = Math.floor(hours / 24);
  return `${days} days`;
}


/**
 * Kick a member from the guild (requires confirmation)
 * @param {Guild} guild - Discord guild
 * @param {string} userId - Target user ID
 * @param {string} reason - Kick reason
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, member, reason, error
 */
export async function kickMember(guild, userId, reason, context = {}) {
  logger.info(`Kicking user ${userId}`);
  
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }
  
  if (!userId) {
    return { success: false, error: 'User ID not provided' };
  }

  try {
    const botMember = guild.members.me;
    if (!botMember?.permissions.has('KickMembers')) {
      return { success: false, error: 'Bot lacks KICK_MEMBERS permission' };
    }

    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch (fetchError) {
      return { success: false, error: 'User not found in this server' };
    }

    // Check if bot can kick this member (role hierarchy)
    if (member.roles.highest.position >= botMember.roles.highest.position) {
      return { success: false, error: 'Cannot kick member with equal or higher role' };
    }

    if (!member.kickable) {
      return { success: false, error: 'Cannot kick this member' };
    }

    const memberInfo = {
      id: member.id,
      username: member.user.username,
      displayName: member.displayName
    };

    await member.kick(reason || 'No reason provided');

    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_member',
      intent: 'member_kick',
      command: `Kick ${memberInfo.username}`,
      target: { userId: memberInfo.id, username: memberInfo.username },
      reason: reason || 'No reason provided',
      guildId: guild.id,
      success: true
    });

    logger.info(`Successfully kicked ${memberInfo.username}`);
    
    return {
      success: true,
      member: memberInfo,
      reason: reason || 'No reason provided',
      message: `Kicked ${memberInfo.username} from the server`
    };

  } catch (error) {
    logger.error(`Failed to kick member: ${error.message}`);
    
    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_member',
      intent: 'member_kick',
      command: `Kick user ${userId}`,
      guildId: guild?.id,
      success: false,
      error: error.message
    });

    return { success: false, error: error.message };
  }
}

/**
 * Ban a member from the guild (requires confirmation)
 * @param {Guild} guild - Discord guild
 * @param {string} userId - Target user ID
 * @param {string} reason - Ban reason
 * @param {number} deleteMessageDays - Days of messages to delete (0-7)
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, user, reason, error
 */
export async function banMember(guild, userId, reason, deleteMessageDays = 0, context = {}) {
  logger.info(`Banning user ${userId}`);
  
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }
  
  if (!userId) {
    return { success: false, error: 'User ID not provided' };
  }

  try {
    const botMember = guild.members.me;
    if (!botMember?.permissions.has('BanMembers')) {
      return { success: false, error: 'Bot lacks BAN_MEMBERS permission' };
    }

    // Try to get member info if they're in the server
    let userInfo = { id: userId, username: 'Unknown User' };
    try {
      const member = await guild.members.fetch(userId);
      userInfo = {
        id: member.id,
        username: member.user.username,
        displayName: member.displayName
      };

      // Check role hierarchy if member is in server
      if (member.roles.highest.position >= botMember.roles.highest.position) {
        return { success: false, error: 'Cannot ban member with equal or higher role' };
      }

      if (!member.bannable) {
        return { success: false, error: 'Cannot ban this member' };
      }
    } catch (fetchError) {
      // User might not be in server, can still ban by ID
    }

    const deleteSeconds = Math.min(7, Math.max(0, deleteMessageDays)) * 24 * 60 * 60;

    await guild.members.ban(userId, {
      reason: reason || 'No reason provided',
      deleteMessageSeconds: deleteSeconds
    });

    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_member',
      intent: 'member_ban',
      command: `Ban ${userInfo.username}`,
      target: { userId: userInfo.id, username: userInfo.username },
      reason: reason || 'No reason provided',
      guildId: guild.id,
      success: true
    });

    logger.info(`Successfully banned ${userInfo.username}`);
    
    return {
      success: true,
      user: userInfo,
      reason: reason || 'No reason provided',
      message: `Banned ${userInfo.username} from the server`
    };

  } catch (error) {
    logger.error(`Failed to ban member: ${error.message}`);
    
    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_member',
      intent: 'member_ban',
      command: `Ban user ${userId}`,
      guildId: guild?.id,
      success: false,
      error: error.message
    });

    return { success: false, error: error.message };
  }
}


/**
 * Timeout a member
 * @param {Guild} guild - Discord guild
 * @param {string} userId - Target user ID
 * @param {string|number} duration - Timeout duration
 * @param {string} reason - Timeout reason
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, member, duration, error
 */
export async function timeoutMember(guild, userId, duration, reason, context = {}) {
  logger.info(`Timing out user ${userId} for ${duration}`);
  
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }
  
  if (!userId) {
    return { success: false, error: 'User ID not provided' };
  }

  const durationMs = parseDuration(duration);
  if (durationMs <= 0) {
    return { success: false, error: 'Invalid duration' };
  }

  // Max timeout is 28 days
  const maxTimeout = 28 * 24 * 60 * 60 * 1000;
  if (durationMs > maxTimeout) {
    return { success: false, error: 'Timeout cannot exceed 28 days' };
  }

  try {
    const botMember = guild.members.me;
    if (!botMember?.permissions.has('ModerateMembers')) {
      return { success: false, error: 'Bot lacks MODERATE_MEMBERS permission' };
    }

    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch (fetchError) {
      return { success: false, error: 'User not found in this server' };
    }

    // Check role hierarchy
    if (member.roles.highest.position >= botMember.roles.highest.position) {
      return { success: false, error: 'Cannot timeout member with equal or higher role' };
    }

    if (!member.moderatable) {
      return { success: false, error: 'Cannot timeout this member' };
    }

    const memberInfo = {
      id: member.id,
      username: member.user.username,
      displayName: member.displayName
    };

    await member.timeout(durationMs, reason || 'No reason provided');

    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_member',
      intent: 'member_timeout',
      command: `Timeout ${memberInfo.username} for ${formatDuration(durationMs)}`,
      target: { userId: memberInfo.id, username: memberInfo.username, duration: durationMs },
      reason: reason || 'No reason provided',
      guildId: guild.id,
      success: true
    });

    logger.info(`Successfully timed out ${memberInfo.username} for ${formatDuration(durationMs)}`);
    
    return {
      success: true,
      member: memberInfo,
      duration: formatDuration(durationMs),
      durationMs,
      message: `Timed out ${memberInfo.username} for ${formatDuration(durationMs)}`
    };

  } catch (error) {
    logger.error(`Failed to timeout member: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Remove timeout from a member
 * @param {Guild} guild - Discord guild
 * @param {string} userId - Target user ID
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, member, error
 */
export async function removeTimeout(guild, userId, context = {}) {
  logger.info(`Removing timeout from user ${userId}`);
  
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }
  
  if (!userId) {
    return { success: false, error: 'User ID not provided' };
  }

  try {
    const botMember = guild.members.me;
    if (!botMember?.permissions.has('ModerateMembers')) {
      return { success: false, error: 'Bot lacks MODERATE_MEMBERS permission' };
    }

    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch (fetchError) {
      return { success: false, error: 'User not found in this server' };
    }

    const memberInfo = {
      id: member.id,
      username: member.user.username,
      displayName: member.displayName
    };

    await member.timeout(null, 'Timeout removed via server admin');

    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_member',
      intent: 'member_untimeout',
      command: `Remove timeout from ${memberInfo.username}`,
      target: { userId: memberInfo.id, username: memberInfo.username },
      guildId: guild.id,
      success: true
    });

    logger.info(`Successfully removed timeout from ${memberInfo.username}`);
    
    return {
      success: true,
      member: memberInfo,
      message: `Removed timeout from ${memberInfo.username}`
    };

  } catch (error) {
    logger.error(`Failed to remove timeout: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Unban a user from the guild
 * @param {Guild} guild - Discord guild
 * @param {string} userId - Target user ID
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, user, error
 */
export async function unbanMember(guild, userId, context = {}) {
  logger.info(`Unbanning user ${userId}`);
  
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }
  
  if (!userId) {
    return { success: false, error: 'User ID not provided' };
  }

  try {
    const botMember = guild.members.me;
    if (!botMember?.permissions.has('BanMembers')) {
      return { success: false, error: 'Bot lacks BAN_MEMBERS permission' };
    }

    // Check if user is actually banned
    let ban;
    try {
      ban = await guild.bans.fetch(userId);
    } catch (fetchError) {
      return { success: false, error: 'User is not banned' };
    }

    const userInfo = {
      id: ban.user.id,
      username: ban.user.username
    };

    await guild.members.unban(userId, 'Unbanned via server admin');

    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_member',
      intent: 'member_unban',
      command: `Unban ${userInfo.username}`,
      target: { userId: userInfo.id, username: userInfo.username },
      guildId: guild.id,
      success: true
    });

    logger.info(`Successfully unbanned ${userInfo.username}`);
    
    return {
      success: true,
      user: userInfo,
      message: `Unbanned ${userInfo.username}`
    };

  } catch (error) {
    logger.error(`Failed to unban user: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get member information
 * @param {Guild} guild - Discord guild
 * @param {string} userId - Target user ID
 * @returns {Object} Result with member info
 */
export async function getMemberInfo(guild, userId) {
  logger.info(`Getting info for user ${userId}`);
  
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }
  
  if (!userId) {
    return { success: false, error: 'User ID not provided' };
  }

  try {
    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch (fetchError) {
      return { success: false, error: 'User not found in this server' };
    }

    const roles = member.roles.cache
      .filter(r => r.id !== guild.id) // Exclude @everyone
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));

    return {
      success: true,
      member: {
        id: member.id,
        username: member.user.username,
        displayName: member.displayName,
        discriminator: member.user.discriminator,
        avatar: member.user.displayAvatarURL(),
        joinedAt: member.joinedAt,
        createdAt: member.user.createdAt,
        roles,
        isOwner: member.id === guild.ownerId,
        isBot: member.user.bot,
        nickname: member.nickname,
        communicationDisabledUntil: member.communicationDisabledUntil
      }
    };

  } catch (error) {
    logger.error(`Failed to get member info: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Export helper functions
export { parseDuration, formatDuration };

export default {
  kickMember,
  banMember,
  timeoutMember,
  removeTimeout,
  unbanMember,
  getMemberInfo,
  parseDuration,
  formatDuration
};
