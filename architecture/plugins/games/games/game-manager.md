# game-manager.js

**Path:** `plugins\games\games\game-manager.js`

## Description
* Game Manager - Handles active game sessions and stats

## Dependencies
- `../../../src/database/db.js` (dynamic, L51)

## Exports
- **registerGame** [function] (L13)
- **getActiveGame** [function] (L18)
- **setActiveGame** [function] (L23)
- **clearActiveGame** [function] (L28)
- **hasActiveGame** [function] (L35)
- **getAllActiveGames** [function] (L40)
- **getGameStats** [function] (L59)
- **updateGameStats** [function] (L75)
- **getAllUserStats** [function] (L89)
- **getGameLeaderboard** [function] (L107)
- **getGlobalLeaderboard** [function] (L129)

## Functions
- ✓ `registerGame(type, handlers)` (L13)
- ✓ `getActiveGame(channelId)` (L18)
- ✓ `setActiveGame(channelId, game)` (L23)
- ✓ `clearActiveGame(channelId)` (L28)
- ✓ `hasActiveGame(channelId)` (L35)
- ✓ `getAllActiveGames()` (L40)
- `async getConfigOps()` (L49)
- ✓ `async getGameStats(userId, gameType)` (L59)
- ✓ `async updateGameStats(userId, gameType, won, points = 0)` (L75)
- ✓ `async getAllUserStats(userId)` (L89)
- ✓ `async getGameLeaderboard(gameType, limit = 10)` (L107)
- ✓ `async getGlobalLeaderboard(limit = 10)` (L129)

## Constants
- **activeGames** [value] (L7)
- **gameTypes** [value] (L10)

