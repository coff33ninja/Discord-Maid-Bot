/**
 * Command Validator for Server Admin
 * 
 * Validates commands against security rules including whitelist patterns
 * and dangerous pattern detection.
 * 
 * @module plugins/server-admin/command-validator
 */

import { createLogger } from '../../src/logging/logger.js';

const logger = createLogger('server-admin:validator');

/**
 * Whitelist of allowed command patterns
 * Commands must match at least one pattern to be considered valid
 */
export const COMMAND_WHITELIST = [
  // Linux systemctl commands
  /^systemctl\s+(status|restart|stop|start)\s+[\w-]+/,
  /^journalctl\s+-u\s+[\w-]+/,
  
  // System info commands (Linux/macOS)
  /^df\s+-h/,
  /^free\s+-[mh]/,
  /^uptime/,
  /^top\s+(-bn1|-l\s+1)/,
  /^ps\s+aux/,
  
  // Git commands
  /^git\s+(pull|status|log)/,
  
  // NPM commands
  /^npm\s+(install|ci)/,
  
  // Package management (Linux)
  /^apt\s+(update|upgrade|list)/,
  /^nala\s+(update|upgrade|list)/,
  
  // Package management (macOS)
  /^brew\s+(update|upgrade|list)/,
  
  // Package management (Windows)
  /^winget\s+(upgrade|list)/,
  /^choco\s+(upgrade|list)/,
  
  // Shutdown/reboot with delay
  /^shutdown\s+(-r\s+\+\d+|\/r\s+\/t\s+\d+)/,
  
  // Windows PowerShell commands
  /^Get-Service\s+[\w-]+/i,
  /^Restart-Service\s+[\w-]+/i,
  /^Stop-Service\s+[\w-]+/i,
  /^Start-Service\s+[\w-]+/i,
  /^Get-CimInstance/i,
  /^Get-Process/i,
  /^Get-PSDrive/i,
  /^Get-Content\s+.+\s+-Tail\s+\d+/i,
  
  // macOS launchctl
  /^launchctl\s+(list|start|stop)\s*/,
  
  // Log viewing
  /^tail\s+-n\s+\d+/,
  /^head\s+-n\s+\d+/,
  
  // Echo for status (used in compound commands)
  /^echo\s+/
];

/**
 * Dangerous patterns that should always be blocked
 * These patterns indicate potentially destructive operations
 */
