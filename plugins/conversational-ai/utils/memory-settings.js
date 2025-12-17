/**
 * Memory Settings Manager
 * 
 * Allows admins to control memory/context settings per user:
 * - Disable memory for specific users
 * - Set custom memory limits
 * - Clear user's conversation history
 * - Users can opt-out themselves
 * 
 * @module plugins/conversational-ai/utils/memory-settings
 */

import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('memory-settings');

// Config key prefixes
const MEMORY_DISABLED_KEY = 'memory_disabled'; // Per user
const MEMORY_LIMIT_KEY = 'memory_limit'; // Per user custom limit
const MEMORY_OPTOUT_KEY = 'memory_optout'; // User self opt-out

/**
 * Check if memory is disabled for a user
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function isMemoryDisabled(guildId, userId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    
    // Check admin-set disabled
    const adminDisabled = configOps.get(`${MEMORY_DISABLED_KEY}_${guildId}_${userId}`);
    if (adminDisabled === 'true') return true;
    
    // Check user opt-out
    const userOptout = configOps.get(`${MEMORY_OPTOUT_KEY}_${userId}`);
    if (userOptout === 'true') return true;
    
    return false;
  } catch (e) {
    logger.error('Failed to check memory disabled:', e.message);
    return false;
  }
}

/**
 * Disable memory for a user (admin action)
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {Object} Result
 */
export async function disableUserMemory(guildId, userId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    configOps.set(`${MEMORY_DISABLED_KEY}_${guildId}_${userId}`, 'true');
    logger.info(`Memory disabled for user ${userId} in guild ${guildId}`);
    return { success: true };
  } catch (e) {
    logger.error('Failed to disable user memory:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Enable memory for a user (admin action)
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {Object} Result
 */
export async function enableUserMemory(guildId, userId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    configOps.delete(`${MEMORY_DISABLED_KEY}_${guildId}_${userId}`);
    logger.info(`Memory enabled for user ${userId} in guild ${guildId}`);
    return { success: true };
  } catch (e) {
    logger.error('Failed to enable user memory:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * User opts out of memory (self-service)
 * @param {string} userId - User ID
 * @returns {Object} Result
 */
export async function userOptOut(userId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    configOps.set(`${MEMORY_OPTOUT_KEY}_${userId}`, 'true');
    logger.info(`User ${userId} opted out of memory`);
    return { success: true };
  } catch (e) {
    logger.error('Failed to opt out:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * User opts back in to memory (self-service)
 * @param {string} userId - User ID
 * @returns {Object} Result
 */
export async function userOptIn(userId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    configOps.delete(`${MEMORY_OPTOUT_KEY}_${userId}`);
    logger.info(`User ${userId} opted back in to memory`);
    return { success: true };
  } catch (e) {
    logger.error('Failed to opt in:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Get custom memory limit for a user
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {Promise<number|null>} Custom limit or null for default
 */
export async function getUserMemoryLimit(guildId, userId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    const limit = configOps.get(`${MEMORY_LIMIT_KEY}_${guildId}_${userId}`);
    return limit ? parseInt(limit, 10) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Set custom memory limit for a user (admin action)
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @param {number} limit - Max messages to remember (0 = disabled)
 * @returns {Object} Result
 */
export async function setUserMemoryLimit(guildId, userId, limit) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    
    if (limit <= 0) {
      // 0 or negative = disable memory
      configOps.set(`${MEMORY_DISABLED_KEY}_${guildId}_${userId}`, 'true');
      configOps.delete(`${MEMORY_LIMIT_KEY}_${guildId}_${userId}`);
    } else {
      configOps.set(`${MEMORY_LIMIT_KEY}_${guildId}_${userId}`, limit.toString());
      configOps.delete(`${MEMORY_DISABLED_KEY}_${guildId}_${userId}`);
    }
    
    logger.info(`Memory limit set to ${limit} for user ${userId} in guild ${guildId}`);
    return { success: true };
  } catch (e) {
    logger.error('Failed to set memory limit:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Clear memory limit for a user (use default)
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {Object} Result
 */
export async function clearUserMemoryLimit(guildId, userId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    configOps.delete(`${MEMORY_LIMIT_KEY}_${guildId}_${userId}`);
    logger.info(`Memory limit cleared for user ${userId} in guild ${guildId}`);
    return { success: true };
  } catch (e) {
    logger.error('Failed to clear memory limit:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Get memory settings for a user
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Settings object
 */
export async function getUserMemorySettings(guildId, userId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    
    const adminDisabled = configOps.get(`${MEMORY_DISABLED_KEY}_${guildId}_${userId}`) === 'true';
    const userOptout = configOps.get(`${MEMORY_OPTOUT_KEY}_${userId}`) === 'true';
    const customLimit = configOps.get(`${MEMORY_LIMIT_KEY}_${guildId}_${userId}`);
    
    return {
      enabled: !adminDisabled && !userOptout,
      adminDisabled,
      userOptout,
      customLimit: customLimit ? parseInt(customLimit, 10) : null,
      usingDefault: !customLimit && !adminDisabled
    };
  } catch (e) {
    return {
      enabled: true,
      adminDisabled: false,
      userOptout: false,
      customLimit: null,
      usingDefault: true
    };
  }
}

/**
 * Clear a user's conversation history from database
 * @param {string} userId - User ID
 * @param {string} [channelId] - Optional channel ID (if null, clears all)
 * @returns {Promise<Object>} Result with count of deleted messages
 */
export async function clearUserHistory(userId, channelId = null) {
  try {
    const { getDb } = await import('../../../src/database/db.js');
    const db = getDb();
    
    let result;
    if (channelId) {
      result = db.prepare(`
        DELETE FROM conversation_history 
        WHERE user_id = ? AND channel_id = ?
      `).run(userId, channelId);
    } else {
      result = db.prepare(`
        DELETE FROM conversation_history 
        WHERE user_id = ?
      `).run(userId);
    }
    
    logger.info(`Cleared ${result.changes} messages for user ${userId}`);
    return { success: true, deleted: result.changes };
  } catch (e) {
    logger.error('Failed to clear user history:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Get list of users with memory disabled in a guild
 * @param {string} guildId - Guild ID
 * @returns {Promise<string[]>} Array of user IDs
 */
export async function getDisabledUsers(guildId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    const allConfigs = configOps.getAll ? configOps.getAll() : [];
    
    const prefix = `${MEMORY_DISABLED_KEY}_${guildId}_`;
    const disabledUsers = [];
    
    for (const config of allConfigs) {
      if (config.key?.startsWith(prefix) && config.value === 'true') {
        const userId = config.key.replace(prefix, '');
        disabledUsers.push(userId);
      }
    }
    
    return disabledUsers;
  } catch (e) {
    logger.error('Failed to get disabled users:', e.message);
    return [];
  }
}

export default {
  isMemoryDisabled,
  disableUserMemory,
  enableUserMemory,
  userOptOut,
  userOptIn,
  getUserMemoryLimit,
  setUserMemoryLimit,
  clearUserMemoryLimit,
  getUserMemorySettings,
  clearUserHistory,
  getDisabledUsers
};
