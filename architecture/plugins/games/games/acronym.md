# acronym.js

**Path:** `plugins\games\games\acronym.js`

## Dependencies
- `discord.js` → EmbedBuilder (L1)
- `./game-manager.js` → getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats (L2)
- `./ai-helper.js` → generateWithRotation (L3)

## Exports
- **startAcronymGame** [function] (L57)
- **stopAcronymGame** [function] (L266)

## Functions
- `generateLetters(length = 3)` (L6)
- `async judgeSubmissions(letters, submissions)` (L24)
- ✓ `async startAcronymGame(interaction, rounds = 5, letterCount = 3)` (L57)
- `async showAcronymRound(channel, channelId)` (L94)
- `setupAcronymCollector(channel, channelId)` (L119)
- `endAcronymGame(channel, channelId)` (L234)
- ✓ `stopAcronymGame(channelId)` (L266)

