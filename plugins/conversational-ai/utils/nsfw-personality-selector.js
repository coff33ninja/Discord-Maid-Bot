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
  const channel = interaction.channel;
  const guild = interaction.guild;
  const userId = interaction.user.id;
  
  try {
    // Set channel-specific personality
    const { setChannelPersonality } = await import('./nsfw-manager.js');
    await setChannelPersonality(channelId, selectedKey);
    
    // Get personality info
    const personalities = await getPersonalities();
    const selected = personalities.find(p => p.key === selectedKey);
    
    // Acknowledge the interaction first (before clearing messages)
    await interaction.deferUpdate();
    
    // Clear channel messages (except pinned ones like the selector)
    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const toDelete = messages.filter(m => !m.pinned && m.deletable);
      if (toDelete.size > 0) {
        await channel.bulkDelete(toDelete, true);
        logger.info(`Cleared ${toDelete.size} messages from ${channel.name} for personality change`);
      }
    } catch (e) {
      logger.warn('Could not clear channel messages:', e.message);
    }
    
    // Update the selector message (re-send since we cleared)
    const { embed, components } = await createPersonalitySelector(selectedKey);
    await sendPersonalitySelector(channel, selectedKey);
    
    // Send new intro message with the new personality
    try {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const aiPlugin = getPlugin('conversational-ai');
      if (aiPlugin?.requestFromCore) {
        const generateFn = async (prompt) => {
          const genResult = await aiPlugin.requestFromCore('gemini-generate', { prompt });
          return genResult?.result?.response?.text?.() || genResult?.text || 'Hello~ Ready to play?';
        };
        
        // Send new intro with the selected personality
        await sendNsfwIntroMessage(channel, { 
          guild, 
          generateFn, 
          personalityKey: selectedKey,
          userId 
        });
      }
    } catch (e) {
      logger.warn('Could not send new intro after personality change:', e.message);
    }
    
    logger.info(`Personality changed to ${selectedKey} in channel ${channelId}, channel cleared`);
    return true;
  } catch (error) {
    logger.error('Failed to handle personality select:', error);
    try {
      await interaction.followUp({
        content: '❌ Failed to change personality. Please try again.',
        ephemeral: true
      });
    } catch (e) {
      // Ignore followup errors
    }
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
export async function sendNsfwIntroMessage(channel, { guild, generateFn, personalityKey = 'maid', userId = null }) {
  logger.info('sendNsfwIntroMessage: Starting...');
  try {
    // Get personality info first (fast)
    const personalities = await getPersonalities();
    const personality = personalities.find(p => p.key === personalityKey) || personalities[0];
    logger.debug(`sendNsfwIntroMessage: Using personality ${personality?.name}`);
    
    // Try to get user profile for personalization
    let userProfile = null;
    if (userId) {
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const profilePlugin = getPlugin('user-profiles');
        if (profilePlugin?.getProfileForContext) {
          userProfile = await profilePlugin.getProfileForContext(userId);
          logger.debug(`sendNsfwIntroMessage: Got user profile for ${userId}`);
        }
      } catch (e) {
        logger.debug('sendNsfwIntroMessage: Could not get user profile');
      }
    }
    
    // Get stored channel participants (all invited users)
    let storedParticipants = [];
    try {
      const { getChannelParticipants } = await import('./nsfw-manager.js');
      storedParticipants = getChannelParticipants(channel.id) || [];
      logger.debug(`sendNsfwIntroMessage: ${storedParticipants.length} stored participants`);
    } catch (e) {
      logger.debug('sendNsfwIntroMessage: Could not get stored participants');
    }
    
    // Try to get online member count, but don't block on it
    let onlineCount = storedParticipants.length || 1; // Use stored participants as base
    let onlineNames = storedParticipants.map(p => p.username);
    let onlineProfiles = []; // Profiles of participants
    
    try {
      // Use cached members if available, with a short timeout
      const cachedMembers = guild.members.cache;
      if (cachedMembers.size > 0) {
        const onlineMembers = cachedMembers.filter(m => 
          !m.user.bot && 
          (m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd') &&
          channel.permissionsFor(m)?.has('ViewChannel')
        );
        
        // Merge online members with stored participants
        const participantIds = new Set(storedParticipants.map(p => p.userId));
        for (const member of onlineMembers.values()) {
          if (!participantIds.has(member.user.id)) {
            onlineNames.push(member.displayName);
            participantIds.add(member.user.id);
          }
        }
        onlineCount = Math.max(onlineCount, participantIds.size);
        
        logger.debug(`sendNsfwIntroMessage: ${onlineCount} total participants (${storedParticipants.length} stored + online)`);
      }
    } catch (e) {
      logger.debug('sendNsfwIntroMessage: Could not get member count, using stored participants');
    }
    
    // Get profiles for all participants
    if (onlineCount > 0) {
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const profilePlugin = getPlugin('user-profiles');
        if (profilePlugin?.getProfileForContext) {
          // Get profiles for stored participants first
          for (const participant of storedParticipants) {
            const profile = await profilePlugin.getProfileForContext(participant.userId);
            if (profile) {
              onlineProfiles.push({
                name: profile.name || participant.username,
                gender: profile.gender,
                pronouns: profile.pronouns
              });
            } else {
              onlineProfiles.push({
                name: participant.username,
                gender: null,
                pronouns: null
              });
            }
          }
        }
      } catch (e) {
        // Fallback: use stored participant names without profiles
        for (const participant of storedParticipants) {
          onlineProfiles.push({
            name: participant.username,
            gender: null,
            pronouns: null
          });
        }
      }
    }
    
    // Build context for AI intro
    // AI counts as a participant! So total = humans + 1 (AI)
    const totalWithAI = onlineCount + 1; // +1 for AI
    const isGroupPlay = totalWithAI > 2; // More than just 1 human + AI = group play
    
    // Build user profile context
    let userContext = '';
    if (userProfile) {
      const parts = [];
      if (userProfile.name) parts.push(`Their preferred name is "${userProfile.name}"`);
      if (userProfile.gender) parts.push(`Gender: ${userProfile.gender}`);
      if (userProfile.pronouns) parts.push(`Use ${userProfile.pronouns} pronouns (${userProfile.pronounSubject}/${userProfile.pronounObject}/${userProfile.pronounPossessive})`);
      if (parts.length > 0) {
        userContext = `\n**User Profile (USE THIS!):**\n${parts.join('. ')}.\nIMPORTANT: Address them correctly using their name and pronouns!`;
      }
    }
    
    // Build group profile context
    let groupContext = '';
    if (isGroupPlay && onlineProfiles.length > 0) {
      const profileDescriptions = onlineProfiles.map(p => {
        const parts = [p.name];
        if (p.gender) parts.push(`(${p.gender})`);
        if (p.pronouns) parts.push(`- ${p.pronouns}`);
        return parts.join(' ');
      });
      groupContext = `\n**Participants:**\n${profileDescriptions.join('\n')}\nUse correct pronouns for each person!`;
    }
    
    const introPrompt = `You are ${personality.name} (${personality.description}). 
NSFW mode was just enabled in this channel. You need to greet the users and invite them to start a roleplay scenario.

**Channel Info:**
- Human participants: ${onlineCount} (${onlineNames.length > 0 ? onlineNames.join(', ') : 'unknown'})
- Total including you (the AI): ${totalWithAI} participants
- This is a ${totalWithAI}some scenario! (${isGroupPlay ? 'GROUP play with multiple humans + you' : 'intimate 2some - just one human + you'})
${userContext}${groupContext}

**Your Task:**
1. Greet in character as ${personality.name}
2. ${isGroupPlay ? `Greet ALL human participants by name: ${onlineNames.join(', ')}` : userProfile?.name ? `Address ${userProfile.name} by name and use correct pronouns` : 'Greet the user warmly'}
3. ${isGroupPlay ? `Acknowledge this is a ${totalWithAI}some (you + ${onlineCount} humans) and express excitement!` : `Acknowledge this is an intimate 2some - just the two of you~`}
4. Ask what kind of scenario they'd like to explore
5. Offer a few sexy/naughty scenario suggestions fitting your personality
6. Be flirty and inviting - this is NSFW so be suggestive!
${isGroupPlay ? `7. Suggest ${totalWithAI}some scenarios - you with ${onlineCount} partners at once!` : ''}

${isGroupPlay ? `IMPORTANT: This is a ${totalWithAI}some! You (the AI) + ${onlineCount} humans (${onlineNames.join(', ')}). Acknowledge everyone!` : `This is a 2some - just you and your partner. Make it intimate!`}

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
        text: `${personality.emoji} ${personality.name} • ${totalWithAI}some (${onlineCount} human${onlineCount > 1 ? 's' : ''} + me~) • Change personality above ↑`
      });
    
    await channel.send({ embeds: [embed] });
    
    logger.info(`Sent NSFW intro message in ${channel.name} (${totalWithAI}some: ${onlineCount} human(s) + AI)`);
    
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
