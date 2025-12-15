/**
 * Discord Server Settings
 * 
 * Manages Discord server settings through natural language commands.
 * Implements server info, name changes, and other server-level settings.
 * 
 * @module plugins/server-admin/discord/server-settings
 */

import { createLogger } from '../../../src/logging/logger.js';
import { logAudit } from '../audit-logger.js';

const logger = createLogger('server-admin:settings');

/**
 * Get server information
 * @param {Guild} guild - Discord guild
 * @returns {Object} Server information
 */
export async function getServerInfo(guild) {
  logger.info(`Getting server info for ${guild?.name || 'unknown'}`);
  
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }

  try {
    // Fetch guild to ensure we have latest data
    const fetchedGuild = await guild.fetch();
    
    const textChannels = fetchedGuild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = fetchedGuild.channels.cache.filter(c => c.type === 2).size;
    const categories = fetchedGuild.channels.cache.filter(c => c.type === 4).size;
    
    return {
      success: true,
      server: {
        id: fetchedGuild.id,
        name: fetchedGuild.name,
        description: fetchedGuild.description,
        icon: fetchedGuild.iconURL({ size: 256 }),
        banner: fetchedGuild.bannerURL({ size: 512 }),
        ownerId: fetchedGuild.ownerId,
        memberCount: fetchedGuild.memberCount,
        channels: {
          total: fetchedGuild.channels.cache.size,
          text: textChannels,
          voice: voiceChannels,
          categories
        },
        roleCount: fetchedGuild.roles.cache.size,
        emojiCount: fetchedGuild.emojis.cache.size,
        boostLevel: fetchedGuild.premiumTier,
        boostCount: fetchedGuild.premiumSubscriptionCount,
        createdAt: fetchedGuild.createdAt,
        verificationLevel: fetchedGuild.verificationLevel,
        features: fetchedGuild.features
      }
    };

  } catch (error) {
    logger.error(`Failed to get server info: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Set server name (requires confirmation)
 * @param {Guild} guild - Discord guild
 * @param {string} name - New server name
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, oldName, newName, error
 */
export async function setServerName(guild, name, context = {}) {
  logger.info(`Setting server name to "${name}"`);
  
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { success: false, error: 'Server name not provided or invalid' };
  }

  const trimmedName = name.trim();
  
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    return { success: false, error: 'Server name must be between 2 and 100 characters' };
  }

  try {
    const botMember = guild.members.me;
    if (!botMember?.permissions.has('ManageGuild')) {
      return { success: false, error: 'Bot lacks MANAGE_GUILD permission' };
    }

    const oldName = guild.name;
    
    await guild.setName(trimmedName, `Changed by ${context.executorName || 'system'} via server admin`);

    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_server',
      intent: 'server_name',
      command: `Set server name to ${trimmedName}`,
      target: { oldName, newName: trimmedName },
      guildId: guild.id,
      success: true
    });

    logger.info(`Successfully changed server name from "${oldName}" to "${trimmedName}"`);
    
    return {
      success: true,
      oldName,
      newName: trimmedName,
      message: `Changed server name from "${oldName}" to "${trimmedName}"`
    };

  } catch (error) {
    logger.error(`Failed to set server name: ${error.message}`);
    
    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_server',
      intent: 'server_name',
      command: `Set server name to ${trimmedName}`,
      guildId: guild?.id,
      success: false,
      error: error.message
    });

    return { success: false, error: error.message };
  }
}


/**
 * Set server description
 * @param {Guild} guild - Discord guild
 * @param {string} description - New server description
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, description, error
 */
export async function setServerDescription(guild, description, context = {}) {
  logger.info(`Setting server description`);
  
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }

  try {
    const botMember = guild.members.me;
    if (!botMember?.permissions.has('ManageGuild')) {
      return { success: false, error: 'Bot lacks MANAGE_GUILD permission' };
    }

    // Check if guild has COMMUNITY feature (required for description)
    if (!guild.features.includes('COMMUNITY')) {
      return { success: false, error: 'Server must be a Community server to set description' };
    }

    const oldDescription = guild.description;
    
    await guild.setDescription(description || null, `Changed by ${context.executorName || 'system'} via server admin`);

    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_server',
      intent: 'server_description',
      command: `Set server description`,
      target: { oldDescription, newDescription: description },
      guildId: guild.id,
      success: true
    });

    logger.info(`Successfully changed server description`);
    
    return {
      success: true,
      description: description || null,
      message: description ? 'Updated server description' : 'Cleared server description'
    };

  } catch (error) {
    logger.error(`Failed to set server description: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get server statistics
 * @param {Guild} guild - Discord guild
 * @returns {Object} Server statistics
 */
export async function getServerStats(guild) {
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }

  try {
    // Fetch all members for accurate counts
    await guild.members.fetch();
    
    const members = guild.members.cache;
    const bots = members.filter(m => m.user.bot).size;
    const humans = members.filter(m => !m.user.bot).size;
    const online = members.filter(m => m.presence?.status === 'online').size;
    const idle = members.filter(m => m.presence?.status === 'idle').size;
    const dnd = members.filter(m => m.presence?.status === 'dnd').size;
    const offline = members.filter(m => !m.presence || m.presence.status === 'offline').size;

    return {
      success: true,
      stats: {
        members: {
          total: guild.memberCount,
          humans,
          bots,
          online,
          idle,
          dnd,
          offline
        },
        channels: {
          total: guild.channels.cache.size,
          text: guild.channels.cache.filter(c => c.type === 0).size,
          voice: guild.channels.cache.filter(c => c.type === 2).size,
          categories: guild.channels.cache.filter(c => c.type === 4).size
        },
        roles: guild.roles.cache.size,
        emojis: guild.emojis.cache.size,
        stickers: guild.stickers.cache.size,
        boosts: {
          level: guild.premiumTier,
          count: guild.premiumSubscriptionCount
        }
      }
    };

  } catch (error) {
    logger.error(`Failed to get server stats: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get list of banned users
 * @param {Guild} guild - Discord guild
 * @param {number} limit - Maximum number of bans to return
 * @returns {Object} List of banned users
 */
export async function getBanList(guild, limit = 50) {
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }

  try {
    const botMember = guild.members.me;
    if (!botMember?.permissions.has('BanMembers')) {
      return { success: false, error: 'Bot lacks BAN_MEMBERS permission' };
    }

    const bans = await guild.bans.fetch({ limit });
    
    const banList = bans.map(ban => ({
      userId: ban.user.id,
      username: ban.user.username,
      reason: ban.reason || 'No reason provided'
    }));

    return {
      success: true,
      bans: banList,
      totalCount: banList.length,
      message: `Found ${banList.length} banned users`
    };

  } catch (error) {
    logger.error(`Failed to get ban list: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export default {
  getServerInfo,
  setServerName,
  setServerDescription,
  getServerStats,
  getBanList
};
