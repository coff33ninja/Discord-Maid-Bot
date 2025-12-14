import { Plugin } from '../../src/core/plugin-system.js';
import { createLogger } from '../../src/logging/logger.js';
import { PERSONALITIES, getPersonality, getPersonalityOptions, DEFAULT_PERSONALITY } from './personalities.js';

/**
 * Personality Plugin
 * 
 * Manages bot personality system with multiple personality types.
 * Users can select different personalities that affect how the bot responds.
 * 
 * Features:
 * - 10 unique personalities (maid, tsundere, kuudere, etc.)
 * - Per-user personality preferences
 * - Personality preview and switching
 * - Integration with conversational AI
 * 
 * API for other plugins:
 * - getPersonality(key) - Get personality data by key
 * - getPersonalityOptions() - Get all available personalities
 * - getUserPersonality(userId) - Get user's selected personality
 * - DEFAULT_PERSONALITY - Default personality key
 */
export default class PersonalityPlugin extends Plugin {
  constructor() {
    super('personality', '1.0.0.0-beta', 'Bot personality management system');
    this.logger = createLogger('personality');
  }
  
  async onLoad() {
    this.logger.info('🎭 Personality plugin loaded');
    this.logger.info(`   ${Object.keys(PERSONALITIES).length} personalities available`);
  }
  
  async onUnload() {
    this.logger.info('🎭 Personality plugin unloaded');
  }
  
  // Public API for other plugins
  getPersonality(key) {
    return getPersonality(key);
  }
  
  getPersonalityOptions() {
    return getPersonalityOptions();
  }
  
  getUserPersonality(userId) {
    const { configOps } = require('../../src/database/db.js');
    const saved = configOps.get(`personality_${userId}`);
    return saved || DEFAULT_PERSONALITY;
  }
  
  getDefaultPersonality() {
    return DEFAULT_PERSONALITY;
  }
  
  getAllPersonalities() {
    return PERSONALITIES;
  }
}
