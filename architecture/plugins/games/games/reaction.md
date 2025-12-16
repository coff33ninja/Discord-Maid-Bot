# reaction.js

**Path:** `plugins\games\games\reaction.js`

## Dependencies
- `discord.js` → EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle (L1)
- `./game-manager.js` → getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats (L2)

## Exports
- **startReactionRace** [function] (L7)
- **stopReactionRace** [function] (L199)

## Functions
- ✓ `async startReactionRace(interaction, rounds = 5)` (L7)
- `async startRound(channel, channelId)` (L42)
- `setupReactionCollector(message, channel, channelId)` (L90)
- `endReactionRace(channel, channelId)` (L167)
- ✓ `stopReactionRace(channelId)` (L199)

## Constants
- **EMOJIS** [array] (L4)

