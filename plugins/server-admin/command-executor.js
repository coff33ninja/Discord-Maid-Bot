/**
 * Command Executor for Server Admin
 * 
 * Executes server commands locally or via SSH/WinRM.
 * Supports Linux, Windows, and macOS platforms.
 * 
 * @module plugins/server-admin/command-executor
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../../src/logging/logger.js';
import { detectPlatform, PLATFORMS } from './command-generator.js';

const execAsync = promisify(exec);
const logger = createLogger('server-admin:executor');

/**
 * Default execution options
 */
export const DEFAULT_OPTIONS = {
  timeout: 30000,      // 30 second timeout
  maxOutput: 2000,     // Max characters in output
  useSSH: false,       // Use SSH for remote execution
  sshHost: null,
  sshUser: null,
  sshPort: 22,
  platform: null,      // Auto-detect if null
  shell: null          // Auto-detect: bash for Linux/macOS, powershell for Windows
};

/**
 * Execute a validated and approved command
 * @param {string} command - Shell command to execute
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Execution result
 */
export async function executeCommand(command, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const platform = opts.platform || detectPlatform();
  const startTime = Date.now();

  if (!command || typeof command !== 'string') {
    return {
      success: false,
      output: '',
      error: 'Invalid command: empty or not a string',
      exitCode: -1,
      duration: 0
    };
  }

  logger.info(`Executing command: ${command.substring(0, 100)}${command.length > 100 ? '...' : ''}`);

  try {
    let result;
    
    if (opts.useSSH && opts.sshHost) {
      result = await executeSSH(command, opts);
    } else {
      result = await executeLocal(command, platform, opts);
    }

    const duration = Date.now() - startTime;
    
    // Truncate output if too long
    let output = result.stdout || '';
    if (output.length > opts.maxOutput) {
      output = output.substring(0, opts.maxOutput) + '\n... [output truncated]';
    }

    logger.info(`Command completed in ${duration}ms with exit code ${result.exitCode}`);

    return {
      success: result.exitCode === 0,
      output,
      error: result.stderr || null,
      exitCode: result.exitCode,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Command execution failed: ${error.message}`);

    return {
      success: false,
      output: '',
      error: error.message,
      exitCode: error.code || -1,
      duration
    };
  }
}

/**
 * Execute command locally
 * @param {string} command - Command to execute
 * @param {string} platform - Target platform
 * @param {Object} opts - Execution options
 * @returns {Promise<Object>} Execution result
 */
async function executeLocal(command, platform, opts) {
  return new Promise((resolve, reject) => {
    let shell, shellArgs;

    if (platform === PLATFORMS.WINDOWS) {
      shell = 'powershell.exe';
      shellArgs = ['-NoProfile', '-NonInteractive', '-Command', command];
    } else {
      shell = '/bin/bash';
      shellArgs = ['-c', command];
    }

    const child = spawn(shell, shellArgs, {
      timeout: opts.timeout,
      maxBuffer: opts.maxOutput * 2,
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code || 0
      });
    });

    child.on('error', (error) => {
      reject(error);
    });

    // Handle timeout
    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${opts.timeout}ms`));
      }
    }, opts.timeout);
  });
}

/**
 * Execute command via SSH
 * @param {string} command - Command to execute
 * @param {Object} opts - SSH options
 * @returns {Promise<Object>} Execution result
 */
async function executeSSH(command, opts) {
  const sshCommand = buildSSHCommand(command, opts);
  
  try {
    const { stdout, stderr } = await execAsync(sshCommand, {
      timeout: opts.timeout,
      maxBuffer: opts.maxOutput * 2
    });

    return {
      stdout,
      stderr,
      exitCode: 0
    };
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1
    };
  }
}

/**
 * Build SSH command string
 * @param {string} command - Remote command to execute
 * @param {Object} opts - SSH options
 * @returns {string} Full SSH command
 */
