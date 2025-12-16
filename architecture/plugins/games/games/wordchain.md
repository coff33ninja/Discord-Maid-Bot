# wordchain.js

**Path:** `plugins\games\games\wordchain.js`

## Dependencies
- `discord.js` → EmbedBuilder (L1)
- `module` → createRequire (L2)
- `axios` → axios (L3)
- `./game-manager.js` → getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats (L4)
- `./ai-helper.js` → generateWithRotation (L5)

## Exports
- **startWordChain** [function] (L187)
- **stopWordChain** [function] (L460)
- **isDictionaryReady** [function] (L470)

## Functions
- `initDictionary()` (L33)
- `async initThemedWords(theme)` (L50)
- `async validateWord(word, useAIFallback = false, theme = 'any', minLength = 3)` (L81)
- `async getWordDefinition(word)` (L125)
- `getRandomStartWord(theme = 'any', minLength = 3)` (L147)
- `getWordsStartingWith(letter, theme = 'any', minLength = 3, limit = 10)` (L170)
- ✓ `async startWordChain(interaction, options = {})` (L187)
- `setupWordChainCollector(channel, channelId)` (L279)
- `async endWordChain(channel, channelId)` (L412)
- ✓ `stopWordChain(channelId)` (L460)
- ✓ `isDictionaryReady()` (L470)

## Constants
- **themedWords** [object] (L16)
- **DIFFICULTY_SETTINGS** [object] (L25)

