# role-manager.js

**Path:** `plugins\server-admin\discord\role-manager.js`

## Description
* Discord Role Manager

## Dependencies
- `../../../src/logging/logger.js` → createLogger (L10)
- `../audit-logger.js` → logAudit (L11)

## Exports
- **addRole** [function] (L82) - Add a role to a member
- **removeRole** [function] (L178) - Remove a role from a member
- **createRole** [function] (L275) - Create a new role in the guild
- **deleteRole** [function] (L368) - Delete a role from the guild (requires confirmation)
- **listRoles** [function] (L446) - List all roles in the guild
- **getRoleInfo** [function] (L490) - Get information about a specific role
- **canManageRole** [reference] (L533)
- **findRole** [reference] (L541)

## Functions
- `findRole(guild, roleIdentifier)` (L21) - Find a role by name or ID in a guild
- `canManageRole(guild, role)` (L41) - Check if the bot can manage a specific role
- ✓ `async addRole(guild, userId, roleName, context = {})` (L82) - Add a role to a member
- ✓ `async removeRole(guild, userId, roleName, context = {})` (L178) - Remove a role from a member
- ✓ `async createRole(guild, name, options = {}, context = {})` (L275) - Create a new role in the guild
- ✓ `async deleteRole(guild, roleName, context = {})` (L368) - Delete a role from the guild (requires confirmation)
- ✓ `async listRoles(guild)` (L446) - List all roles in the guild
- ✓ `async getRoleInfo(guild, roleName)` (L490) - Get information about a specific role

