/**
 * Status Formatter for Server Admin
 * 
 * Formats command output into user-friendly Discord messages.
 * Handles platform-specific output parsing.
 * 
 * @module plugins/server-admin/status-formatter
 */

import { createLogger } from '../../src/logging/logger.js';

const logger = createLogger('server-admin:formatter');

/**
 * Format server status output
 * @param {string} output - Raw command output
 * @param {string} platform - Platform type
 * @returns {Object} Formatted status with CPU, memory, disk, uptime
 */
export function formatServerStatus(output, platform = 'linux') {
  if (!output || typeof output !== 'string') {
    return {
      cpu: 'N/A',
      memory: 'N/A',
      disk: 'N/A',
      uptime: 'N/A',
      raw: output || '',
      formatted: '❌ Unable to parse server status'
    };
  }

  let cpu = 'N/A';
  let memory = 'N/A';
  let disk = 'N/A';
  let uptime = 'N/A';

  try {
    // Parse based on expected format: "CPU: X% | MEM: Y% | DISK: Z% | UP: ..."
    const cpuMatch = output.match(/CPU:\s*([\d.]+)%/i);
    const memMatch = output.match(/MEM:\s*([\d.]+)%/i);
    const diskMatch = output.match(/DISK:\s*([\d.]+%)/i);
    const uptimeMatch = output.match(/UP:\s*(.+?)(?:\||$)/i);

    if (cpuMatch) cpu = `${cpuMatch[1]}%`;
    if (memMatch) memory = `${memMatch[1]}%`;
    if (diskMatch) disk = diskMatch[1];
    if (uptimeMatch) uptime = uptimeMatch[1].trim();
  } catch (error) {
    logger.error('Error parsing server status:', error);
  }

  const formatted = `📊 **Server Status**
\`\`\`
CPU Usage:    ${cpu}
Memory Usage: ${memory}
Disk Usage:   ${disk}
Uptime:       ${uptime}
\`\`\``;

  return {
    cpu,
    memory,
    disk,
    uptime,
    raw: output,
    formatted
  };
}

/**
 * Format log output with line limiting
 * @param {string} output - Raw log output
 * @param {number} maxLines - Maximum lines to include
 * @returns {Object} Formatted log output
 */
export function formatLogOutput(output, maxLines = 50) {
  if (!output || typeof output !== 'string') {
    return {
      lines: [],
      lineCount: 0,
      truncated: false,
      formatted: '📋 No log output available'
    };
  }

  const allLines = output.split('\n').filter(line => line.trim());
  const truncated = allLines.length > maxLines;
  const lines = truncated ? allLines.slice(-maxLines) : allLines;
  const lineCount = lines.length;

  // Format for Discord (code block with limited length)
  let formatted = lines.join('\n');
  
  // Discord has a 2000 char limit, leave room for formatting
  const maxChars = 1800;
  if (formatted.length > maxChars) {
    formatted = formatted.substring(formatted.length - maxChars);
    formatted = '...\n' + formatted;
  }

  const header = truncated 
    ? `📋 **Logs** (showing last ${lineCount} of ${allLines.length} lines)`
    : `📋 **Logs** (${lineCount} lines)`;

  return {
    lines,
    lineCount,
    totalLines: allLines.length,
    truncated,
    formatted: `${header}\n\`\`\`\n${formatted}\n\`\`\``
  };
}

/**
 * Format deployment result
 * @param {string} output - Deployment command output
 * @returns {Object} Formatted deployment result
 */
export function formatDeploymentResult(output) {
  if (!output || typeof output !== 'string') {
    return {
      success: false,
      commitHash: null,
      changes: [],
      formatted: '❌ Deployment output unavailable'
    };
  }

  let commitHash = null;
  let success = true;
  const changes = [];

  try {
    // Try to extract commit hash from git pull output
    const commitMatch = output.match(/([a-f0-9]{7,40})\.\.([a-f0-9]{7,40})/i);
    if (commitMatch) {
      commitHash = commitMatch[2];
    }

    // Check for "Already up to date"
    if (output.toLowerCase().includes('already up to date') || 
        output.toLowerCase().includes('already up-to-date')) {
      return {
        success: true,
        commitHash: null,
        changes: [],
        alreadyUpToDate: true,
        formatted: '✅ **Deployment Complete**\n\nCode is already up to date. No changes deployed.'
      };
    }

    // Extract changed files
    const fileMatches = output.match(/^\s*[\w./]+\s*\|\s*\d+/gm);
    if (fileMatches) {
      changes.push(...fileMatches.map(m => m.trim()));
    }

    // Check for errors
    if (output.toLowerCase().includes('error') || 
        output.toLowerCase().includes('fatal') ||
        output.toLowerCase().includes('failed')) {
      success = false;
    }
  } catch (error) {
    logger.error('Error parsing deployment result:', error);
    success = false;
  }

  let formatted;
  if (success) {
    formatted = `✅ **Deployment Successful**\n`;
    if (commitHash) {
      formatted += `\nCommit: \`${commitHash}\``;
    }
    if (changes.length > 0) {
      formatted += `\nFiles changed: ${changes.length}`;
    }
  } else {
    formatted = `❌ **Deployment Failed**\n\n\`\`\`\n${output.substring(0, 500)}\n\`\`\``;
  }

  return {
    success,
    commitHash,
    changes,
    raw: output,
    formatted
  };
}

