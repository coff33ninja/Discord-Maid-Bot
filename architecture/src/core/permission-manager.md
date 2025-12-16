# permission-manager.js

**Path:** `src\core\permission-manager.js`

## Dependencies
- `../database/db.js` → configOps (L1)
- `../auth/auth.js` → hasPermission (L2)
- `../logging/logger.js` → createLogger (L3)

## Exports
- **checkUserPermission** [function] (L13) - Check if user has permission
- **setUserRole** [function] (L43) - Set user role
- **getUserRole** [function] (L63) - Get user role
- **getAllUsers** [function] (L80) - Get all users with roles

## Functions
- ✓ `async checkUserPermission(userId, permission)` (L13) - Check if user has permission
- ✓ `async setUserRole(userId, username, role)` (L43) - Set user role
- ✓ `getUserRole(userId)` (L63) - Get user role
- ✓ `getAllUsers()` (L80) - Get all users with roles

