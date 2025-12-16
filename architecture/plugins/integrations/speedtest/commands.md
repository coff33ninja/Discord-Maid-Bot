# commands.js

**Path:** `plugins\integrations\speedtest\commands.js`

## Description
* Speed Test Commands

## Dependencies
- `discord.js` → SlashCommandSubcommandBuilder, EmbedBuilder (L7)
- `../../../src/logging/logger.js` → createLogger (L8)
- `../../../src/core/plugin-system.js` (dynamic, L43)
- `../../../src/core/plugin-system.js` (dynamic, L87)
- `../../../src/core/plugin-system.js` (dynamic, L135)

## Exports
- **parentCommand** [const] (L13)
- **commandGroup** [const] (L18)
- **handleCommand** [function] (L23) - Handle speed test commands
- **runSpeedtest** [function] (L134)

## Functions
- ✓ `async handleCommand(interaction, commandName, subcommand)` (L23) - Handle speed test commands
- `async handleSpeedTestCommand(interaction)` (L38) - /network speedtest - Run internet speed test
- `async handleSpeedHistoryCommand(interaction)` (L82) - /network speedhistory - View speed test history
- ✓ `async runSpeedtest(userId = null)` (L134)

## Constants
- ✓ **parentCommand** [value] (L13)

