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
    // Use core handler for Gemini via plugin system
    const { getPlugin } = await import('../../../src/core/plugin-system.js');
    const aiPlugin = getPlugin('conversational-ai');
    
    if (!aiPlugin) {
      logger.warn('Conversational AI plugin not available for channel config');
      return getDefaultConfig(purpose, channelType);
    }
    
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
  "description": "Brief channel description for the topic (max 100 chars)",
  "reason": "Brief explanation of your choices"
}

Rules:
- Channel names must be lowercase with hyphens, emoji at start (e.g., "🧪-bot-testing")
- Category names should have emoji prefix (e.g., "🔒 Admin")
- isPrivate=true for admin/sensitive channels (logs, alerts, network status, testing for admins)
- isPrivate=false for user-facing channels (music, games, general)
- Pick appropriate emojis that match the purpose
- If purpose mentions "admin", "private", "staff", "mod", make it private
- If purpose relates to music/games/fun, make it public
- Keep channel names short (2-4 words max)`;

    const { result } = await aiPlugin.requestFromCore('gemini-generate', {
      prompt,
      options: {
        maxOutputTokens: 200,
        temperature: 0.3
      }
    });
    
    const responseText = result?.response?.text?.() || '';
    
    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const config = JSON.parse(jsonMatch[0]);
      logger.info(`AI suggested channel config for "${purpose}": ${config.channelName} in ${config.categoryName}`);
      return config;
    }
    
    // Fallback if AI response is invalid
    logger.warn('AI response did not contain valid JSON for channel config');
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
  
  // Always allow the bot to see and send in channels it creates
  const botMember = guild.members.me;
  if (botMember) {
    permissionOverwrites.push({
      id: botMember.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.AddReactions
      ]
    });
  }
  
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
  
  // Use AI-generated description or fallback
  const topic = config.description || options.topic || `${purpose} - Created by bot`;
  
  // Build permission overwrites - always include bot for private channels
  const permissionOverwrites = [];
  const botMember = guild.members.me;
  
  if (botMember) {
    permissionOverwrites.push({
      id: botMember.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.AddReactions
      ]
    });
  }
  
  // If private, deny @everyone and allow admins
  if (config.isPrivate) {
    permissionOverwrites.push({
      id: guild.id, // @everyone role
      deny: [PermissionFlagsBits.ViewChannel]
    });
    
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
  
  channel = await guild.channels.create({
    name: config.channelName,
    type: discordChannelType,
    parent: category.id,
    topic: topic,
    permissionOverwrites,
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

/**
 * Setup an AI auto-chat channel for a guild
 * In this channel, the bot responds to ALL messages without needing @mention
 * 
 * @param {Guild} guild - Discord guild
 * @param {Object} options - Setup options
 * @param {string} options.categoryName - User-specified category name (optional)
 * @param {string} options.channelName - Custom channel name (optional)
 * @param {boolean} options.nsfw - Enable NSFW mode for this channel
 * @param {Array<string>} options.participants - Array of user IDs to add as participants (for private NSFW)
 * @param {string} options.requesterId - User ID of the person requesting the channel
 * @returns {Object} { channel, category, config }
 */
export async function setupAIChatChannel(guild, options = {}) {
  const { configOps } = await import('../../../src/database/db.js');
  
  const isNsfwChannel = options.nsfw || false;
  const participants = options.participants || [];
  const requesterId = options.requesterId;
  
  // For NSFW with participants, always create a new private channel
  // Don't reuse existing channels
  if (!isNsfwChannel || participants.length === 0) {
    // Check if already has an AI chat channel (only for non-NSFW or NSFW without specific participants)
    const existingConfig = configOps.get(`ai_chat_channel_${guild.id}`);
    if (existingConfig && !isNsfwChannel) {
      try {
        const existingChannel = await guild.channels.fetch(existingConfig);
        if (existingChannel) {
          logger.info(`AI chat channel already exists: ${existingChannel.name}`);
          return { 
            channel: existingChannel, 
            existed: true,
            message: 'AI chat channel already set up!'
          };
        }
      } catch (e) {
        // Channel was deleted, continue to create new one
      }
    }
  }
  
  // Generate channel name based on participants for NSFW
  let channelName = options.channelName || 'chat-with-akeno';
  if (isNsfwChannel && participants.length > 0) {
    // Create unique channel name with participant count
    const participantCount = participants.length + 1; // +1 for requester
    channelName = `nsfw-${participantCount}some-${Date.now().toString(36).slice(-4)}`;
  } else if (isNsfwChannel) {
    channelName = 'nsfw-chat-with-akeno';
  }
  
  // Use user-specified category or default
  const categoryName = options.categoryName || (isNsfwChannel ? '🔞 NSFW' : '🤖 Bot');
  
  // Find or create the category (NSFW channels are private)
  const category = await findOrCreateCategory(guild, categoryName, isNsfwChannel);
  
  // Build permission overwrites for the channel
  const permissionOverwrites = [];
  
  // Always allow the bot
  const botMember = guild.members.me;
  if (botMember) {
    permissionOverwrites.push({
      id: botMember.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.ManageMessages // For clearing messages on personality change
      ]
    });
  }
  
  // For NSFW with participants, make it private to only those users
  if (isNsfwChannel && (participants.length > 0 || requesterId)) {
    // Deny @everyone
    permissionOverwrites.push({
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel]
    });
    
    // Allow the requester
    if (requesterId) {
      permissionOverwrites.push({
        id: requesterId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    }
    
    // Allow each participant
    for (const participantId of participants) {
      permissionOverwrites.push({
        id: participantId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    }
  }
  
  // Create the channel
  const topic = isNsfwChannel 
    ? `🔞 Private NSFW chat room. Only invited participants can see this channel.`
    : `💬 This is my chat room! Talk to me here without @mentioning - I'll respond to every message.`;
  
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: topic,
    nsfw: isNsfwChannel, // Mark as NSFW in Discord
    permissionOverwrites: permissionOverwrites.length > 0 ? permissionOverwrites : undefined,
    reason: isNsfwChannel 
      ? `NSFW AI chat channel for ${participants.length + 1} participants`
      : 'AI chat channel - bot responds to all messages here'
  });
  
  // Save this channel as the AI auto-respond channel for this guild (only for non-participant NSFW)
  if (!isNsfwChannel || participants.length === 0) {
    configOps.set(`ai_chat_channel_${guild.id}`, channel.id);
  }
  
  // Enable NSFW mode in our system if requested
  if (isNsfwChannel) {
    try {
      const { enableNsfw } = await import('./nsfw-manager.js');
      await enableNsfw(guild.id, channel.id);
      logger.info(`NSFW mode enabled for new channel ${channel.name}`);
    } catch (e) {
      logger.warn('Could not enable NSFW mode:', e.message);
    }
  }
  
  // Send welcome message
  try {
    let welcomeEmbed;
    
    if (isNsfwChannel && participants.length > 0) {
      // Multi-participant NSFW welcome
      const participantMentions = participants.map(id => `<@${id}>`).join(', ');
      const requesterMention = requesterId ? `<@${requesterId}>` : 'you';
      
      welcomeEmbed = {
        color: 0xFF1493, // Deep pink
        title: '🔞 Private NSFW Room Created!',
        description: `Welcome to your private room!\n\n` +
          `**Participants:** ${requesterMention}${participants.length > 0 ? ', ' + participantMentions : ''}\n\n` +
          `This is a private NSFW channel where I can be much more... expressive~ 💋\n\n` +
          `**Rules:**\n` +
          `• Only invited participants can see this channel\n` +
          `• I respond to every message - no @mention needed\n` +
          `• Use the personality dropdown above to change my character\n` +
          `• Have fun and be respectful to each other! 🔥`,
        footer: { text: `${participants.length + 1} participants • NSFW enabled` },
        timestamp: new Date().toISOString()
      };
    } else if (isNsfwChannel) {
      // Solo NSFW welcome
      welcomeEmbed = {
        color: 0xFF1493,
        title: '🔞 NSFW Chat Room Created!',
        description: `Welcome to your private NSFW room!\n\n` +
          `In this channel, I can be much more... expressive~ 💋\n\n` +
          `**How to use:**\n` +
          `• Just type normally - no @mention needed\n` +
          `• Use the personality dropdown to change my character\n` +
          `• I'll remember our conversation context\n` +
          `• Let's have some fun! 🔥`,
        footer: { text: 'NSFW enabled • Your naughty AI assistant' },
        timestamp: new Date().toISOString()
      };
    } else {
      // Normal welcome
      welcomeEmbed = {
        color: 0x667eea,
        title: '💬 Welcome to my Chat Room!',
        description: `Hey there! This is my personal chat channel. You can talk to me here without using @mentions - I'll respond to every message!\n\n` +
          `**How to use:**\n` +
          `• Just type normally - no need to @mention me\n` +
          `• I remember our conversation context\n` +
          `• Ask me anything or just chat!\n\n` +
          `**Tips:**\n` +
          `• For commands, you can still use @mention in other channels\n` +
          `• I'm here 24/7, so feel free to drop by anytime\n` +
          `• Be nice and have fun! 🎉`,
        footer: { text: 'Your friendly AI assistant' },
        timestamp: new Date().toISOString()
      };
    }
    
    await channel.send({ embeds: [welcomeEmbed] });
    
    // For NSFW channels, also send the personality selector and intro
    if (isNsfwChannel) {
      try {
        const { sendPersonalitySelector, sendNsfwIntroMessage } = await import('./nsfw-personality-selector.js');
        await sendPersonalitySelector(channel, 'maid');
        
        // Get AI plugin for intro message
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        if (aiPlugin?.requestFromCore) {
          const generateFn = async (prompt) => {
            const genResult = await aiPlugin.requestFromCore('gemini-generate', { prompt });
            return genResult?.result?.response?.text?.() || genResult?.text || 'Hello~ Ready to play?';
          };
          
          await sendNsfwIntroMessage(channel, { 
            guild, 
            generateFn, 
            personalityKey: 'maid',
            userId: requesterId
          });
        }
      } catch (e) {
        logger.warn('Could not send NSFW components:', e.message);
      }
    }
  } catch (e) {
    logger.warn('Could not send welcome message:', e.message);
  }
  
  logger.info(`Created AI chat channel: ${channel.name} in category ${category.name} for ${guild.name}` +
    (isNsfwChannel ? ` (NSFW, ${participants.length + 1} participants)` : ''));
  
  return {
    channel,
    category,
    config: {
      isAIChatChannel: true,
      channelName: channel.name,
      categoryName: category.name,
      isNsfw: isNsfwChannel,
      participants: participants.length > 0 ? [requesterId, ...participants].filter(Boolean) : []
    },
    existed: false
  };
}

