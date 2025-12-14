import { Plugin } from '../../src/core/plugin-system.js';
import { createLogger } from '../../src/logging/logger.js';

/**
 * Games Plugin
 * 
 * Provides 18 interactive games for Discord users.
 * 
 * Features:
 * - 18 different games
 * - Game state management
 * - Leaderboards
 * - Statistics tracking
 * - Multi-player support
 * 
 * Games:
 * - Trivia (AI, Research, Speed modes)
 * - Hangman, Number Guess, RPS
 * - Tic Tac Toe, 20 Questions, Riddles
 * - Word Chain, Emoji Decode, Would You Rather
 * - Caption Contest, Acronym, Story Builder
 * - Connect Four, Math Blitz, Reaction Race
 * - Mafia
 */
export default class GamesPlugin extends Plugin {
  constructor() {
    super('games', '1.0.0', 'Interactive games collection with 18+ games');
    this.logger = createLogger('games');
    this.activeGames = new Map(); // Track active game sessions
  }
  
  async onLoad() {
    this.logger.info('🎮 Games plugin loaded');
    this.logger.info('   18 games available');
  }
  
  async onUnload() {
    this.logger.info('🎮 Stopping all active games...');
    this.activeGames.clear();
    this.logger.info('🎮 Games plugin unloaded');
  }
  
  // Register an active game
  registerGame(channelId, gameType, gameData) {
    this.activeGames.set(channelId, { gameType, gameData, startedAt: new Date() });
  }
  
  // Get active game for a channel
  getActiveGame(channelId) {
    return this.activeGames.get(channelId);
  }
  
  // Stop a game
  stopGame(channelId) {
    return this.activeGames.delete(channelId);
  }
  
  // Get all active games
  getActiveGames() {
    return Array.from(this.activeGames.entries()).map(([channelId, data]) => ({
      channelId,
      ...data
    }));
  }
  
  // Helper method for games to generate AI content
  // Games should use this instead of importing gemini-keys directly
  async generateWithAI(prompt, options = {}) {
    return await this.requestFromCore('gemini-generate', { prompt, options });
  }
}

// Export helper for game files to use
// Game files can import this: import { generateWithRotation } from './plugin.js'
export async function generateWithRotation(prompt, options = {}) {
  const { getPlugin } = await import('../../src/core/plugin-system.js');
  const gamesPlugin = getPlugin('games');
  if (!gamesPlugin) {
    throw new Error('Games plugin not loaded');
  }
  return await gamesPlugin.generateWithAI(prompt, options);
}
