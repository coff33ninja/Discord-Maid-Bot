/**
 * Profile Message Handler
 * 
 * Handles natural language profile setup in profile channels
 * and for users in setup mode.
 */

import { createLogger } from '../../src/logging/logger.js';

const logger = createLogger('profile-handler');

/**
 * Handle a message for profile setup
 * @param {Object} message - Discord message
 * @param {Object} plugin - UserProfilesPlugin instance
 * @returns {Promise<boolean>} Whether the message was handled
 */
export async function handleProfileMessage(message, plugin) {
  if (message.author.bot) return false;
  
  const userId = message.author.id;
  const channelId = message.channel.id;
  const guildId = message.guild?.id;
  
  // Check if user is in setup mode
  const setupState = plugin.getSetupState(userId);
  
  // Check if this is a profile channel
  const isProfileChannel = guildId && await plugin.isProfileChannel(channelId, guildId);
  
  // Only handle if in setup mode or in profile channel
  if (!setupState && !isProfileChannel) {
    return false;
  }
  
  const content = message.content.trim().toLowerCase();
  
  // Check for exit commands
  if (['done', 'finish', 'finished', 'exit', 'quit', 'stop'].includes(content)) {
    plugin.endSetup(userId);
    
    const profile = await plugin.getProfile(userId);
    const summary = await plugin.getProfileSummary(userId);
    
    await message.reply({
      embeds: [{
        color: 0x2ECC71,
        title: '✅ Profile Setup Complete!',
        description: summary 
          ? `Here's what I know about you:\n\n${summary}`
          : "Your profile is saved! You can add more details anytime with `/profile edit`",
        footer: { text: 'Use /profile view to see your full profile' }
      }]
    });
    
    return true;
  }
  
  // Get current profile
  const currentProfile = await plugin.getProfile(userId) || { userId };
  
  // Parse profile info from message
  const extracted = await plugin.parseProfileFromMessage(message.content, currentProfile);
  
  // Update profile if new info was found
  if (extracted.updated) {
    const updates = {};
    
    if (extracted.displayName) updates.displayName = extracted.displayName;
    if (extracted.gender) updates.gender = extracted.gender;
    if (extracted.pronouns) updates.pronouns = extracted.pronouns;
    if (extracted.personality) updates.personality = extracted.personality;
    if (extracted.timezone) updates.timezone = extracted.timezone;
    if (extracted.bio) updates.bio = extracted.bio;
    if (extracted.age && extracted.age >= 13) updates.age = extracted.age;
    
    // Merge interests
    if (extracted.interests?.length) {
      const existingInterests = currentProfile.interests || [];
      const newInterests = [...new Set([...existingInterests, ...extracted.interests])];
      updates.interests = newInterests;
    }
    
    if (Object.keys(updates).length > 0) {
      await plugin.updateProfile(userId, updates);
      logger.info(`Updated profile for ${userId}: ${Object.keys(updates).join(', ')}`);
    }
  }
  
  // Generate conversational response
  const updatedProfile = await plugin.getProfile(userId) || {};
  const response = await plugin.generateSetupResponse(userId, message.content, updatedProfile);
  
  // Check if profile is complete enough
  const isComplete = updatedProfile.displayName && 
                     updatedProfile.gender && 
                     updatedProfile.pronouns;
  
  if (isComplete && !setupState) {
    // In profile channel, auto-complete after basic info
    await message.reply({
      content: response + "\n\n_Your basic profile is set up! Feel free to share more or say \"done\" when finished~_"
    });
  } else {
    await message.reply(response);
  }
  
  return true;
}

/**
 * Get profile context for AI conversations
 * @param {string} userId - User ID
 * @param {Object} plugin - UserProfilesPlugin instance
 * @returns {Promise<string|null>} Profile context string
 */
export async function getProfileContext(userId, plugin) {
  const profile = await plugin.getProfile(userId);
  if (!profile) return null;
  
  const parts = [];
  
  if (profile.displayName) {
    parts.push(`User prefers to be called "${profile.displayName}"`);
  }
  if (profile.gender) {
    parts.push(`Gender: ${profile.gender}`);
  }
  if (profile.pronouns) {
    parts.push(`Pronouns: ${profile.pronouns}`);
  }
  if (profile.personality) {
    parts.push(`Personality: ${profile.personality}`);
  }
  if (profile.interests?.length) {
    parts.push(`Interests: ${profile.interests.slice(0, 5).join(', ')}`);
  }
  
  return parts.length > 0 ? parts.join('. ') + '.' : null;
}

export default {
  handleProfileMessage,
  getProfileContext
};
