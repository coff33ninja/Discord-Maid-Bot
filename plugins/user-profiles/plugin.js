import { Plugin } from '../../src/core/plugin-system.js';
import { createLogger } from '../../src/logging/logger.js';

/**
 * User Profiles Plugin
 * 
 * Allows users to set up their profiles through natural conversation or slash commands.
 * The bot can create a dedicated profile setup channel where new members can introduce themselves.
 * 
 * Features:
 * - Natural language profile setup via AI conversation
 * - Slash command for quick profile editing
 * - Dedicated profile channel creation
 * - Stores: gender, pronouns, personality traits, interests, timezone, etc.
 * - Integration with conversational AI for personalized responses
 */
export default class UserProfilesPlugin extends Plugin {
  constructor() {
    super('user-profiles', '1.0.0', 'User profile management with AI-powered setup');
    this.logger = createLogger('user-profiles');
    this.client = null;
    this.activeSetups = new Map(); // Track users in profile setup mode
  }
  
  async onLoad() {
    this.logger.info('👤 User Profiles plugin loaded');
  }
  
  async onUnload() {
    this.logger.info('👤 User Profiles plugin unloaded');
  }
  
  setClient(client) {
    this.client = client;
  }
  
  /**
   * Get a user's profile
   * @param {string} userId - Discord user ID
   * @returns {Object|null} User profile or null
   */
  async getProfile(userId) {
    const { configOps } = await import('../../src/database/db.js');
    const data = configOps.get(`user_profile_${userId}`);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
  
  /**
   * Save a user's profile
   * @param {string} userId - Discord user ID
   * @param {Object} profile - Profile data
   */
  async saveProfile(userId, profile) {
    const { configOps } = await import('../../src/database/db.js');
    profile.updatedAt = Date.now();
    if (!profile.createdAt) {
      profile.createdAt = Date.now();
    }
    configOps.set(`user_profile_${userId}`, JSON.stringify(profile));
    this.logger.info(`✅ Saved profile for user ${userId}`);
  }
  
  /**
   * Update specific fields in a user's profile
   * @param {string} userId - Discord user ID
   * @param {Object} updates - Fields to update
   */
  async updateProfile(userId, updates) {
    const existing = await this.getProfile(userId) || { userId };
    const updated = { ...existing, ...updates };
    await this.saveProfile(userId, updated);
    return updated;
  }
  
  /**
   * Start profile setup mode for a user
   * @param {string} userId - Discord user ID
   * @param {string} channelId - Channel where setup is happening
   */
  startSetup(userId, channelId) {
    this.activeSetups.set(userId, {
      channelId,
      startedAt: Date.now(),
      step: 'intro',
      collectedData: {}
    });
  }
  
  /**
   * Check if user is in setup mode
   * @param {string} userId - Discord user ID
   * @returns {Object|null} Setup state or null
   */
  getSetupState(userId) {
    return this.activeSetups.get(userId) || null;
  }
  
  /**
   * End profile setup mode
   * @param {string} userId - Discord user ID
   */
  endSetup(userId) {
    this.activeSetups.delete(userId);
  }
  
  /**
   * Get profile summary for AI context
   * @param {string} userId - Discord user ID
   * @returns {string} Human-readable profile summary
   */
  async getProfileSummary(userId) {
    const profile = await this.getProfile(userId);
    if (!profile) return null;
    
    const parts = [];
    if (profile.displayName) parts.push(`Name: ${profile.displayName}`);
    if (profile.gender) parts.push(`Gender: ${profile.gender}`);
    if (profile.pronouns) parts.push(`Pronouns: ${profile.pronouns}`);
    if (profile.personality) parts.push(`Personality: ${profile.personality}`);
    if (profile.interests?.length) parts.push(`Interests: ${profile.interests.join(', ')}`);
    if (profile.timezone) parts.push(`Timezone: ${profile.timezone}`);
    if (profile.bio) parts.push(`Bio: ${profile.bio}`);
    
    return parts.length > 0 ? parts.join(' | ') : null;
  }
  
  /**
   * Create a profile setup channel in a guild
   * @param {Object} guild - Discord guild
   * @param {Object} options - Channel options
   * @returns {Object} Created channel
   */
  async createProfileChannel(guild, options = {}) {
    const channelName = options.name || '👤-profile-setup';
    const categoryId = options.categoryId || null;
    
    // Check if channel already exists
    const existing = guild.channels.cache.find(c => c.name === channelName.replace(/[^a-z0-9-]/gi, '-').toLowerCase());
    if (existing) {
      return { channel: existing, created: false };
    }
    
    const channelOptions = {
      name: channelName,
      type: 0, // Text channel
      topic: '🎭 Introduce yourself to the bot! Tell me about yourself and I\'ll remember you~',
      rateLimitPerUser: 5, // Slow mode 5 seconds
    };
    
    if (categoryId) {
      channelOptions.parent = categoryId;
    }
    
    const channel = await guild.channels.create(channelOptions);
    
    // Send welcome message
    await channel.send({
      embeds: [{
        color: 0x9B59B6,
        title: '👤 Profile Setup Channel',
        description: `Welcome! This channel is for setting up your profile with me~\n\n` +
          `**How to use:**\n` +
          `• Just chat naturally! Tell me about yourself\n` +
          `• I'll ask questions to learn more about you\n` +
          `• Or use \`/profile edit\` for quick setup\n\n` +
          `**What I can learn:**\n` +
          `• Your preferred name\n` +
          `• Gender & pronouns\n` +
          `• Personality type\n` +
          `• Interests & hobbies\n` +
          `• Timezone\n` +
          `• A short bio\n\n` +
          `_This helps me personalize my responses to you!_`,
        footer: { text: 'Your data is stored securely and only used by this bot' }
      }]
    });
    
    // Store channel ID in config
    const { configOps } = await import('../../src/database/db.js');
    configOps.set(`profile_channel_${guild.id}`, channel.id);
    
    this.logger.info(`✅ Created profile channel in ${guild.name}`);
    
    return { channel, created: true };
  }
  
  /**
   * Check if a channel is a profile setup channel
   * @param {string} channelId - Channel ID
   * @param {string} guildId - Guild ID
   * @returns {boolean}
   */
  async isProfileChannel(channelId, guildId) {
    const { configOps } = await import('../../src/database/db.js');
    const savedChannelId = configOps.get(`profile_channel_${guildId}`);
    return savedChannelId === channelId;
  }
  
  /**
   * Parse profile data from AI conversation
   * @param {string} message - User's message
   * @param {Object} currentProfile - Current profile data
   * @returns {Promise<Object>} Extracted profile updates
   */
  async parseProfileFromMessage(message, currentProfile = {}) {
    try {
      const { generateWithRotation } = await import('../../src/config/gemini-keys.js');
      
      const prompt = `You are extracting user profile information from a message.

Current profile data: ${JSON.stringify(currentProfile)}

User message: "${message}"

Extract any profile information mentioned. Respond with ONLY valid JSON:
{
  "displayName": null or string (preferred name/nickname),
  "gender": null or string (male/female/non-binary/other),
  "pronouns": null or string (he/him, she/her, they/them, etc.),
  "personality": null or string (introvert/extrovert/ambivert, or personality type),
  "interests": null or array of strings (hobbies, interests),
  "timezone": null or string (timezone like "EST", "UTC+8", "America/New_York"),
  "bio": null or string (short bio/description),
  "age": null or number (if mentioned, only if 13+),
  "updated": true/false (whether any new info was found)
}

Rules:
- Only extract information explicitly mentioned
- Don't guess or assume
- Return null for fields not mentioned
- For interests, add to existing list don't replace
- Be conservative - only extract clear information`;

      const { result } = await generateWithRotation(prompt);
      const response = result.response;
      
      if (!response || typeof response.text !== 'function') {
        return { updated: false };
      }
      
      let text = response.text().trim();
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      return JSON.parse(text);
    } catch (error) {
      this.logger.error('Failed to parse profile from message:', error.message);
      return { updated: false };
    }
  }
  
  /**
   * Generate AI response for profile setup conversation
   * @param {string} userId - User ID
   * @param {string} message - User's message
   * @param {Object} profile - Current profile
   * @returns {Promise<string>} AI response
   */
  async generateSetupResponse(userId, message, profile = {}) {
    try {
      const { generateWithRotation } = await import('../../src/config/gemini-keys.js');
      
      // Get bot personality
      const { getPlugin } = await import('../../src/core/plugin-system.js');
      const personalityPlugin = getPlugin('personality');
      let personalityContext = '';
      
      if (personalityPlugin) {
        const userPersonality = personalityPlugin.getUserPersonality(userId);
        const personality = personalityPlugin.getPersonality(userPersonality);
        if (personality) {
          personalityContext = `Bot personality: ${personality.name} - ${personality.description}. Style: ${personality.style}`;
        }
      }
      
      const missingFields = [];
      if (!profile.displayName) missingFields.push('preferred name');
      if (!profile.gender) missingFields.push('gender');
      if (!profile.pronouns) missingFields.push('pronouns');
      if (!profile.interests?.length) missingFields.push('interests/hobbies');
      
      const prompt = `You are a friendly bot helping a user set up their profile through natural conversation.

${personalityContext}

Current profile: ${JSON.stringify(profile)}
Missing information: ${missingFields.join(', ') || 'none - profile is complete!'}

User just said: "${message}"

Generate a friendly, conversational response that:
1. Acknowledges what they shared (if anything)
2. If profile is incomplete, naturally ask about ONE missing field
3. If profile is complete, thank them and let them know they're all set
4. Stay in character with the bot personality
5. Keep it short and friendly (2-3 sentences max)

Response:`;

      const { result } = await generateWithRotation(prompt);
      const response = result.response;
      
      if (!response || typeof response.text !== 'function') {
        return "Thanks for sharing! Is there anything else you'd like to tell me about yourself?";
      }
      
      return response.text().trim();
    } catch (error) {
      this.logger.error('Failed to generate setup response:', error.message);
      return "I'd love to learn more about you! Feel free to tell me about yourself~";
    }
  }
}
