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
    super('games', '1.0.0', 'Interactive games collection with 18+ games');
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
}
