# riddles.js

**Path:** `plugins\games\games\riddles.js`

## Dependencies
- `discord.js` → EmbedBuilder (L1)
- `./game-manager.js` → getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats (L2)
- `./ai-helper.js` → generateWithRotation (L3)

## Exports
- **startRiddles** [function] (L57)
- **stopRiddles** [function] (L273)
- **DIFFICULTIES** [reference] (L282)

## Functions
- `async generateRiddle(difficulty)` (L13)
- `async checkAnswer(correctAnswer, userAnswer)` (L40)
- ✓ `async startRiddles(interaction, difficulty = 'medium', rounds = 5)` (L57)
- `async askRiddle(channel, channelId)` (L97)
- `setupRiddleCollector(channel, channelId)` (L132)
- `endRiddleGame(channel, channelId)` (L235)
- ✓ `stopRiddles(channelId)` (L273)

## Constants
- **DIFFICULTIES** [object] (L6)

