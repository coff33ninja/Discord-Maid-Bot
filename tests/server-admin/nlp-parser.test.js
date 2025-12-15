/**
 * NLP Parser Property Tests
 * 
 * Property-based tests for the server admin NLP parser.
 * Uses fast-check for generating random test inputs.
 * 
 * @module tests/server-admin/nlp-parser.test
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  INTENTS, 
  parseAdminIntent, 
  requiresConfirmation,
  requiresDoubleConfirmation 
} from '../../plugins/server-admin/nlp-parser.js';

// Valid server status queries
const SERVER_STATUS_QUERIES = [
  'is the bot running',
  'is bot running',
  'bot status',
  'check if the bot is running',
  'show server status',
  'server stats',
  'cpu usage',
  'memory usage',
  'show logs',
  'view logs',
  'last 50 logs',
  'bot logs',
  'why is the server slow',
  'server diagnostics',
  'check disk space',
  'disk usage'
];

// Valid service management queries
const SERVICE_QUERIES = [
  'restart the bot',
  'restart bot',
  'reboot bot',
  'stop the bot',
  'stop bot',
  'shutdown bot'
];

// Valid deployment queries
const DEPLOY_QUERIES = [
  'deploy',
  'deploy latest code',
  'deploy code',
  'update bot',
  'git pull'
];

// Valid maintenance queries
const MAINTENANCE_QUERIES = [
  'update packages',
  'system update',
  'reboot server',
  'restart server'
];

// Valid Discord role queries
const ROLE_QUERIES = [
  'give admin role',
  'add role moderator',
  'remove role admin',
  'list roles',
  'show roles'
];

// Valid Discord channel queries
const CHANNEL_QUERIES = [
  'lock channel',
  'lock this channel',
  'unlock channel',
  'set slowmode 5'
];

// Valid Discord member queries
const MEMBER_QUERIES = [
  'kick <@123456789>',
  'ban <@123456789>',
  'timeout <@123456789>',
  'member info <@123456789>'
];

describe('NLP Parser', () => {
  /**
   * **Feature: ai-server-admin, Property 1: Natural Language to Command Mapping**
   * *For any* valid admin query (status check, restart, deploy, etc.),
   * the NLP parser SHALL produce a recognized intent.
   * **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 4.2**
   */
  describe('Property 1: Natural Language to Command Mapping', () => {
    it('should parse server status queries to correct intents', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SERVER_STATUS_QUERIES),
          (query) => {
            const result = parseAdminIntent(query);
            
            expect(result.action).not.toBe(INTENTS.UNKNOWN);
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.type).toBe('server_status');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse service management queries to correct intents', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SERVICE_QUERIES),
          (query) => {
            const result = parseAdminIntent(query);
            
            expect(result.action).not.toBe(INTENTS.UNKNOWN);
            expect([INTENTS.SERVICE_RESTART, INTENTS.SERVICE_STOP]).toContain(result.action);
            expect(result.type).toBe('service_management');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse deployment queries to correct intents', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DEPLOY_QUERIES),
          (query) => {
            const result = parseAdminIntent(query);
            
            expect(result.action).toBe(INTENTS.DEPLOY);
            expect(result.type).toBe('deployment');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse maintenance queries to correct intents', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...MAINTENANCE_QUERIES),
          (query) => {
            const result = parseAdminIntent(query);
            
            expect(result.action).not.toBe(INTENTS.UNKNOWN);
            expect([INTENTS.PACKAGE_UPDATE, INTENTS.REBOOT]).toContain(result.action);
            expect(result.type).toBe('maintenance');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse Discord role queries to correct intents', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ROLE_QUERIES),
          (query) => {
            const result = parseAdminIntent(query);
            
            expect(result.action).not.toBe(INTENTS.UNKNOWN);
            expect(result.type).toBe('discord_roles');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse Discord channel queries to correct intents', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...CHANNEL_QUERIES),
          (query) => {
            const result = parseAdminIntent(query);
            
            expect(result.action).not.toBe(INTENTS.UNKNOWN);
            expect(result.type).toBe('discord_channels');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse Discord member queries to correct intents', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...MEMBER_QUERIES),
          (query) => {
            const result = parseAdminIntent(query);
            
            expect(result.action).not.toBe(INTENTS.UNKNOWN);
            expect(result.type).toBe('discord_members');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return UNKNOWN for unrecognized queries', () => {
      const unrecognizedQueries = [
        'hello world',
        'what is the weather',
        'play some music',
        'random gibberish xyz123'
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...unrecognizedQueries),
          (query) => {
            const result = parseAdminIntent(query);
            expect(result.action).toBe(INTENTS.UNKNOWN);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle null and empty inputs gracefully', () => {
      expect(parseAdminIntent(null).action).toBe(INTENTS.UNKNOWN);
      expect(parseAdminIntent('').action).toBe(INTENTS.UNKNOWN);
      expect(parseAdminIntent(undefined).action).toBe(INTENTS.UNKNOWN);
    });

    it('should be case insensitive', () => {
      const queries = [
        'IS THE BOT RUNNING',
        'Is The Bot Running',
        'is the bot running',
        'RESTART BOT',
        'Restart Bot'
      ];

      for (const query of queries) {
        const result = parseAdminIntent(query);
        expect(result.action).not.toBe(INTENTS.UNKNOWN);
      }
    });
  });

  describe('Confidence Scoring', () => {
    it('should return confidence between 0 and 1', () => {
      const allQueries = [
        ...SERVER_STATUS_QUERIES,
        ...SERVICE_QUERIES,
        ...DEPLOY_QUERIES
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...allQueries),
          (query) => {
            const result = parseAdminIntent(query);
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should increase confidence for polite requests', () => {
      const baseQuery = 'restart bot';
      const politeQuery = 'please restart bot';
      
      const baseResult = parseAdminIntent(baseQuery);
      const politeResult = parseAdminIntent(politeQuery);
      
      expect(politeResult.confidence).toBeGreaterThanOrEqual(baseResult.confidence);
    });
  });

  describe('Parameter Extraction', () => {
    it('should extract user IDs from mentions', () => {
      const result = parseAdminIntent('kick <@123456789012345678>');
      expect(result.params.userId).toBe('123456789012345678');
    });

    it('should extract line counts from log queries', () => {
      const result = parseAdminIntent('show last 50 logs');
      expect(result.params.count).toBe(50);
    });

    it('should extract role names from role queries', () => {
      const result = parseAdminIntent('give admin role');
      expect(result.params.roleName).toBe('admin');
    });
  });

  describe('Confirmation Requirements', () => {
    it('should require confirmation for dangerous operations', () => {
      const dangerousIntents = [
        INTENTS.SERVICE_RESTART,
        INTENTS.SERVICE_STOP,
        INTENTS.DEPLOY,
        INTENTS.PACKAGE_UPDATE,
        INTENTS.REBOOT,
        INTENTS.MEMBER_KICK,
        INTENTS.MEMBER_BAN
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...dangerousIntents),
          (intent) => {
            expect(requiresConfirmation(intent)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not require confirmation for read-only operations', () => {
      const readOnlyIntents = [
        INTENTS.STATUS_CHECK,
        INTENTS.SERVER_STATS,
        INTENTS.VIEW_LOGS,
        INTENTS.DISK_CHECK,
        INTENTS.ROLE_LIST,
        INTENTS.SERVER_INFO
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...readOnlyIntents),
          (intent) => {
            expect(requiresConfirmation(intent)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should require double confirmation only for reboot', () => {
      expect(requiresDoubleConfirmation(INTENTS.REBOOT)).toBe(true);
      expect(requiresDoubleConfirmation(INTENTS.SERVICE_RESTART)).toBe(false);
      expect(requiresDoubleConfirmation(INTENTS.DEPLOY)).toBe(false);
    });
  });

  describe('Intent Type Classification', () => {
    it('should classify all intents into valid types', () => {
      const validTypes = [
        'server_status',
        'service_management',
        'deployment',
        'maintenance',
        'discord_roles',
        'discord_channels',
        'discord_members',
        'discord_settings',
        'unknown'
      ];

      const allQueries = [
        ...SERVER_STATUS_QUERIES,
        ...SERVICE_QUERIES,
        ...DEPLOY_QUERIES,
        ...MAINTENANCE_QUERIES,
        ...ROLE_QUERIES,
        ...CHANNEL_QUERIES,
        ...MEMBER_QUERIES
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...allQueries),
          (query) => {
            const result = parseAdminIntent(query);
            expect(validTypes).toContain(result.type);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
