import { Plugin } from '../../src/core/plugin-system.js';
import { createLogger } from '../../src/logging/logger.js';
import { getActiveGame, clearActiveGame, getAllActiveGames } from './games/game-manager.js';

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
  }
  
  async onLoad() {
    this.logger.info('🎮 Games plugin loaded');
    this.logger.info('   18 games available');
  }
  
  async onUnload() {
    this.logger.info('🎮 Games plugin unloaded');
  }
  
  // Get active game for a channel (delegates to game-manager)
  getActiveGame(channelId) {
    return getActiveGame(channelId);
  }
  
  // Stop a game (delegates to game-manager)
  stopGame(channelId) {
    return clearActiveGame(channelId);
  }
  
  // Get all active games (delegates to game-manager)
  getActiveGames() {
    return getAllActiveGames();
  }
}
