# commands.js

**Path:** `plugins\integrations\commands.js`

## Description
* Integrations Commands

## Dependencies
- `discord.js` → SlashCommandBuilder, EmbedBuilder (L7)
- `../../src/logging/logger.js` → createLogger (L8)

## Exports
- **commands** [const] (L18)
- **parentCommand** [const] (L24)
- **commandGroup** [const] (L25)
- **handlesCommands** [const] (L28)
- **handleCommand** [function] (L33) - Handle command execution - delegates to appropriate sub-plugin
- **handleAutocomplete** [function] (L57) - Handle autocomplete

## Functions
- ✓ `async handleCommand(interaction, commandName, subcommand)` (L33) - Handle command execution - delegates to appropriate sub-plugin
- ✓ `async handleAutocomplete(interaction)` (L57) - Handle autocomplete

## Constants
- ✓ **commands** [array] (L18)
- ✓ **handlesCommands** [array] (L28)

