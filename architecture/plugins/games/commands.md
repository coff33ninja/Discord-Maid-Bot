# commands.js

**Path:** `plugins\games\commands.js`

## Description
* Games Commands - Queued Loading System

## Dependencies
- `discord.js` → SlashCommandBuilder, EmbedBuilder (L8)
- `../../src/logging/logger.js` → createLogger (L9)
- `./games/game-manager.js` → clearActiveGame, getActiveGame, getAllActiveGames, getGlobalLeaderboard (L10)
- `./games/trivia.js` (dynamic, L169)
- `./games/hangman.js` (dynamic, L174)
- `./games/numguess.js` (dynamic, L179)
- `./games/rps.js` (dynamic, L185)
- `./games/tictactoe.js` (dynamic, L194)
- `./games/connectfour.js` (dynamic, L203)
- `./games/riddles.js` (dynamic, L212)
- `./games/wordchain.js` (dynamic, L217)
- `./games/twenty-questions.js` (dynamic, L222)
- `./games/emojidecode.js` (dynamic, L227)
- `./games/wouldyourather.js` (dynamic, L232)
- `./games/caption.js` (dynamic, L237)
- `./games/acronym.js` (dynamic, L242)
- `./games/storybuilder.js` (dynamic, L247)
- `./games/mathblitz.js` (dynamic, L252)
- `./games/reaction.js` (dynamic, L257)
- `./games/mafia.js` (dynamic, L262)

## Exports
- **parentCommand** [const] (L15)
- **commandGroup** [const] (L18)
- **handlesCommands** [const] (L21)
- **commands** [const] (L47) - Command definitions - Simplified with queued loading
- **handleAutocomplete** [function] (L97) - Handle autocomplete for game selection
- **handleCommand** [function] (L119) - Handle game commands

## Functions
- ✓ `async handleAutocomplete(interaction)` (L97) - Handle autocomplete for game selection
- ✓ `async handleCommand(interaction, commandName, subcommand)` (L119) - Handle game commands
- `async handlePlayGame(interaction)` (L152) - Play a game - dynamically loads the game module
- `async handleListGames(interaction)` (L276) - List all available games
- `async handleStopGame(interaction)` (L299) - Stop active game in channel
- `async handleGameStats(interaction)` (L316) - Show game statistics
- `async handleLeaderboard(interaction)` (L341) - Show leaderboard

## Constants
- ✓ **handlesCommands** [array] (L21)
- **GAMES** [object] (L24)
- ✓ **commands** [array] (L47) - Command definitions - Simplified with queued loading

## Slash Commands
- **/game** (L49) - 🎮 Play games
- **/play** (L53) - Start a game
- **/game** (L56) - Which game to play
- **/difficulty** (L61) - Difficulty level
- **/opponent** (L69) - Challenge a player (for multiplayer games)
- **/rounds** (L72) - Number of rounds (1-20)
- **/list** (L78) - List all available games
- **/stats** (L82) - View game statistics
- **/stop** (L86) - Stop the current game
- **/leaderboard** (L90) - View the games leaderboard

