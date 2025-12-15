/**
 * NLP Parser for Server Admin
 * 
 * Parses natural language into server admin intents.
 * Supports both Linux/Windows/macOS server commands and Discord admin commands.
 * 
 * @module plugins/server-admin/nlp-parser
 */

import { createLogger } from '../../src/logging/logger.js';

const logger = createLogger('server-admin:nlp');

/**
 * Intent types for server administration
 */
export const INTENTS = {
  // Server Status (Read-only)
  STATUS_CHECK: 'status_check',
  SERVER_STATS: 'server_stats',
  VIEW_LOGS: 'view_logs',
  DIAGNOSTICS: 'diagnostics',
  DISK_CHECK: 'disk_check',
  
  // Service Management
  SERVICE_RESTART: 'service_restart',
  SERVICE_STOP: 'service_stop',
  SERVICE_START: 'service_start',
  
  // Deployment
  DEPLOY: 'deploy',
  
  // System Maintenance
  PACKAGE_UPDATE: 'package_update',
  REBOOT: 'reboot',
  
  // Discord Role Management
  ROLE_ADD: 'role_add',
  ROLE_REMOVE: 'role_remove',
  ROLE_CREATE: 'role_create',
  ROLE_DELETE: 'role_delete',
  ROLE_LIST: 'role_list',
  
  // Discord Channel Management
  CHANNEL_CREATE: 'channel_create',
  CHANNEL_DELETE: 'channel_delete',
  CHANNEL_RENAME: 'channel_rename',
  CHANNEL_MOVE: 'channel_move',
  CHANNEL_TOPIC: 'channel_topic',
  CHANNEL_LOCK: 'channel_lock',
  CHANNEL_UNLOCK: 'channel_unlock',
  SLOWMODE: 'slowmode',
  
  // Discord Member Management
  MEMBER_KICK: 'member_kick',
  MEMBER_BAN: 'member_ban',
  MEMBER_TIMEOUT: 'member_timeout',
  MEMBER_UNBAN: 'member_unban',
  MEMBER_INFO: 'member_info',
  
  // Discord Server Settings
  SERVER_INFO: 'server_info',
  SERVER_NAME: 'server_name',
  
  // Unknown
  UNKNOWN: 'unknown'
};


/**
 * Intent patterns with keywords and regex
 */
