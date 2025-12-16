# commands.js

**Path:** `plugins\integrations\homeassistant\commands.js`

## Description
* Home Assistant Commands - Queued Loading System

## Dependencies
- `discord.js` → SlashCommandBuilder, EmbedBuilder (L7)
- `../../../src/logging/logger.js` → createLogger (L8)
- `../../../src/core/plugin-system.js` (dynamic, L118)
- `../../../src/core/plugin-system.js` (dynamic, L420)

## Exports
- **parentCommand** [const] (L13)
- **handlesCommands** [const] (L14)
- **commands** [const] (L33) - Command definitions - Simplified with queued loading
- **handleCommand** [function] (L114) - Handle homeassistant commands
- **handleAutocomplete** [function] (L415) - Handle autocomplete for Home Assistant entities

## Functions
- ✓ `async handleCommand(interaction, commandName, subcommand)` (L114) - Handle homeassistant commands
- `async handleControl(interaction, ha)` (L170) - Control an entity
- `async handleList(interaction, ha)` (L249) - List entities of a type
- `async handleSensorRead(interaction, ha)` (L317) - Read a sensor
- `async handleDiagnose(interaction, ha)` (L339) - Run diagnostics
- `async handleESPDevices(interaction, ha)` (L377) - List ESP devices
- ✓ `async handleAutocomplete(interaction)` (L415) - Handle autocomplete for Home Assistant entities

## Constants
- ✓ **handlesCommands** [array] (L14)
- **ENTITY_TYPES** [object] (L17)
- ✓ **commands** [array] (L33) - Command definitions - Simplified with queued loading

## Slash Commands
- **/homeassistant** (L35) - 🏠 Control Home Assistant devices
- **/control** (L39) - Control a Home Assistant entity
- **/type** (L42) - Entity type
- **/entity** (L56) - Entity to control
- **/action** (L61) - Action to perform
- **/brightness** (L70) - Brightness for lights (0-255)
- **/list** (L76) - List Home Assistant entities
- **/type** (L79) - Entity type to list
- **/sensor** (L94) - Read a sensor value
- **/entity** (L97) - Sensor to read
- **/diagnose** (L103) - Run Home Assistant diagnostics
- **/esp** (L107) - List ESP/ESPHome devices

