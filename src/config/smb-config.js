/**
 * SMB/CIFS Configuration Module
 * 
 * Cross-platform SMB file sharing support
 * 
 * Requirements:
 * - Windows: Built-in (net use, copy, dir commands)
 * - Linux: smbclient package (install: sudo apt-get install smbclient)
 * - macOS: smbclient (usually pre-installed)
 */

import { configOps } from '../database/db.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Get SMB configuration (database first, then env fallback)
export function getSMBConfig() {
  const host = configOps.get('smb_host') || process.env.SMB_HOST;
  const username = configOps.get('smb_username') || process.env.SMB_USERNAME;
  const password = configOps.get('smb_password') || process.env.SMB_PASSWORD;
  const share = configOps.get('smb_share') || process.env.SMB_SHARE || 'share';
  const enabledDb = configOps.get('smb_enabled');
  // Enable by default if configured, unless explicitly disabled
  const enabled = enabledDb === null ? !!(host && username && password) : enabledDb === 'true';
  
  return {
    host: host || '',
    username: username || '',
    password: password ? '***' : '', // Don't expose password
    share,
    enabled,
    configured: !!(host && username && password)
  };
}

// Set SMB configuration
export function setSMBConfig(host, username, password, share = 'share') {
  configOps.set('smb_host', host);
  configOps.set('smb_username', username);
  configOps.set('smb_password', password);
  configOps.set('smb_share', share);
  configOps.set('smb_enabled', 'true');
  
  return {
    success: true,
    message: 'SMB configuration saved'
  };
}

// Test SMB connection (cross-platform)
export async function testSMBConnection() {
  const config = getSMBConfig();
  
  if (!config.configured) {
    return {
      success: false,
      message: 'SMB not configured'
    };
  }
  
  try {
    const host = configOps.get('smb_host') || process.env.SMB_HOST;
    const username = configOps.get('smb_username') || process.env.SMB_USERNAME;
    const password = configOps.get('smb_password') || process.env.SMB_PASSWORD;
    const share = configOps.get('smb_share') || process.env.SMB_SHARE || 'share';
    
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Windows: Use net use
      const mountCmd = `net use \\\\${host}\\${share} ${password} /user:${username}`;
      await execAsync(mountCmd);
      
      // Try to list files
      const listCmd = `dir \\\\${host}\\${share}`;
      await execAsync(listCmd);
    } else {
      // Linux/Mac: Use smbclient
      const testCmd = `smbclient //${host}/${share} -U ${username}%${password} -c "ls"`;
      await execAsync(testCmd);
    }
    
    return {
      success: true,
      message: 'SMB connection successful'
    };
  } catch (error) {
    return {
      success: false,
      message: `SMB connection failed: ${error.message}`
    };
  }
}

// Save file to SMB (cross-platform)
export async function saveToSMB(filename, content, localTempDir = './temp') {
  const config = getSMBConfig();
  
  if (!config.enabled || !config.configured) {
    // Save locally instead
    await fs.mkdir(localTempDir, { recursive: true });
    const localPath = path.join(localTempDir, filename);
    await fs.writeFile(localPath, content, 'utf8');
    return {
      success: true,
      savedToSMB: false,
      localPath
    };
  }
  
  try {
    const host = configOps.get('smb_host') || process.env.SMB_HOST;
    const username = configOps.get('smb_username') || process.env.SMB_USERNAME;
    const password = configOps.get('smb_password') || process.env.SMB_PASSWORD;
    const share = configOps.get('smb_share') || process.env.SMB_SHARE || 'share';
    
    // Save to local temp first
    await fs.mkdir(localTempDir, { recursive: true });
    const localPath = path.join(localTempDir, filename);
    await fs.writeFile(localPath, content, 'utf8');
    
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Windows: Use net use and copy
      const mountCmd = `net use \\\\${host}\\${share} ${password} /user:${username}`;
      await execAsync(mountCmd).catch(() => {}); // Ignore if already mounted
      
      // Copy to SMB
      const smbPath = `\\\\${host}\\${share}\\${filename}`;
      await execAsync(`copy "${localPath}" "${smbPath}"`);
      
      // Clean up local file
      await fs.unlink(localPath);
      
      return {
        success: true,
        savedToSMB: true,
        smbPath
      };
    } else {
      // Linux/Mac: Use smbclient
      const uploadCmd = `smbclient //${host}/${share} -U ${username}%${password} -c "put \\"${localPath}\\" \\"${filename}\\"" 2>&1`;
      await execAsync(uploadCmd);
      
      // Clean up local file
      await fs.unlink(localPath);
      
      return {
        success: true,
        savedToSMB: true,
        smbPath: `//${host}/${share}/${filename}`
      };
    }
  } catch (error) {
    console.error('SMB save error:', error.message);
    
    // Keep local copy on failure
    return {
      success: true,
      savedToSMB: false,
      localPath: path.join(localTempDir, filename),
      error: error.message
    };
  }
}

// Enable/disable SMB
export function toggleSMB(enabled) {
  configOps.set('smb_enabled', enabled ? 'true' : 'false');
  return {
    success: true,
    enabled
  };
}

// Get SMB status
export function getSMBStatus() {
  const config = getSMBConfig();
  return {
    configured: config.configured,
    enabled: config.enabled,
    host: config.host,
    share: config.share
  };
}

// List files on SMB share (cross-platform)
export async function listSMBFiles() {
  const config = getSMBConfig();
  
  if (!config.enabled || !config.configured) {
    return {
      success: false,
      message: 'SMB not configured or disabled'
    };
  }
  
  try {
    const host = configOps.get('smb_host') || process.env.SMB_HOST;
    const username = configOps.get('smb_username') || process.env.SMB_USERNAME;
    const password = configOps.get('smb_password') || process.env.SMB_PASSWORD;
    const share = configOps.get('smb_share') || process.env.SMB_SHARE || 'share';
    
    const isWindows = process.platform === 'win32';
    let files = [];
    
    if (isWindows) {
      // Windows: Use net use and dir
      const mountCmd = `net use \\\\${host}\\${share} ${password} /user:${username}`;
      await execAsync(mountCmd).catch(() => {});
      
      // List files
      const listCmd = `dir /b \\\\${host}\\${share}`;
      const { stdout } = await execAsync(listCmd);
      
      files = stdout.trim().split('\n').filter(f => f.trim());
    } else {
      // Linux/Mac: Use smbclient
      const listCmd = `smbclient //${host}/${share} -U ${username}%${password} -c "ls" 2>&1`;
      const { stdout } = await execAsync(listCmd);
      
      // Parse smbclient output (format: "  filename    A    size  date")
      files = stdout
        .split('\n')
        .filter(line => line.trim() && !line.includes('blocks of size') && !line.includes('blocks available'))
        .map(line => {
          const match = line.trim().match(/^(.+?)\s+[A-Z]+\s+\d+/);
          return match ? match[1].trim() : null;
        })
        .filter(Boolean);
    }
    
    return {
      success: true,
      files
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}
