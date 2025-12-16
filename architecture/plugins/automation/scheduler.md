# scheduler.js

**Path:** `plugins\automation\scheduler.js`

## Dependencies
- `node-cron` → cron (L1)
- `../../src/database/db.js` → taskOps (L2)

## Exports
- **initScheduler** [function] (L7)
- **scheduleTask** [function] (L20)
- **stopTask** [function] (L117)
- **restartTask** [function] (L127)
- **getActiveTasks** [function] (L137)
- **cronPatterns** [const] (L142)

## Functions
- ✓ `initScheduler(client, handlers)` (L7)
- ✓ `scheduleTask(client, task, handlers)` (L20)
- ✓ `stopTask(taskId)` (L117)
- ✓ `restartTask(client, taskId, handlers)` (L127)
- ✓ `getActiveTasks()` (L137)

## Constants
- **activeTasks** [value] (L4)
- ✓ **cronPatterns** [object] (L142)