/**
 * Format disk space output
 * @param {string} output - df -h or Get-PSDrive output
 * @param {string} platform - Platform type
 * @returns {Object} Formatted disk info
 */
export function formatDiskSpace(output, platform = 'linux') {
  if (!output || typeof output !== 'string') {
    return {
      drives: [],
      formatted: '❌ Unable to get disk information'
    };
  }

  const drives = [];

  try {
    if (platform === 'windows') {
      // Parse PowerShell Get-PSDrive output
      const lines = output.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const match = line.match(/^(\w)\s+([\d.]+)\s+([\d.]+)/);
        if (match) {
          drives.push({
            name: `${match[1]}:`,
            used: `${match[2]} GB`,
            free: `${match[3]} GB`
          });
        }
      }
    } else {
      // Parse df -h output
      const lines = output.split('\n').filter(l => l.trim() && !l.startsWith('Filesystem'));
      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 5) {
          drives.push({
            name: parts[0],
            size: parts[1],
            used: parts[2],
            available: parts[3],
            usePercent: parts[4],
            mountPoint: parts[5] || '/'
          });
        }
      }
    }
  } catch (error) {
    logger.error('Error parsing disk space:', error);
  }

  let formatted = '💾 **Disk Space**\n```\n';
  if (drives.length > 0) {
    for (const drive of drives) {
      if (platform === 'windows') {
        formatted += `${drive.name}  Used: ${drive.used}  Free: ${drive.free}\n`;
      } else {
        formatted += `${drive.mountPoint}: ${drive.usePercent} used (${drive.available} free)\n`;
      }
    }
  } else {
    formatted += 'No disk information available\n';
  }
  formatted += '```';

  return {
    drives,
    raw: output,
    formatted
  };
}

/**
 * Format service status output
 * @param {string} output - Service status output
 * @param {string} serviceName - Name of the service
 * @returns {Object} Formatted service status
 */
export function formatServiceStatus(output, serviceName = 'service') {
  if (!output || typeof output !== 'string') {
    return {
      running: false,
      status: 'unknown',
      formatted: `❓ Unable to determine ${serviceName} status`
    };
  }

  const lower = output.toLowerCase();
  let running = false;
  let status = 'unknown';

  // Check various status indicators
  if (lower.includes('active (running)') || 
      lower.includes('running') ||
      lower.includes('status: running')) {
    running = true;
    status = 'running';
  } else if (lower.includes('inactive') || lower.includes('stopped')) {
    running = false;
    status = 'stopped';
  } else if (lower.includes('failed')) {
    running = false;
    status = 'failed';
  }

  const emoji = running ? '✅' : '❌';
  const formatted = `${emoji} **${serviceName}**: ${status.charAt(0).toUpperCase() + status.slice(1)}`;

  return {
    running,
    status,
    raw: output,
    formatted
  };
}

/**
 * Format command execution result for Discord
 * @param {Object} result - Execution result from command executor
 * @param {string} commandType - Type of command executed
 * @returns {string} Formatted Discord message
 */
export function formatExecutionResult(result, commandType = 'command') {
  if (!result) {
    return '❌ No execution result';
  }

  if (result.success) {
    let message = `✅ **${commandType}** completed successfully`;
    if (result.output && result.output.trim()) {
      const output = result.output.length > 1500 
        ? result.output.substring(0, 1500) + '\n... [truncated]'
        : result.output;
      message += `\n\`\`\`\n${output}\n\`\`\``;
    }
    if (result.duration) {
      message += `\n_Completed in ${result.duration}ms_`;
    }
    return message;
  } else {
    let message = `❌ **${commandType}** failed`;
    if (result.error) {
      message += `\n\`\`\`\n${result.error.substring(0, 500)}\n\`\`\``;
    }
    if (result.exitCode !== undefined) {
      message += `\n_Exit code: ${result.exitCode}_`;
    }
    return message;
  }
}

export default {
  formatServerStatus,
  formatLogOutput,
  formatDeploymentResult,
  formatDiskSpace,
  formatServiceStatus,
  formatExecutionResult
};
