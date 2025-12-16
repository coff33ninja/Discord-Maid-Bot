# game-manager.js

**Path:** `plugins\games\game-manager.js`

## Dependencies
- `../../src/database/db.js` → configOps (L1)

## Exports
- **registerGame** [function] (L10)
- **getActiveGame** [function] (L15)
- **setActiveGame** [function] (L20)
- **clearActiveGame** [function] (L25)
- **hasActiveGame** [function] (L32)
- **getGameStats** [function] (L37)
- **updateGameStats** [function] (L49)
- **getAllUserStats** [function] (L60)
- **getGameLeaderboard** [function] (L75)
- **getGlobalLeaderboard** [function] (L94)

## Functions
- ✓ `registerGame(type, handlers)` (L10)
- ✓ `getActiveGame(channelId)` (L15)
- ✓ `setActiveGame(channelId, game)` (L20)
- ✓ `clearActiveGame(channelId)` (L25)
- ✓ `hasActiveGame(channelId)` (L32)
- ✓ `getGameStats(userId, gameType)` (L37)
- ✓ `updateGameStats(userId, gameType, won, points = 0)` (L49)
- ✓ `getAllUserStats(userId)` (L60)
- ✓ `getGameLeaderboard(gameType, limit = 10)` (L75)
- ✓ `getGlobalLeaderboard(limit = 10)` (L94)

## Constants
- **activeGames** [value] (L4)
- **gameTypes** [value] (L7)

