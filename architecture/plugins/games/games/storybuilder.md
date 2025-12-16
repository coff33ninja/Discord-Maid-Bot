# storybuilder.js

**Path:** `plugins\games\games\storybuilder.js`

## Dependencies
- `discord.js` → EmbedBuilder (L1)
- `./game-manager.js` → getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats (L2)
- `./ai-helper.js` → generateWithRotation (L3)

## Exports
- **startStoryBuilder** [function] (L32)
- **stopStoryBuilder** [function] (L251)

## Functions
- `async generateStoryStarter(theme)` (L6)
- `async aiContinueStory(story, action = 'continue')` (L22)
- ✓ `async startStoryBuilder(interaction, theme = 'adventure', maxTurns = 10)` (L32)
- `setupStoryCollector(channel, channelId)` (L81)
- `endStoryBuilder(channel, channelId)` (L217)
- ✓ `stopStoryBuilder(channelId)` (L251)

