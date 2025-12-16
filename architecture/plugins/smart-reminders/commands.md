# commands.js

**Path:** `plugins\smart-reminders\commands.js`

## Description
* Smart Reminders Plugin Commands - Simplified with queued loading

## Dependencies
- `discord.js` → SlashCommandSubcommandGroupBuilder (L1)
- `../../src/utils/autocomplete-helpers.js` (dynamic, L169)
- `../../src/core/plugin-system.js` (dynamic, L175)

## Exports
- **commandGroup** [const] (L16)
- **parentCommand** [const] (L144)
- **handleCommand** [function] (L146)
- **handleAutocomplete** [function] (L165)

## Functions
- ✓ `async handleCommand(interaction, plugin)` (L146)
- ✓ `async handleAutocomplete(interaction, plugin)` (L165)
- `parseTimeString(timeStr)` (L218)
- `parseIntervalString(intervalStr)` (L293)
- `async handleCreate(interaction, plugin)` (L327)
- `async handleFor(interaction, plugin)` (L421)
- `async handleList(interaction, plugin)` (L537)
- `async handleManage(interaction, plugin)` (L571)
- `async handleSnooze(interaction, plugin)` (L613)

## Constants
- **REMINDER_TYPES** [object] (L9)
- ✓ **commandGroup** [value] (L16)
- ✓ **parentCommand** [value] (L144)

## Slash Commands
- **/reminder** (L17) - Smart reminder & automation system
- **/create** (L22) - Create a reminder
- **/type** (L25) - Reminder type
- **/message** (L35) - What to remind about
- **/when** (L39) - When/interval (e.g., 5m, 2h, 1d, 18:00)
- **/name** (L43) - Reminder name
- **/channel** (L46) - Send to channel (default: DM)
- **/device** (L49) - Device for presence reminders
- **/action** (L53) - Action for automations
- **/ai_variation** (L62) - Use AI to vary recurring messages
- **/for** (L67) - Create reminder for someone else (with optional actions)
- **/user** (L70) - Who to remind
- **/message** (L74) - What to remind them about
- **/when** (L78) - When to remind (e.g., 5m, 2h, 18:00)
- **/channel** (L82) - Send to channel (default: DM)
- **/action** (L85) - Action to trigger with reminder
- **/device** (L95) - Device for WOL action
- **/entity** (L99) - Home Assistant entity (e.g., light.bedroom)
- **/list** (L105) - List your reminders
- **/manage** (L110) - Manage a reminder
- **/reminder** (L113) - Reminder to manage
- **/action** (L118) - What to do
- **/snooze** (L132) - Snooze a reminder
- **/reminder** (L135) - Reminder to snooze
- **/duration** (L140) - How long to snooze (e.g., 10m, 1h)

