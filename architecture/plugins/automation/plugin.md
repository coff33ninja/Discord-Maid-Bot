# plugin.js

**Path:** `plugins\automation\plugin.js`

## Dependencies
- `../../src/core/plugin-system.js` → Plugin (L1)
- `../../src/logging/logger.js` → createLogger (L2)
- `node-cron` → cron (L3)
- `../../src/database/db.js` → taskOps (L4)
- `./network-management/commands.js` (dynamic, L136)
- `./integrations/speedtest/commands.js` (dynamic, L154)
- `./integrations/weather/commands.js` (dynamic, L183)

## Exports
- **AutomationPlugin** [class] (default) (L19) - Automation Plugin

