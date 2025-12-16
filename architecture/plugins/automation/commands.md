# commands.js

**Path:** `plugins\automation\commands.js`

## Description
* Automation Commands

## Dependencies
- `discord.js` → SlashCommandBuilder, EmbedBuilder (L8)
- `../../src/logging/logger.js` → createLogger (L9)
- `../../src/database/db.js` → taskOps (L10)
- `../../src/core/permission-manager.js` → checkUserPermission (L11)
- `../../src/auth/auth.js` → PERMISSIONS (L12)
- `node-cron` (dynamic, L151)
- `../../src/core/plugin-system.js` (dynamic, L171)
- `../../src/core/plugin-system.js` (dynamic, L239)
- `../../src/core/plugin-system.js` (dynamic, L300)

## Exports
- **parentCommand** [const] (L17)
- **handlesCommands** [const] (L18)
- **commands** [const] (L24) - Command definitions - /automation
- **handleCommand** [function] (L52) - Handle automation commands

## Functions
- ✓ `async handleCommand(interaction, commandName, subcommand)` (L52) - Handle automation commands
- `async handleListTasks(interaction)` (L90) - List all scheduled tasks
- `async handleAddTask(interaction)` (L126) - Add a new scheduled task
- `async handleToggleTask(interaction)` (L201) - Toggle a task on/off
- `async handleDeleteTask(interaction)` (L266) - Delete a scheduled task

## Constants
- ✓ **handlesCommands** [array] (L18)
- ✓ **commands** [array] (L24) - Command definitions - /automation

## Slash Commands
- **/automation** (L26) - ⚙️ Automation and triggers
- **/schedule** (L29) - Manage scheduled tasks
- **/action** (L31) - Action
- **/name** (L38) - Task name
- **/command** (L39) - Command to run
- **/cron** (L45) - Cron expression
- **/channel** (L46) - Notification channel

