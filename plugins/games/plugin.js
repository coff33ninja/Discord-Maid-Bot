import { Plugin } from '../../src/core/plugin-system.js';

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
    super('1.0.0.0-beta', '1.0.0', 'Interactive games collection with 18+ games');
    this.activeGames = new Map(); // Track active game sessions
  }
  
  async onLoad() {
    console.log('🎮 Games plugin loaded');
    console.log('   18 games available');
  }
  
  async onUnload() {
    console.log('🎮 Stopping all active games...');
    this.activeGames.clear();
    console.log('🎮 Games plugin unloaded');
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
