/**
 * Discord Channel Manager
 * 
 * Manages Discord server channels through natural language commands.
 * Implements channel creation, deletion, locking, and configuration.
 * 
 * @module plugins/server-admin/discord/channel-manager
 */

import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { createLogger } from '../../../src/logging/logger.js';
import { logAudit } from '../audit-logger.js';

const logger = createLogger('server-admin:channels');

/**
 * Find a channel by name or ID in a guild
 * @param {Guild} guild - Discord guild
 * @param {string} channelIdentifier - Channel name or ID
 * @returns {Channel|null} Found channel or null
 */
function findChannel(guild, channelIdentifier) {
  if (!guild || !channelIdentifier) return null;
  
  // Try to find by ID first
  let channel = guild.channels.cache.get(channelIdentifier);
  if (channel) return channel;
  
  // Try to find by name (case-insensitive)
  const lowerName = channelIdentifier.toLowerCase().replace(/^#/, '');
  channel = guild.channels.cache.find(c => c.name.toLowerCase() === lowerName);
  
  return channel || null;
}

/**
 * Check if the bot can manage channels
 * @param {Guild} guild - Discord guild
 * @returns {Object} Result with canManage and reason
 */
function canManageChannels(guild) {
  if (!guild) {
    return { canManage: false, reason: 'Guild not provided' };
  }

  const botMember = guild.members.me;
  if (!botMember) {
    return { canManage: false, reason: 'Bot member not found in guild' };
  }

  if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return { canManage: false, reason: 'Bot lacks MANAGE_CHANNELS permission' };
  }

  return { canManage: true, reason: null };
}


/**
 * Create a new channel in the guild
 * @param {Guild} guild - Discord guild
 * @param {string} name - Channel name
 * @param {string} type - 'text' or 'voice'
 * @param {string} categoryId - Optional category ID
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, channel, error
 */
export async function createChannel(guild, name, type = 'text', categoryId = null, context = {}) {
  logger.info(`Creating ${type} channel "${name}"`);
  
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { success: false, error: 'Channel name not provided or invalid' };
  }

  const trimmedName = name.trim().toLowerCase().replace(/\s+/g, '-');

  try {
    const manageCheck = canManageChannels(guild);
    if (!manageCheck.canManage) {
      return { success: false, error: manageCheck.reason };
    }

    // Determine channel type
    let channelType;
    switch (type.toLowerCase()) {
      case 'voice':
        channelType = ChannelType.GuildVoice;
        break;
      case 'text':
      default:
        channelType = ChannelType.GuildText;
        break;
    }

    // Create channel options
    const options = {
      name: trimmedName,
      type: channelType,
      reason: `Created by ${context.executorName || 'system'} via server admin`
    };

    // Add to category if specified
    if (categoryId) {
      const category = guild.channels.cache.get(categoryId);
      if (category && category.type === ChannelType.GuildCategory) {
        options.parent = categoryId;
      }
    }

    const newChannel = await guild.channels.create(options);

    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_channel',
      intent: 'channel_create',
      command: `Create ${type} channel ${trimmedName}`,
      target: { channelId: newChannel.id, channelName: newChannel.name },
      guildId: guild.id,
      success: true
    });

    logger.info(`Successfully created channel "${newChannel.name}" (${newChannel.id})`);
    
    return {
      success: true,
      channel: { 
        id: newChannel.id, 
        name: newChannel.name, 
        type: type,
        parentId: newChannel.parentId
      },
      message: `Created ${type} channel #${newChannel.name}`
    };

  } catch (error) {
    logger.error(`Failed to create channel: ${error.message}`);
    
    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_channel',
      intent: 'channel_create',
      command: `Create ${type} channel ${trimmedName}`,
      guildId: guild?.id,
      success: false,
      error: error.message
    });

    return { success: false, error: error.message };
  }
}

/**
 * Delete a channel (requires confirmation)
 * @param {Guild} guild - Discord guild
 * @param {string} channelIdentifier - Channel name or ID
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, deletedChannel, error
 */
