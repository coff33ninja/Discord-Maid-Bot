# commands.js

**Path:** `plugins\research\commands.js`

## Description
* Research Commands

## Dependencies
- `discord.js` → SlashCommandBuilder, EmbedBuilder (L7)
- `../../src/logging/logger.js` → createLogger (L8)
- `../../src/core/plugin-system.js` (dynamic, L96)
- `../../src/core/plugin-system.js` (dynamic, L145)
- `../../src/core/plugin-system.js` (dynamic, L202)
- `./web-search.js` (dynamic, L259)
- `../../src/core/plugin-system.js` (dynamic, L317)

## Exports
- **parentCommand** [const] (L13)
- **handlesCommands** [const] (L16)
- **commands** [const] (L21) - Command definitions - /research
- **handleCommand** [function] (L68) - Handle research commands
- **webResearch** [function] (L316)

## Functions
- ✓ `async handleCommand(interaction, commandName, subcommand)` (L68) - Handle research commands
- `async handleResearchQuery(interaction)` (L88) - /research query - Perform AI-powered research
- `async handleResearchHistory(interaction)` (L140) - /research history - View research history
- `async handleResearchSearch(interaction)` (L195) - /research search - Search research history
- `async handleWebSearch(interaction)` (L252) - /research web - Web search using DuckDuckGo
- ✓ `async webResearch(query, userId = null)` (L316)

## Constants
- ✓ **handlesCommands** [array] (L16)
- ✓ **commands** [array] (L21) - Command definitions - /research

## Slash Commands
- **/research** (L23) - 🔎 Research and search tools
- **/query** (L27) - Research a topic with AI
- **/query** (L30) - What to research
- **/history** (L35) - View past research
- **/limit** (L38) - Number of results
- **/search** (L44) - Search through past research
- **/query** (L47) - Search terms
- **/web** (L52) - Search the web (DuckDuckGo)
- **/query** (L55) - What to search for
- **/results** (L59) - Number of results (1-10)

