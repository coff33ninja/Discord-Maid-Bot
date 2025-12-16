# commands.js

**Path:** `plugins\device-health\commands.js`

## Description
* Device Health Plugin Commands

## Dependencies
- `discord.js` → SlashCommandSubcommandGroupBuilder (L1)
- `../../src/utils/autocomplete-helpers.js` (dynamic, L81)

## Exports
- **commandGroup** [const] (L8)
- **parentCommand** [const] (L51)
- **handleCommand** [function] (L54)
- **handleAutocomplete** [function] (L76)

## Functions
- ✓ `async handleCommand(interaction, plugin)` (L54)
- ✓ `async handleAutocomplete(interaction, plugin)` (L76)
- `async handleHealthReport(interaction, plugin)` (L99)
- `async handleHealthSummary(interaction, plugin)` (L182)
- `async handleUnhealthy(interaction, plugin)` (L223)
- `async handleReliable(interaction, plugin)` (L247)
- `async handleCompare(interaction, plugin)` (L271)
- `async handleAlerts(interaction, plugin)` (L303)

## Constants
- ✓ **commandGroup** [value] (L8)
- ✓ **parentCommand** [value] (L51)

## Slash Commands
- **/health** (L9) - Device health monitoring
- **/report** (L13) - View device health report
- **/device** (L16) - Device to check (leave empty for all)
- **/summary** (L21) - View health summary for all devices
- **/unhealthy** (L25) - List devices with poor health (uptime < 90%)
- **/reliable** (L29) - List most reliable devices (uptime > 99%)
- **/compare** (L33) - Compare two devices
- **/device1** (L36) - First device
- **/device2** (L41) - Second device
- **/alerts** (L47) - Check for predictive alerts

