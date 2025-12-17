/**
 * AI-Powered Channel Helper
 * 
 * Uses Gemini to intelligently decide:
 * - Channel names with appropriate emojis
 * - Category placement/creation
 * - Permission levels (public/private/admin-only)
 * 
 * @module plugins/conversational-ai/utils/channel-helper
 */

import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('channel-helper');

/**
 * Use AI to decide channel configuration
 * @param {string} purpose - What the channel is for (e.g., "music controls", "admin logs")
 * @param {string} channelType - 'text' or 'voice'
 * @param {Object} context - Additional context (guild name, existing categories, etc.)
 * @returns {Object} Channel configuration
 */
export async function getAIChannelConfig(purpose, channelType = 'text', context = {}) {
  try {
    const { generateWithGemini } = await import('./gemini-client.js');
    
    const prompt = `You are a Discord server organizer. Based on the purpose, suggest a channel configuration.

Purpose: ${purpose}
Channel Type: ${channelType}
Server Name: ${context.guildName || 'Unknown'}
Existing Categories: ${context.existingCategories?.join(', ') || 'None'}

Respond in JSON format ONLY (no markdown, no explanation):
{
  "channelName": "emoji-channel-name",
  "categoryName": "🎵 Category Name",
  "categoryEmoji": "🎵",
  "isPrivate": false,
  "reason": "Brief explanation"
}

Rules:
- Channel names must be lowercase with hyphens, emoji at start
- Category names should have emoji prefix
- isPrivate=true for admin/sensitive channels (logs, alerts, network status)
- isPrivate=false for user-facing channels (music, games, general)
- Pick appropriate emojis that match the purpose
- If purpose relates to admin/logs/network/alerts, make it private
- If purpose relates to music/games/fun, make it public`;

    const response = await generateWithGemini(prompt, { maxTokens: 200 });
    
    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const config = JSON.parse(jsonMatch[0]);
      logger.info(`AI suggested channel config for "${purpose}": ${config.channelName} in ${config.categoryName}`);
      return config;
    }
    
    // Fallback if AI response is invalid
    return getDefaultConfig(purpose, channelType);
    
  } catch (error) {
    logger.error('AI channel config failed:', error.message);
    return getDefaultConfig(purpose, channelType);
  }
}

/**
 * Fallback configuration when AI is unavailable
 */
