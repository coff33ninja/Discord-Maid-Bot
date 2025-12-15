/**
 * Command Generator for Server Admin
 * 
 * Generates platform-specific shell commands from parsed intents.
 * Supports Linux, Windows, and macOS platforms.
 * 
 * @module plugins/server-admin/command-generator
 */

import { createLogger } from '../../src/logging/logger.js';
import { INTENTS } from './nlp-parser.js';

const logger = createLogger('server-admin:generator');

/**
 * Supported platforms
 */
export const PLATFORMS = {
  LINUX: 'linux',
  WINDOWS: 'windows',
  DARWIN: 'darwin'  // macOS
};

/**
 * Default configuration
 */
export const DEFAULT_CONFIG = {
  botServiceName: 'discord-maid-bot',
  botPath: '/opt/discord-maid-bot',
  logPath: '/var/log/discord-maid-bot.log',
  windowsLogPath: 'C:\\discord-maid-bot\\logs\\bot.log'
};

/**
 * Platform-specific command templates
 */
export const COMMAND_TEMPLATES = {
  [PLATFORMS.LINUX]: {
    [INTENTS.STATUS_CHECK]: 'systemctl status {serviceName} --no-pager',
    [INTENTS.SERVER_STATS]: 'echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk \'{print $2}\')% | MEM: $(free -m | awk \'/Mem:/ {printf "%.1f%%", $3/$2*100}\') | DISK: $(df -h / | awk \'NR==2 {print $5}\') | UP: $(uptime -p)"',
    [INTENTS.VIEW_LOGS]: 'journalctl -u {serviceName} -n {lines} --no-pager',
    [INTENTS.DIAGNOSTICS]: 'ps aux --sort=-%mem | head -10',
    [INTENTS.DISK_CHECK]: 'df -h',
    [INTENTS.SERVICE_RESTART]: 'systemctl restart {serviceName}',
    [INTENTS.SERVICE_STOP]: 'systemctl stop {serviceName}',
    [INTENTS.SERVICE_START]: 'systemctl start {serviceName}',
    [INTENTS.DEPLOY]: 'cd {botPath} && git pull && npm install && systemctl restart {serviceName}',
    [INTENTS.PACKAGE_UPDATE]: 'apt update && apt upgrade -y',
    [INTENTS.REBOOT]: 'shutdown -r +{delay}'
  },
  [PLATFORMS.WINDOWS]: {
    [INTENTS.STATUS_CHECK]: 'Get-Service {serviceName} | Format-List',
    [INTENTS.SERVER_STATS]: 'Get-CimInstance Win32_OperatingSystem | Select-Object @{N="CPU";E={(Get-CimInstance Win32_Processor).LoadPercentage}}, @{N="MemUsed";E={[math]::Round(($_.TotalVisibleMemorySize - $_.FreePhysicalMemory) / $_.TotalVisibleMemorySize * 100, 1)}}, @{N="Uptime";E={(Get-Date) - $_.LastBootUpTime}}',
    [INTENTS.VIEW_LOGS]: 'Get-Content {logPath} -Tail {lines}',
    [INTENTS.DIAGNOSTICS]: 'Get-Process | Sort-Object -Property WorkingSet64 -Descending | Select-Object -First 10 Name, @{N="MemMB";E={[math]::Round($_.WorkingSet64/1MB,2)}}',
    [INTENTS.DISK_CHECK]: 'Get-PSDrive -PSProvider FileSystem | Select-Object Name, @{N="UsedGB";E={[math]::Round($_.Used/1GB,2)}}, @{N="FreeGB";E={[math]::Round($_.Free/1GB,2)}}',
    [INTENTS.SERVICE_RESTART]: 'Restart-Service {serviceName}',
    [INTENTS.SERVICE_STOP]: 'Stop-Service {serviceName}',
    [INTENTS.SERVICE_START]: 'Start-Service {serviceName}',
    [INTENTS.DEPLOY]: 'cd {botPath}; git pull; npm install; Restart-Service {serviceName}',
    [INTENTS.PACKAGE_UPDATE]: 'winget upgrade --all --accept-package-agreements',
    [INTENTS.REBOOT]: 'shutdown /r /t {delaySeconds}'
  },
  [PLATFORMS.DARWIN]: {
    [INTENTS.STATUS_CHECK]: 'launchctl list | grep {serviceName}',
    [INTENTS.SERVER_STATS]: 'top -l 1 | head -10',
    [INTENTS.VIEW_LOGS]: 'tail -n {lines} {logPath}',
    [INTENTS.DIAGNOSTICS]: 'ps aux | sort -nrk 4 | head -10',
    [INTENTS.DISK_CHECK]: 'df -h',
    [INTENTS.SERVICE_RESTART]: 'launchctl stop {serviceName} && launchctl start {serviceName}',
    [INTENTS.SERVICE_STOP]: 'launchctl stop {serviceName}',
    [INTENTS.SERVICE_START]: 'launchctl start {serviceName}',
    [INTENTS.DEPLOY]: 'cd {botPath} && git pull && npm install && launchctl stop {serviceName} && launchctl start {serviceName}',
    [INTENTS.PACKAGE_UPDATE]: 'brew update && brew upgrade',
    [INTENTS.REBOOT]: 'sudo shutdown -r +{delay}'
  }
};

