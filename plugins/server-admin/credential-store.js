/**
 * Credential Store for Server Admin
 * 
 * Securely stores and retrieves SSH/WinRM credentials.
 * Uses encryption with the bot's JWT_SECRET.
 * 
 * @module plugins/server-admin/credential-store
 */

import crypto from 'crypto';
import { createLogger } from '../../src/logging/logger.js';
import { configOps } from '../../src/database/db.js';

const logger = createLogger('server-admin:credentials');

/**
 * Credential storage prefix in database
 */
const CRED_PREFIX = 'server_admin_cred_';

/**
 * Encryption algorithm
 */
const ALGORITHM = 'aes-256-gcm';

/**
 * Get encryption key from environment
 * @returns {Buffer} 32-byte encryption key
 */
function getEncryptionKey() {
  const secret = process.env.JWT_SECRET || process.env.BOT_SECRET || 'default-secret-key';
  // Derive a 32-byte key from the secret
  return crypto.scryptSync(secret, 'server-admin-salt', 32);
}

/**
 * Encrypt a string value
 * @param {string} plaintext - Value to encrypt
 * @returns {string} Encrypted value (base64 encoded)
 */
export function encrypt(plaintext) {
  if (!plaintext) return null;
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine iv + authTag + encrypted data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    logger.error(`Encryption failed: ${error.message}`);
    throw new Error('Failed to encrypt credential');
  }
}

/**
 * Decrypt a string value
 * @param {string} encryptedBase64 - Encrypted value (base64 encoded)
 * @returns {string} Decrypted plaintext
 */
export function decrypt(encryptedBase64) {
  if (!encryptedBase64) return null;
  
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedBase64, 'base64');
    
    // Extract iv, authTag, and encrypted data
    const iv = combined.subarray(0, 16);
    const authTag = combined.subarray(16, 32);
    const encrypted = combined.subarray(32);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error(`Decryption failed: ${error.message}`);
    throw new Error('Failed to decrypt credential');
  }
}


/**
 * Store SSH credentials for a server
 * @param {string} serverId - Unique server identifier
 * @param {Object} credentials - SSH credentials
 * @returns {Object} Result with success status
 */