const INTENT_PATTERNS = [
  // Server Status
  {
    intent: INTENTS.STATUS_CHECK,
    patterns: [
      /is\s+(?:the\s+)?bot\s+running/i,
      /bot\s+status/i,
      /check\s+(?:if\s+)?(?:the\s+)?bot/i
    ],
    keywords: ['bot running', 'bot status', 'service status', 'is bot up']
  },
  {
    intent: INTENTS.SERVER_STATS,
    patterns: [
      /(?:show|get|check)\s+server\s+(?:status|stats)/i,
      /(?:cpu|memory|ram|disk)\s+usage/i,
      /system\s+(?:status|stats|info)/i
    ],
    keywords: ['server status', 'server stats', 'cpu usage', 'memory usage']
  },
  {
    intent: INTENTS.VIEW_LOGS,
    patterns: [
      /(?:show|view|get|display)\s+(?:the\s+)?(?:last\s+)?(\d+)?\s*(?:log|logs)/i,
      /(?:last|recent)\s+(\d+)?\s*(?:log|logs)/i,
      /bot\s+logs/i
    ],
    keywords: ['show logs', 'view logs', 'bot logs', 'recent logs']
  },
  {
    intent: INTENTS.DIAGNOSTICS,
    patterns: [
      /why\s+is\s+(?:the\s+)?server\s+slow/i,
      /server\s+diagnostics/i,
      /top\s+processes/i
    ],
    keywords: ['server slow', 'diagnostics', 'top processes']
  },
  {
    intent: INTENTS.DISK_CHECK,
    patterns: [
      /(?:check|show|view)\s+disk\s+(?:space|usage)/i,
      /(?:how\s+much\s+)?(?:disk|storage)\s+(?:space|left)/i
    ],
    keywords: ['disk space', 'disk usage', 'storage space']
  },
  
  // Service Management
  {
    intent: INTENTS.SERVICE_RESTART,
    patterns: [
      /restart\s+(?:the\s+)?bot/i,
      /reboot\s+(?:the\s+)?bot/i
    ],
    keywords: ['restart bot', 'reboot bot', 'restart service']
  },
  {
    intent: INTENTS.SERVICE_STOP,
    patterns: [
      /stop\s+(?:the\s+)?bot/i,
      /shutdown\s+(?:the\s+)?bot/i
    ],
    keywords: ['stop bot', 'shutdown bot']
  },
  
  // Deployment
  {
    intent: INTENTS.DEPLOY,
    patterns: [
      /deploy\s+(?:the\s+)?(?:latest\s+)?(?:code|update)/i,
      /update\s+(?:the\s+)?bot/i,
      /git\s+pull/i
    ],
    keywords: ['deploy', 'deploy code', 'update bot', 'git pull']
  },
  
  // System Maintenance
  {
    intent: INTENTS.PACKAGE_UPDATE,
    patterns: [
      /update\s+(?:system\s+)?packages/i,
      /system\s+update/i
    ],
    keywords: ['update packages', 'system update']
  },
  {
    intent: INTENTS.REBOOT,
    patterns: [
      /reboot\s+(?:the\s+)?server/i,
      /restart\s+(?:the\s+)?server/i
    ],
    keywords: ['reboot server', 'restart server']
  },
  
  // Discord Role Management
  {
    intent: INTENTS.ROLE_ADD,
    patterns: [
      /(?:give|add|assign)\s+(?:the\s+)?(.+?)\s+role/i
    ],
    keywords: ['give role', 'add role', 'assign role']
  },
  {
    intent: INTENTS.ROLE_REMOVE,
    patterns: [
      /(?:remove|take|revoke)\s+(?:the\s+)?(.+?)\s+role/i
    ],
    keywords: ['remove role', 'take role', 'revoke role']
  },
  {
    intent: INTENTS.ROLE_LIST,
    patterns: [
      /list\s+(?:all\s+)?roles/i,
      /show\s+(?:all\s+)?roles/i
    ],
    keywords: ['list roles', 'show roles']
  },
  
  // Discord Channel Management
  {
    intent: INTENTS.CHANNEL_LOCK,
    patterns: [
      /lock\s+(?:this\s+)?channel/i
    ],
    keywords: ['lock channel', 'lock this channel']
  },
  {
    intent: INTENTS.CHANNEL_UNLOCK,
    patterns: [
      /unlock\s+(?:this\s+)?channel/i
    ],
    keywords: ['unlock channel', 'unlock this channel']
  },
  {
    intent: INTENTS.SLOWMODE,
    patterns: [
      /set\s+slowmode\s+(?:to\s+)?(\d+)/i,
      /slowmode\s+(\d+)/i
    ],
    keywords: ['slowmode', 'set slowmode']
  },
  
  // Discord Member Management
  {
    intent: INTENTS.MEMBER_KICK,
    patterns: [
      /kick\s+<@!?(\d+)>/i,
      /kick\s+(?:user\s+)?(\w+)/i
    ],
    keywords: ['kick', 'kick user', 'kick member']
  },
  {
    intent: INTENTS.MEMBER_BAN,
    patterns: [
      /ban\s+<@!?(\d+)>/i,
      /ban\s+(?:user\s+)?(\w+)/i
    ],
    keywords: ['ban', 'ban user', 'ban member']
  },
  {
    intent: INTENTS.MEMBER_TIMEOUT,
    patterns: [
      /timeout\s+<@!?(\d+)>/i,
      /mute\s+<@!?(\d+)>/i
    ],
    keywords: ['timeout', 'mute', 'timeout user']
  },
  {
    intent: INTENTS.MEMBER_INFO,
    patterns: [
      /(?:show|get)\s+(?:member\s+)?info\s+(?:for\s+)?<@!?(\d+)>/i,
      /who\s+is\s+<@!?(\d+)>/i
    ],
    keywords: ['member info', 'user info', 'who is']
  },
  
  // Discord Server Settings
  {
    intent: INTENTS.SERVER_INFO,
    patterns: [
      /(?:show|get)\s+server\s+info/i,
      /server\s+information/i
    ],
    keywords: ['server info', 'guild info']
  }
];


/**
 * Parse natural language into server admin intent
 * @param {string} query - User's natural language query
 * @returns {Object} Parsed intent with action type and parameters
 */
export function parseAdminIntent(query) {
  if (!query || typeof query !== 'string') {
    return { action: INTENTS.UNKNOWN, params: {}, confidence: 0, originalQuery: query };
  }
  
  const lowerQuery = query.toLowerCase().trim();
  
  // Try each pattern
  for (const pattern of INTENT_PATTERNS) {
    // Check regex patterns
    for (const regex of pattern.patterns) {
      const match = lowerQuery.match(regex);
      if (match) {
        const params = extractParams(pattern.intent, query);
        const confidence = calculateConfidence(lowerQuery, pattern.keywords);
        
        logger.debug(`Matched intent: ${pattern.intent} with confidence ${confidence}`);
        
        return {
          action: pattern.intent,
          params,
          confidence,
          originalQuery: query,
          type: getIntentType(pattern.intent)
        };
      }
    }
    
    // Check keywords
    for (const keyword of pattern.keywords) {
      if (lowerQuery.includes(keyword)) {
        const params = extractParams(pattern.intent, query);
        const confidence = calculateConfidence(lowerQuery, pattern.keywords);
        
        logger.debug(`Matched intent via keyword: ${pattern.intent}`);
        
        return {
          action: pattern.intent,
          params,
          confidence,
          originalQuery: query,
          type: getIntentType(pattern.intent)
        };
      }
    }
  }
  
  return {
    action: INTENTS.UNKNOWN,
    params: {},
    confidence: 0,
    originalQuery: query,
    type: 'unknown'
  };
}

