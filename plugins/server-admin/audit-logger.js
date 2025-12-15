/**
 * Audit Logger for Server Admin
 * 
 * Logs all command executions and Discord admin actions
 * for security auditing and compliance.
 * 
 * @module plugins/server-admin/audit-logger
 */

import { createLogger } from '../../src/logging/logger.js';
import { configOps } from '../../src/database/db.js';

const logger = createLogger('server-admin:audit');

/**
 * Audit log entry prefix in database
 */
const AUDIT_PREFIX = 'server_admin_audit_';

/**
 * Maximum audit entries to keep (for cleanup)
 */
const MAX_AUDIT_ENTRIES = 1000;

/**
 * Log a command execution to the audit trail
 * @param {Object} entry - Audit log entry
 * @returns {Object} Stored audit entry with ID
 */
export function logAudit(entry) {
  if (!entry) {
    logger.warn('Attempted to log null audit entry');
    return null;
  }

  const auditEntry = {
    id: generateAuditId(),
    userId: entry.userId || 'unknown',
    username: entry.username || 'unknown',
    command: entry.command || '',
    intent: entry.intent || '',
    type: entry.type || 'command', // 'command', 'discord_role', 'discord_channel', 'discord_member', 'discord_server'
    target: entry.target || null,  // Target user/channel/role for Discord actions
    reason: entry.reason || null,
    timestamp: Date.now(),
    approved: entry.approved !== false,
    executed: entry.executed !== false,
    success: entry.success !== false,
    output: truncateOutput(entry.output),
    error: entry.error || null,
    duration: entry.duration || 0,
    platform: entry.platform || 'unknown',
    guildId: entry.guildId || null,
    channelId: entry.channelId || null
  };

  try {
    const key = `${AUDIT_PREFIX}${auditEntry.id}`;
    configOps.set(key, JSON.stringify(auditEntry));
    
    logger.info(`Audit logged: ${auditEntry.type} by ${auditEntry.username} - ${auditEntry.command || auditEntry.intent}`);
    
    return auditEntry;
  } catch (error) {
    logger.error('Failed to store audit entry:', error);
    return auditEntry; // Return entry even if storage fails
  }
}

/**
 * Get audit history with optional filters
 * @param {Object} filters - Query filters
 * @returns {Array} Filtered audit entries
 */
export function getAuditHistory(filters = {}) {
  try {
    const allConfig = configOps.getAll();
    const entries = [];

    for (const config of allConfig) {
      if (config.key.startsWith(AUDIT_PREFIX)) {
        try {
          const entry = JSON.parse(config.value);
          if (matchesFilters(entry, filters)) {
            entries.push(entry);
          }
        } catch (parseError) {
          logger.warn(`Failed to parse audit entry: ${config.key}`);
        }
      }
    }

    // Sort by timestamp descending (newest first)
    entries.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit if specified
    if (filters.limit && filters.limit > 0) {
      return entries.slice(0, filters.limit);
    }

    return entries;
  } catch (error) {
    logger.error('Failed to get audit history:', error);
    return [];
  }
}

/**
 * Get a specific audit entry by ID
 * @param {string} auditId - Audit entry ID
 * @returns {Object|null} Audit entry or null
 */
