/**
 * Audit Logger Property Tests
 * 
 * Property-based tests for the audit logger.
 * Uses fast-check for generating random test inputs.
 * 
 * @module tests/server-admin/audit-logger.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  logAudit,
  getAuditHistory,
  getAuditEntry,
  getUserAuditHistory,
  formatAuditEntry
} from '../../plugins/server-admin/audit-logger.js';

describe('Audit Logger', () => {
  /**
   * **Feature: ai-server-admin, Property 5: Audit Log Completeness**
   * *For any* command execution (successful or failed), the audit log entry
   * SHALL contain userId, command, timestamp, and result fields with non-empty values.
   * **Validates: Requirements 4.4, 5.3**
   */
  describe('Property 5: Audit Log Completeness', () => {
    it('should create audit entries with all required fields', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.boolean(),
          (userId, username, command, success) => {
            const entry = logAudit({
              userId,
              username,
              command,
              success
            });
            
            // All required fields must be present
            expect(entry).toHaveProperty('id');
            expect(entry).toHaveProperty('userId');
            expect(entry).toHaveProperty('command');
            expect(entry).toHaveProperty('timestamp');
            expect(entry).toHaveProperty('success');
            
            // Fields should have correct values
            expect(entry.userId).toBe(userId);
            expect(entry.command).toBe(command);
            expect(entry.success).toBe(success);
            expect(entry.timestamp).toBeGreaterThan(0);
            
            // ID should be non-empty
            expect(entry.id).toBeTruthy();
            expect(entry.id.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include timestamp for all entries', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (userId, command) => {
            const before = Date.now();
            const entry = logAudit({ userId, command });
            const after = Date.now();
            
            expect(entry.timestamp).toBeGreaterThanOrEqual(before);
            expect(entry.timestamp).toBeLessThanOrEqual(after);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should record both successful and failed executions', () => {
      const successEntry = logAudit({
        userId: 'user1',
        command: 'df -h',
        success: true,
        output: 'Filesystem...'
      });
      
      const failEntry = logAudit({
        userId: 'user2',
        command: 'invalid command',
        success: false,
        error: 'Command not found'
      });
      
      expect(successEntry.success).toBe(true);
      expect(successEntry.output).toBeTruthy();
      
      expect(failEntry.success).toBe(false);
      expect(failEntry.error).toBeTruthy();
    });

    it('should handle entries with all optional fields', () => {
      const fullEntry = logAudit({
        userId: 'user123',
        username: 'TestUser',
        command: 'systemctl restart bot',
        intent: 'service_restart',
        type: 'command',
        target: null,
        reason: 'Scheduled restart',
        approved: true,
        executed: true,
        success: true,
        output: 'Service restarted',
        error: null,
        duration: 1500,
        platform: 'linux',
        guildId: 'guild123',
        channelId: 'channel456'
      });
      
      expect(fullEntry.userId).toBe('user123');
      expect(fullEntry.username).toBe('TestUser');
      expect(fullEntry.intent).toBe('service_restart');
      expect(fullEntry.duration).toBe(1500);
      expect(fullEntry.platform).toBe('linux');
      expect(fullEntry.guildId).toBe('guild123');
    });

    it('should provide default values for missing fields', () => {
      const minimalEntry = logAudit({
        command: 'test'
      });
      
      expect(minimalEntry.userId).toBe('unknown');
      expect(minimalEntry.username).toBe('unknown');
      expect(minimalEntry.approved).toBe(true);
      expect(minimalEntry.executed).toBe(true);
      expect(minimalEntry.success).toBe(true);
    });
  });

  describe('Audit Retrieval', () => {
    it('should retrieve entries by ID', () => {
      const entry = logAudit({
        userId: 'retrieval-test',
        command: 'test command'
      });
      
      const retrieved = getAuditEntry(entry.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved.id).toBe(entry.id);
      expect(retrieved.userId).toBe('retrieval-test');
    });

    it('should return null for non-existent ID', () => {
      const result = getAuditEntry('non-existent-id-12345');
      expect(result).toBeNull();
    });

    it('should filter by userId', () => {
      // Create entries for different users
      logAudit({ userId: 'filter-user-1', command: 'cmd1' });
      logAudit({ userId: 'filter-user-2', command: 'cmd2' });
      logAudit({ userId: 'filter-user-1', command: 'cmd3' });
      
      const user1Entries = getUserAuditHistory('filter-user-1', 100);
      
      // All returned entries should be for user1
      for (const entry of user1Entries) {
        expect(entry.userId).toBe('filter-user-1');
      }
    });

    it('should respect limit parameter', () => {
      // Create multiple entries
      for (let i = 0; i < 10; i++) {
        logAudit({ userId: 'limit-test', command: `cmd${i}` });
      }
      
      const limited = getAuditHistory({ userId: 'limit-test', limit: 5 });
      
      expect(limited.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Audit Entry Formatting', () => {
    it('should format successful entries with checkmark', () => {
      const entry = {
        timestamp: Date.now(),
        username: 'TestUser',
        command: 'df -h',
        success: true
      };
      
      const formatted = formatAuditEntry(entry);
      
      expect(formatted).toContain('✅');
      expect(formatted).toContain('TestUser');
      expect(formatted).toContain('df -h');
    });

    it('should format failed entries with X', () => {
      const entry = {
        timestamp: Date.now(),
        username: 'TestUser',
        command: 'bad command',
        success: false
      };
      
      const formatted = formatAuditEntry(entry);
      
      expect(formatted).toContain('❌');
    });

    it('should handle null entry', () => {
      const formatted = formatAuditEntry(null);
      expect(formatted).toBe('No entry');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null audit entry', () => {
      const result = logAudit(null);
      expect(result).toBeNull();
    });

    it('should truncate long output', () => {
      const longOutput = 'x'.repeat(1000);
      const entry = logAudit({
        userId: 'truncate-test',
        command: 'test',
        output: longOutput
      });
      
      expect(entry.output.length).toBeLessThan(longOutput.length);
      expect(entry.output).toContain('truncated');
    });

    it('should handle special characters in command', () => {
      const entry = logAudit({
        userId: 'special-char-test',
        command: 'echo "test with $pecial ch@rs & pipes | here"'
      });
      
      expect(entry.command).toContain('$pecial');
      expect(entry.command).toContain('|');
    });
  });
});
