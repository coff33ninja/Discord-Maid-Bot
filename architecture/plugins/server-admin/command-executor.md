# command-executor.js

**Path:** `plugins\server-admin\command-executor.js`

## Description
* Command Executor for Server Admin

## Dependencies
- `child_process` → spawn, exec (L10)
- `util` → promisify (L11)
- `../../src/logging/logger.js` → createLogger (L12)
- `./command-generator.js` → detectPlatform, PLATFORMS (L13)

## Exports
- **DEFAULT_OPTIONS** [const] (L21) - Default execution options
- **executeCommand** [function] (L38) - Execute a validated and approved command
- **isSSHAvailable** [function] (L215) - Check if SSH is available
- **testSSHConnection** [function] (L229) - Test SSH connection
- **checkServiceStatus** [function] (L250)
- **getServerStats** [function] (L259)
- **viewLogs** [function] (L270)
- **restartService** [function] (L279)
- **stopService** [function] (L287)
- **deployCode** [function] (L295)
- **checkDiskSpace** [function] (L303)
- **updatePackages** [function] (L311)
- **rebootServer** [function] (L319)

## Functions
- ✓ `async executeCommand(command, options = {})` (L38) - Execute a validated and approved command
- `async executeLocal(command, platform, opts)` (L102) - Execute command locally
- `async executeSSH(command, opts)` (L159) - Execute command via SSH
- `buildSSHCommand(command, opts)` (L188) - Build SSH command string
- ✓ `async isSSHAvailable()` (L215) - Check if SSH is available
- ✓ `async testSSHConnection(opts)` (L229) - Test SSH connection
- ✓ `async checkServiceStatus()` (L250)
- ✓ `async getServerStats()` (L259)
- ✓ `async viewLogs(lines = 20)` (L270)
- ✓ `async restartService()` (L279)
- ✓ `async stopService()` (L287)
- ✓ `async deployCode()` (L295)
- ✓ `async checkDiskSpace()` (L303)
- ✓ `async updatePackages()` (L311)
- ✓ `async rebootServer()` (L319)

## Constants
- ✓ **DEFAULT_OPTIONS** [object] (L21) - Default execution options

