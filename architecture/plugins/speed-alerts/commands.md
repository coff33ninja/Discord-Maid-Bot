# commands.js

**Path:** `plugins\speed-alerts\commands.js`

## Description
* Speed Alerts Plugin Commands

## Dependencies
- `discord.js` → SlashCommandSubcommandGroupBuilder (L1)
- `../../src/plugins/plugin-manager.js` (dynamic, L98)
- `../../src/plugins/plugin-manager.js` (dynamic, L112)

## Exports
- **commandGroup** [const] (L8)
- **parentCommand** [const] (L38)
- **handleCommand** [function] (L40)

## Functions
- ✓ `async handleCommand(interaction, plugin)` (L40)
- `async handleConfig(interaction, plugin)` (L57)
- `async handleStatus(interaction, plugin)` (L79)
- `async handleEnable(interaction, plugin)` (L97)
- `async handleDisable(interaction, plugin)` (L111)

## Constants
- ✓ **commandGroup** [value] (L8)
- ✓ **parentCommand** [value] (L38)

## Slash Commands
- **/speedalert** (L9) - Speed alert notifications
- **/config** (L13) - Configure speed alerts
- **/threshold** (L16) - Alert when speed drops below (Mbps)
- **/channel** (L22) - Channel to send alerts
- **/status** (L27) - View current settings
- **/enable** (L31) - Enable speed alerts
- **/disable** (L35) - Disable speed alerts

