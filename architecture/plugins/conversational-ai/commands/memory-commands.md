# memory-commands.js

**Path:** `plugins\conversational-ai\commands\memory-commands.js`

## Description
* Memory Commands

## Dependencies
- `discord.js` → SlashCommandBuilder, EmbedBuilder (L12)
- `../../../src/logging/logger.js` → createLogger (L13)
- `../../../src/core/plugin-system.js` (dynamic, L51)

## Exports
- **commandGroup** [const] (L20) - Command definition
- **parentCommand** [const] (L41)
- **handlesCommands** [const] (L44)
- **handleCommand** [function] (L61) - Handle memory command execution

## Functions
- `async getPlugin()` (L49) - Get plugin instance
- ✓ `async handleCommand(interaction, commandName, subcommand)` (L61) - Handle memory command execution
- `async handleView(interaction)` (L81) - Handle /memory view
- `async handleClear(interaction)` (L144) - Handle /memory clear
- `async handleSearch(interaction)` (L184) - Handle /memory search
- `async handleStats(interaction)` (L233) - Handle /memory stats

## Constants
- ✓ **commandGroup** [value] (L20) - Command definition
- ✓ **handlesCommands** [array] (L44)

## Slash Commands
- **/memory** (L21) - 🧠 Manage AI memory
- **/view** (L24) - View short-term memory for this channel
- **/clear** (L27) - Clear short-term memory for this channel
- **/search** (L30) - Search semantic memory
- **/query** (L33) - Search query
- **/stats** (L37) - View memory statistics

