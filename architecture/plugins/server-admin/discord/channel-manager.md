# channel-manager.js

**Path:** `plugins\server-admin\discord\channel-manager.js`

## Description
* Discord Channel Manager

## Dependencies
- `discord.js` → ChannelType, PermissionFlagsBits (L10)
- `../../../src/logging/logger.js` → createLogger (L11)
- `../audit-logger.js` → logAudit (L12)

## Exports
- **createChannel** [function] (L68) - Create a new channel in the guild
- **deleteChannel** [function] (L171) - Delete a channel (requires confirmation)
- **renameChannel** [function] (L245) - Rename a channel
- **moveChannel** [function] (L295) - Move a channel to a category
- **setTopic** [function] (L347) - Set channel topic
- **lockChannel** [function] (L392) - Lock a channel (remove send message permission for @everyone)
- **unlockChannel** [function] (L440) - Unlock a channel (reset send message permission for @everyone)
- **setSlowmode** [function] (L489) - Set slowmode for a channel
- **listChannels** [function] (L537) - List all channels in the guild
- **findChannel** [reference] (L568)
- **canManageChannels** [reference] (L568)

## Functions
- `findChannel(guild, channelIdentifier)` (L22) - Find a channel by name or ID in a guild
- `canManageChannels(guild)` (L41) - Check if the bot can manage channels
- ✓ `async createChannel(guild, name, type = 'text', categoryId = null, context = {})` (L68) - Create a new channel in the guild
- ✓ `async deleteChannel(guild, channelIdentifier, context = {})` (L171) - Delete a channel (requires confirmation)
- ✓ `async renameChannel(channel, newName, context = {})` (L245) - Rename a channel
- ✓ `async moveChannel(channel, categoryId, context = {})` (L295) - Move a channel to a category
- ✓ `async setTopic(channel, topic, context = {})` (L347) - Set channel topic
- ✓ `async lockChannel(channel, context = {})` (L392) - Lock a channel (remove send message permission for @everyone)
- ✓ `async unlockChannel(channel, context = {})` (L440) - Unlock a channel (reset send message permission for @everyone)
- ✓ `async setSlowmode(channel, seconds, context = {})` (L489) - Set slowmode for a channel
- ✓ `async listChannels(guild)` (L537) - List all channels in the guild

