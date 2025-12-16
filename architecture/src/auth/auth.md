# auth.js

**Path:** `src\auth\auth.js`

## Dependencies
- `bcrypt` → bcrypt (L1)
- `jsonwebtoken` → jwt (L2)
- `../database/db.js` → configOps (L3)

## Exports
- **ROLES** [const] (L9)
- **PERMISSIONS** [const] (L16)
- **initializeAuth** [function] (L98)
- **createUser** [function] (L119)
- **authenticateUser** [function] (L138)
- **verifyToken** [function] (L172)
- **hasPermission** [function] (L181)
- **requireAuth** [function] (L187)
- **requirePermission** [function] (L204)
- **getAllUsers** [function] (L219)
- **updateUserRole** [function] (L241)
- **deleteUser** [function] (L255)
- **changePassword** [function] (L280)

## Functions
- ✓ `async initializeAuth()` (L98)
- ✓ `async createUser(username, password, role = ROLES.VIEWER)` (L119)
- ✓ `async authenticateUser(username, password)` (L138)
- ✓ `verifyToken(token)` (L172)
- ✓ `hasPermission(role, permission)` (L181)
- ✓ `requireAuth(req, res, next)` (L187)
- ✓ `requirePermission(permission)` (L204)
- ✓ `getAllUsers()` (L219)
- ✓ `updateUserRole(username, newRole)` (L241)
- ✓ `deleteUser(username)` (L255)
- ✓ `async changePassword(username, oldPassword, newPassword)` (L280)

## Constants
- ✓ **ROLES** [object] (L9)
- ✓ **PERMISSIONS** [object] (L16)
- **ROLE_PERMISSIONS** [object] (L70)

