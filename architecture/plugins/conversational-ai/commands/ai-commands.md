# ai-commands.js

**Path:** `plugins\conversational-ai\commands\ai-commands.js`

## Description
* AI Commands

## Dependencies
- `discord.js` → SlashCommandBuilder, EmbedBuilder (L12)
- `../../../src/logging/logger.js` → createLogger (L13)
- `../../../src/database/db.js` → configOps (L14)
- `../../../src/core/plugin-system.js` (dynamic, L50)
- `../../../src/core/plugin-system.js` (dynamic, L62)

## Exports
- **commandGroup** [const] (L21) - Command definition
- **parentCommand** [const] (L40)
- **handlesCommands** [const] (L43)
- **handleCommand** [function] (L72) - Handle AI command execution
- **handleAutocomplete** [function] (L90) - Handle autocomplete for personality

## Functions
- `async getPlugin()` (L48) - Get plugin instance
- `async getPersonalityPlugin()` (L60) - Get personality plugin
- ✓ `async handleCommand(interaction, commandName, subcommand)` (L72) - Handle AI command execution
- ✓ `async handleAutocomplete(interaction)` (L90) - Handle autocomplete for personality
- `async handleSettings(interaction)` (L126) - Handle /ai settings
- `async handleContext(interaction)` (L170) - Handle /ai context
- `async handlePersonality(interaction)` (L243) - Handle /ai personality

## Constants
- ✓ **commandGroup** [value] (L21) - Command definition
- ✓ **handlesCommands** [array] (L43)

## Slash Commands
- **/ai** (L22) - 🤖 AI settings and information
- **/settings** (L25) - View AI configuration
- **/context** (L28) - Show current context for this channel
- **/personality** (L31) - Quick personality switch
- **/style** (L34) - Personality style

