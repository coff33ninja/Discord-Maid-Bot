# connectfour.js

**Path:** `plugins\games\games\connectfour.js`

## Dependencies
- `discord.js` → EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle (L1)
- `./game-manager.js` → getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats (L2)

## Exports
- **challengeConnect4** [function] (L126)
- **playConnect4AI** [function] (L172)
- **stopConnect4** [function] (L376)

## Functions
- `createBoard()` (L11)
- `renderBoard(board)` (L16)
- `dropPiece(board, col, piece)` (L26)
- `checkWin(board, piece)` (L37)
- `checkDraw(board)` (L90)
- `getAIMove(board, aiPiece, playerPiece)` (L95)
- ✓ `async challengeConnect4(interaction, opponent)` (L126)
- ✓ `async playConnect4AI(interaction)` (L172)
- `createColumnButtons()` (L208)
- `createColumnButtons2()` (L218)
- `setupConnect4Collector(message, channel, channelId)` (L226)
- ✓ `stopConnect4(channelId)` (L376)

## Constants
- **EMPTY** [value] (L6)
- **PLAYER1** [value] (L7)
- **PLAYER2** [value] (L8)

