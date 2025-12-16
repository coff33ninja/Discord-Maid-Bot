# mafia.js

**Path:** `plugins\games\games\mafia.js`

## Dependencies
- `discord.js` → EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle (L1)
- `./game-manager.js` → getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats (L2)

## Exports
- **startMafia** [function] (L38)
- **stopMafia** [function] (L450)

## Functions
- `assignRoles(playerCount)` (L13)
- ✓ `async startMafia(interaction, minPlayers = 4)` (L38)
- `setupLobbyCollector(message, channel, channelId)` (L102)
- `async updateLobbyEmbed(message, game)` (L211)
- `async processNight(channel, channelId)` (L230)
- `setupDayCollector(channel, channelId)` (L295)
- `async executePlayer(channel, channelId, playerId)` (L362)
- `checkWinCondition(game)` (L404)
- `endMafiaGame(channel, channelId, winner)` (L414)
- ✓ `stopMafia(channelId)` (L450)

## Constants
- **ROLES** [object] (L5)

