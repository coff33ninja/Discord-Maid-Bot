# audit-logger.js

**Path:** `plugins\server-admin\audit-logger.js`

## Description
* Audit Logger for Server Admin

## Dependencies
- `../../src/logging/logger.js` → createLogger (L10)
- `../../src/database/db.js` → configOps (L11)

## Exports
- **logAudit** [function] (L30) - Log a command execution to the audit trail
- **getAuditHistory** [function] (L75) - Get audit history with optional filters
- **getAuditEntry** [function] (L113) - Get a specific audit entry by ID
- **getUserAuditHistory** [function] (L134) - Get audit entries for a specific user
- **getAuditByType** [function] (L144) - Get audit entries by type
- **getRecentAudit** [function] (L154) - Get recent audit entries
- **getFailedAudit** [function] (L164) - Get failed command audit entries
- **cleanupAuditLog** [function] (L173) - Clean up old audit entries
- **getAuditStats** [function] (L203) - Get audit statistics
- **formatAuditEntry** [function] (L292) - Format audit entry for display

## Functions
- ✓ `logAudit(entry)` (L30) - Log a command execution to the audit trail
- ✓ `getAuditHistory(filters = {})` (L75) - Get audit history with optional filters
- ✓ `getAuditEntry(auditId)` (L113) - Get a specific audit entry by ID
- ✓ `getUserAuditHistory(userId, limit = 50)` (L134) - Get audit entries for a specific user
- ✓ `getAuditByType(type, limit = 50)` (L144) - Get audit entries by type
- ✓ `getRecentAudit(hours = 24, limit = 100)` (L154) - Get recent audit entries
- ✓ `getFailedAudit(limit = 50)` (L164) - Get failed command audit entries
- ✓ `cleanupAuditLog(keepCount = MAX_AUDIT_ENTRIES)` (L173) - Clean up old audit entries
- ✓ `getAuditStats()` (L203) - Get audit statistics
- `matchesFilters(entry, filters)` (L241) - Check if entry matches filters
- `generateAuditId()` (L267) - Generate unique audit ID
- `truncateOutput(output)` (L278) - Truncate output to reasonable length
- ✓ `formatAuditEntry(entry)` (L292) - Format audit entry for display

## Constants
- **AUDIT_PREFIX** [value] (L18) - Audit log entry prefix in database