export function getAuditEntry(auditId) {
  try {
    const key = `${AUDIT_PREFIX}${auditId}`;
    const value = configOps.get(key);
    
    if (value) {
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    logger.error(`Failed to get audit entry ${auditId}:`, error);
    return null;
  }
}

/**
 * Get audit entries for a specific user
 * @param {string} userId - User ID
 * @param {number} limit - Maximum entries to return
 * @returns {Array} User's audit entries
 */
export function getUserAuditHistory(userId, limit = 50) {
  return getAuditHistory({ userId, limit });
}

/**
 * Get audit entries by type
 * @param {string} type - Audit type
 * @param {number} limit - Maximum entries to return
 * @returns {Array} Audit entries of specified type
 */
export function getAuditByType(type, limit = 50) {
  return getAuditHistory({ type, limit });
}

/**
 * Get recent audit entries
 * @param {number} hours - Hours to look back
 * @param {number} limit - Maximum entries to return
 * @returns {Array} Recent audit entries
 */
export function getRecentAudit(hours = 24, limit = 100) {
  const since = Date.now() - (hours * 60 * 60 * 1000);
  return getAuditHistory({ since, limit });
}

/**
 * Get failed command audit entries
 * @param {number} limit - Maximum entries to return
 * @returns {Array} Failed audit entries
 */
export function getFailedAudit(limit = 50) {
  return getAuditHistory({ success: false, limit });
}

/**
 * Clean up old audit entries
 * @param {number} keepCount - Number of entries to keep
 * @returns {number} Number of entries deleted
 */
export function cleanupAuditLog(keepCount = MAX_AUDIT_ENTRIES) {
  try {
    const entries = getAuditHistory({});
    
    if (entries.length <= keepCount) {
      return 0;
    }

    // Sort by timestamp and get entries to delete
    const toDelete = entries.slice(keepCount);
    let deleted = 0;

    for (const entry of toDelete) {
      const key = `${AUDIT_PREFIX}${entry.id}`;
      configOps.delete(key);
      deleted++;
    }

    logger.info(`Cleaned up ${deleted} old audit entries`);
    return deleted;
  } catch (error) {
    logger.error('Failed to cleanup audit log:', error);
    return 0;
  }
}

/**
 * Get audit statistics
 * @returns {Object} Audit statistics
 */
export function getAuditStats() {
  const entries = getAuditHistory({});
  
  const stats = {
    total: entries.length,
    successful: 0,
    failed: 0,
    byType: {},
    byUser: {},
    last24Hours: 0
  };

  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

  for (const entry of entries) {
    if (entry.success) {
      stats.successful++;
    } else {
      stats.failed++;
    }

    stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
    stats.byUser[entry.userId] = (stats.byUser[entry.userId] || 0) + 1;

    if (entry.timestamp > oneDayAgo) {
      stats.last24Hours++;
    }
  }

  return stats;
}

/**
 * Check if entry matches filters
 * @param {Object} entry - Audit entry
 * @param {Object} filters - Filters to apply
 * @returns {boolean} True if entry matches
 */
function matchesFilters(entry, filters) {
  if (filters.userId && entry.userId !== filters.userId) {
    return false;
  }
  if (filters.type && entry.type !== filters.type) {
    return false;
  }
  if (filters.success !== undefined && entry.success !== filters.success) {
    return false;
  }
  if (filters.since && entry.timestamp < filters.since) {
    return false;
  }
  if (filters.until && entry.timestamp > filters.until) {
    return false;
  }
  if (filters.guildId && entry.guildId !== filters.guildId) {
    return false;
  }
  return true;
}

/**
 * Generate unique audit ID
 * @returns {string} Unique ID
 */
function generateAuditId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Truncate output to reasonable length
 * @param {string} output - Output to truncate
 * @returns {string} Truncated output
 */
function truncateOutput(output) {
  if (!output) return null;
  const maxLength = 500;
  if (output.length > maxLength) {
    return output.substring(0, maxLength) + '... [truncated]';
  }
  return output;
}

/**
 * Format audit entry for display
 * @param {Object} entry - Audit entry
 * @returns {string} Formatted string
 */
export function formatAuditEntry(entry) {
  if (!entry) return 'No entry';
  
  const date = new Date(entry.timestamp).toISOString();
  const status = entry.success ? '✅' : '❌';
  const action = entry.command || entry.intent || entry.type;
  
  return `${status} [${date}] ${entry.username}: ${action}`;
}

export default {
  logAudit,
  getAuditHistory,
  getAuditEntry,
  getUserAuditHistory,
  getAuditByType,
  getRecentAudit,
  getFailedAudit,
  cleanupAuditLog,
  getAuditStats,
  formatAuditEntry
};
