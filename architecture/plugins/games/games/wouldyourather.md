# wouldyourather.js

**Path:** `plugins\games\games\wouldyourather.js`

## Dependencies
- `discord.js` → EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle (L1)
- `./game-manager.js` → getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats (L2)
- `./ai-helper.js` → generateWithRotation (L3)

## Exports
- **startWouldYouRather** [function] (L32)
- **customWouldYouRather** [function] (L69)
- **stopWouldYouRather** [function] (L264)

## Functions
- `async generateScenario(theme = 'random')` (L6)
- ✓ `async startWouldYouRather(interaction, rounds = 5, theme = 'random')` (L32)
- ✓ `async customWouldYouRather(interaction, optionA, optionB)` (L69)
- `async showScenario(channel, channelId)` (L107)
- `setupWYRCollector(message, channel, channelId)` (L168)
- `async endWYRGame(channel, channelId)` (L235)
- ✓ `stopWouldYouRather(channelId)` (L264)