export async function deleteChannel(guild, channelIdentifier, context = {}) {
  logger.info(`Deleting channel "${channelIdentifier}"`);
  
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }
  
  if (!channelIdentifier) {
    return { success: false, error: 'Channel identifier not provided' };
  }

  try {
    const manageCheck = canManageChannels(guild);
    if (!manageCheck.canManage) {
      return { success: false, error: manageCheck.reason };
    }

    const channel = findChannel(guild, channelIdentifier);
    if (!channel) {
      return { success: false, error: `Channel "${channelIdentifier}" not found` };
    }

    const deletedInfo = {
      id: channel.id,
      name: channel.name,
      type: channel.type === ChannelType.GuildVoice ? 'voice' : 'text'
    };

    await channel.delete(`Deleted by ${context.executorName || 'system'} via server admin`);

    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_channel',
      intent: 'channel_delete',
      command: `Delete channel ${deletedInfo.name}`,
      target: { channelId: deletedInfo.id, channelName: deletedInfo.name },
      guildId: guild.id,
      success: true
    });

    logger.info(`Successfully deleted channel "${deletedInfo.name}"`);
    
    return {
      success: true,
      deletedChannel: deletedInfo,
      message: `Deleted channel #${deletedInfo.name}`
    };

  } catch (error) {
    logger.error(`Failed to delete channel: ${error.message}`);
    
    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_channel',
      intent: 'channel_delete',
      command: `Delete channel ${channelIdentifier}`,
      guildId: guild?.id,
      success: false,
      error: error.message
    });

    return { success: false, error: error.message };
  }
}

/**
 * Rename a channel
 * @param {Channel} channel - Discord channel
 * @param {string} newName - New channel name
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, channel, error
 */
export async function renameChannel(channel, newName, context = {}) {
  logger.info(`Renaming channel to "${newName}"`);
  
  if (!channel) {
    return { success: false, error: 'Channel not provided' };
  }
  
  if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
    return { success: false, error: 'New name not provided or invalid' };
  }

  const trimmedName = newName.trim().toLowerCase().replace(/\s+/g, '-');
  const oldName = channel.name;

  try {
    await channel.setName(trimmedName, `Renamed by ${context.executorName || 'system'} via server admin`);

    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_channel',
      intent: 'channel_rename',
      command: `Rename channel ${oldName} to ${trimmedName}`,
      target: { channelId: channel.id, oldName, newName: trimmedName },
      guildId: channel.guild?.id,
      success: true
    });

    logger.info(`Successfully renamed channel from "${oldName}" to "${trimmedName}"`);
    
    return {
      success: true,
      channel: { id: channel.id, name: trimmedName, oldName },
      message: `Renamed channel from #${oldName} to #${trimmedName}`
    };

  } catch (error) {
    logger.error(`Failed to rename channel: ${error.message}`);
    return { success: false, error: error.message };
  }
}


/**
 * Move a channel to a category
 * @param {Channel} channel - Discord channel
 * @param {string} categoryId - Category ID to move to
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, channel, error
 */
