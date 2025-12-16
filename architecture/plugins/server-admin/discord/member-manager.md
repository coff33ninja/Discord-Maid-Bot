# member-manager.js

**Path:** `plugins\server-admin\discord\member-manager.js`

## Description
* Discord Member Manager

## Dependencies
- `../../../src/logging/logger.js` → createLogger (L10)
- `../audit-logger.js` → logAudit (L11)

## Exports
- **kickMember** [function] (L67) - Kick a member from the guild (requires confirmation)
- **banMember** [function] (L156) - Ban a member from the guild (requires confirmation)
- **timeoutMember** [function] (L251) - Timeout a member
- **removeTimeout** [function] (L338) - Remove timeout from a member
- **unbanMember** [function] (L402) - Unban a user from the guild
- **getMemberInfo** [function] (L465) - Get member information
- **parseDuration** [reference] (L514)
- **formatDuration** [reference] (L514)

## Functions
- `parseDuration(duration)` (L20) - Parse duration string to milliseconds
- `formatDuration(ms)` (L47) - Format duration for display
- ✓ `async kickMember(guild, userId, reason, context = {})` (L67) - Kick a member from the guild (requires confirmation)
- ✓ `async banMember(guild, userId, reason, deleteMessageDays = 0, context = {})` (L156) - Ban a member from the guild (requires confirmation)
- ✓ `async timeoutMember(guild, userId, duration, reason, context = {})` (L251) - Timeout a member
- ✓ `async removeTimeout(guild, userId, context = {})` (L338) - Remove timeout from a member
- ✓ `async unbanMember(guild, userId, context = {})` (L402) - Unban a user from the guild
- ✓ `async getMemberInfo(guild, userId)` (L465) - Get member information

