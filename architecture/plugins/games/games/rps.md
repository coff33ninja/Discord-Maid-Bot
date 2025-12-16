# rps.js

**Path:** `plugins\games\games\rps.js`

## Dependencies
- `discord.js` → EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType (L1)
- `./game-manager.js` → updateGameStats (L2)

## Exports
- **challengeRPS** [function] (L40)
- **quickRPS** [function] (L229)

## Functions
- `createChoiceButtons(disabled = false)` (L15)
- ✓ `async challengeRPS(interaction, opponent, bestOf = 3)` (L40)
- `async resolveRound(channel, challenge, challengeKey)` (L135)
- ✓ `async quickRPS(interaction)` (L229)

## Constants
- **activeChallenges** [value] (L5)
- **CHOICES** [object] (L8)

