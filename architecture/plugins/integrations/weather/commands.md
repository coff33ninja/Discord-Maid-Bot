# commands.js

**Path:** `plugins\integrations\weather\commands.js`

## Description
* Weather Commands

## Dependencies
- `discord.js` → SlashCommandBuilder, EmbedBuilder (L7)
- `../../../src/logging/logger.js` → createLogger (L8)
- `../../../src/core/plugin-system.js` (dynamic, L38)
- `../../../src/core/plugin-system.js` (dynamic, L85)

## Exports
- **parentCommand** [const] (L13)
- **commands** [const] (L15)
- **handleCommand** [function] (L29) - Handle weather command
- **getWeather** [function] (L84)

## Functions
- ✓ `async handleCommand(interaction, commandName, subcommand)` (L29) - Handle weather command
- ✓ `async getWeather(city = 'Cape Town')` (L84)

## Constants
- ✓ **commands** [array] (L15)

## Slash Commands
- **/weather** (L17) - 🌤️ Get current weather information
- **/city** (L21) - City name (default: Cape Town)

