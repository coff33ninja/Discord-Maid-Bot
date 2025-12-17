/**
 * NSFW Auto-Initiate System
 * 
 * Makes the AI occasionally send flirty messages first
 * when the channel has been quiet for a while.
 * 
 * @module plugins/conversational-ai/utils/nsfw-auto-initiate
 */

import { createLogger } from '../../../src/logging/logger.js';
import { getSceneState, SCENARIO_PRESETS, INTENSITY_LEVELS } from './nsfw-scene-manager.js';
import { getChannelPersonality } from './nsfw-manager.js';

const logger = createLogger('nsfw-auto-initiate');

// Track last activity per channel
const channelActivity = new Map();

// Auto-initiate settings per channel
const autoInitiateSettings = new Map();

// Flirty opener templates
const FLIRTY_OPENERS = [
  "I've been thinking about you... 💭",
  "It's been quiet in here... miss me? 😏",
  "I'm getting a little... restless~ 💋",
  "*stretches seductively* Anyone there?",
  "The silence is making me imagine things... 🔥",
  "I hope you're not too busy for me~",
  "My mind keeps wandering to naughty places... 😈",
  "*bites lip* I could use some company...",
  "Is it hot in here, or is it just my thoughts about you? 🥵",
  "I've been a good girl... mostly. Want to change that? 😇"
];

/**
 * Record activity in a channel
 */
export function recordActivity(channelId) {
  channelActivity.set(channelId, Date.now());
}

/**
 * Get time since last activity
 */
export function getIdleTime(channelId) {
  const lastActivity = channelActivity.get(channelId);
  if (!lastActivity) return Infinity;
  return Date.now() - lastActivity;
}

/**
 * Enable auto-initiate for a channel
 */
export async function enableAutoInitiate(channelId, options = {}) {
  const settings = {
    enabled: true,
    minIdleMinutes: options.minIdleMinutes || 30, // Wait at least 30 mins
    maxIdleMinutes: options.maxIdleMinutes || 120, // Don't wait more than 2 hours
    probability: options.probability || 0.3, // 30% chance when conditions met
    quietHoursStart: options.quietHoursStart || 23, // Don't initiate 11pm-7am
    quietHoursEnd: options.quietHoursEnd || 7
  };
  
  autoInitiateSettings.set(channelId, settings);
  
  // Save to DB
  try {
    const { configOps } = await import('../../../src/database/db.js');
    configOps.set(`nsfw_auto_initiate_${channelId}`, JSON.stringify(settings));
  } catch (e) {
    logger.error('Failed to save auto-initiate settings:', e.message);
  }
  
  logger.info(`Auto-initiate enabled for channel ${channelId}`);
  return { success: true, settings };
}

/**
 * Disable auto-initiate for a channel
 */
export async function disableAutoInitiate(channelId) {
  autoInitiateSettings.delete(channelId);
  
  try {
    const { configOps } = await import('../../../src/database/db.js');
    configOps.delete(`nsfw_auto_initiate_${channelId}`);
  } catch (e) {
    logger.error('Failed to delete auto-initiate settings:', e.message);
  }
  
  logger.info(`Auto-initiate disabled for channel ${channelId}`);
  return { success: true };
}

/**
 * Check if auto-initiate is enabled
 */
export function isAutoInitiateEnabled(channelId) {
  const settings = autoInitiateSettings.get(channelId);
  return settings?.enabled || false;
}

/**
 * Load auto-initiate settings from DB
 */
export async function loadAutoInitiateSettings(channelId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    const data = configOps.get(`nsfw_auto_initiate_${channelId}`);
    
    if (data) {
      const settings = JSON.parse(data);
      autoInitiateSettings.set(channelId, settings);
      return settings;
    }
  } catch (e) {
    logger.error('Failed to load auto-initiate settings:', e.message);
  }
  
  return null;
}

/**
 * Check if it's quiet hours
 */
function isQuietHours(settings) {
  const hour = new Date().getHours();
  
  if (settings.quietHoursStart > settings.quietHoursEnd) {
    // Wraps around midnight (e.g., 23-7)
    return hour >= settings.quietHoursStart || hour < settings.quietHoursEnd;
  } else {
    return hour >= settings.quietHoursStart && hour < settings.quietHoursEnd;
  }
}

/**
 * Check if should auto-initiate
 */