export function storeSSHCredentials(serverId, credentials) {
  if (!serverId) {
    return { success: false, error: 'Server ID required' };
  }
  
  if (!credentials || !credentials.host) {
    return { success: false, error: 'Host is required' };
  }

  try {
    const credData = {
      type: 'ssh',
      host: credentials.host,
      port: credentials.port || 22,
      username: credentials.username,
      // Encrypt sensitive fields
      password: credentials.password ? encrypt(credentials.password) : null,
      privateKey: credentials.privateKey ? encrypt(credentials.privateKey) : null,
      passphrase: credentials.passphrase ? encrypt(credentials.passphrase) : null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const key = `${CRED_PREFIX}ssh_${serverId}`;
    configOps.set(key, JSON.stringify(credData));
    
    logger.info(`Stored SSH credentials for server: ${serverId}`);
    
    return { success: true, serverId };
  } catch (error) {
    logger.error(`Failed to store SSH credentials: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve SSH credentials for a server
 * @param {string} serverId - Unique server identifier
 * @returns {Object} Decrypted credentials or error
 */
export function getSSHCredentials(serverId) {
  if (!serverId) {
    return { success: false, error: 'Server ID required' };
  }

  try {
    const key = `${CRED_PREFIX}ssh_${serverId}`;
    const stored = configOps.get(key);
    
    if (!stored) {
      return { success: false, error: 'Credentials not found' };
    }

    const credData = JSON.parse(stored);
    
    // Decrypt sensitive fields
    return {
      success: true,
      credentials: {
        type: credData.type,
        host: credData.host,
        port: credData.port,
        username: credData.username,
        password: credData.password ? decrypt(credData.password) : null,
        privateKey: credData.privateKey ? decrypt(credData.privateKey) : null,
        passphrase: credData.passphrase ? decrypt(credData.passphrase) : null
      }
    };
  } catch (error) {
    logger.error(`Failed to retrieve SSH credentials: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Store WinRM credentials for a Windows server
 * @param {string} serverId - Unique server identifier
 * @param {Object} credentials - WinRM credentials
 * @returns {Object} Result with success status
 */
export function storeWinRMCredentials(serverId, credentials) {
  if (!serverId) {
    return { success: false, error: 'Server ID required' };
  }
  
  if (!credentials || !credentials.host) {
    return { success: false, error: 'Host is required' };
  }

  try {
    const credData = {
      type: 'winrm',
      host: credentials.host,
      port: credentials.port || 5985,
      username: credentials.username,
      password: credentials.password ? encrypt(credentials.password) : null,
      useSSL: credentials.useSSL || false,
      domain: credentials.domain || null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const key = `${CRED_PREFIX}winrm_${serverId}`;
    configOps.set(key, JSON.stringify(credData));
    
    logger.info(`Stored WinRM credentials for server: ${serverId}`);
    
    return { success: true, serverId };
  } catch (error) {
    logger.error(`Failed to store WinRM credentials: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve WinRM credentials for a server
 * @param {string} serverId - Unique server identifier
 * @returns {Object} Decrypted credentials or error
 */
export function getWinRMCredentials(serverId) {
  if (!serverId) {
    return { success: false, error: 'Server ID required' };
  }

  try {
    const key = `${CRED_PREFIX}winrm_${serverId}`;
    const stored = configOps.get(key);
    
    if (!stored) {
      return { success: false, error: 'Credentials not found' };
    }

    const credData = JSON.parse(stored);
    
    return {
      success: true,
      credentials: {
        type: credData.type,
        host: credData.host,
        port: credData.port,
        username: credData.username,
        password: credData.password ? decrypt(credData.password) : null,
        useSSL: credData.useSSL,
        domain: credData.domain
      }
    };
  } catch (error) {
    logger.error(`Failed to retrieve WinRM credentials: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Delete credentials for a server
 * @param {string} serverId - Unique server identifier
 * @param {string} type - 'ssh' or 'winrm'
 * @returns {Object} Result with success status
 */
export function deleteCredentials(serverId, type = 'ssh') {
  if (!serverId) {
    return { success: false, error: 'Server ID required' };
  }

  try {
    const key = `${CRED_PREFIX}${type}_${serverId}`;
    configOps.delete(key);
    
    logger.info(`Deleted ${type} credentials for server: ${serverId}`);
    
    return { success: true };
  } catch (error) {
    logger.error(`Failed to delete credentials: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * List all stored server credentials (without sensitive data)
 * @returns {Object} List of servers with credentials
 */
export function listCredentials() {
  try {
    const allConfig = configOps.getAll();
    const servers = [];

    for (const config of allConfig) {
      if (config.key.startsWith(CRED_PREFIX)) {
        try {
          const credData = JSON.parse(config.value);
          const keyParts = config.key.replace(CRED_PREFIX, '').split('_');
          const type = keyParts[0];
          const serverId = keyParts.slice(1).join('_');
          
          servers.push({
            serverId,
            type,
            host: credData.host,
            port: credData.port,
            username: credData.username,
            createdAt: credData.createdAt,
            updatedAt: credData.updatedAt
          });
        } catch (parseError) {
          logger.warn(`Failed to parse credential: ${config.key}`);
        }
      }
    }

    return { success: true, servers };
  } catch (error) {
    logger.error(`Failed to list credentials: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Check if stored value is encrypted (not plaintext)
 * @param {string} storedValue - Value from database
 * @returns {boolean} True if encrypted
 */
export function isEncrypted(storedValue) {
  if (!storedValue) return false;
  
  try {
    // Try to decode as base64
    const decoded = Buffer.from(storedValue, 'base64');
    // Encrypted values should be at least 32 bytes (16 iv + 16 authTag)
    return decoded.length >= 32;
  } catch {
    return false;
  }
}

export default {
  encrypt,
  decrypt,
  storeSSHCredentials,
  getSSHCredentials,
  storeWinRMCredentials,
  getWinRMCredentials,
  deleteCredentials,
  listCredentials,
  isEncrypted
};
