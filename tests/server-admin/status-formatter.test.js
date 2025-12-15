/**
 * Status Formatter Property Tests
 * 
 * Property-based tests for the status formatter.
 * Uses fast-check for generating random test inputs.
 * 
 * @module tests/server-admin/status-formatter.test
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  formatServerStatus,
  formatLogOutput,
  formatDeploymentResult,
  formatDiskSpace,
  formatServiceStatus,
  formatExecutionResult
} from '../../plugins/server-admin/status-formatter.js';

describe('Status Formatter', () => {
  /**
   * **Feature: ai-server-admin, Property 8: Server Status Response Completeness**
   * *For any* server status query, the formatted response SHALL contain
   * CPU usage, memory usage, disk space, and uptime values.
   * **Validates: Requirements 1.2**
   */
  describe('Property 8: Server Status Response Completeness', () => {
    it('should include all required fields in server status', () => {
      // Generate valid status output strings
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          fc.float({ min: 0, max: 100, noNaN: true }),
          fc.integer({ min: 0, max: 100 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (cpu, mem, disk, uptime) => {
            const output = `CPU: ${cpu.toFixed(1)}% | MEM: ${mem.toFixed(1)}% | DISK: ${disk}% | UP: ${uptime}`;
            const result = formatServerStatus(output);
            
            // All fields should be present
            expect(result).toHaveProperty('cpu');
            expect(result).toHaveProperty('memory');
            expect(result).toHaveProperty('disk');
            expect(result).toHaveProperty('uptime');
            expect(result).toHaveProperty('formatted');
            
            // Values should not be N/A when valid input provided
            expect(result.cpu).not.toBe('N/A');
            expect(result.memory).not.toBe('N/A');
            expect(result.disk).not.toBe('N/A');
            expect(result.uptime).not.toBe('N/A');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle missing or malformed input gracefully', () => {
      const result1 = formatServerStatus(null);
      const result2 = formatServerStatus('');
      const result3 = formatServerStatus('random garbage');
      
      // Should still return object with all fields
      for (const result of [result1, result2, result3]) {
        expect(result).toHaveProperty('cpu');
        expect(result).toHaveProperty('memory');
        expect(result).toHaveProperty('disk');
        expect(result).toHaveProperty('uptime');
        expect(result).toHaveProperty('formatted');
      }
    });

    it('should include formatted output suitable for Discord', () => {
      const output = 'CPU: 25.5% | MEM: 60.2% | DISK: 45% | UP: 5 days';
      const result = formatServerStatus(output);
      
      expect(result.formatted).toContain('Server Status');
      expect(result.formatted).toContain('CPU');
      expect(result.formatted).toContain('Memory');
      expect(result.formatted).toContain('Disk');
      expect(result.formatted).toContain('Uptime');
    });
  });

  /**
   * **Feature: ai-server-admin, Property 9: Log Line Count Accuracy**
   * *For any* log view request with N lines specified,
   * the returned output SHALL contain at most N lines.
   * **Validates: Requirements 1.3**
   */
  describe('Property 9: Log Line Count Accuracy', () => {
    it('should limit output to specified number of lines', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 200 }),
          (maxLines, totalLines) => {
            // Generate log output with totalLines lines
            const logLines = Array.from({ length: totalLines }, (_, i) => `Log line ${i + 1}`);
            const output = logLines.join('\n');
            
            const result = formatLogOutput(output, maxLines);
            
            // Should have at most maxLines lines
            expect(result.lineCount).toBeLessThanOrEqual(maxLines);
            expect(result.lines.length).toBeLessThanOrEqual(maxLines);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should indicate when output is truncated', () => {
      const logLines = Array.from({ length: 100 }, (_, i) => `Log line ${i + 1}`);
      const output = logLines.join('\n');
      
      const result = formatLogOutput(output, 50);
      
      expect(result.truncated).toBe(true);
      expect(result.lineCount).toBe(50);
      expect(result.totalLines).toBe(100);
    });

    it('should not truncate when lines are within limit', () => {
      const logLines = Array.from({ length: 20 }, (_, i) => `Log line ${i + 1}`);
      const output = logLines.join('\n');
      
      const result = formatLogOutput(output, 50);
      
      expect(result.truncated).toBe(false);
      expect(result.lineCount).toBe(20);
    });

    it('should handle empty log output', () => {
      const result = formatLogOutput('', 50);
      
      expect(result.lineCount).toBe(0);
      expect(result.lines).toEqual([]);
      expect(result.truncated).toBe(false);
    });

    it('should handle null log output', () => {
      const result = formatLogOutput(null, 50);
      
      expect(result.lineCount).toBe(0);
      expect(result.formatted).toContain('No log output');
    });
  });

  describe('Deployment Result Formatting', () => {
    it('should detect successful deployment', () => {
      const output = `Updating abc1234..def5678
Fast-forward
 src/index.js | 5 +++++
 1 file changed, 5 insertions(+)`;
      
      const result = formatDeploymentResult(output);
      
      expect(result.success).toBe(true);
      expect(result.commitHash).toBe('def5678');
    });

    it('should detect already up to date', () => {
      const output = 'Already up to date.';
      const result = formatDeploymentResult(output);
      
      expect(result.success).toBe(true);
      expect(result.alreadyUpToDate).toBe(true);
    });

    it('should detect deployment failure', () => {
      const output = 'error: Your local changes would be overwritten';
      const result = formatDeploymentResult(output);
      
      expect(result.success).toBe(false);
    });

    it('should handle null output', () => {
      const result = formatDeploymentResult(null);
      
      expect(result.success).toBe(false);
      expect(result.formatted).toContain('unavailable');
    });
  });

  describe('Disk Space Formatting', () => {
    it('should parse Linux df output', () => {
      const output = `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       100G   45G   55G  45% /
/dev/sdb1       500G  200G  300G  40% /data`;
      
      const result = formatDiskSpace(output, 'linux');
      
      expect(result.drives.length).toBe(2);
      expect(result.drives[0].mountPoint).toBe('/');
      expect(result.drives[0].usePercent).toBe('45%');
    });

    it('should handle empty disk output', () => {
      const result = formatDiskSpace('', 'linux');
      
      expect(result.drives).toEqual([]);
      // Empty input returns error message
      expect(result.formatted).toContain('Unable to get disk');
    });
  });

  describe('Service Status Formatting', () => {
    it('should detect running service', () => {
      const outputs = [
        'Active: active (running)',
        'Status: Running',
        'service is running'
      ];
      
      for (const output of outputs) {
        const result = formatServiceStatus(output, 'test-service');
        expect(result.running).toBe(true);
        expect(result.status).toBe('running');
      }
    });

    it('should detect stopped service', () => {
      const outputs = [
        'Active: inactive (dead)',
        'Status: Stopped',
        'service is stopped'
      ];
      
      for (const output of outputs) {
        const result = formatServiceStatus(output, 'test-service');
        expect(result.running).toBe(false);
      }
    });

    it('should detect failed service', () => {
      const output = 'Active: failed';
      const result = formatServiceStatus(output, 'test-service');
      
      expect(result.running).toBe(false);
      expect(result.status).toBe('failed');
    });
  });

  describe('Execution Result Formatting', () => {
    it('should format successful execution', () => {
      const result = {
        success: true,
        output: 'Command completed',
        duration: 150
      };
      
      const formatted = formatExecutionResult(result, 'Test Command');
      
      expect(formatted).toContain('✅');
      expect(formatted).toContain('Test Command');
      expect(formatted).toContain('successfully');
      expect(formatted).toContain('150ms');
    });

    it('should format failed execution', () => {
      const result = {
        success: false,
        error: 'Permission denied',
        exitCode: 1
      };
      
      const formatted = formatExecutionResult(result, 'Test Command');
      
      expect(formatted).toContain('❌');
      expect(formatted).toContain('failed');
      expect(formatted).toContain('Permission denied');
      expect(formatted).toContain('Exit code: 1');
    });

    it('should handle null result', () => {
      const formatted = formatExecutionResult(null);
      expect(formatted).toContain('No execution result');
    });

    it('should truncate long output', () => {
      const longOutput = 'x'.repeat(2000);
      const result = {
        success: true,
        output: longOutput
      };
      
      const formatted = formatExecutionResult(result);
      
      expect(formatted.length).toBeLessThan(longOutput.length);
      expect(formatted).toContain('truncated');
    });
  });
});
