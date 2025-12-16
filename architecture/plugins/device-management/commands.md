# commands.js

**Path:** `plugins\device-management\commands.js`

## Description
* Device Management Commands

## Dependencies
- `discord.js` → SlashCommandBuilder, EmbedBuilder (L7)
- `../../src/logging/logger.js` → createLogger (L8)
- `../../src/database/db.js` → deviceOps (L9)
- `../../src/database/db.js` (dynamic, L361)
- `../../src/database/db.js` (dynamic, L367)
- `../network-management/device-detector.js` (dynamic, L573)
- `../../src/database/db.js` (dynamic, L574)

## Exports
- **parentCommand** [const] (L14)
- **handlesCommands** [const] (L17)
- **commands** [const] (L22) - Command definitions - /device
- **handleCommand** [function] (L158) - Handle device management commands
- **handleAutocomplete** [function] (L449) - Handle autocomplete

## Functions
- ✓ `async handleCommand(interaction, commandName, subcommand)` (L158) - Handle device management commands
- `async handleGroupAssign(interaction)` (L199) - /device group assign
- `async handleGroupList(interaction)` (L231) - /device group list
- `async handleGroupView(interaction)` (L264) - /device group view
- `async handleGroupRemove(interaction)` (L302) - /device group remove
- `async handleDeviceConfig(interaction)` (L334) - /device config
- `async handleDeviceList(interaction)` (L399) - /device list
- ✓ `async handleAutocomplete(interaction)` (L449) - Handle autocomplete
- `async handleDeviceRename(interaction)` (L495) - /device rename
- `async handleDeviceInfo(interaction)` (L531) - /device info
- `async handleDeviceScan(interaction)` (L568) - /device scan - Deep scan with nmap

## Constants
- ✓ **handlesCommands** [array] (L17)
- ✓ **commands** [array] (L22) - Command definitions - /device

## Slash Commands
- **/device** (L24) - 📱 Device management and configuration
- **/group** (L28) - Manage device groups
- **/assign** (L32) - Assign device to a group
- **/device** (L35) - Device to assign
- **/group** (L40) - Group name
- **/list** (L45) - List all groups
- **/view** (L49) - View devices in a group
- **/group** (L52) - Group name
- **/remove** (L58) - Remove device from its group
- **/device** (L61) - Device to remove
- **/config** (L67) - Configure device properties
- **/device** (L70) - Device to configure
- **/name** (L75) - Friendly name
- **/emoji** (L78) - Emoji (e.g., 🎮 💻 📱)
- **/type** (L81) - Device type
- **/os** (L96) - Operating system
- **/group** (L109) - Group name
- **/rename** (L113) - Rename a device
- **/device** (L116) - Device to rename
- **/name** (L121) - New name for the device
- **/info** (L126) - Get detailed info about a device
- **/device** (L129) - Device to get info about
- **/scan** (L135) - Deep scan a device with nmap to detect type/OS
- **/device** (L138) - Device to scan (leave empty for all)
- **/list** (L143) - List all known devices
- **/filter** (L146) - Filter devices

