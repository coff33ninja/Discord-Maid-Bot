# credential-store.js

**Path:** `plugins\server-admin\credential-store.js`

## Description
* Credential Store for Server Admin

## Dependencies
- `crypto` → crypto (L10)
- `../../src/logging/logger.js` → createLogger (L11)
- `../../src/database/db.js` → configOps (L12)

## Exports
- **encrypt** [function] (L41) - Encrypt a string value
- **decrypt** [function] (L73) - Decrypt a string value
- **storeSSHCredentials** [function] (L105) - Store SSH credentials for a server
- **getSSHCredentials** [function] (L145) - Retrieve SSH credentials for a server
- **storeWinRMCredentials** [function] (L185) - Store WinRM credentials for a Windows server
- **getWinRMCredentials** [function] (L224) - Retrieve WinRM credentials for a server
- **deleteCredentials** [function] (L263) - Delete credentials for a server
- **listCredentials** [function] (L285) - List all stored server credentials (without sensitive data)
- **isEncrypted** [function] (L325) - Check if stored value is encrypted (not plaintext)

## Functions
- `getEncryptionKey()` (L30) - Get encryption key from environment
- ✓ `encrypt(plaintext)` (L41) - Encrypt a string value
- ✓ `decrypt(encryptedBase64)` (L73) - Decrypt a string value
- ✓ `storeSSHCredentials(serverId, credentials)` (L105) - Store SSH credentials for a server
- ✓ `getSSHCredentials(serverId)` (L145) - Retrieve SSH credentials for a server
- ✓ `storeWinRMCredentials(serverId, credentials)` (L185) - Store WinRM credentials for a Windows server
- ✓ `getWinRMCredentials(serverId)` (L224) - Retrieve WinRM credentials for a server
- ✓ `deleteCredentials(serverId, type = 'ssh')` (L263) - Delete credentials for a server
- ✓ `listCredentials()` (L285) - List all stored server credentials (without sensitive data)
- ✓ `isEncrypted(storedValue)` (L325) - Check if stored value is encrypted (not plaintext)

## Constants
- **CRED_PREFIX** [value] (L19) - Credential storage prefix in database
- **ALGORITHM** [value] (L24) - Encryption algorithm

