/**
 * Platform Detector for Server Admin
 * 
 * Detects local and remote platform types for command generation.
 * Caches platform info per server for performance.
 * 
 * @module plugins/server-admin/platform-detector
 */

import { createLogger } from '../../src/logging/logger.js';
import os from 'os';

const logger = createLogger('server-admin:platform');

/**
 * Platform types
 */
export const PLATFORMS = {
  LINUX: 'linux',
  WINDOWS: 'windows',
  DARWIN: 'darwin',
  UNKNOWN: 'unknown'
};

/**
 * Platform cache for remote servers
 * Map<serverKey, { platform, detectedAt, hostname }>
 */
const platformCache = new Map();

/**
 * Cache TTL in milliseconds (1 hour)
 */
const CACHE_TTL = 3600000;

/**
 * Detect the local platform
 * @returns {Object} Platform info
 */
export function detectLocalPlatform() {
  const platform = process.platform;
  const arch = process.arch;
  const hostname = os.hostname();
  const release = os.release();

  let platformType;
  let platformName;

  switch (platform) {
    case 'win32':
      platformType = PLATFORMS.WINDOWS;
      platformName = `Windows ${release}`;
      break;
    case 'darwin':
      platformType = PLATFORMS.DARWIN;
      platformName = `macOS ${release}`;
      break;
    case 'linux':
      platformType = PLATFORMS.LINUX;
      platformName = `Linux ${release}`;
      break;
    default:
      platformType = PLATFORMS.LINUX; // Default to Linux for BSD, etc.
      platformName = `${platform} ${release}`;
  }

  logger.debug(`Detected local platform: ${platformName} (${arch})`);

  return {
    platform: platformType,
    platformName,
    arch,
    hostname,
    isLocal: true,
    nodeVersion: process.version
  };
}

/**
 * Get cached platform info for a server
 * @param {string} host - Server hostname or IP
 * @param {number} port - SSH port (default 22)
 * @returns {Object|null} Cached platform info or null
 */
export function getCachedPlatform(host, port = 22) {
  const key = `${host}:${port}`;
  const cached = platformCache.get(key);

  if (!cached) {
    return null;
  }

  // Check if cache is expired
  if (Date.now() - cached.detectedAt > CACHE_TTL) {
    platformCache.delete(key);
    return null;
  }

  return cached;
}

/**
 * Cache platform info for a server
 * @param {string} host - Server hostname or IP
 * @param {number} port - SSH port
 * @param {Object} platformInfo - Platform information to cache
 */
export function cachePlatform(host, port, platformInfo) {
  const key = `${host}:${port}`;
  platformCache.set(key, {
    ...platformInfo,
    detectedAt: Date.now()
  });
  logger.debug(`Cached platform for ${key}: ${platformInfo.platform}`);
}

/**
 * Parse platform from uname output
 * @param {string} unameOutput - Output from uname -s command
 * @returns {string} Platform type
 */
export function parseUnameOutput(unameOutput) {
  if (!unameOutput) {
    return PLATFORMS.UNKNOWN;
  }

  const output = unameOutput.toLowerCase().trim();

  if (output.includes('linux')) {
    return PLATFORMS.LINUX;
  }
  if (output.includes('darwin')) {
    return PLATFORMS.DARWIN;
  }
  if (output.includes('mingw') || output.includes('cygwin') || output.includes('msys')) {
    return PLATFORMS.WINDOWS;
  }
  if (output.includes('freebsd') || output.includes('openbsd') || output.includes('netbsd')) {
    return PLATFORMS.LINUX; // Treat BSD as Linux-like
  }

  return PLATFORMS.UNKNOWN;
}

/**
 * Parse platform from Windows systeminfo
 * @param {string} output - Output from systeminfo or ver command
 * @returns {boolean} True if Windows detected
 */
export function isWindowsOutput(output) {
  if (!output) {
    return false;
  }
  const lower = output.toLowerCase();
  return lower.includes('windows') || lower.includes('microsoft');
}

/**
 * Get platform-specific shell
 * @param {string} platform - Platform type
 * @returns {Object} Shell configuration
 */
export function getShellConfig(platform) {
  switch (platform) {
    case PLATFORMS.WINDOWS:
      return {
        shell: 'powershell.exe',
        args: ['-NoProfile', '-NonInteractive', '-Command'],
        encoding: 'utf8'
      };
    case PLATFORMS.DARWIN:
      return {
        shell: '/bin/zsh',
        args: ['-c'],
        encoding: 'utf8',
        fallback: '/bin/bash'
      };
    case PLATFORMS.LINUX:
    default:
      return {
        shell: '/bin/bash',
        args: ['-c'],
        encoding: 'utf8'
      };
  }
}

/**
 * Get platform-specific path separator
 * @param {string} platform - Platform type
 * @returns {string} Path separator
 */
export function getPathSeparator(platform) {
  return platform === PLATFORMS.WINDOWS ? '\\' : '/';
}

/**
 * Get platform-specific line ending
 * @param {string} platform - Platform type
 * @returns {string} Line ending
 */
export function getLineEnding(platform) {
  return platform === PLATFORMS.WINDOWS ? '\r\n' : '\n';
}

/**
 * Clear platform cache
 */
export function clearPlatformCache() {
  platformCache.clear();
  logger.info('Platform cache cleared');
}

/**
 * Get cache size
 * @returns {number} Number of cached entries
 */
export function getCacheSize() {
  return platformCache.size;
}

/**
 * Get all cached platforms
 * @returns {Array} Array of cached platform entries
 */
export function getAllCachedPlatforms() {
  const entries = [];
  for (const [key, value] of platformCache.entries()) {
    entries.push({
      server: key,
      ...value
    });
  }
  return entries;
}

export default {
  PLATFORMS,
  detectLocalPlatform,
  getCachedPlatform,
  cachePlatform,
  parseUnameOutput,
  isWindowsOutput,
  getShellConfig,
  getPathSeparator,
  getLineEnding,
  clearPlatformCache,
  getCacheSize,
  getAllCachedPlatforms
};