function buildSSHCommand(command, opts) {
  const parts = ['ssh'];
  
  // Add port if not default
  if (opts.sshPort && opts.sshPort !== 22) {
    parts.push('-p', opts.sshPort.toString());
  }
  
  // Add common options
  parts.push('-o', 'StrictHostKeyChecking=no');
  parts.push('-o', 'BatchMode=yes');
  parts.push('-o', `ConnectTimeout=${Math.floor(opts.timeout / 1000)}`);
  
  // Add user@host
  const target = opts.sshUser ? `${opts.sshUser}@${opts.sshHost}` : opts.sshHost;
  parts.push(target);
  
  // Add command (escaped)
  parts.push(`"${command.replace(/"/g, '\\"')}"`);
  
  return parts.join(' ');
}

/**
 * Check if SSH is available
 * @returns {Promise<boolean>} True if SSH client is available
 */
export async function isSSHAvailable() {
  try {
    await execAsync('ssh -V');
    return true;
  } catch {
    return false;
  }
}

/**
 * Test SSH connection
 * @param {Object} opts - SSH options
 * @returns {Promise<Object>} Connection test result
 */
export async function testSSHConnection(opts) {
  try {
    const result = await executeSSH('echo "Connection successful"', {
      ...DEFAULT_OPTIONS,
      ...opts,
      timeout: 10000
    });

    return {
      success: result.exitCode === 0,
      message: result.stdout.trim() || result.stderr
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Legacy function exports for backward compatibility
export async function checkServiceStatus() {
  logger.info('Checking service status...');
  return { 
    running: true, 
    details: 'Use executeCommand with generated command',
    error: null 
  };
}

export async function getServerStats() {
  logger.info('Getting server stats...');
  return {
    cpu: 'N/A',
    memory: 'N/A',
    disk: 'N/A',
    uptime: 'N/A',
    error: 'Use executeCommand with generated command'
  };
}

export async function viewLogs(lines = 20) {
  logger.info(`Viewing last ${lines} log lines...`);
  return {
    lines,
    output: 'Use executeCommand with generated command',
    error: null
  };
}

export async function restartService() {
  logger.info('Restart service requested');
  return {
    needsApproval: true,
    message: '⚠️ **Restart Bot?**\n\nThis will restart the bot service.\n\n_Click Approve to continue or Cancel to abort._'
  };
}

export async function stopService() {
  logger.info('Stop service requested');
  return {
    needsApproval: true,
    message: '⚠️ **Stop Bot?**\n\nThis will stop the bot service.\n\n_Click Approve to continue or Cancel to abort._'
  };
}

export async function deployCode() {
  logger.info('Deploy code requested');
  return {
    needsApproval: true,
    message: '🚀 **Deploy Latest Code?**\n\nThis will:\n1. Pull latest code from git\n2. Install dependencies\n3. Restart the bot\n\n_Click Approve to continue or Cancel to abort._'
  };
}

export async function checkDiskSpace() {
  logger.info('Checking disk space...');
  return {
    output: 'Use executeCommand with generated command',
    error: null
  };
}

export async function updatePackages() {
  logger.info('Update packages requested');
  return {
    needsApproval: true,
    message: '📦 **Update System Packages?**\n\nThis will update all system packages.\n\n_Click Approve to continue or Cancel to abort._'
  };
}

export async function rebootServer() {
  logger.info('Reboot server requested');
  return {
    needsApproval: true,
    message: '🔄 **Reboot Server?**\n\n⚠️ **WARNING:** This will reboot the entire server!\n\nThe bot will be offline for 2-5 minutes.\n\n_Click Approve to continue or Cancel to abort._'
  };
}

export default {
  DEFAULT_OPTIONS,
  executeCommand,
  isSSHAvailable,
  testSSHConnection,
  checkServiceStatus,
  getServerStats,
  viewLogs,
  restartService,
  stopService,
  deployCode,
  checkDiskSpace,
  updatePackages,
  rebootServer
};
