# server-settings.js

**Path:** `plugins\server-admin\discord\server-settings.js`

## Description
* Discord Server Settings

## Dependencies
- `../../../src/logging/logger.js` → createLogger (L10)
- `../audit-logger.js` → logAudit (L11)

## Exports
- **getServerInfo** [function] (L20) - Get server information
- **setServerName** [function] (L74) - Set server name (requires confirmation)
- **setServerDescription** [function] (L147) - Set server description
- **getServerStats** [function] (L199) - Get server statistics
- **getBanList** [function] (L256) - Get list of banned users

## Functions
- ✓ `async getServerInfo(guild)` (L20) - Get server information
- ✓ `async setServerName(guild, name, context = {})` (L74) - Set server name (requires confirmation)
- ✓ `async setServerDescription(guild, description, context = {})` (L147) - Set server description
- ✓ `async getServerStats(guild)` (L199) - Get server statistics
- ✓ `async getBanList(guild, limit = 50)` (L256) - Get list of banned users

