# hangman.js

**Path:** `plugins\games\games\hangman.js`

## Dependencies
- `discord.js` → EmbedBuilder (L1)
- `./game-manager.js` → getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats (L2)
- `./ai-helper.js` → generateWithRotation (L3)

## Exports
- **startHangman** [function] (L129)
- **stopHangman** [function] (L333)
- **getHangmanCategories** [function] (L343)
- **CATEGORIES** [reference] (L351)

## Functions
- `async getWord(category)` (L71)
- `createGameEmbed(game, title = '🎯 Hangman')` (L104)
- ✓ `async startHangman(interaction, category = 'random')` (L129)
- `setupGuessCollector(channel, channelId)` (L169)
- `async showGameEnd(channel, game, winner = null)` (L291)
- ✓ `stopHangman(channelId)` (L333)
- ✓ `getHangmanCategories()` (L343)

## Constants
- **CATEGORIES** [object] (L6)
- **HANGMAN_STAGES** [array] (L18)

