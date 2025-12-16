# commands.js

**Path:** `plugins\power-management\commands.js`

## Description
* Power Management Commands

## Dependencies
- `discord.js` → SlashCommandSubcommandGroupBuilder, EmbedBuilder (L7)
- `../../src/logging/logger.js` → createLogger (L8)
- `../../src/database/db.js` → deviceOps (L9)
- `../../src/dashboard/server.js` → broadcastUpdate (L10)
- `../../src/utils/autocomplete-helpers.js` (dynamic, L103)
- `../../src/database/db.js` (dynamic, L379)

## Exports
- **parentCommand** [const] (L13)
- **commandGroup** [const] (L16)
- **handleAutocomplete** [function] (L98) - Handle autocomplete
- **handleCommand** [function] (L123) - Handle commands

## Functions
- ✓ `async handleAutocomplete(interaction, plugin)` (L98) - Handle autocomplete
- ✓ `async handleCommand(interaction, plugin)` (L123) - Handle commands
- `async handleWake(interaction, plugin)` (L145) - Wake device
- `async handleShutdown(interaction, plugin)` (L188) - Shutdown device
- `async handleRestart(interaction, plugin)` (L237) - Restart device
- `async handleStatus(interaction, plugin)` (L286) - Check power status
- `async handleConfigure(interaction, plugin)` (L364) - Configure device for remote shutdown

## Constants
- ✓ **parentCommand** [value] (L13)
- ✓ **commandGroup** [value] (L16)

## Slash Commands
- **/power** (L17) - Device power management
- **/wake** (L21) - Wake a device using Wake-on-LAN
- **/device** (L24) - Device name, IP, or MAC address
- **/shutdown** (L32) - Shutdown a device remotely
- **/device** (L35) - Device name, IP, or MAC address
- **/delay** (L41) - Delay in seconds before shutdown (default: 5)
- **/restart** (L48) - Restart a device remotely
- **/device** (L51) - Device name, IP, or MAC address
- **/delay** (L57) - Delay in seconds before restart (default: 5)
- **/status** (L64) - Check power status of devices
- **/device** (L67) - Device name, IP, or MAC address (optional - shows all if not specified)
- **/configure** (L75) - Configure device for remote shutdown
- **/device** (L78) - Device name, IP, or MAC address
- **/api_key** (L84) - API key for shutdown server
- **/port** (L89) - Port for shutdown server (default: 5000)

