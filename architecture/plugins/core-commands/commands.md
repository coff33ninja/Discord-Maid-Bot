# commands.js

**Path:** `plugins\core-commands\commands.js`

## Description
* Core Commands - Command Definitions and Handlers

## Dependencies
- `discord.js` → SlashCommandBuilder, EmbedBuilder (L8)
- `../../src/logging/logger.js` → createLogger (L9)
- `../../src/database/db.js` → deviceOps, speedTestOps, chatOps, taskOps (L10)
- `../../src/core/permission-manager.js` → checkUserPermission (L11)
- `../../src/auth/auth.js` → PERMISSIONS (L12)
- `../conversational-ai/commands.js` (dynamic, L178)
- `../personality/commands.js` (dynamic, L190)
- `../../src/database/db.js` (dynamic, L683)

## Exports
- **commandGroup** [const] (L27) - Command group configuration
- **parentCommand** [const] (L33)
- **handlesCommands** [const] (L37)
- **commands** [const] (L42) - Define slash commands
- **handleCommand** [function] (L165) - Handle command execution
- **handleAutocomplete** [function] (L710) - Handle autocomplete (if needed)

## Functions
- ✓ `async handleCommand(interaction, commandName, subcommand)` (L165) - Handle command execution
- `async handleHelp(interaction)` (L274) - Handle /help or /bot help
- `async handleStats(interaction)` (L427) - Handle /stats or /bot stats
- `async handlePing(interaction)` (L458) - Handle /ping
- `async handleDashboard(interaction)` (L480) - Handle /dashboard or /bot dashboard
- `async handleLogs(interaction, subcommand)` (L503) - Handle /bot logs subcommands
- `async handlePluginCommand(interaction, subcommand, userId)` (L529) - Handle /plugin or /bot plugin subcommands
- `async handleAdminCommand(interaction, subcommand, subcommandGroup, userId)` (L657) - Handle /admin command
- ✓ `async handleAutocomplete(interaction)` (L710) - Handle autocomplete (if needed)

## Constants
- ✓ **commandGroup** [object] (L27) - Command group configuration
- ✓ **handlesCommands** [array] (L37)
- ✓ **commands** [array] (L42) - Define slash commands

## Slash Commands
- **/help** (L45) - Show all available commands and bot information
- **/stats** (L50) - Display bot statistics
- **/ping** (L55) - Check bot latency and response time
- **/dashboard** (L60) - Get web dashboard URL and information
- **/plugin** (L65) - Manage bot plugins (admin only)
- **/list** (L69) - List all loaded plugins
- **/enable** (L73) - Enable a plugin
- **/name** (L77) - Plugin name
- **/disable** (L82) - Disable a plugin
- **/name** (L86) - Plugin name
- **/reload** (L91) - Reload a plugin
- **/name** (L95) - Plugin name
- **/stats** (L100) - Show plugin statistics
- **/bot** (L105) - 🤖 Bot management and settings
- **/chat** (L107) - Chat with AI assistant
- **/message** (L108) - Your message
- **/stats** (L109) - View bot statistics
- **/dashboard** (L110) - Get web dashboard URL
- **/help** (L111) - Show help and available commands
- **/logs** (L112) - View system logs
- **/recent** (L113) - View recent logs
- **/level** (L114) - Filter by level
- **/limit** (L120) - Number of logs
- **/search** (L121) - Search logs
- **/query** (L122) - Search query
- **/limit** (L123) - Number of results
- **/stats** (L124) - View log statistics
- **/errors** (L125) - View recent errors
- **/limit** (L126) - Number of errors
- **/plugin** (L127) - Plugin management
- **/list** (L128) - List all plugins
- **/enable** (L129) - Enable a plugin
- **/name** (L130) - Plugin name
- **/disable** (L131) - Disable a plugin
- **/name** (L132) - Plugin name
- **/reload** (L133) - Reload a plugin
- **/name** (L134) - Plugin name
- **/stats** (L135) - View plugin statistics
- **/admin** (L139) - 👑 Administration (Admin only)
- **/permissions** (L141) - Permission management
- **/list** (L142) - List all users and permissions
- **/set** (L143) - Set user role
- **/user** (L144) - User to modify
- **/role** (L145) - Role to assign
- **/grant** (L147) - Grant specific permission
- **/user** (L148) - User
- **/permission** (L149) - Permission
- **/revoke** (L150) - Revoke specific permission
- **/user** (L151) - User
- **/permission** (L152) - Permission
- **/config** (L153) - Bot configuration
- **/view** (L154) - View configuration
- **/section** (L155) - Config section
- **/set** (L157) - Set configuration value
- **/key** (L158) - Configuration key
- **/value** (L159) - Configuration value

