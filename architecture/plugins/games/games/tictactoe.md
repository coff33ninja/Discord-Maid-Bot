# tictactoe.js

**Path:** `plugins\games\games\tictactoe.js`

## Dependencies
- `discord.js` → EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType (L1)
- `./game-manager.js` → updateGameStats (L2)

## Exports
- **challengeTTT** [function] (L105)
- **playTTTvsAI** [function] (L159)
- **stopTTT** [function] (L332)

## Functions
- `createBoardButtons(board, disabled = false)` (L13)
- `checkWinner(board)` (L40)
- `getAIMove(board, aiSymbol)` (L62)
- ✓ `async challengeTTT(interaction, opponent)` (L105)
- ✓ `async playTTTvsAI(interaction)` (L159)
- `setupCollector(message, game, gameKey, channel)` (L195)
- `async showGameOver(interaction, game, result, gameKey)` (L285)
- ✓ `stopTTT(channelId)` (L332)

## Constants
- **activeGames** [value] (L5)
- **EMPTY** [value] (L8)
- **X** [value] (L9)
- **O** [value] (L10)

