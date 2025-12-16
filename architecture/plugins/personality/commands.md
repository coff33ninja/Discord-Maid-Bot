# commands.js

**Path:** `plugins\personality\commands.js`

## Description
* Personality Commands

## Dependencies
- `discord.js` → SlashCommandSubcommandBuilder, EmbedBuilder (L7)
- `../../src/logging/logger.js` → createLogger (L8)
- `../../src/database/db.js` → configOps (L9)
- `./personalities.js` → getPersonality, getPersonalityOptions, DEFAULT_PERSONALITY (L10)

## Exports
- **parentCommand** [const] (L25)
- **commandGroup** [const] (L28)
- **handleCommand** [function] (L50) - Handle personality command execution
- **getUserPersonality** [reference] (L104)
- **setUserPersonality** [reference] (L104)

## Functions
- `getUserPersonality(userId)` (L15)
- `setUserPersonality(userId, personalityKey)` (L20)
- ✓ `async handleCommand(interaction, commandName, subcommand)` (L50) - Handle personality command execution

## Constants
- ✓ **parentCommand** [value] (L25)
- ✓ **commandGroup** [value] (L28)

## Slash Commands
- **/personality** (L29) - Change bot personality
- **/style** (L32) - Personality style

