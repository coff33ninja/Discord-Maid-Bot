# twenty-questions.js

**Path:** `plugins\games\games\twenty-questions.js`

## Dependencies
- `discord.js` → EmbedBuilder (L1)
- `./game-manager.js` → getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats (L2)
- `./ai-helper.js` → generateWithRotation (L3)

## Exports
- **start20Questions** [function] (L81)
- **stop20Questions** [function] (L279)
- **CATEGORIES** [reference] (L288)

## Functions
- `async generateSecret(category)` (L18)
- `async answerQuestion(secret, question, previousQA)` (L44)
- `async checkGuess(secret, guess)` (L67)
- ✓ `async start20Questions(interaction, category = 'anything')` (L81)
- `setup20QCollector(channel, channelId)` (L135)
- ✓ `stop20Questions(channelId)` (L279)

## Constants
- **CATEGORIES** [object] (L6)

