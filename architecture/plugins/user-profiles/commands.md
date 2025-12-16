# commands.js

**Path:** `plugins\user-profiles\commands.js`

## Description
* User Profile Commands

## Dependencies
- `discord.js` → SlashCommandSubcommandGroupBuilder, PermissionFlagsBits (L1)
- `../../src/logging/logger.js` → createLogger (L2)
- `../../src/core/permission-manager.js` → getUserRole (L3)
- `../../src/database/db.js` (dynamic, L237)

## Exports
- **parentCommand** [const] (L34)
- **commandGroup** [const] (L37)
- **handleCommand** [function] (L95) - Handle profile commands

## Functions
- `isAdmin(userId, member = null)` (L13) - Check if user is a bot admin
- ✓ `async handleCommand(interaction, plugin)` (L95) - Handle profile commands
- `async handleView(interaction, plugin)` (L114)
- `async handleEdit(interaction, plugin)` (L176)
- `async handleSetup(interaction, plugin)` (L211)
- `async handleDelete(interaction, plugin)` (L236)
- `async handleCreateChannel(interaction, plugin)` (L266)

## Constants
- ✓ **parentCommand** [value] (L34)
- ✓ **commandGroup** [value] (L37)

## Slash Commands
- **/profile** (L38) - Manage your user profile
- **/view** (L41) - User to view (leave empty for your own)
- **/user** (L44) - User to view (leave empty for your own)
- **/edit** (L50) - Edit your profile
- **/field** (L53) - Field to edit
- **/value** (L67) - New value (for interests, separate with commas)
- **/setup** (L73) - Start interactive profile setup
- **/delete** (L77) - Delete your profile data
- **/createchannel** (L81) - Create a profile setup channel (Admin only)
- **/name** (L84) - Channel name

