# caption.js

**Path:** `plugins\games\games\caption.js`

## Dependencies
- `discord.js` → EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle (L1)
- `./game-manager.js` → getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats (L2)
- `./ai-helper.js` → generateWithRotation (L3)

## Exports
- **startCaptionContest** [function] (L29)
- **stopCaptionContest** [function] (L283)

## Functions
- `async generateScenario()` (L6)
- ✓ `async startCaptionContest(interaction, rounds = 3)` (L29)
- `async showCaptionScenario(channel, channelId)` (L69)
- `setupCaptionSubmissionCollector(channel, channelId)` (L100)
- `setupCaptionVotingCollector(channel, channelId, submissions)` (L171)
- `endCaptionGame(channel, channelId)` (L251)
- ✓ `stopCaptionContest(channelId)` (L283)

