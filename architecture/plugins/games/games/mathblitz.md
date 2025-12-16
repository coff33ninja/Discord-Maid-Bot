# mathblitz.js

**Path:** `plugins\games\games\mathblitz.js`

## Dependencies
- `discord.js` → EmbedBuilder (L1)
- `./game-manager.js` → getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats (L2)

## Exports
- **startMathBlitz** [function] (L45)
- **stopMathBlitz** [function] (L222)
- **DIFFICULTIES** [reference] (L231)

## Functions
- `generateProblem(difficulty)` (L12)
- ✓ `async startMathBlitz(interaction, difficulty = 'medium', rounds = 10)` (L45)
- `async showProblem(channel, channelId)` (L83)
- `setupMathCollector(channel, channelId)` (L110)
- `endMathBlitz(channel, channelId)` (L190)
- ✓ `stopMathBlitz(channelId)` (L222)

## Constants
- **DIFFICULTIES** [object] (L5)

