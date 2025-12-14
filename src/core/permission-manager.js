import { configOps } from '../database/db.js';
import { hasPermission } from '../auth/auth.js';
import { createLogger } from '../logging/logger.js';

const logger = createLogger('permission-manager');

/**
 * Check if user has permission
 * @param {string} userId - Discord user ID
 * @param {string} permission - Permission to check
 * @returns {Promise<boolean>}
 */
export async function checkUserPermission(userId, permission) {
  try {
    // Get user from database
    const userJson = configOps.get(`discord_user_${userId}`);

    if (!userJson) {
      // Default: new users are viewers (read-only)
      return false;
    }

    const user = JSON.parse(userJson);

    // Check if user is deleted
    if (user.deleted) {
      return false;
    }

    return hasPermission(user.role, permission);
  } catch (error) {
    logger.error('Error checking user permission:', error);
    return false;
  }
}

/**
 * Set user role
 * @param {string} userId - Discord user ID
 * @param {string} username - Discord username
 * @param {string} role - Role to assign
 */
export async function setUserRole(userId, username, role) {
  try {
    configOps.set(`discord_user_${userId}`, JSON.stringify({
      userId,
      username,
      role,
      updated: new Date().toISOString()
    }));
    logger.info(`Set role for user ${username} (${userId}) to ${role}`);
  } catch (error) {
    logger.error('Error setting user role:', error);
    throw error;
  }
}

/**
 * Get user role
 * @param {string} userId - Discord user ID
 * @returns {string|null}
 */
export function getUserRole(userId) {
  try {
    const userJson = configOps.get(`discord_user_${userId}`);
    if (!userJson) return null;

    const user = JSON.parse(userJson);
    return user.deleted ? null : user.role;
  } catch (error) {
    logger.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Get all users with roles
 * @returns {Array}
 */
export function getAllUsers() {
  try {
    const allConfig = configOps.getAll();
    const users = [];

    for (const config of allConfig) {
      if (config.key.startsWith('discord_user_')) {
        try {
          const userData = JSON.parse(config.value);
          if (!userData.deleted) {
            users.push(userData);
          }
        } catch (parseError) {
          logger.error('Error parsing user data:', parseError);
        }
      }
    }

    return users;
  } catch (error) {
    logger.error('Error getting all users:', error);
    return [];
  }
}
