# smb-config.js

**Path:** `src\config\smb-config.js`

## Description
* SMB/CIFS Configuration Module

## Dependencies
- `../database/db.js` → configOps (L12)
- `child_process` → exec (L13)
- `util` → promisify (L14)
- `fs/promises` → fs (L15)
- `path` → path (L16)

## Exports
- **getSMBConfig** [function] (L21)
- **setSMBConfig** [function] (L41)
- **testSMBConnection** [function] (L55)
- **saveToSMB** [function] (L100)
- **toggleSMB** [function] (L173)
- **getSMBStatus** [function] (L182)
- **listSMBFiles** [function] (L193)

## Functions
- ✓ `getSMBConfig()` (L21)
- ✓ `setSMBConfig(host, username, password, share = 'share')` (L41)
- ✓ `async testSMBConnection()` (L55)
- ✓ `async saveToSMB(filename, content, localTempDir = './temp')` (L100)
- ✓ `toggleSMB(enabled)` (L173)
- ✓ `getSMBStatus()` (L182)
- ✓ `async listSMBFiles()` (L193)

