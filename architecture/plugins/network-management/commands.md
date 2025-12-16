# commands.js

**Path:** `plugins\network-management\commands.js`

## Description
* Network Management Commands

## Dependencies
- `discord.js` → SlashCommandBuilder, EmbedBuilder (L7)
- `../../src/logging/logger.js` → createLogger (L8)
- `../../src/database/db.js` → deviceOps (L9)
- `../../src/dashboard/server.js` → broadcastUpdate (L10)
- `./scanner.js` → scanUnifiedNetwork, quickPingCheck, isTailscaleAvailable, getTailscaleStatus (L11)
- `wake_on_lan` → wol (L12)
- `../../src/core/plugin-system.js` (dynamic, L50)
- `../../src/core/plugin-system.js` (dynamic, L304)
- `../../src/database/db.js` (dynamic, L345)
- `../../src/utils/autocomplete-helpers.js` (dynamic, L392)

## Exports
- **parentCommand** [const] (L73)
- **handlesCommands** [const] (L76)
- **commands** [const] (L81) - Command definitions - /network
- **handleCommand** [function] (L128) - Handle network management commands
- **handleAutocomplete** [function] (L385) - Handle autocomplete for network management commands
- **quickPing** [reference] (L418)
- **scanNetwork** [reference] (L418)
- **wakeDevice** [reference] (L418)
- **networkDevices** [reference] (L418)

## Functions
- `async quickPing()` (L21)
- `async scanNetwork()` (L37)
- `async wakeDevice(mac)` (L63)
- ✓ `async handleCommand(interaction, commandName, subcommand)` (L128) - Handle network management commands
- `async handleScanCommand(interaction)` (L150) - /network scan - Scan the network for devices
- `async handleDevicesCommand(interaction)` (L183) - /network devices - List all discovered devices
- `async handleWolCommand(interaction)` (L246) - /network wol - Wake a device using Wake-on-LAN
- `async handleSpeedtestCommand(interaction)` (L299) - /network speedtest - Run internet speed test
- `async handleSpeedhistoryCommand(interaction)` (L340) - /network speedhistory - View speed test history
- ✓ `async handleAutocomplete(interaction, plugin)` (L385) - Handle autocomplete for network management commands

## Constants
- ✓ **handlesCommands** [array] (L76)
- ✓ **commands** [array] (L81) - Command definitions - /network

## Slash Commands
- **/network** (L83) - 🌐 Network operations and monitoring
- **/scan** (L87) - Scan network for devices
- **/devices** (L91) - List all known devices
- **/filter** (L94) - Filter devices
- **/wol** (L103) - Wake device with Wake-on-LAN
- **/device** (L106) - Device to wake
- **/speedtest** (L112) - Run internet speed test
- **/speedhistory** (L116) - View speed test history
- **/days** (L119) - Number of days to show