/**
 * Commands that require confirmation before execution
 */
const CONFIRMATION_REQUIRED = [
  INTENTS.SERVICE_RESTART,
  INTENTS.SERVICE_STOP,
  INTENTS.DEPLOY,
  INTENTS.PACKAGE_UPDATE,
  INTENTS.REBOOT
];

/**
 * Commands that require double confirmation (extra dangerous)
 */
const DOUBLE_CONFIRMATION_REQUIRED = [
  INTENTS.REBOOT
];

/**
 * Commands that cause downtime
 */
const CAUSES_DOWNTIME = [
  INTENTS.SERVICE_RESTART,
  INTENTS.SERVICE_STOP,
  INTENTS.DEPLOY,
  INTENTS.REBOOT
];

/**
 * Intent descriptions for user display
 */
const INTENT_DESCRIPTIONS = {
  [INTENTS.STATUS_CHECK]: 'Check bot service status',
  [INTENTS.SERVER_STATS]: 'View server statistics (CPU, memory, disk, uptime)',
  [INTENTS.VIEW_LOGS]: 'View recent log entries',
  [INTENTS.DIAGNOSTICS]: 'Run diagnostics (top processes by memory)',
  [INTENTS.DISK_CHECK]: 'Check disk space usage',
  [INTENTS.SERVICE_RESTART]: 'Restart the bot service',
  [INTENTS.SERVICE_STOP]: 'Stop the bot service',
  [INTENTS.SERVICE_START]: 'Start the bot service',
  [INTENTS.DEPLOY]: 'Deploy latest code (git pull, npm install, restart)',
  [INTENTS.PACKAGE_UPDATE]: 'Update system packages',
  [INTENTS.REBOOT]: 'Reboot the server'
};

/**
 * Generate a shell command from a parsed intent
 * @param {Object} intent - Parsed intent from NLP parser
 * @param {Object} options - Generation options
 * @returns {Object} Command object with shell command and metadata
 */
export function generateCommand(intent, options = {}) {
  if (!intent || !intent.action) {
    return {
      command: null,
      error: 'Invalid intent: missing action',
      valid: false
    };
  }

  const platform = options.platform || detectPlatform();
  const config = { ...DEFAULT_CONFIG, ...options.config };
  
  const templates = COMMAND_TEMPLATES[platform];
  if (!templates) {
    return {
      command: null,
      error: `Unsupported platform: ${platform}`,
      valid: false
    };
  }

  const template = templates[intent.action];
  if (!template) {
    return {
      command: null,
      error: `No command template for action: ${intent.action}`,
      valid: false
    };
  }

  // Substitute parameters
  const command = substituteParams(template, intent, config, platform);

  logger.debug(`Generated command for ${intent.action} on ${platform}: ${command}`);

  return {
    command,
    intent: intent.action,
    platform,
    description: INTENT_DESCRIPTIONS[intent.action] || intent.action,
    requiresConfirmation: CONFIRMATION_REQUIRED.includes(intent.action),
    requiresDoubleConfirmation: DOUBLE_CONFIRMATION_REQUIRED.includes(intent.action),
    causesDowntime: CAUSES_DOWNTIME.includes(intent.action),
    valid: true
  };
}