export async function moveChannel(channel, categoryId, context = {}) {
  logger.info(`Moving channel to category ${categoryId}`);
  
  if (!channel) {
    return { success: false, error: 'Channel not provided' };
  }

  try {
    const guild = channel.guild;
    let category = null;
    
    if (categoryId) {
      category = guild.channels.cache.get(categoryId);
      if (!category || category.type !== ChannelType.GuildCategory) {
        return { success: false, error: 'Category not found or invalid' };
      }
    }

    await channel.setParent(categoryId, { reason: `Moved by ${context.executorName || 'system'} via server admin` });

    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_channel',
      intent: 'channel_move',
      command: `Move channel ${channel.name} to category`,
      target: { channelId: channel.id, channelName: channel.name, categoryId },
      guildId: guild.id,
      success: true
    });

    logger.info(`Successfully moved channel "${channel.name}" to category`);
    
    return {
      success: true,
      channel: { id: channel.id, name: channel.name, parentId: categoryId },
      message: `Moved #${channel.name} to ${category ? category.name : 'no category'}`
    };

  } catch (error) {
    logger.error(`Failed to move channel: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Set channel topic
 * @param {Channel} channel - Discord text channel
 * @param {string} topic - New topic
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, channel, error
 */
export async function setTopic(channel, topic, context = {}) {
  logger.info(`Setting channel topic`);
  
  if (!channel) {
    return { success: false, error: 'Channel not provided' };
  }
  
  if (channel.type !== ChannelType.GuildText) {
    return { success: false, error: 'Can only set topic on text channels' };
  }

  try {
    await channel.setTopic(topic || '', `Topic set by ${context.executorName || 'system'} via server admin`);

    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_channel',
      intent: 'channel_topic',
      command: `Set topic for ${channel.name}`,
      target: { channelId: channel.id, channelName: channel.name, topic },
      guildId: channel.guild?.id,
      success: true
    });

    logger.info(`Successfully set topic for channel "${channel.name}"`);
    
    return {
      success: true,
      channel: { id: channel.id, name: channel.name, topic },
      message: `Set topic for #${channel.name}`
    };

  } catch (error) {
    logger.error(`Failed to set topic: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Lock a channel (remove send message permission for @everyone)
 * @param {Channel} channel - Discord channel
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, channel, locked, error
 */
export async function lockChannel(channel, context = {}) {
  logger.info(`Locking channel ${channel?.name || channel}`);
  
  if (!channel) {
    return { success: false, error: 'Channel not provided' };
  }

  try {
    const guild = channel.guild;
    const everyoneRole = guild.roles.everyone;

    // Set SendMessages to false for @everyone
    await channel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: false
    }, { reason: `Locked by ${context.executorName || 'system'} via server admin` });

    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_channel',
      intent: 'channel_lock',
      command: `Lock channel ${channel.name}`,
      target: { channelId: channel.id, channelName: channel.name },
      guildId: guild.id,
      success: true
    });

    logger.info(`Successfully locked channel "${channel.name}"`);
    
    return {
      success: true,
      channel: { id: channel.id, name: channel.name },
      locked: true,
      message: `Locked #${channel.name} - members cannot send messages`
    };

  } catch (error) {
    logger.error(`Failed to lock channel: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Unlock a channel (reset send message permission for @everyone)
 * @param {Channel} channel - Discord channel
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, channel, locked, error
 */
export async function unlockChannel(channel, context = {}) {
  logger.info(`Unlocking channel ${channel?.name || channel}`);
  
  if (!channel) {
    return { success: false, error: 'Channel not provided' };
  }

  try {
    const guild = channel.guild;
    const everyoneRole = guild.roles.everyone;

    // Reset SendMessages to null (inherit) for @everyone
    await channel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: null
    }, { reason: `Unlocked by ${context.executorName || 'system'} via server admin` });

    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_channel',
      intent: 'channel_unlock',
      command: `Unlock channel ${channel.name}`,
      target: { channelId: channel.id, channelName: channel.name },
      guildId: guild.id,
      success: true
    });

    logger.info(`Successfully unlocked channel "${channel.name}"`);
    
    return {
      success: true,
      channel: { id: channel.id, name: channel.name },
      locked: false,
      message: `Unlocked #${channel.name} - members can send messages`
    };

  } catch (error) {
    logger.error(`Failed to unlock channel: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Set slowmode for a channel
 * @param {Channel} channel - Discord text channel
 * @param {number} seconds - Slowmode duration in seconds (0 to disable)
 * @param {Object} context - Execution context
 * @returns {Object} Result with success, channel, error
 */
export async function setSlowmode(channel, seconds, context = {}) {
  logger.info(`Setting slowmode to ${seconds}s`);
  
  if (!channel) {
    return { success: false, error: 'Channel not provided' };
  }
  
  if (channel.type !== ChannelType.GuildText) {
    return { success: false, error: 'Can only set slowmode on text channels' };
  }

  const duration = Math.max(0, Math.min(21600, parseInt(seconds) || 0)); // Max 6 hours

  try {
    await channel.setRateLimitPerUser(duration, `Slowmode set by ${context.executorName || 'system'} via server admin`);

    logAudit({
      userId: context.executorId || 'system',
      username: context.executorName || 'system',
      type: 'discord_channel',
      intent: 'slowmode',
      command: `Set slowmode ${duration}s for ${channel.name}`,
      target: { channelId: channel.id, channelName: channel.name, seconds: duration },
      guildId: channel.guild?.id,
      success: true
    });

    logger.info(`Successfully set slowmode to ${duration}s for channel "${channel.name}"`);
    
    return {
      success: true,
      channel: { id: channel.id, name: channel.name, slowmode: duration },
      message: duration > 0 
        ? `Set slowmode to ${duration} seconds in #${channel.name}`
        : `Disabled slowmode in #${channel.name}`
    };

  } catch (error) {
    logger.error(`Failed to set slowmode: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * List all channels in the guild
 * @param {Guild} guild - Discord guild
 * @returns {Object} Result with success, channels, error
 */
export async function listChannels(guild) {
  if (!guild) {
    return { success: false, error: 'Guild not provided' };
  }

  try {
    const channels = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice)
      .sort((a, b) => a.position - b.position)
      .map(c => ({
        id: c.id,
        name: c.name,
        type: c.type === ChannelType.GuildVoice ? 'voice' : 'text',
        parentId: c.parentId,
        position: c.position
      }));

    return {
      success: true,
      channels,
      totalCount: channels.length,
      message: `Found ${channels.length} channels`
    };

  } catch (error) {
    logger.error(`Failed to list channels: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Export helper functions for testing
export { findChannel, canManageChannels };

export default {
  createChannel,
  deleteChannel,
  renameChannel,
  moveChannel,
  setTopic,
  lockChannel,
  unlockChannel,
  setSlowmode,
  listChannels,
  findChannel,
  canManageChannels
};
