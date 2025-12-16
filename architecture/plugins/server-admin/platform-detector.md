# platform-detector.js

**Path:** `plugins\server-admin\platform-detector.js`

## Description
* Platform Detector for Server Admin

## Dependencies
- `../../src/logging/logger.js` → createLogger (L10)
- `os` → os (L11)

## Exports
- **PLATFORMS** [const] (L18) - Platform types
- **detectLocalPlatform** [function] (L40) - Detect the local platform
- **getCachedPlatform** [function] (L85) - Get cached platform info for a server
- **cachePlatform** [function] (L108) - Cache platform info for a server
- **parseUnameOutput** [function] (L122) - Parse platform from uname output
- **isWindowsOutput** [function] (L150) - Parse platform from Windows systeminfo
- **getShellConfig** [function] (L163) - Get platform-specific shell
- **getPathSeparator** [function] (L193) - Get platform-specific path separator
- **getLineEnding** [function] (L202) - Get platform-specific line ending
- **clearPlatformCache** [function] (L209) - Clear platform cache
- **getCacheSize** [function] (L218) - Get cache size
- **getAllCachedPlatforms** [function] (L226) - Get all cached platforms

## Functions
- ✓ `detectLocalPlatform()` (L40) - Detect the local platform
- ✓ `getCachedPlatform(host, port = 22)` (L85) - Get cached platform info for a server
- ✓ `cachePlatform(host, port, platformInfo)` (L108) - Cache platform info for a server
- ✓ `parseUnameOutput(unameOutput)` (L122) - Parse platform from uname output
- ✓ `isWindowsOutput(output)` (L150) - Parse platform from Windows systeminfo
- ✓ `getShellConfig(platform)` (L163) - Get platform-specific shell
- ✓ `getPathSeparator(platform)` (L193) - Get platform-specific path separator
- ✓ `getLineEnding(platform)` (L202) - Get platform-specific line ending
- ✓ `clearPlatformCache()` (L209) - Clear platform cache
- ✓ `getCacheSize()` (L218) - Get cache size
- ✓ `getAllCachedPlatforms()` (L226) - Get all cached platforms

## Constants
- ✓ **PLATFORMS** [object] (L18) - Platform types
- **platformCache** [value] (L29) - Platform cache for remote servers

