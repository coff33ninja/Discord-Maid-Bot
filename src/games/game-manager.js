import { configOps } from '../database/db.js';

// Active games per channel
const activeGames = new Map();

// Game types registry
const gameTypes = new Map();

// Register a game type
export function registerGame(type, handlers) {
  gameTypes.set(type, handlers);
}

// Get active game in channel
export function getActiveGame(channelId) {
  return activeGames.get(channelId);
}

// Set active game in channel
export function setActiveGame(channelId, game) {
  activeGames.set(channelId, game);
}

// Clear active game
export function clearActiveGame(channelId) {
  const game = activeGames.get(channelId);
  if (game?.timeout) clearTimeout(game.timeout);
  activeGames.delete(channelId);
}

// Check if channel has active game
export function hasActiveGame(channelId) {
  return activeGames.has(channelId);
}

// Get game stats for user
export function getGameStats(userId, gameType) {
  const key = `game_stats_${userId}_${gameType}`;
  const saved = configOps.get(key);
  return saved ? JSON.parse(saved) : {
    gamesPlayed: 0,
    gamesWon: 0,
    totalPoints: 0,
    bestScore: 0
  };
}

// Update game stats
export function updateGameStats(userId, gameType, won, points = 0) {
  const stats = getGameStats(userId, gameType);
  stats.gamesPlayed++;
  if (won) stats.gamesWon++;
  stats.totalPoints += points;
  stats.bestScore = Math.max(stats.bestScore, points);
  configOps.set(`game_stats_${userId}_${gameType}`, JSON.stringify(stats));
  return stats;
}

// Get all stats for a user across all games
export function getAllUserStats(userId) {
  const allConfig = configOps.getAll();
  const stats = {};
  
  for (const config of allConfig) {
    if (config.key.startsWith(`game_stats_${userId}_`)) {
      const gameType = config.key.replace(`game_stats_${userId}_`, '');
      stats[gameType] = JSON.parse(config.value);
    }
  }
  
  return stats;
}

// Get leaderboard for a specific game
export function getGameLeaderboard(gameType, limit = 10) {
  const allConfig = configOps.getAll();
  const players = [];
  
  for (const config of allConfig) {
    if (config.key.includes(`_${gameType}`) && config.key.startsWith('game_stats_')) {
      const parts = config.key.split('_');
      const odId = parts[2];
      const data = JSON.parse(config.value);
      players.push({ odId, ...data });
    }
  }
  
  return players
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, limit);
}

// Get global leaderboard across all games
export function getGlobalLeaderboard(limit = 10) {
  const allConfig = configOps.getAll();
  const playerTotals = new Map();
  
  for (const config of allConfig) {
    if (config.key.startsWith('game_stats_')) {
      const parts = config.key.split('_');
      const odId = parts[2];
      const data = JSON.parse(config.value);
      
      const current = playerTotals.get(odId) || { odId, totalPoints: 0, gamesPlayed: 0, gamesWon: 0 };
      current.totalPoints += data.totalPoints;
      current.gamesPlayed += data.gamesPlayed;
      current.gamesWon += data.gamesWon;
      playerTotals.set(odId, current);
    }
  }
  
  return Array.from(playerTotals.values())
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, limit);
}

export default {
  getActiveGame,
  setActiveGame,
  clearActiveGame,
  hasActiveGame,
  getGameStats,
  updateGameStats,
  getAllUserStats,
  getGameLeaderboard,
  getGlobalLeaderboard,
  registerGame
};
