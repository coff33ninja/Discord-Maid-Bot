# commands.js

**Path:** `plugins\network-insights\commands.js`

## Description
* Network Insights Plugin Commands

## Dependencies
- `discord.js` → SlashCommandSubcommandGroupBuilder (L1)

## Exports
- **commandGroup** [const] (L8)
- **parentCommand** [const] (L29)
- **handleCommand** [function] (L31)

## Functions
- ✓ `async handleCommand(interaction, plugin)` (L31)
- `async handleAnalyze(interaction, plugin)` (L46)
- `async handleLatest(interaction, plugin)` (L71)
- `async handleHistory(interaction, plugin)` (L100)

## Constants
- ✓ **commandGroup** [value] (L8)
- ✓ **parentCommand** [value] (L29)

## Slash Commands
- **/insights** (L9) - AI-powered network insights
- **/analyze** (L13) - Generate AI insights about your network
- **/latest** (L17) - View the latest network insights
- **/history** (L21) - View past network insights
- **/limit** (L24) - Number of insights to show