export const DANGEROUS_PATTERNS = [
  // Recursive deletion
  { pattern: /rm\s+-rf/i, description: 'Recursive force delete' },
  { pattern: /rm\s+.*\//i, description: 'Delete with path' },
  { pattern: /rmdir\s+\/s/i, description: 'Windows recursive delete' },
  { pattern: /del\s+\/s/i, description: 'Windows recursive delete' },
  
  // Disk operations
  { pattern: /dd\s+if=/i, description: 'Direct disk write' },
  { pattern: /mkfs/i, description: 'Filesystem creation' },
  { pattern: /fdisk/i, description: 'Disk partitioning' },
  { pattern: /parted/i, description: 'Disk partitioning' },
  
  // Fork bomb
  { pattern: /:\(\)\s*{\s*:\|:\s*&\s*}/i, description: 'Fork bomb' },
  { pattern: /\$\(.*\)\s*&/i, description: 'Background subshell' },
  
  // Device writes
  { pattern: />\s*\/dev\/sd/i, description: 'Direct device write' },
  { pattern: />\s*\/dev\/null/i, description: 'Null redirect (suspicious in context)' },
  
  // Permission changes
  { pattern: /chmod\s+777/i, description: 'World-writable permissions' },
  { pattern: /chmod\s+-R\s+777/i, description: 'Recursive world-writable' },
  
  // Remote code execution
  { pattern: /curl.*\|\s*(ba)?sh/i, description: 'Pipe curl to shell' },
  { pattern: /wget.*\|\s*(ba)?sh/i, description: 'Pipe wget to shell' },
  
  // Code evaluation
  { pattern: /eval\s*\(/i, description: 'Eval execution' },
  { pattern: /\$\(.*\)/i, description: 'Command substitution' },
  { pattern: /`.*`/i, description: 'Backtick command substitution' },
  
  // System destruction
  { pattern: /:(){ :|:& };:/i, description: 'Fork bomb variant' },
  { pattern: />\s*\/etc\//i, description: 'Write to /etc' },
  { pattern: />\s*\/boot\//i, description: 'Write to /boot' },
  
  // Windows specific dangerous
  { pattern: /format\s+[a-z]:/i, description: 'Windows format drive' },
  { pattern: /reg\s+delete/i, description: 'Registry deletion' },
  
  // SQL injection patterns (if commands contain user input)
  { pattern: /;\s*drop\s+/i, description: 'SQL injection attempt' },
  { pattern: /;\s*delete\s+from/i, description: 'SQL injection attempt' }
];

/**
 * Commands that require explicit user confirmation before execution
 */
export const CONFIRMATION_REQUIRED_PATTERNS = [
  /systemctl\s+(restart|stop)/i,
  /Restart-Service/i,
  /Stop-Service/i,
  /launchctl\s+stop/i,
  /shutdown/i,
  /reboot/i,
  /apt\s+upgrade/i,
  /nala\s+upgrade/i,
  /brew\s+upgrade/i,
  /winget\s+upgrade/i,
  /git\s+pull/i,
  /npm\s+install/i
];

/**
 * Validate a command against security rules
 * @param {string} command - Shell command to validate
 * @param {string} userId - User requesting the command (for logging)
 * @returns {Object} Validation result
 */
export function validateCommand(command, userId = 'unknown') {
  if (!command || typeof command !== 'string') {
    return {
      valid: false,
      blocked: true,
      reason: 'Invalid command: empty or not a string',
      matchedWhitelist: null,
      matchedDangerous: null,
      requiresApproval: false
    };
  }

  const trimmedCommand = command.trim();
  
  // Check for dangerous patterns first
  for (const dangerous of DANGEROUS_PATTERNS) {
    if (dangerous.pattern.test(trimmedCommand)) {
      logger.warn(`Blocked dangerous command from user ${userId}: ${trimmedCommand}`);
      logger.warn(`Matched pattern: ${dangerous.description}`);
      
      return {
        valid: false,
        blocked: true,
        reason: `Command blocked: ${dangerous.description}`,
        matchedWhitelist: null,
        matchedDangerous: dangerous.description,
        requiresApproval: false
      };
    }
  }

  // Check against whitelist
  let matchedWhitelist = null;
  for (const pattern of COMMAND_WHITELIST) {
    if (pattern.test(trimmedCommand)) {
      matchedWhitelist = pattern.toString();
      break;
    }
  }

  if (!matchedWhitelist) {
    logger.warn(`Command not in whitelist from user ${userId}: ${trimmedCommand}`);
    
    return {
      valid: false,
      blocked: true,
      reason: 'Command not in allowed whitelist',
      matchedWhitelist: null,
      matchedDangerous: null,
      requiresApproval: false
    };
  }

  // Check if confirmation is required
  const requiresApproval = CONFIRMATION_REQUIRED_PATTERNS.some(
    pattern => pattern.test(trimmedCommand)
  );

  logger.debug(`Command validated for user ${userId}: ${trimmedCommand}`);
  
  return {
    valid: true,
    blocked: false,
    reason: null,
    matchedWhitelist,
    matchedDangerous: null,
    requiresApproval
  };
}

/**
 * Check if a command matches any dangerous pattern
 * @param {string} command - Command to check
 * @returns {Object|null} Matched dangerous pattern info or null
 */
export function matchesDangerousPattern(command) {
  if (!command || typeof command !== 'string') {
    return null;
  }

  for (const dangerous of DANGEROUS_PATTERNS) {
    if (dangerous.pattern.test(command)) {
      return {
        pattern: dangerous.pattern.toString(),
        description: dangerous.description
      };
    }
  }

  return null;
}

/**
 * Check if a command matches the whitelist
 * @param {string} command - Command to check
 * @returns {string|null} Matched whitelist pattern or null
 */
export function matchesWhitelist(command) {
  if (!command || typeof command !== 'string') {
    return null;
  }

  for (const pattern of COMMAND_WHITELIST) {
    if (pattern.test(command)) {
      return pattern.toString();
    }
  }

  return null;
}

/**
 * Check if a command requires approval
 * @param {string} command - Command to check
 * @returns {boolean} True if approval is required
 */
export function requiresApproval(command) {
  if (!command || typeof command !== 'string') {
    return false;
  }

  return CONFIRMATION_REQUIRED_PATTERNS.some(
    pattern => pattern.test(command)
  );
}

export default {
  validateCommand,
  matchesDangerousPattern,
  matchesWhitelist,
  requiresApproval,
  COMMAND_WHITELIST,
  DANGEROUS_PATTERNS,
  CONFIRMATION_REQUIRED_PATTERNS
};
