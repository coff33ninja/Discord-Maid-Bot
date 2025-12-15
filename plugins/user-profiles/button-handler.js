/**
 * Profile Button/Select Handler
 * 
 * Handles interactive profile setup via buttons and select menus.
 */

import { createLogger } from '../../src/logging/logger.js';
import {
  buildGenderSelect,
  buildPronounSelect,
  buildPersonalitySelect,
  buildInterestsSelect,
  buildSetupComplete,
  buildProfileEmbed,
  GENDER_OPTIONS,
  PRONOUN_OPTIONS,
  INTEREST_CATEGORIES,
  INTEREST_CATEGORIES_2
} from './profile-components.js';

const logger = createLogger('profile-button-handler');

// Track users in wizard mode
const wizardState = new Map();

/**
 * Handle profile-related button interactions
 * @param {Object} interaction - Discord interaction
 * @param {Object} plugin - UserProfilesPlugin instance
 * @returns {Promise<boolean>} Whether interaction was handled
 */
export async function handleProfileButton(interaction, plugin) {
  const customId = interaction.customId;
  
  if (!customId.startsWith('profile_')) {
    return false;
  }
  
  const userId = interaction.user.id;
  
  try {
    switch (customId) {
      case 'profile_start_setup':
        return await handleStartSetup(interaction, plugin);
      
      case 'profile_quick_gender':
        return await interaction.reply(buildGenderSelect());
      
      case 'profile_quick_pronouns':
        return await interaction.reply(buildPronounSelect());
      
      case 'profile_view':
        return await handleViewProfile(interaction, plugin);
      
      case 'profile_skip_name':
        return await handleSkipName(interaction, plugin);
      
      case 'profile_cancel':
        wizardState.delete(userId);
        return await interaction.reply({
          content: '❌ Profile setup cancelled. You can start again anytime!',
          ephemeral: true
        });
      
      case 'profile_edit_more':
        return await handleEditMore(interaction, plugin);
      
      case 'profile_done':
        wizardState.delete(userId);
        return await interaction.reply({
          content: '✅ All done! I\'ll remember your preferences~',
          ephemeral: true
        });
      
      case 'profile_interests_page_1':
        return await interaction.update(buildInterestsSelect(1));
      
      case 'profile_interests_page_2':
        return await interaction.update(buildInterestsSelect(2));
      
      case 'profile_interests_done':
        return await handleInterestsDone(interaction, plugin);
      
      case 'profile_edit_personality':
        return await interaction.reply(buildPersonalitySelect());
      
      case 'profile_edit_interests':
        return await interaction.reply(buildInterestsSelect(1));
      
      default:
        return false;
    }
  } catch (error) {
    logger.error('Profile button handler error:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Something went wrong. Please try again.',
        ephemeral: true
      });
    }
    return true;
  }
}

/**
 * Handle profile-related select menu interactions
 * @param {Object} interaction - Discord interaction
 * @param {Object} plugin - UserProfilesPlugin instance
 * @returns {Promise<boolean>} Whether interaction was handled
 */
export async function handleProfileSelect(interaction, plugin) {
  const customId = interaction.customId;
  
  if (!customId.startsWith('profile_select_')) {
    return false;
  }
  
  const userId = interaction.user.id;
  const values = interaction.values;
  
  try {
    switch (customId) {
      case 'profile_select_gender':
        await plugin.updateProfile(userId, { gender: values[0] });
        
        // Check if in wizard mode
        const genderState = wizardState.get(userId);
        if (genderState?.step === 2) {
          wizardState.set(userId, { ...genderState, step: 3 });
          await interaction.update({
            content: '✅ Gender saved!',
            components: []
          });
          await interaction.followUp(buildPronounSelect());
        } else {
          await interaction.reply({
            content: `✅ Gender set to **${values[0]}**!`,
            ephemeral: true
          });
        }
        return true;
      
      case 'profile_select_pronouns':
        await plugin.updateProfile(userId, { pronouns: values[0] });
        
        const pronounState = wizardState.get(userId);
        if (pronounState?.step === 3) {
          wizardState.set(userId, { ...pronounState, step: 4 });
          await interaction.update({
            content: '✅ Pronouns saved!',
            components: []
          });
          await interaction.followUp(buildPersonalitySelect());
        } else {
          await interaction.reply({
            content: `✅ Pronouns set to **${values[0]}**!`,
            ephemeral: true
          });
        }
        return true;
      
      case 'profile_select_personality':
        await plugin.updateProfile(userId, { personality: values[0] });
        
        const personalityState = wizardState.get(userId);
        if (personalityState?.step === 4) {
          wizardState.set(userId, { ...personalityState, step: 5 });
          await interaction.update({
            content: '✅ Personality saved!',
            components: []
          });
          await interaction.followUp(buildInterestsSelect());
        } else {
          await interaction.reply({
            content: `✅ Personality set to **${values[0]}**!`,
            ephemeral: true
          });
        }
        return true;
      
      default:
        // Handle paginated interest selects
        if (customId.startsWith('profile_select_interests_p')) {
          return await handleInterestSelect(interaction, plugin, values);
        }
        return false;
        return false;
    }
  } catch (error) {
    logger.error('Profile select handler error:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Something went wrong. Please try again.',
        ephemeral: true
      });
    }
    return true;
  }
}