function getDefaultConfig(purpose, channelType) {
  const purposeLower = purpose.toLowerCase();
  
  // Check for privacy indicators
  const isPrivate = purposeLower.includes('admin') || 
                    purposeLower.includes('private') || 
                    purposeLower.includes('staff') ||
                    purposeLower.includes('mod') ||
                    purposeLower.includes('log') ||
                    purposeLower.includes('alert') ||
                    purposeLower.includes('network');
  
  // Clean up the purpose to extract channel name
  let cleanName = purpose
    .toLowerCase()
    .replace(/\b(for|the|a|an|only|channel|admins?|staff|mods?|private|public)\b/gi, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')  // Remove leading/trailing hyphens
    .replace(/-+/g, '-');     // Collapse multiple hyphens
  
  // If name is empty after cleaning, use a default
  if (!cleanName || cleanName.length < 2) {
    cleanName = 'new-channel';
  }
  
  // Determine category and emoji based on keywords
  let config = {
    channelName: cleanName,
    categoryName: '🤖 Bot',
    categoryEmoji: '🤖',
    isPrivate: isPrivate,
    reason: 'Default configuration (AI unavailable)'
  };
  
  // Add appropriate emoji prefix to channel name
  let emoji = '📌';
  
  if (purposeLower.includes('music') || purposeLower.includes('audio')) {
    config.categoryName = '🎵 Music';
    config.categoryEmoji = '🎵';
    emoji = '🎵';
    if (channelType === 'voice') {
      config.channelName = '🎵 Music 24/7';
    }
  } else if (purposeLower.includes('test')) {
    config.categoryName = isPrivate ? '🔒 Admin' : '🤖 Bot';
    emoji = '🧪';
  } else if (purposeLower.includes('log')) {
    config.categoryName = '🔒 Admin';
    config.categoryEmoji = '🔒';
    config.isPrivate = true;
    emoji = '📋';
  } else if (purposeLower.includes('alert') || purposeLower.includes('notification')) {
    config.categoryName = '🚨 Alerts';
    config.categoryEmoji = '🚨';
    config.isPrivate = true;
    emoji = '🚨';
  } else if (purposeLower.includes('network') || purposeLower.includes('device')) {
    config.categoryName = '📡 Network';
    config.categoryEmoji = '📡';
    config.isPrivate = true;
    emoji = '📡';
  } else if (purposeLower.includes('game')) {
    config.categoryName = '🎮 Games';
    config.categoryEmoji = '🎮';
    emoji = '🎮';
  } else if (isPrivate) {
    config.categoryName = '🔒 Admin';
    config.categoryEmoji = '🔒';
    emoji = '🔒';
  }
  
  // Add emoji to channel name if not already there
  if (!config.channelName.match(/^[\p{Emoji}]/u)) {
    config.channelName = `${emoji}-${config.channelName}`;
  }
  
  return config;
}

/**
 * Find or create a category in a guild
 * @param {Guild} guild - Discord guild
 * @param {string} categoryName - Category name (with emoji)
 * @param {boolean} isPrivate - Whether category should be private
 * @returns {CategoryChannel} The category
 */
export async function findOrCreateCategory(guild, categoryName, isPrivate = false) {
  // Try to find existing category (case-insensitive, ignore emoji differences)
  const baseName = categoryName.replace(/^[\p{Emoji}\s]+/u, '').trim().toLowerCase();
  
  let category = guild.channels.cache.find(c => 
    c.type === ChannelType.GuildCategory && 
    c.name.toLowerCase().includes(baseName)
  );
  
  if (category) {
    logger.info(`Found existing category: ${category.name}`);
    return category;
  }
  
  // Create new category
  logger.info(`Creating category: ${categoryName} (private: ${isPrivate})`);
  
  const permissionOverwrites = [];
  
  if (isPrivate) {
    // Private: deny @everyone, allow admins
    permissionOverwrites.push({
      id: guild.id, // @everyone role
      deny: [PermissionFlagsBits.ViewChannel]
    });
    
    // Find admin role and allow
    const adminRole = guild.roles.cache.find(r => 
      r.permissions.has(PermissionFlagsBits.Administrator) && r.name !== '@everyone'
    );
    if (adminRole) {
      permissionOverwrites.push({
        id: adminRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
      });
    }
  }
  
  category = await guild.channels.create({
    name: categoryName,
    type: ChannelType.GuildCategory,
    permissionOverwrites,
    reason: 'Bot auto-created category'
  });
  
  return category;
}

/**
 * Create a channel with AI-decided configuration
 * @param {Guild} guild - Discord guild
 * @param {string} purpose - What the channel is for
 * @param {string} channelType - 'text' or 'voice'
 * @param {Object} options - Additional options
 * @returns {Object} { channel, category, config }
 */
export async function createSmartChannel(guild, purpose, channelType = 'text', options = {}) {
  // Get existing categories for context
  const existingCategories = guild.channels.cache
    .filter(c => c.type === ChannelType.GuildCategory)
    .map(c => c.name);
  
  // Get AI configuration
  const config = await getAIChannelConfig(purpose, channelType, {
    guildName: guild.name,
    existingCategories
  });
  
  // Find or create category
  const category = await findOrCreateCategory(guild, config.categoryName, config.isPrivate);
  
  // Check if channel already exists in category
  let channel = category.children.cache.find(c => 
    c.name.toLowerCase() === config.channelName.toLowerCase().replace(/\s+/g, '-')
  );
  
  if (channel) {
    logger.info(`Found existing channel: ${channel.name}`);
    return { channel, category, config, existed: true };
  }
  
  // Create the channel
  const discordChannelType = channelType === 'voice' 
    ? ChannelType.GuildVoice 
    : ChannelType.GuildText;
  
  logger.info(`Creating channel: ${config.channelName} in ${category.name}`);
  
  channel = await guild.channels.create({
    name: config.channelName,
    type: discordChannelType,
    parent: category.id,
    topic: options.topic || `${purpose} - Created by bot`,
    reason: config.reason || 'Bot auto-created channel'
  });
  
  return { channel, category, config, existed: false };
}

/**
 * Get channel suggestions for a purpose (without creating)
 */
export async function suggestChannelConfig(purpose, channelType = 'text') {
  return await getAIChannelConfig(purpose, channelType, {});
}

export default {
  createSmartChannel,
  findOrCreateCategory,
  getAIChannelConfig,
  suggestChannelConfig
};
