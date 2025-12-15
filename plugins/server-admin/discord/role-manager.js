/**
 * Discord Role Manager
 * 
 * Manages Discord server roles through natural language commands.
 * Implements role assignment, creation, deletion, and listing.
 * 
 * @module plugins/server-admin/discord/role-manager
 */

import { createLogger } from '../../../src/logging/logger.js';
import { logAudit } from '../audit-logger.js';

const logger = createLogger('server-admin:roles');

/**
 * Find a role by name or ID in a guild
 * @param {Guild} guild - Discord guild
 * @param {string} roleIdentifier - Role name or ID
 * @returns {Role|null} Found role or null
 */
function findRole(guild, roleIdentifier) {
  if (!guild || !roleIdentifier) return null;
  
  // Try to find by ID first
  let role = guild.roles.cache.get(roleIdentifier);
  if (role) return role;
  
  // Try to find by name (case-insensitive)
  const lowerName = roleIdentifier.toLowerCase();
  role = guild.roles.cache.find(r => r.name.toLowerCase() === lowerName);
  
  return role || null;
}

/**
 * Check if the bot can manage a specific role
 * @param {Guild} guild - Discord guild
 * @param {Role} role - Role to check
 * @returns {Object} Result with canManage and reason
 */
function canManageRole(guild, role) {
  if (!guild || !role) {
    return { canManage: false, reason: 'Invalid guild or role' };
  }

  const botMember = guild.members.me;
  if (!botMember) {
    return { canManage: false, reason: 'Bot member not found in guild' };
  }

  // Check if bot has MANAGE_ROLES permission
  if (!botMember.permissions.has('ManageRoles')) {
    return { canManage: false, reason: 'Bot lacks MANAGE_ROLES permission' };
  }

  // Check role hierarchy - bot's highest role must be above target role
  const botHighestRole = botMember.roles.highest;
  if (role.position >= botHighestRole.position) {
    return { 
      canManage: false, 
      reason: `Cannot manage role "${role.name}" - it is at or above the bot's highest role "${botHighestRole.name}"` 
    };
  }

  // Cannot manage @everyone role
  if (role.id === guild.id) {
    return { canManage: false, reason: 'Cannot manage the @everyone role' };
  }

  return { canManage: true, reason: null };
}


/**
 * Add a role to a member
 * @param {Guild} guild - Discord guild
 * @param {string} userId - Target user ID
 * @param {string} roleName - Role name or ID
 * @param {Object} context - Execution context (executor info)
 * @returns {Object} Result with success, role, member, error
 */
export async function addRole(guild, userId, roleName, context = {}) {
  logger.info(`Adding role "${roleName}" to user ${userId}`);
  
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }
  
  if (!userId) {
    return { success: false, error: 'User ID not provided' };
  }
  
  if (!roleName) {
    return { success: false, error: 'Role name not provided' };
  }

  try {
    // Find the role
    const role = findRole(guild, roleName);
    if (!role) {
      return { success: false, error: `Role "${roleName}" not found` };
    }

    // Check if bot can manage this role
    const manageCheck = canManageRole(guild, role);
    if (!manageCheck.canManage) {
      return { success: false, error: manageCheck.reason };
    }

    // Find the member
    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch (fetchError) {
      return { success: false, error: `User not found in this server` };
    }

    // Check if member already has the role
    if (member.roles.cache.has(role.id)) {
      return { 
        success: true, 
        role: { id: role.id, name: role.name },
        member: { id: member.id, username: member.user.username },
        message: `${member.user.username} already has the ${role.name} role`
      };
    }

    // Add the role
    await member.roles.add(role);

    // Log the action
    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_role',
      intent: 'role_add',
      command: `Add role ${role.name} to ${member.user.username}`,
      target: { userId: member.id, username: member.user.username, roleId: role.id, roleName: role.name },
      guildId: guild.id,
      success: true
    });

    logger.info(`Successfully added role "${role.name}" to ${member.user.username}`);
    
    return {
      success: true,
      role: { id: role.id, name: role.name, color: role.hexColor },
      member: { id: member.id, username: member.user.username, displayName: member.displayName },
      message: `Added ${role.name} role to ${member.user.username}`
    };

  } catch (error) {
    logger.error(`Failed to add role: ${error.message}`);
    
    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_role',
      intent: 'role_add',
      command: `Add role ${roleName} to user ${userId}`,
      guildId: guild?.id,
      success: false,
      error: error.message
    });

    return { success: false, error: error.message };
  }
}

