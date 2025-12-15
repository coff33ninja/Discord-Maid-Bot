/**
 * Interactive Profile Setup Components
 * 
 * Button and select menu based profile setup for Discord.
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';

const logger = createLogger('profile-components');

/**
 * Gender options
 */
export const GENDER_OPTIONS = [
  { label: '👨 Male', value: 'male', emoji: '👨' },
  { label: '👩 Female', value: 'female', emoji: '👩' },
  { label: '🧑 Non-binary', value: 'non-binary', emoji: '🧑' },
  { label: '❓ Other', value: 'other', emoji: '❓' },
  { label: '🤐 Prefer not to say', value: 'prefer-not-to-say', emoji: '🤐' }
];

/**
 * Pronoun options
 */
export const PRONOUN_OPTIONS = [
  { label: 'he/him', value: 'he/him' },
  { label: 'she/her', value: 'she/her' },
  { label: 'they/them', value: 'they/them' },
  { label: 'he/they', value: 'he/they' },
  { label: 'she/they', value: 'she/they' },
  { label: 'any pronouns', value: 'any' },
  { label: 'Other (tell me in chat)', value: 'other' }
];

/**
 * Personality type options
 */
export const PERSONALITY_OPTIONS = [
  { label: '🌟 Extrovert', value: 'extrovert', description: 'Energized by social interaction' },
  { label: '🌙 Introvert', value: 'introvert', description: 'Energized by alone time' },
  { label: '⚖️ Ambivert', value: 'ambivert', description: 'A mix of both' }
];

/**
 * Interest categories
 */
export const INTEREST_CATEGORIES = [
  { label: '🎮 Gaming', value: 'gaming' },
  { label: '🎬 Anime/Manga', value: 'anime' },
  { label: '🎵 Music', value: 'music' },
  { label: '🎨 Art/Creative', value: 'art' },
  { label: '💻 Tech/Programming', value: 'tech' },
  { label: '📚 Reading/Writing', value: 'reading' },
  { label: '🎥 Movies/TV', value: 'movies' },
  { label: '⚽ Sports/Fitness', value: 'sports' },
  { label: '🍳 Cooking/Food', value: 'cooking' },
  { label: '✈️ Travel', value: 'travel' },
  { label: '🐾 Pets/Animals', value: 'pets' },
  { label: '🔬 Science', value: 'science' }
];

/**
 * Build the welcome message with interactive setup
 * @returns {Object} Message options with embeds and components
 */
export function buildWelcomeMessage() {
  const embed = {
    color: 0x9B59B6,
    title: '👤 Profile Setup',
    description: `Welcome! Let's set up your profile so I can get to know you better~\n\n` +
      `**Click the buttons below to set up your profile, or just chat naturally!**\n\n` +
      `_Your profile helps me personalize my responses to you._`,
    fields: [
      {
        name: '📝 What I\'ll Learn',
        value: '• Your name & pronouns\n• Gender & personality\n• Interests & hobbies\n• Timezone',
        inline: true
      },
      {
        name: '🔒 Privacy',
        value: '• Data stored securely\n• Only used by this bot\n• Delete anytime with\n  `/bot profile delete`',
        inline: true
      }
    ],
    footer: { text: 'Click "Start Setup" or just introduce yourself!' }
  };

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('profile_start_setup')
        .setLabel('🚀 Start Setup')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('profile_quick_gender')
        .setLabel('⚧️ Set Gender')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('profile_quick_pronouns')
        .setLabel('💬 Set Pronouns')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('profile_view')
        .setLabel('👁️ View Profile')
        .setStyle(ButtonStyle.Secondary)
    );

  return { embeds: [embed], components: [row] };
}

/**
 * Build gender selection menu
 * @returns {Object} Message options
 */
export function buildGenderSelect() {
  const row = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('profile_select_gender')
        .setPlaceholder('Select your gender')
        .addOptions(GENDER_OPTIONS.map(opt => ({
          label: opt.label,
          value: opt.value,
          emoji: opt.emoji
        })))
    );

  return {
    content: '⚧️ **What\'s your gender?**',
    components: [row],
    ephemeral: true
  };
}

/**
 * Build pronoun selection menu
 * @returns {Object} Message options
 */
export function buildPronounSelect() {
  const row = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('profile_select_pronouns')
        .setPlaceholder('Select your pronouns')
        .addOptions(PRONOUN_OPTIONS.map(opt => ({
          label: opt.label,
          value: opt.value
        })))
    );

  return {
    content: '💬 **What are your pronouns?**',
    components: [row],
    ephemeral: true
  };
}

/**
 * Build personality selection menu
 * @returns {Object} Message options
 */
