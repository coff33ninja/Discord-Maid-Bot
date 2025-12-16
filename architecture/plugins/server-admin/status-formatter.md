# status-formatter.js

**Path:** `plugins\server-admin\status-formatter.js`

## Description
* Status Formatter for Server Admin

## Dependencies
- `../../src/logging/logger.js` → createLogger (L10)

## Exports
- **formatServerStatus** [function] (L20) - Format server status output
- **formatLogOutput** [function] (L76) - Format log output with line limiting
- **formatDeploymentResult** [function] (L119) - Format deployment result
- **formatDiskSpace** [function] (L197) - Format disk space output
- **formatServiceStatus** [function] (L269) - Format service status output
- **formatExecutionResult** [function] (L313) - Format command execution result for Discord

## Functions
- ✓ `formatServerStatus(output, platform = 'linux')` (L20) - Format server status output
- ✓ `formatLogOutput(output, maxLines = 50)` (L76) - Format log output with line limiting
- ✓ `formatDeploymentResult(output)` (L119) - Format deployment result
- ✓ `formatDiskSpace(output, platform = 'linux')` (L197) - Format disk space output
- ✓ `formatServiceStatus(output, serviceName = 'service')` (L269) - Format service status output
- ✓ `formatExecutionResult(result, commandType = 'command')` (L313) - Format command execution result for Discord

