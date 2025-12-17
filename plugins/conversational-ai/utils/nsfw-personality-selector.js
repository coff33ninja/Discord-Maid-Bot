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

export default {
  createPersonalitySelector,
  sendPersonalitySelector,
  handlePersonalitySelect,
  removePersonalitySelector
};