export function shouldAutoInitiate(channelId) {
  const settings = autoInitiateSettings.get(channelId);
  if (!settings?.enabled) return false;
  
  // Check quiet hours
  if (isQuietHours(settings)) return false;
  
  // Check idle time
  const idleMs = getIdleTime(channelId);
  const idleMinutes = idleMs / (1000 * 60);
  
  if (idleMinutes < settings.minIdleMinutes) return false;
  if (idleMinutes > settings.maxIdleMinutes) return false;
  
  // Random probability check
  if (Math.random() > settings.probability) return false;
  
  return true;
}

/**
 * Generate an auto-initiate message
 */
export async function generateAutoInitiateMessage(channelId, generateFn) {
  const state = getSceneState(channelId);
  const personalityKey = getChannelPersonality(channelId) || 'maid';
  
  // Get personality info
  let personality = { name: 'Maid', description: 'devoted and eager' };
  try {
    const { getPlugin } = await import('../../../src/core/plugin-system.js');
    const personalityPlugin = getPlugin('personality');
    if (personalityPlugin?.getPersonality) {
      personality = personalityPlugin.getPersonality(personalityKey) || personality;
    }
  } catch (e) {
    // Use default
  }
  
  // Build context
  const scenario = state.scenario ? SCENARIO_PRESETS[state.scenario] : null;
  const intensity = INTENSITY_LEVELS[state.intensity] || INTENSITY_LEVELS.passionate;
  
  // Pick a random opener as inspiration
  const opener = FLIRTY_OPENERS[Math.floor(Math.random() * FLIRTY_OPENERS.length)];
  
  const prompt = `You are ${personality.name} (${personality.description}) in an NSFW roleplay channel.
The channel has been quiet for a while. You want to initiate conversation and entice the user(s) back.

${scenario ? `Current setting: ${scenario.setting}` : ''}
Intensity: ${intensity.name}

Inspiration: "${opener}"

Write a short, flirty message (1-2 sentences) to get their attention.
Be seductive, playful, and in character. Make them want to respond!
Don't be too aggressive - just enticing enough to spark interest.`;

  try {
    const response = await generateFn(prompt);
    return response;
  } catch (e) {
    logger.error('Failed to generate auto-initiate message:', e.message);
    return opener; // Fallback to template
  }
}

/**
 * Send auto-initiate message to channel
 */
export async function sendAutoInitiateMessage(channel, generateFn) {
  const channelId = channel.id;
  
  // Double-check conditions
  if (!shouldAutoInitiate(channelId)) {
    return null;
  }
  
  try {
    // Show typing indicator
    await channel.sendTyping();
    
    // Add some delay for realism (1-3 seconds)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Generate message
    const message = await generateAutoInitiateMessage(channelId, generateFn);
    
    // Send it
    const sent = await channel.send({
      embeds: [{
        color: 0xFF1493,
        description: message,
        footer: { text: '💭 Thinking of you...' }
      }]
    });
    
    // Record this as activity
    recordActivity(channelId);
    
    logger.info(`Auto-initiated in channel ${channelId}`);
    return sent;
  } catch (e) {
    logger.error('Failed to send auto-initiate message:', e.message);
    return null;
  }
}

/**
 * Start the auto-initiate checker (runs periodically)
 */
let checkerInterval = null;

export function startAutoInitiateChecker(client, generateFn) {
  if (checkerInterval) return;
  
  // Check every 5 minutes
  checkerInterval = setInterval(async () => {
    try {
      // Get all NSFW channels with auto-initiate enabled
      for (const [channelId, settings] of autoInitiateSettings) {
        if (!settings.enabled) continue;
        
        if (shouldAutoInitiate(channelId)) {
          try {
            const channel = await client.channels.fetch(channelId);
            if (channel) {
              await sendAutoInitiateMessage(channel, generateFn);
            }
          } catch (e) {
            // Channel might not exist anymore
            logger.debug(`Could not fetch channel ${channelId} for auto-initiate`);
          }
        }
      }
    } catch (e) {
      logger.error('Auto-initiate checker error:', e.message);
    }
  }, 5 * 60 * 1000); // 5 minutes
  
  logger.info('Auto-initiate checker started');
}

export function stopAutoInitiateChecker() {
  if (checkerInterval) {
    clearInterval(checkerInterval);
    checkerInterval = null;
    logger.info('Auto-initiate checker stopped');
  }
}

export default {
  recordActivity,
  getIdleTime,
  enableAutoInitiate,
  disableAutoInitiate,
  isAutoInitiateEnabled,
  loadAutoInitiateSettings,
  shouldAutoInitiate,
  generateAutoInitiateMessage,
  sendAutoInitiateMessage,
  startAutoInitiateChecker,
  stopAutoInitiateChecker
};