/**
 * Remove a role from a member
 * @param {Guild} guild - Discord guild
 * @param {string} userId - Target user ID
 * @param {string} roleName - Role name or ID
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, role, member, error
 */
export async function removeRole(guild, userId, roleName, context = {}) {
  logger.info(`Removing role "${roleName}" from user ${userId}`);
  
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }
  
  if (!userId) {
    return { success: false, error: 'User ID not provided' };
  }
  
  if (!roleName) {
    return { success: false, error: 'Role name not provided' };
  }

  try {
    // Find the role
    const role = findRole(guild, roleName);
    if (!role) {
      return { success: false, error: `Role "${roleName}" not found` };
    }

    // Check if bot can manage this role
    const manageCheck = canManageRole(guild, role);
    if (!manageCheck.canManage) {
      return { success: false, error: manageCheck.reason };
    }

    // Find the member
    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch (fetchError) {
      return { success: false, error: `User not found in this server` };
    }

    // Check if member has the role
    if (!member.roles.cache.has(role.id)) {
      return { 
        success: true, 
        role: { id: role.id, name: role.name },
        member: { id: member.id, username: member.user.username },
        message: `${member.user.username} doesn't have the ${role.name} role`
      };
    }

    // Remove the role
    await member.roles.remove(role);

    // Log the action
    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_role',
      intent: 'role_remove',
      command: `Remove role ${role.name} from ${member.user.username}`,
      target: { userId: member.id, username: member.user.username, roleId: role.id, roleName: role.name },
      guildId: guild.id,
      success: true
    });

    logger.info(`Successfully removed role "${role.name}" from ${member.user.username}`);
    
    return {
      success: true,
      role: { id: role.id, name: role.name, color: role.hexColor },
      member: { id: member.id, username: member.user.username, displayName: member.displayName },
      message: `Removed ${role.name} role from ${member.user.username}`
    };

  } catch (error) {
    logger.error(`Failed to remove role: ${error.message}`);
    
    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_role',
      intent: 'role_remove',
      command: `Remove role ${roleName} from user ${userId}`,
      guildId: guild?.id,
      success: false,
      error: error.message
    });

    return { success: false, error: error.message };
  }
}


/**
 * Create a new role in the guild
 * @param {Guild} guild - Discord guild
 * @param {string} name - Role name
 * @param {Object} options - Role options (color, permissions, hoist, mentionable)
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, role, error
 */
export async function createRole(guild, name, options = {}, context = {}) {
  logger.info(`Creating role "${name}"`);
  
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { success: false, error: 'Role name not provided or invalid' };
  }

  const trimmedName = name.trim();

  try {
    // Check if bot has permission to manage roles
    const botMember = guild.members.me;
    if (!botMember || !botMember.permissions.has('ManageRoles')) {
      return { success: false, error: 'Bot lacks MANAGE_ROLES permission' };
    }

    // Check if role with same name already exists
    const existingRole = findRole(guild, trimmedName);
    if (existingRole) {
      return { success: false, error: `A role named "${trimmedName}" already exists` };
    }

    // Create the role
    const roleOptions = {
      name: trimmedName,
      color: options.color || null,
      hoist: options.hoist || false,
      mentionable: options.mentionable || false,
      reason: `Created by ${context.executorName || 'system'} via server admin`
    };

    if (options.permissions) {
      roleOptions.permissions = options.permissions;
    }

    const newRole = await guild.roles.create(roleOptions);

    // Log the action
    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_role',
      intent: 'role_create',
      command: `Create role ${trimmedName}`,
      target: { roleId: newRole.id, roleName: newRole.name },
      guildId: guild.id,
      success: true
    });

    logger.info(`Successfully created role "${newRole.name}" (${newRole.id})`);
    
    return {
      success: true,
      role: { 
        id: newRole.id, 
        name: newRole.name, 
        color: newRole.hexColor,
        position: newRole.position,
        hoist: newRole.hoist,
        mentionable: newRole.mentionable
      },
      message: `Created role "${newRole.name}"`
    };

  } catch (error) {
    logger.error(`Failed to create role: ${error.message}`);
    
    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_role',
      intent: 'role_create',
      command: `Create role ${trimmedName}`,
      guildId: guild?.id,
      success: false,
      error: error.message
    });

    return { success: false, error: error.message };
  }
}

