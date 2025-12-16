# emojidecode.js

**Path:** `plugins\games\games\emojidecode.js`

## Dependencies
- `discord.js` → EmbedBuilder (L1)
- `./game-manager.js` → getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats (L2)
- `./ai-helper.js` → generateWithRotation (L3)

## Exports
- **startEmojiDecode** [function] (L59)
- **stopEmojiDecode** [function] (L264)
- **CATEGORIES** [reference] (L273)

## Functions
- `async generateEmojiPuzzle(category)` (L18)
- `async checkAnswer(correctAnswer, userAnswer)` (L46)
- ✓ `async startEmojiDecode(interaction, category = 'random', rounds = 5)` (L59)
- `async showPuzzle(channel, channelId)` (L99)
- `setupEmojiCollector(channel, channelId)` (L133)
- `endEmojiGame(channel, channelId)` (L229)
- ✓ `stopEmojiDecode(channelId)` (L264)

## Constants
- **CATEGORIES** [object] (L6)