/**
 * Check if a channel is an AI auto-chat channel
 * @param {string} guildId - Guild ID
 * @param {string} channelId - Channel ID
 * @returns {boolean}
 */
export async function isAIChatChannel(guildId, channelId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    const savedChannelId = configOps.get(`ai_chat_channel_${guildId}`);
    return savedChannelId === channelId;
  } catch (e) {
    return false;
  }
}

/**
 * Get the AI chat channel for a guild
 * @param {string} guildId - Guild ID
 * @returns {string|null} Channel ID or null
 */
export async function getAIChatChannelId(guildId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    return configOps.get(`ai_chat_channel_${guildId}`) || null;
  } catch (e) {
    return null;
  }
}

/**
 * Remove AI chat channel config (when channel is deleted)
 * @param {string} guildId - Guild ID
 */
export async function removeAIChatChannel(guildId) {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    configOps.delete(`ai_chat_channel_${guildId}`);
    logger.info(`Removed AI chat channel config for guild ${guildId}`);
  } catch (e) {
    logger.error('Failed to remove AI chat channel config:', e.message);
  }
}

export default {
  createSmartChannel,
  findOrCreateCategory,
  getAIChannelConfig,
  suggestChannelConfig,
  setupAIChatChannel,
  isAIChatChannel,
  getAIChatChannelId,
  removeAIChatChannel
};
