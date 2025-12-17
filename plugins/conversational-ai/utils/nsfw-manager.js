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

// Cache for NSFW channels to avoid repeated DB reads
let nsfwChannelCache = new Map();
const CACHE_TTL = 30000; // 30 seconds
let cacheTimestamps = new Map();

// Pre-loaded configOps reference (set during first async call)
let configOpsRef = null;

/**
 * Initialize the configOps reference (call this early)
 */
export async function initNsfwManager() {
  if (!configOpsRef) {
    const { configOps } = await import('../../../src/database/db.js');
    configOpsRef = configOps;
  }
}

/**
 * Get all NSFW-enabled channel IDs for a guild (sync version with caching)
 * @param {string} guildId - Guild ID
 * @returns {string[]} Array of channel IDs
 */
export function getNsfwChannels(guildId) {
  // Check cache first
  const cacheTime = cacheTimestamps.get(guildId) || 0;
  if (Date.now() < cacheTime + CACHE_TTL && nsfwChannelCache.has(guildId)) {
    return nsfwChannelCache.get(guildId);
  }
  
  // If configOps is loaded, use it synchronously
  if (configOpsRef) {
    try {
      const channels = configOpsRef.get(`${NSFW_CONFIG_KEY}_${guildId}`);
      const result = channels ? JSON.parse(channels) : [];
      
      // Update cache
      nsfwChannelCache.set(guildId, result);
      cacheTimestamps.set(guildId, Date.now());
      
      return result;
    } catch (e) {
      logger.error('Failed to get NSFW channels:', e.message);
      return nsfwChannelCache.get(guildId) || [];
    }
  }
  
  // Return cached value or empty if not initialized yet
  return nsfwChannelCache.get(guildId) || [];
}

/**
 * Get all NSFW-enabled channel IDs for a guild (async version)
 * @param {string} guildId - Guild ID
 * @returns {Promise<string[]>} Array of channel IDs
 */
export async function getNsfwChannelsAsync(guildId) {
  try {
    // Ensure configOps is loaded
    if (!configOpsRef) {
      await initNsfwManager();
    }
    
    const channels = configOpsRef.get(`${NSFW_CONFIG_KEY}_${guildId}`);
    const result = channels ? JSON.parse(channels) : [];
    
    // Update cache
    nsfwChannelCache.set(guildId, result);
    cacheTimestamps.set(guildId, Date.now());
    
    return result;
  } catch (e) {
    logger.error('Failed to get NSFW channels:', e.message);
    return [];
  }
}

/**
 * Check if a channel is NSFW-unlocked (sync version)
 * @param {string} guildId - Guild ID
 * @param {string} channelId - Channel ID
 * @returns {boolean}
 */
export function isNsfwChannel(guildId, channelId) {
  const channels = getNsfwChannels(guildId);
  return channels.includes(channelId);
}

/**
 * Check if a channel is NSFW-unlocked (async version)
 * @param {string} guildId - Guild ID
 * @param {string} channelId - Channel ID
 * @returns {Promise<boolean>}
 */
export async function isNsfwChannelAsync(guildId, channelId) {
  const channels = await getNsfwChannelsAsync(guildId);
  return channels.includes(channelId);
}

/**
 * Invalidate the NSFW channel cache (call after enable/disable)
 */
export function invalidateNsfwCache() {
  nsfwChannelCache.clear();
  cacheTimestamps.clear();
}

/**
 * Enable NSFW mode for a channel
 * @param {string} guildId - Guild ID
 * @param {string} channelId - Channel ID
 * @returns {Object} Result with success status
 */
export async function enableNsfw(guildId, channelId) {
  try {
    // Ensure configOps is loaded
    if (!configOpsRef) {
      await initNsfwManager();
    }
    const channels = await getNsfwChannelsAsync(guildId);
    
    if (channels.includes(channelId)) {
      return { success: false, error: 'Channel is already NSFW-unlocked' };
    }
    
    channels.push(channelId);
    configOpsRef.set(`${NSFW_CONFIG_KEY}_${guildId}`, JSON.stringify(channels));
    
    // Invalidate cache
    invalidateNsfwCache();
    
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
    // Ensure configOps is loaded
    if (!configOpsRef) {
      await initNsfwManager();
    }
    const channels = await getNsfwChannelsAsync(guildId);
    
    if (!channels.includes(channelId)) {
      return { success: false, error: 'Channel is not NSFW-unlocked' };
    }
    
    const updated = channels.filter(id => id !== channelId);
    configOpsRef.set(`${NSFW_CONFIG_KEY}_${guildId}`, JSON.stringify(updated));
    
    // Invalidate cache
    invalidateNsfwCache();
    
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

// Cache for channel personalities
let personalityCache = new Map();

/**
 * Get the personality for a specific channel (NSFW channels only) - sync version
 * @param {string} channelId - Channel ID
 * @returns {string|null} Personality key or null if not set
 */
export function getChannelPersonality(channelId) {
  // Check cache first
  if (personalityCache.has(channelId)) {
    return personalityCache.get(channelId);
  }
  
  // If configOps is loaded, use it synchronously
  if (configOpsRef) {
    try {
      const result = configOpsRef.get(`${CHANNEL_PERSONALITY_KEY}_${channelId}`) || null;
      
      // Update cache
      personalityCache.set(channelId, result);
      
      return result;
    } catch (e) {
      logger.error('Failed to get channel personality:', e.message);
      return null;
    }
  }
  
  return null;
}

/**
 * Get the personality for a specific channel (async version)
 * @param {string} channelId - Channel ID
 * @returns {Promise<string|null>} Personality key or null if not set
 */
export async function getChannelPersonalityAsync(channelId) {
  try {
    if (!configOpsRef) {
      await initNsfwManager();
    }
    const result = configOpsRef.get(`${CHANNEL_PERSONALITY_KEY}_${channelId}`) || null;
    
    // Update cache
    personalityCache.set(channelId, result);
    
    return result;
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
    if (!configOpsRef) {
      await initNsfwManager();
    }
    configOpsRef.set(`${CHANNEL_PERSONALITY_KEY}_${channelId}`, personalityKey);
    
    // Update cache
    personalityCache.set(channelId, personalityKey);
    
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
    if (!configOpsRef) {
      await initNsfwManager();
    }
    configOpsRef.delete(`${CHANNEL_PERSONALITY_KEY}_${channelId}`);
    
    // Clear from cache
    personalityCache.delete(channelId);
    
    logger.info(`Channel ${channelId} personality cleared`);
  } catch (e) {
    logger.error('Failed to clear channel personality:', e.message);
  }
}

export default {
  initNsfwManager,
  getNsfwChannels,
  getNsfwChannelsAsync,
  isNsfwChannel,
  isNsfwChannelAsync,
  invalidateNsfwCache,
  enableNsfw,
  disableNsfw,
  getNsfwPromptModifier,
  getChannelPersonality,
  getChannelPersonalityAsync,
  setChannelPersonality,
  clearChannelPersonality
};
