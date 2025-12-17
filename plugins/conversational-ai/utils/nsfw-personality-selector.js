/**
 * NSFW Personality Selector
 * 
 * Creates a pinned message with a dropdown to select personality
 * in NSFW channels. Personality is channel-specific.
 * 
 * @module plugins/conversational-ai/utils/nsfw-personality-selector
 */

import { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('nsfw-personality-selector');

// Config key for storing the selector message ID
const SELECTOR_MESSAGE_KEY = 'nsfw_personality_selector';

/**
 * Get all personalities from the personality plugin
 * @returns {Array} Array of personality options
 */
async function getPersonalities() {
  try {
    const { getPlugin } = await import('../../../src/core/plugin-system.js');
    const personalityPlugin = getPlugin('personality');
    if (personalityPlugin?.getPersonalityOptions) {
      return personalityPlugin.getPersonalityOptions();
    }
  } catch (e) {
    logger.warn('Could not load personalities from plugin:', e.message);
  }
  
  // Fallback
  return [
    { key: 'maid', name: 'Devoted Maid', emoji: '🌸', description: 'Polite and eager to serve' },
    { key: 'tsundere', name: 'Tsundere', emoji: '💢', description: 'Reluctantly helpful' },
    { key: 'yandere', name: 'Yandere', emoji: '🖤', description: 'Obsessively devoted' },
    { key: 'oneesan', name: 'Onee-san', emoji: '💋', description: 'Mature big sister type' },
    { key: 'catgirl', name: 'Catgirl', emoji: '🐱', description: 'Playful and cat-like' }
  ];
}

/**
 * Create the personality selector embed and dropdown
 * @param {string} currentPersonality - Currently selected personality key
 * @returns {Object} { embed, components }
 */
export async function createPersonalitySelector(currentPersonality = 'maid') {
  const personalities = await getPersonalities();
  
  // Build the dropdown options
  const options = personalities.map(p => ({
    label: p.name,
    description: p.description?.slice(0, 100) || 'No description',
    value: p.key,
    emoji: p.emoji,
    default: p.key === currentPersonality
  }));
  
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('nsfw_personality_select')
    .setPlaceholder('🎭 Select a personality...')
    .addOptions(options);
  
  const row = new ActionRowBuilder().addComponents(selectMenu);
  
  const currentP = personalities.find(p => p.key === currentPersonality) || personalities[0];
  
  const embed = new EmbedBuilder()
    .setColor(0xFF69B4) // Hot pink for NSFW
    .setTitle('🔞 NSFW Channel - Personality Selector')
    .setDescription(
      `**Current Personality:** ${currentP.emoji} ${currentP.name}\n\n` +
      `Use the dropdown below to change my personality for this channel.\n` +
      `This setting only affects THIS channel and won't change your preferences elsewhere.\n\n` +
      `_In NSFW mode, I can be much more... expressive~ 💋_`
    )
    .setFooter({ text: 'Personality changes are instant • Only admins can enable/disable NSFW' });
  
  return { embed, components: [row] };
}

/**
 * Send or update the personality selector in a channel
 * @param {TextChannel} channel - Discord channel
 * @param {string} currentPersonality - Current personality key
 * @returns {Message} The selector message
 */
export async function sendPersonalitySelector(channel, currentPersonality = 'maid') {
  const { configOps } = await import('../../../src/database/db.js');
  const { embed, components } = await createPersonalitySelector(currentPersonality);
  
  // Check if we already have a selector message
  const existingMessageId = configOps.get(`${SELECTOR_MESSAGE_KEY}_${channel.id}`);
  
  if (existingMessageId) {
    try {
      const existingMessage = await channel.messages.fetch(existingMessageId);
      if (existingMessage) {
        // Update existing message
        await existingMessage.edit({ embeds: [embed], components });
        return existingMessage;
      }
    } catch (e) {
      // Message was deleted, create new one
    }
  }
  
  // Send new message
  const message = await channel.send({ embeds: [embed], components });
  
  // Try to pin it
  try {
    await message.pin();
  } catch (e) {
    logger.warn('Could not pin personality selector:', e.message);
  }
  
  // Save message ID
  configOps.set(`${SELECTOR_MESSAGE_KEY}_${channel.id}`, message.id);
  
  return message;
}

/**
 * Handle personality selection from dropdown
 * @param {Interaction} interaction - Discord interaction
 */
export async function handlePersonalitySelect(interaction) {
  if (!interaction.isStringSelectMenu()) return false;
  if (interaction.customId !== 'nsfw_personality_select') return false;
  
  const selectedKey = interaction.values[0];
  const channelId = interaction.channelId;
  
  try {
    // Set channel-specific personality
    const { setChannelPersonality } = await import('./nsfw-manager.js');
    await setChannelPersonality(channelId, selectedKey);
    
    // Get personality info
    const personalities = await getPersonalities();
    const selected = personalities.find(p => p.key === selectedKey);
    
    // Update the selector message
    const { embed, components } = await createPersonalitySelector(selectedKey);
    await interaction.update({ embeds: [embed], components });
    
    // Send confirmation (ephemeral)
    await interaction.followUp({
      content: `${selected?.emoji || '🎭'} Personality changed to **${selected?.name || selectedKey}** for this channel!`,
      ephemeral: true
    });
    
    logger.info(`Personality changed to ${selectedKey} in channel ${channelId}`);
    return true;
  } catch (error) {
    logger.error('Failed to handle personality select:', error);
    await interaction.reply({
      content: '❌ Failed to change personality. Please try again.',
      ephemeral: true
    });
    return true;
  }
}

/**
 * Remove the personality selector from a channel
 * @param {TextChannel} channel - Discord channel
 */
export async function removePersonalitySelector(channel) {
  const { configOps } = await import('../../../src/database/db.js');
  const messageId = configOps.get(`${SELECTOR_MESSAGE_KEY}_${channel.id}`);
  
  if (messageId) {
    try {
      const message = await channel.messages.fetch(messageId);
      if (message) {
        await message.delete();
      }
    } catch (e) {
      // Message already deleted
    }
    
    configOps.delete(`${SELECTOR_MESSAGE_KEY}_${channel.id}`);
  }
}

/**
 * Send an AI-generated intro message when NSFW mode is enabled
 * Checks who's online and invites users to start a scenario
 * @param {TextChannel} channel - Discord channel
 * @param {Object} options - Options
 * @param {Object} options.guild - Discord guild
 * @param {Function} options.generateFn - AI generation function
 * @param {string} options.personalityKey - Current personality key
 */
export async function sendNsfwIntroMessage(channel, { guild, generateFn, personalityKey = 'maid' }) {
  logger.info('sendNsfwIntroMessage: Starting...');
  try {
    // Get personality info first (fast)
    const personalities = await getPersonalities();
    const personality = personalities.find(p => p.key === personalityKey) || personalities[0];
    logger.debug(`sendNsfwIntroMessage: Using personality ${personality?.name}`);
    
    // Try to get online member count, but don't block on it
    let onlineCount = 1; // Default to solo
    let onlineNames = [];
    
    try {
      // Use cached members if available, with a short timeout
      const cachedMembers = guild.members.cache;
      if (cachedMembers.size > 0) {
        const onlineMembers = cachedMembers.filter(m => 
          !m.user.bot && 
          (m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd') &&
          channel.permissionsFor(m)?.has('ViewChannel')
        );
        onlineCount = onlineMembers.size || 1;
        onlineNames = onlineMembers.map(m => m.displayName).slice(0, 5);
        logger.debug(`sendNsfwIntroMessage: ${onlineCount} online members from cache`);
      }
    } catch (e) {
      logger.debug('sendNsfwIntroMessage: Could not get member count, using default');
    }
    
    // Build context for AI intro
    const isGroupPlay = onlineCount > 1;
    const introPrompt = `You are ${personality.name} (${personality.description}). 
NSFW mode was just enabled in this channel. You need to greet the users and invite them to start a roleplay scenario.

**Channel Info:**
- Online users who can see this channel: ${onlineCount}
${onlineNames.length > 0 ? `- Some names: ${onlineNames.join(', ')}` : ''}
- This is ${isGroupPlay ? 'a potential GROUP play scenario (multiple users online)' : 'likely a SOLO play scenario (one user)'}

**Your Task:**
1. Greet in character as ${personality.name}
2. Acknowledge ${isGroupPlay ? 'that multiple people are here and group play is possible' : 'the user'}
3. Ask what kind of scenario they'd like to explore
4. Offer a few sexy/naughty scenario suggestions fitting your personality
5. Be flirty and inviting - this is NSFW so be suggestive!
6. If group play is possible, mention threesome/group scenarios as an option

Keep it to 2-3 short paragraphs. Be in character and seductive!`;

    // Show typing indicator while generating
    await channel.sendTyping();
    
    // Generate the intro
    logger.debug('sendNsfwIntroMessage: Calling generateFn...');
    const introResponse = await generateFn(introPrompt);
    logger.debug(`sendNsfwIntroMessage: Got response (${introResponse?.length || 0} chars)`);
    
    // Send as an embed
    const { EmbedBuilder } = await import('discord.js');
    const embed = new EmbedBuilder()
      .setColor(0xFF1493) // Deep pink
      .setDescription(introResponse)
      .setFooter({ 
        text: `${personality.emoji} ${personality.name} • ${isGroupPlay ? `${onlineCount} users online - group play available!` : 'Solo play'} • Change personality above ↑`
      });
    
    await channel.send({ embeds: [embed] });
    
    logger.info(`Sent NSFW intro message in ${channel.name} (${onlineCount} online, ${isGroupPlay ? 'group' : 'solo'})`);
    
  } catch (error) {
    logger.error('Failed to send NSFW intro message:', error);
    // Don't throw - this is optional, the NSFW enable still worked
  }
}

export default {
  createPersonalitySelector,
  sendPersonalitySelector,
  handlePersonalitySelect,
  removePersonalitySelector,
  sendNsfwIntroMessage
};