/**
 * Handle start setup button
 */
async function handleStartSetup(interaction, plugin) {
  const userId = interaction.user.id;
  
  // Start wizard
  wizardState.set(userId, { step: 1, startedAt: Date.now() });
  
  await interaction.reply({
    embeds: [{
      color: 0x9B59B6,
      title: '👤 Profile Setup (1/5)',
      description: '**What should I call you?**\n\nType your preferred name/nickname in the chat below!\n\n_Or click Skip to use your Discord username._',
      footer: { text: 'Waiting for your response...' }
    }],
    ephemeral: true
  });
  
  // Set up a collector for the name
  const filter = m => m.author.id === userId;
  const channel = interaction.channel;
  
  try {
    const collected = await channel.awaitMessages({
      filter,
      max: 1,
      time: 60000, // 1 minute timeout
      errors: ['time']
    });
    
    const name = collected.first()?.content;
    if (name && name.length <= 32) {
      await plugin.updateProfile(userId, { displayName: name });
      
      // Delete the user's message to keep channel clean
      try {
        await collected.first().delete();
      } catch (e) {
        // Can't delete, that's fine
      }
      
      wizardState.set(userId, { step: 2 });
      await interaction.followUp({
        content: `✅ Nice to meet you, **${name}**!`,
        ephemeral: true
      });
      await interaction.followUp(buildGenderSelect());
    }
  } catch (e) {
    // Timeout - continue with username
    wizardState.set(userId, { step: 2 });
    await interaction.followUp({
      content: `⏰ No response, I'll use your Discord name. Let's continue!`,
      ephemeral: true
    });
    await interaction.followUp(buildGenderSelect());
  }
  
  return true;
}

/**
 * Handle skip name button
 */
async function handleSkipName(interaction, plugin) {
  const userId = interaction.user.id;
  
  wizardState.set(userId, { step: 2 });
  await interaction.reply({
    content: `👍 I'll use your Discord username. Let's continue!`,
    ephemeral: true
  });
  await interaction.followUp(buildGenderSelect());
  
  return true;
}

/**
 * Handle view profile button
 */
async function handleViewProfile(interaction, plugin) {
  const profile = await plugin.getProfile(interaction.user.id);
  const embed = buildProfileEmbed(profile || {}, interaction.user);
  
  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
  
  return true;
}

/**
 * Handle interest selection from paginated menus
 */
async function handleInterestSelect(interaction, plugin, values) {
  const userId = interaction.user.id;
  
  // Get all interest options for label lookup
  const allInterests = [...INTEREST_CATEGORIES, ...INTEREST_CATEGORIES_2];
  
  // Map values to readable labels
  const newLabels = values.map(v => {
    const opt = allInterests.find(o => o.value === v);
    return opt?.label?.replace(/^[^\s]+\s/, '') || v; // Remove emoji prefix
  });
  
  // Get existing interests and merge
  const profile = await plugin.getProfile(userId) || {};
  const existingInterests = profile.interests || [];
  const mergedInterests = [...new Set([...existingInterests, ...newLabels])];
  
  await plugin.updateProfile(userId, { interests: mergedInterests });
  
  // Check if in wizard mode
  const state = wizardState.get(userId);
  if (state?.step === 5) {
    // Stay on interests page, let them add more or click Done
    await interaction.update({
      content: `✅ Added: **${newLabels.join(', ')}**\n\n🎯 Current interests: ${mergedInterests.join(', ')}\n\n_Select more or click Done_`,
      components: interaction.message.components
    });
  } else {
    await interaction.reply({
      content: `✅ Added interests: **${newLabels.join(', ')}**\n\nTotal: ${mergedInterests.join(', ')}`,
      ephemeral: true
    });
  }
  
  return true;
}

/**
 * Handle interests done button
 */
async function handleInterestsDone(interaction, plugin) {
  const userId = interaction.user.id;
  const state = wizardState.get(userId);
  
  if (state?.step === 5) {
    wizardState.delete(userId);
    const profile = await plugin.getProfile(userId);
    await interaction.update({
      content: '✅ Interests saved!',
      components: []
    });
    await interaction.followUp(buildSetupComplete(profile));
  } else {
    await interaction.update({
      content: '✅ Interests updated!',
      components: []
    });
  }
  
  return true;
}

/**
 * Handle edit more button
 */
async function handleEditMore(interaction, plugin) {
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
  
  await interaction.reply({
    content: '✏️ **What would you like to edit?**',
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('profile_quick_gender')
          .setLabel('⚧️ Gender')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('profile_quick_pronouns')
          .setLabel('💬 Pronouns')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('profile_edit_personality')
          .setLabel('🎭 Personality')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('profile_edit_interests')
          .setLabel('🎯 Interests')
          .setStyle(ButtonStyle.Secondary)
      )
    ],
    ephemeral: true
  });
  
  return true;
}

export default {
  handleProfileButton,
  handleProfileSelect
};
