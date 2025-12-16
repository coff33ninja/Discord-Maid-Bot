# commands.js

**Path:** `plugins\conversational-ai\commands.js`

## Description
* Conversational AI Commands

## Dependencies
- `discord.js` → SlashCommandBuilder, EmbedBuilder (L8)
- `../../src/logging/logger.js` → createLogger (L9)
- `../../src/database/db.js` → chatOps, configOps (L10)
- `./handlers/response-handler.js` → ResponseHandler (L11)
- `../../src/core/plugin-system.js` (dynamic, L55)
- `../../src/core/plugin-system.js` (dynamic, L70)
- `../../src/core/plugin-system.js` (dynamic, L152)
- `../../src/database/db.js` (dynamic, L246)

## Exports
- **initializeHandler** [function] (L24) - Initialize response handler with plugin components
- **commands** [const] (L189)
- **commandGroup** [const] (L196)
- **parentCommand** [const] (L199)
- **handlesCommands** [const] (L202)
- **handleCommand** [function] (L207) - Handle command execution
- **handleAutocomplete** [function] (L223) - Handle autocomplete
- **handleChatMessage** [function] (L234) - Process chat message with context integration
- **chatWithMaid** [reference] (L283)
- **chatWithContext** [reference] (L283)

## Functions
- ✓ `initializeHandler(plugin)` (L24) - Initialize response handler with plugin components
- `async getResponseHandler()` (L50) - Get or create response handler
- `async getPersonalityPlugin()` (L68)
- `async getUserPersonality(userId)` (L77)
- `async getPersonality(key)` (L87)
- `async chatWithContext(userMessage, userId, username, channelId, networkContext = null)` (L104) - Chat with AI using full context (new method)
- `async chatWithMaidBasic(userMessage, userId, username, networkContext = null)` (L139) - Basic chat function (fallback when handler not available)
- `async chatWithMaid(userMessage, userId, username, networkContext = null)` (L172)
- ✓ `async handleCommand(interaction, commandName, subcommand)` (L207) - Handle command execution
- ✓ `async handleAutocomplete(interaction)` (L223) - Handle autocomplete
- ✓ `async handleChatMessage(interaction)` (L234) - Process chat message with context integration

## Constants
- **chatCommand** [value] (L178)
- ✓ **commands** [array] (L189)
- ✓ **handlesCommands** [array] (L202)

## Slash Commands
- **/chat** (L179) - 💬 Chat with the AI bot
- **/message** (L183) - Your message to the bot

