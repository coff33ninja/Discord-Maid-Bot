/**
 * Approval Manager Property Tests
 * 
 * Property-based tests for the approval manager.
 * Uses fast-check for generating random test inputs.
 * 
 * @module tests/server-admin/approval-manager.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  APPROVAL_TIMEOUT,
  createApprovalRequest,
  requiresConfirmation,
  requiresDoubleConfirmation,
  storePendingApproval,
  getPendingApproval,
  resolvePendingApproval,
  getPendingCount,
  clearPendingApprovals
} from '../../plugins/server-admin/approval-manager.js';

// Commands that require confirmation
const CONFIRMATION_COMMANDS = [
  { command: 'systemctl restart discord-maid-bot', requiresConfirmation: true, description: 'Restart bot service' },
  { command: 'systemctl stop discord-maid-bot', requiresConfirmation: true, description: 'Stop bot service' },
  { command: 'shutdown -r +5', requiresConfirmation: true, causesDowntime: true, description: 'Reboot server' },
  { command: 'apt upgrade -y', requiresConfirmation: true, description: 'Upgrade packages' },
  { command: 'git pull && npm install', requiresConfirmation: true, description: 'Deploy code' }
];

// Commands that require double confirmation
const DOUBLE_CONFIRMATION_COMMANDS = [
  { command: 'shutdown -r +2', requiresConfirmation: true, requiresDoubleConfirmation: true, causesDowntime: true, description: 'Reboot server' }
];

// Read-only commands that don't require confirmation
const READ_ONLY_COMMANDS = [
  { command: 'systemctl status discord-maid-bot', requiresConfirmation: false, description: 'Check status' },
  { command: 'df -h', requiresConfirmation: false, description: 'Check disk space' },
  { command: 'free -m', requiresConfirmation: false, description: 'Check memory' },
  { command: 'uptime', requiresConfirmation: false, description: 'Check uptime' }
];

describe('Approval Manager', () => {
  beforeEach(() => {
    clearPendingApprovals();
  });

  /**
   * **Feature: ai-server-admin, Property 4: Confirmation Requirement for Dangerous Operations**
   * *For any* command that causes service interruption (stop, restart, reboot, deploy),
   * the system SHALL set requiresConfirmation=true and display a preview before execution.
   * **Validates: Requirements 2.2, 2.3, 4.3, 6.1, 6.2**
   */
  describe('Property 4: Confirmation Requirement for Dangerous Operations', () => {
    it('should require confirmation for dangerous commands', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...CONFIRMATION_COMMANDS),
          (command) => {
            expect(requiresConfirmation(command)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not require confirmation for read-only commands', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...READ_ONLY_COMMANDS),
          (command) => {
            expect(requiresConfirmation(command)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should require double confirmation for critical operations', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DOUBLE_CONFIRMATION_COMMANDS),
          (command) => {
            expect(requiresDoubleConfirmation(command)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create approval request with command preview', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...CONFIRMATION_COMMANDS),
          (command) => {
            const request = createApprovalRequest(command);
            
            // Should have embeds
            expect(request.embeds).toBeDefined();
            expect(request.embeds.length).toBeGreaterThan(0);
            
            // Should have components (buttons)
            expect(request.components).toBeDefined();
            expect(request.components.length).toBeGreaterThan(0);
            
            // Embed should contain the command
            const embed = request.embeds[0];
            expect(embed.fields).toBeDefined();
            
            const commandField = embed.fields.find(f => f.name === 'Command');
            expect(commandField).toBeDefined();
            expect(commandField.value).toContain(command.command);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include warning for downtime-causing commands', () => {
      const downtimeCommands = CONFIRMATION_COMMANDS.filter(c => c.causesDowntime);
      
      for (const command of downtimeCommands) {
        const request = createApprovalRequest(command);
        const embed = request.embeds[0];
        
        const warningField = embed.fields.find(f => f.name.includes('Warning'));
        expect(warningField).toBeDefined();
      }
    });

    it('should include critical warning for double confirmation commands', () => {
      for (const command of DOUBLE_CONFIRMATION_COMMANDS) {
        const request = createApprovalRequest(command);
        const embed = request.embeds[0];
        
        const criticalField = embed.fields.find(f => f.name.includes('Critical'));
        expect(criticalField).toBeDefined();
      }
    });
  });

  describe('Approval Request Creation', () => {
    it('should throw error for invalid command', () => {
      expect(() => createApprovalRequest(null)).toThrow();
      expect(() => createApprovalRequest({})).toThrow();
      expect(() => createApprovalRequest({ description: 'no command' })).toThrow();
    });

    it('should include description when provided', () => {
      const command = {
        command: 'test command',
        description: 'Test description'
      };
      
      const request = createApprovalRequest(command);
      const embed = request.embeds[0];
      
      const descField = embed.fields.find(f => f.name === 'Description');
      expect(descField).toBeDefined();
      expect(descField.value).toBe('Test description');
    });

    it('should have correct timeout in footer', () => {
      const command = { command: 'test' };
      const request = createApprovalRequest(command);
      const embed = request.embeds[0];
      
      expect(embed.footer.text).toContain(`${APPROVAL_TIMEOUT / 1000}`);
    });
  });

  describe('Pending Approvals Management', () => {
    it('should store and retrieve pending approvals', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 20 }),
          fc.string({ minLength: 5, maxLength: 50 }),
          fc.string({ minLength: 10, maxLength: 20 }),
          (messageId, command, userId) => {
            clearPendingApprovals();
            
            storePendingApproval(messageId, { command, userId });
            
            const retrieved = getPendingApproval(messageId);
            expect(retrieved).not.toBeNull();
            expect(retrieved.command).toBe(command);
            expect(retrieved.userId).toBe(userId);
            expect(retrieved.resolved).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for non-existent approvals', () => {
      const result = getPendingApproval('non-existent-id');
      expect(result).toBeNull();
    });

    it('should resolve pending approvals', () => {
      const messageId = 'test-message-123';
      storePendingApproval(messageId, { command: 'test', userId: 'user123' });
      
      resolvePendingApproval(messageId, 'approved');
      
      const approval = getPendingApproval(messageId);
      expect(approval.resolved).toBe(true);
      expect(approval.resolution).toBe('approved');
      expect(approval.resolvedAt).toBeDefined();
    });

    it('should track pending count correctly', () => {
      clearPendingApprovals();
      
      expect(getPendingCount()).toBe(0);
      
      storePendingApproval('msg1', { command: 'cmd1', userId: 'user1' });
      expect(getPendingCount()).toBe(1);
      
      storePendingApproval('msg2', { command: 'cmd2', userId: 'user2' });
      expect(getPendingCount()).toBe(2);
      
      clearPendingApprovals();
      expect(getPendingCount()).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should have correct timeout value', () => {
      expect(APPROVAL_TIMEOUT).toBe(60000); // 60 seconds
    });
  });

  describe('Edge Cases', () => {
    it('should handle commands with special characters', () => {
      const command = {
        command: 'echo "test with $pecial ch@rs & pipes | here"',
        description: 'Test special chars'
      };
      
      const request = createApprovalRequest(command);
      expect(request.embeds[0].fields[0].value).toContain(command.command);
    });

    it('should handle very long commands', () => {
      const longCommand = 'a'.repeat(500);
      const command = {
        command: longCommand,
        description: 'Long command test'
      };
      
      const request = createApprovalRequest(command);
      expect(request.embeds[0].fields[0].value).toContain(longCommand);
    });
  });
});
