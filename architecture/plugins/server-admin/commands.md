# commands.js

**Path:** `plugins\server-admin\commands.js`

## Description
* Server Admin Slash Commands

## Dependencies
- `discord.js` → SlashCommandSubcommandGroupBuilder, EmbedBuilder (L10)
- `../../src/logging/logger.js` → createLogger (L11)
- `./discord-admin.js` → handleDiscordAdmin, formatResult (L12)
- `./command-executor.js` (dynamic, L351)
- `./command-generator.js` (dynamic, L352)
- `./approval-manager.js` (dynamic, L353)
- `./button-handler.js` (dynamic, L354)
- `./credential-store.js` (dynamic, L738)
- `./command-executor.js` (dynamic, L739)
- `./command-validator.js` (dynamic, L740)
- `./credential-store.js` (dynamic, L914)

## Exports
- **parentCommand** [const] (L17)
- **commandGroup** [const] (L24) - Command group - server management
- **additionalGroups** [const] (L64) - Additional command groups to inject
- **handleCommand** [function] (L318) - Handle admin commands for server-admin plugin
- **handleAutocomplete** [function] (L907) - Handle autocomplete for admin commands

## Functions
- ✓ `async handleCommand(interaction, plugin)` (L318) - Handle admin commands for server-admin plugin
- `async handleServerCommand(interaction, subcommand)` (L350) - Handle server management commands
- `async handleDiscordCommand(interaction, subcommand)` (L454) - Handle Discord management commands
- `async handleSSHCommand(interaction, subcommand)` (L732) - Handle SSH management commands
- ✓ `async handleAutocomplete(interaction)` (L907) - Handle autocomplete for admin commands

## Constants
- ✓ **parentCommand** [value] (L17)
- ✓ **commandGroup** [value] (L24) - Command group - server management
- ✓ **additionalGroups** [array] (L64) - Additional command groups to inject

## Slash Commands
- **/server** (L25) - Linux/Windows/macOS server management
- **/status** (L29) - Check server and bot status
- **/logs** (L34) - View recent bot logs
- **/lines** (L38) - Number of lines to show (default: 20)
- **/restart** (L46) - Restart the bot service
- **/deploy** (L51) - Deploy latest code from git
- **/disk** (L56) - Check disk space usage
- **/discord** (L66) - Discord server management
- **/info** (L70) - Show server information
- **/roles** (L75) - List all server roles
- **/channels** (L80) - List all server channels
- **/lock** (L85) - Lock the current channel
- **/unlock** (L90) - Unlock the current channel
- **/slowmode** (L95) - Set slowmode for current channel
- **/seconds** (L99) - Slowmode duration in seconds (0 to disable)
- **/kick** (L108) - Kick a member from the server
- **/user** (L112) - User to kick
- **/reason** (L118) - Reason for kick
- **/ban** (L124) - Ban a member from the server
- **/user** (L128) - User to ban
- **/reason** (L134) - Reason for ban
- **/delete_days** (L139) - Days of messages to delete (0-7)
- **/unban** (L147) - Unban a user from the server
- **/user_id** (L151) - User ID to unban
- **/timeout** (L158) - Timeout a member
- **/user** (L162) - User to timeout
- **/duration** (L168) - Duration (e.g., 5m, 1h, 1d)
- **/reason** (L174) - Reason for timeout
- **/untimeout** (L180) - Remove timeout from a member
- **/user** (L184) - User to remove timeout from
- **/giverole** (L191) - Give a role to a member
- **/user** (L195) - User to give role to
- **/role** (L201) - Role to give
- **/removerole** (L208) - Remove a role from a member
- **/user** (L212) - User to remove role from
- **/role** (L218) - Role to remove
- **/ssh** (L226) - SSH credential and remote server management
- **/add** (L230) - Add SSH credentials for a server
- **/name** (L234) - Server name/identifier
- **/host** (L240) - Server hostname or IP
- **/username** (L246) - SSH username
- **/password** (L252) - SSH password (stored encrypted)
- **/port** (L257) - SSH port (default: 22)
- **/list** (L265) - List all configured SSH servers
- **/remove** (L270) - Remove SSH credentials for a server
- **/name** (L274) - Server name to remove
- **/test** (L282) - Test SSH connection to a server
- **/name** (L286) - Server name to test
- **/exec** (L294) - Execute command on remote server
- **/server** (L298) - Server to execute on
- **/command** (L305) - Command to execute

