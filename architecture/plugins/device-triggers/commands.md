# commands.js

**Path:** `plugins\device-triggers\commands.js`

## Description
* Device Triggers Plugin Commands

## Dependencies
- `discord.js` → SlashCommandSubcommandGroupBuilder (L1)
- `../../src/utils/autocomplete-helpers.js` (dynamic, L107)
- `../../src/integrations/homeassistant.js` (dynamic, L130)
- `../../src/database/db.js` (dynamic, L199)
- `../../src/database/db.js` (dynamic, L236)

## Exports
- **commandGroup** [const] (L8)
- **parentCommand** [const] (L82)
- **handleCommand** [function] (L84)
- **handleAutocomplete** [function] (L101)

## Functions
- ✓ `async handleCommand(interaction, plugin)` (L84)
- ✓ `async handleAutocomplete(interaction, plugin)` (L101)
- `async handleAdd(interaction, plugin)` (L153)
- `async handleList(interaction, plugin)` (L226)
- `async handleRemove(interaction, plugin)` (L268)
- `async handleToggle(interaction, plugin)` (L289)

## Constants
- ✓ **commandGroup** [value] (L8)
- ✓ **parentCommand** [value] (L82)

## Slash Commands
- **/devicetrigger** (L9) - Device automation triggers
- **/add** (L13) - Create a new trigger
- **/name** (L16) - Trigger name
- **/device** (L20) - Device to monitor
- **/event** (L25) - When to trigger
- **/action** (L34) - What to do
- **/message** (L43) - Custom message
- **/channel** (L46) - Channel for alerts
- **/ha_entity** (L49) - Home Assistant entity
- **/ha_service** (L53) - HA service (e.g., light.turn_on)
- **/list** (L57) - List all triggers
- **/remove** (L61) - Remove a trigger
- **/trigger** (L64) - Trigger to remove
- **/toggle** (L70) - Enable/disable a trigger
- **/trigger** (L73) - Trigger to toggle
- **/enabled** (L78) - Enable or disable