/**
 * Extract parameters from query based on intent
 */
function extractParams(intent, query) {
  const params = {};
  
  // Extract user mentions
  const userMatch = query.match(/<@!?(\d+)>/);
  if (userMatch) params.userId = userMatch[1];
  
  // Extract numbers (for log lines, slowmode, etc.)
  const numberMatch = query.match(/(\d+)\s*(?:lines?|logs?|seconds?|s|minutes?|m|hours?|h)/i);
  if (numberMatch) params.count = parseInt(numberMatch[1]);
  
  // Extract role names
  if ([INTENTS.ROLE_ADD, INTENTS.ROLE_REMOVE].includes(intent)) {
    const roleMatch = query.match(/(?:give|add|assign|remove|take|revoke)\s+(?:the\s+)?(.+?)\s+role/i);
    if (roleMatch) params.roleName = roleMatch[1].trim();
  }
  
  // Extract reason
  const reasonMatch = query.match(/(?:for|reason[:\s]+)(.+)$/i);
  if (reasonMatch) params.reason = reasonMatch[1].trim();
  
  return params;
}

/**
 * Calculate confidence score for intent match
 */
function calculateConfidence(query, keywords) {
  let confidence = 0.7;
  
  // Higher confidence for more keyword matches
  const matchCount = keywords.filter(kw => query.includes(kw)).length;
  confidence += matchCount * 0.05;
  
  // Higher confidence for question patterns
  if (query.includes('?')) confidence += 0.05;
  
  // Higher confidence for polite requests
  if (query.includes('please') || query.includes('can you')) confidence += 0.05;
  
  return Math.min(1, confidence);
}

/**
 * Get the type category for an intent
 */
function getIntentType(intent) {
  const typeMap = {
    [INTENTS.STATUS_CHECK]: 'server_status',
    [INTENTS.SERVER_STATS]: 'server_status',
    [INTENTS.VIEW_LOGS]: 'server_status',
    [INTENTS.DIAGNOSTICS]: 'server_status',
    [INTENTS.DISK_CHECK]: 'server_status',
    [INTENTS.SERVICE_RESTART]: 'service_management',
    [INTENTS.SERVICE_STOP]: 'service_management',
    [INTENTS.SERVICE_START]: 'service_management',
    [INTENTS.DEPLOY]: 'deployment',
    [INTENTS.PACKAGE_UPDATE]: 'maintenance',
    [INTENTS.REBOOT]: 'maintenance',
    [INTENTS.ROLE_ADD]: 'discord_roles',
    [INTENTS.ROLE_REMOVE]: 'discord_roles',
    [INTENTS.ROLE_CREATE]: 'discord_roles',
    [INTENTS.ROLE_DELETE]: 'discord_roles',
    [INTENTS.ROLE_LIST]: 'discord_roles',
    [INTENTS.CHANNEL_CREATE]: 'discord_channels',
    [INTENTS.CHANNEL_DELETE]: 'discord_channels',
    [INTENTS.CHANNEL_RENAME]: 'discord_channels',
    [INTENTS.CHANNEL_MOVE]: 'discord_channels',
    [INTENTS.CHANNEL_TOPIC]: 'discord_channels',
    [INTENTS.CHANNEL_LOCK]: 'discord_channels',
    [INTENTS.CHANNEL_UNLOCK]: 'discord_channels',
    [INTENTS.SLOWMODE]: 'discord_channels',
    [INTENTS.MEMBER_KICK]: 'discord_members',
    [INTENTS.MEMBER_BAN]: 'discord_members',
    [INTENTS.MEMBER_TIMEOUT]: 'discord_members',
    [INTENTS.MEMBER_UNBAN]: 'discord_members',
    [INTENTS.MEMBER_INFO]: 'discord_members',
    [INTENTS.SERVER_INFO]: 'discord_settings',
    [INTENTS.SERVER_NAME]: 'discord_settings'
  };
  return typeMap[intent] || 'unknown';
}

/**
 * Check if an intent requires confirmation
 */
export function requiresConfirmation(intent) {
  const confirmationRequired = [
    INTENTS.SERVICE_RESTART,
    INTENTS.SERVICE_STOP,
    INTENTS.DEPLOY,
    INTENTS.PACKAGE_UPDATE,
    INTENTS.REBOOT,
    INTENTS.ROLE_DELETE,
    INTENTS.CHANNEL_DELETE,
    INTENTS.MEMBER_KICK,
    INTENTS.MEMBER_BAN
  ];
  return confirmationRequired.includes(intent);
}

/**
 * Check if an intent requires double confirmation (extra dangerous)
 */
export function requiresDoubleConfirmation(intent) {
  return intent === INTENTS.REBOOT;
}

export default {
  INTENTS,
  parseAdminIntent,
  requiresConfirmation,
  requiresDoubleConfirmation
};