export function buildPersonalitySelect() {
  const row = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('profile_select_personality')
        .setPlaceholder('Select your personality type')
        .addOptions(PERSONALITY_OPTIONS.map(opt => ({
          label: opt.label,
          value: opt.value,
          description: opt.description
        })))
    );

  return {
    content: '🎭 **How would you describe your personality?**',
    components: [row],
    ephemeral: true
  };
}

/**
 * Build interests selection menu (multi-select)
 * @returns {Object} Message options
 */
export function buildInterestsSelect() {
  const row = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('profile_select_interests')
        .setPlaceholder('Select your interests (up to 5)')
        .setMinValues(1)
        .setMaxValues(5)
        .addOptions(INTEREST_CATEGORIES.map(opt => ({
          label: opt.label,
          value: opt.value
        })))
    );

  return {
    content: '🎯 **What are you interested in?** (Select up to 5)',
    components: [row],
    ephemeral: true
  };
}

/**
 * Build the full setup wizard step
 * @param {number} step - Current step (1-5)
 * @param {Object} profile - Current profile data
 * @returns {Object} Message options
 */
export function buildSetupStep(step, profile = {}) {
  switch (step) {
    case 1:
      return {
        embeds: [{
          color: 0x9B59B6,
          title: '👤 Profile Setup (1/5)',
          description: '**What should I call you?**\n\nType your preferred name/nickname in the chat!',
          footer: { text: 'Type your name or click Skip' }
        }],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('profile_skip_name')
              .setLabel('Skip')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId('profile_cancel')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Danger)
          )
        ]
      };
    
    case 2:
      return buildGenderSelect();
    
    case 3:
      return buildPronounSelect();
    
    case 4:
      return buildPersonalitySelect();
    
    case 5:
      return buildInterestsSelect();
    
    default:
      return buildSetupComplete(profile);
  }
}

/**
 * Build setup complete message
 * @param {Object} profile - Completed profile
 * @returns {Object} Message options
 */
export function buildSetupComplete(profile) {
  const fields = [];
  
  if (profile.displayName) fields.push({ name: '📛 Name', value: profile.displayName, inline: true });
  if (profile.gender) fields.push({ name: '⚧️ Gender', value: profile.gender, inline: true });
  if (profile.pronouns) fields.push({ name: '💬 Pronouns', value: profile.pronouns, inline: true });
  if (profile.personality) fields.push({ name: '🎭 Personality', value: profile.personality, inline: true });
  if (profile.interests?.length) fields.push({ name: '🎯 Interests', value: profile.interests.join(', '), inline: false });

  return {
    embeds: [{
      color: 0x2ECC71,
      title: '✅ Profile Setup Complete!',
      description: 'Thanks for setting up your profile! I\'ll use this info to personalize my responses~',
      fields: fields.length > 0 ? fields : [{ name: 'Profile', value: '_No data set yet_' }],
      footer: { text: 'Use /bot profile edit to make changes anytime' }
    }],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('profile_edit_more')
          .setLabel('✏️ Edit More')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('profile_done')
          .setLabel('✅ Done')
          .setStyle(ButtonStyle.Success)
      )
    ]
  };
}

/**
 * Build profile view embed
 * @param {Object} profile - User profile
 * @param {Object} user - Discord user
 * @returns {Object} Embed object
 */
export function buildProfileEmbed(profile, user) {
  const fields = [];
  
  if (profile.gender) fields.push({ name: '⚧️ Gender', value: profile.gender, inline: true });
  if (profile.pronouns) fields.push({ name: '💬 Pronouns', value: profile.pronouns, inline: true });
  if (profile.personality) fields.push({ name: '🎭 Personality', value: profile.personality, inline: true });
  if (profile.timezone) fields.push({ name: '🌍 Timezone', value: profile.timezone, inline: true });
  if (profile.interests?.length) fields.push({ name: '🎯 Interests', value: profile.interests.join(', '), inline: false });
  if (profile.bio) fields.push({ name: '📝 Bio', value: profile.bio, inline: false });

  return {
    color: 0x9B59B6,
    title: `👤 ${profile.displayName || user.username}'s Profile`,
    thumbnail: { url: user.displayAvatarURL({ dynamic: true }) },
    fields: fields.length > 0 ? fields : [{ name: 'Profile', value: '_No profile data yet. Click "Start Setup" to begin!_' }],
    footer: { text: 'Profile last updated' },
    timestamp: profile.updatedAt ? new Date(profile.updatedAt) : new Date()
  };
}

export default {
  buildWelcomeMessage,
  buildGenderSelect,
  buildPronounSelect,
  buildPersonalitySelect,
  buildInterestsSelect,
  buildSetupStep,
  buildSetupComplete,
  buildProfileEmbed,
  GENDER_OPTIONS,
  PRONOUN_OPTIONS,
  PERSONALITY_OPTIONS,
  INTEREST_CATEGORIES
};