/**
 * Substitute parameters in command template
 * @param {string} template - Command template with placeholders
 * @param {Object} intent - Parsed intent with params
 * @param {Object} config - Configuration values
 * @param {string} platform - Target platform
 * @returns {string} Command with substituted values
 */
function substituteParams(template, intent, config, platform) {
  let command = template;
  const params = intent.params || {};

  // Service name
  command = command.replace(/{serviceName}/g, config.botServiceName);
  
  // Bot path
  command = command.replace(/{botPath}/g, config.botPath);
  
  // Log path (platform-specific)
  const logPath = platform === PLATFORMS.WINDOWS ? config.windowsLogPath : config.logPath;
  command = command.replace(/{logPath}/g, logPath);
  
  // Log lines (default 50)
  const lines = params.count || params.lines || 50;
  command = command.replace(/{lines}/g, lines.toString());
  
  // Reboot delay (default 2 minutes)
  const delay = params.delay || 2;
  command = command.replace(/{delay}/g, delay.toString());
  
  // Windows uses seconds for shutdown
  const delaySeconds = delay * 60;
  command = command.replace(/{delaySeconds}/g, delaySeconds.toString());

  return command;
}

/**
 * Detect the current platform
 * @returns {string} Platform identifier
 */
export function detectPlatform() {
  const platform = process.platform;
  
  if (platform === 'win32') {
    return PLATFORMS.WINDOWS;
  }
  if (platform === 'darwin') {
    return PLATFORMS.DARWIN;
  }
  // Default to Linux for linux, freebsd, etc.
  return PLATFORMS.LINUX;
}

/**
 * Get all supported intents for a platform
 * @param {string} platform - Platform identifier
 * @returns {string[]} Array of supported intent names
 */
export function getSupportedIntents(platform = detectPlatform()) {
  const templates = COMMAND_TEMPLATES[platform];
  if (!templates) {
    return [];
  }
  return Object.keys(templates);
}

/**
 * Check if an intent requires confirmation
 * @param {string} intentAction - Intent action name
 * @returns {boolean} True if confirmation is required
 */
export function intentRequiresConfirmation(intentAction) {
  return CONFIRMATION_REQUIRED.includes(intentAction);
}

/**
 * Check if an intent requires double confirmation
 * @param {string} intentAction - Intent action name
 * @returns {boolean} True if double confirmation is required
 */
export function intentRequiresDoubleConfirmation(intentAction) {
  return DOUBLE_CONFIRMATION_REQUIRED.includes(intentAction);
}

/**
 * Check if an intent causes downtime
 * @param {string} intentAction - Intent action name
 * @returns {boolean} True if the command causes downtime
 */
export function intentCausesDowntime(intentAction) {
  return CAUSES_DOWNTIME.includes(intentAction);
}

/**
 * Get description for an intent
 * @param {string} intentAction - Intent action name
 * @returns {string} Human-readable description
 */
export function getIntentDescription(intentAction) {
  return INTENT_DESCRIPTIONS[intentAction] || intentAction;
}

export default {
  PLATFORMS,
  DEFAULT_CONFIG,
  COMMAND_TEMPLATES,
  generateCommand,
  detectPlatform,
  getSupportedIntents,
  intentRequiresConfirmation,
  intentRequiresDoubleConfirmation,
  intentCausesDowntime,
  getIntentDescription
};