/**
 * Delete a role from the guild (requires confirmation)
 * @param {Guild} guild - Discord guild
 * @param {string} roleName - Role name or ID
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, deletedRole, error
 */
export async function deleteRole(guild, roleName, context = {}) {
  logger.info(`Deleting role "${roleName}"`);
  
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }
  
  if (!roleName) {
    return { success: false, error: 'Role name not provided' };
  }

  try {
    // Find the role
    const role = findRole(guild, roleName);
    if (!role) {
      return { success: false, error: `Role "${roleName}" not found` };
    }

    // Check if bot can manage this role
    const manageCheck = canManageRole(guild, role);
    if (!manageCheck.canManage) {
      return { success: false, error: manageCheck.reason };
    }

    // Store role info before deletion
    const deletedRoleInfo = {
      id: role.id,
      name: role.name,
      color: role.hexColor,
      memberCount: role.members.size
    };

    // Delete the role
    await role.delete(`Deleted by ${context.executorName || 'system'} via server admin`);

    // Log the action
    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_role',
      intent: 'role_delete',
      command: `Delete role ${deletedRoleInfo.name}`,
      target: { roleId: deletedRoleInfo.id, roleName: deletedRoleInfo.name },
      guildId: guild.id,
      success: true
    });

    logger.info(`Successfully deleted role "${deletedRoleInfo.name}"`);
    
    return {
      success: true,
      deletedRole: deletedRoleInfo,
      message: `Deleted role "${deletedRoleInfo.name}" (had ${deletedRoleInfo.memberCount} members)`
    };

  } catch (error) {
    logger.error(`Failed to delete role: ${error.message}`);
    
    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_role',
      intent: 'role_delete',
      command: `Delete role ${roleName}`,
      guildId: guild?.id,
      success: false,
      error: error.message
    });

    return { success: false, error: error.message };
  }
}

/**
 * List all roles in the guild
 * @param {Guild} guild - Discord guild
 * @returns {Object} Result with success, roles, error
 */
export async function listRoles(guild) {
  logger.info('Listing roles');
  
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }

  try {
    // Get all roles sorted by position (highest first)
    const roles = guild.roles.cache
      .filter(role => role.id !== guild.id) // Exclude @everyone
      .sort((a, b) => b.position - a.position)
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        memberCount: role.members.size,
        hoist: role.hoist,
        mentionable: role.mentionable,
        managed: role.managed // True if managed by integration/bot
      }));

    logger.info(`Found ${roles.length} roles`);
    
    return {
      success: true,
      roles,
      totalCount: roles.length,
      message: `Found ${roles.length} roles`
    };

  } catch (error) {
    logger.error(`Failed to list roles: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get information about a specific role
 * @param {Guild} guild - Discord guild
 * @param {string} roleName - Role name or ID
 * @returns {Object} Result with success, role, error
 */
export async function getRoleInfo(guild, roleName) {
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }
  
  if (!roleName) {
    return { success: false, error: 'Role name not provided' };
  }

  try {
    const role = findRole(guild, roleName);
    if (!role) {
      return { success: false, error: `Role "${roleName}" not found` };
    }

    return {
      success: true,
      role: {
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position,
        memberCount: role.members.size,
        hoist: role.hoist,
        mentionable: role.mentionable,
        managed: role.managed,
        createdAt: role.createdAt,
        permissions: role.permissions.toArray()
      }
    };

  } catch (error) {
    logger.error(`Failed to get role info: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Check if bot can manage a role (exported for testing)
 * @param {Guild} guild - Discord guild
 * @param {Role} role - Role to check
 * @returns {Object} Result with canManage and reason
 */
export { canManageRole };

/**
 * Find a role by name or ID (exported for testing)
 * @param {Guild} guild - Discord guild
 * @param {string} roleIdentifier - Role name or ID
 * @returns {Role|null} Found role or null
 */
export { findRole };

export default {
  addRole,
  removeRole,
  createRole,
  deleteRole,
  listRoles,
  getRoleInfo,
  canManageRole,
  findRole
};
