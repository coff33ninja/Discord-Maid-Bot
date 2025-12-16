# commands.js

**Path:** `plugins\device-bulk-ops\commands.js`

## Description
* Device Bulk Operations Plugin Commands

## Dependencies
- `discord.js` → SlashCommandSubcommandGroupBuilder (L1)

## Exports
- **commandGroup** [const] (L8)
- **parentCommand** [const] (L50)
- **handleCommand** [function] (L52)

## Functions
- ✓ `async handleCommand(interaction, plugin)` (L52)
- `async handleRename(interaction, plugin)` (L67)
- `async handleEmoji(interaction, plugin)` (L114)
- `async handleGroup(interaction, plugin)` (L159)

## Constants
- ✓ **commandGroup** [value] (L8)
- ✓ **parentCommand** [value] (L50)

## Slash Commands
- **/bulk** (L9) - Bulk operations for device management
- **/rename** (L13) - Bulk rename devices matching a pattern
- **/pattern** (L16)
- **/prefix** (L20) - Prefix to add to device names
- **/suffix** (L23) - Suffix to add to device names
- **/emoji** (L27) - Bulk set emoji for devices matching a pattern
- **/pattern** (L30) - Regex pattern to match devices
- **/emoji** (L34) - Emoji to set (e.g., 💻, 📱, 🖥️)
- **/group** (L39) - Bulk assign devices to a group
- **/pattern** (L42) - Regex pattern to match devices
- **/group** (L46) - Group name to assign

