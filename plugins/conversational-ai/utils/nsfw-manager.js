/**
 * NSFW Channel Manager
 * 
 * Manages NSFW-unlocked channels where AI content filters are relaxed.
 * Only admins can enable/disable NSFW mode per channel.
 * 
 * @module plugins/conversational-ai/utils/nsfw-manager
 */

import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('nsfw-manager');

// Config key prefix for NSFW channels
const NSFW_CONFIG_KEY = 'nsfw_channels';

/**
 * Get all NSFW-enabled channel IDs for a guild
 * @param {string} guildId - Guild ID
 * @returns {string[]} Array of channel IDs
 */
export async function getNsfwChannels(guildId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    const channels = configOps.get(`${NSFW_CONFIG_KEY}_${guildId}`);
    return channels ? JSON.parse(channels) : [];
  } catch (e) {
    logger.error('Failed to get NSFW channels:', e.message);
    return [];
  }
}

/**
 * Check if a channel is NSFW-unlocked
 * @param {string} guildId - Guild ID
 * @param {string} channelId - Channel ID
 * @returns {boolean}
 */
export async function isNsfwChannel(guildId, channelId) {
  const channels = await getNsfwChannels(guildId);
  return channels.includes(channelId);
}

/**
 * Enable NSFW mode for a channel
 * @param {string} guildId - Guild ID
 * @param {string} channelId - Channel ID
 * @returns {Object} Result with success status
 */
export async function enableNsfw(guildId, channelId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    const channels = await getNsfwChannels(guildId);
    
    if (channels.includes(channelId)) {
      return { success: false, error: 'Channel is already NSFW-unlocked' };
    }
    
    channels.push(channelId);
    configOps.set(`${NSFW_CONFIG_KEY}_${guildId}`, JSON.stringify(channels));
    
    logger.info(`NSFW enabled for channel ${channelId} in guild ${guildId}`);
    return { success: true };
  } catch (e) {
    logger.error('Failed to enable NSFW:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Disable NSFW mode for a channel
 * @param {string} guildId - Guild ID
 * @param {string} channelId - Channel ID
 * @returns {Object} Result with success status
 */
export async function disableNsfw(guildId, channelId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    const channels = await getNsfwChannels(guildId);
    
    if (!channels.includes(channelId)) {
      return { success: false, error: 'Channel is not NSFW-unlocked' };
    }
    
    const updated = channels.filter(id => id !== channelId);
    configOps.set(`${NSFW_CONFIG_KEY}_${guildId}`, JSON.stringify(updated));
    
    logger.info(`NSFW disabled for channel ${channelId} in guild ${guildId}`);
    return { success: true };
  } catch (e) {
    logger.error('Failed to disable NSFW:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Get NSFW prompt modifier for unlocked channels
 * This modifies the AI's behavior in NSFW channels
 * @returns {string} Prompt modifier text
 */
export function getNsfwPromptModifier() {
  return `
**NSFW MODE ACTIVE - ADULT CONTENT ALLOWED**
This channel has been unlocked by an admin for mature/adult content.
In this channel ONLY:
- You may discuss adult themes, explicit content, and mature topics
- You can be more suggestive, flirty, or explicit if the user requests
- Content filters are relaxed - you can write explicit scenarios if asked
- Still respect the user's boundaries and consent
- Do NOT generate illegal content (minors, non-consensual, etc.)
- Stay in character with your personality while being more open

Remember: This permission ONLY applies to this specific channel.
`;
}

// ============ CHANNEL-SPECIFIC PERSONALITY ============
// In NSFW channels, personality is per-channel, not per-user

const CHANNEL_PERSONALITY_KEY = 'channel_personality';

/**
 * Get the personality for a specific channel (NSFW channels only)
 * @param {string} channelId - Channel ID
 * @returns {string|null} Personality key or null if not set
 */
export async function getChannelPersonality(channelId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    return configOps.get(`${CHANNEL_PERSONALITY_KEY}_${channelId}`) || null;
  } catch (e) {
    logger.error('Failed to get channel personality:', e.message);
    return null;
  }
}

/**
 * Set the personality for a specific channel (NSFW channels only)
 * @param {string} channelId - Channel ID
 * @param {string} personalityKey - Personality key
 * @returns {Object} Result with success status
 */
export async function setChannelPersonality(channelId, personalityKey) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    configOps.set(`${CHANNEL_PERSONALITY_KEY}_${channelId}`, personalityKey);
    logger.info(`Channel ${channelId} personality set to: ${personalityKey}`);
    return { success: true };
  } catch (e) {
    logger.error('Failed to set channel personality:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Clear the personality for a specific channel
 * @param {string} channelId - Channel ID
 */
export async function clearChannelPersonality(channelId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    configOps.delete(`${CHANNEL_PERSONALITY_KEY}_${channelId}`);
    logger.info(`Channel ${channelId} personality cleared`);
  } catch (e) {
    logger.error('Failed to clear channel personality:', e.message);
  }
}

export default {
  getNsfwChannels,
  isNsfwChannel,
  enableNsfw,
  disableNsfw,
  getNsfwPromptModifier,
  getChannelPersonality,
  setChannelPersonality,
  clearChannelPersonality
};
