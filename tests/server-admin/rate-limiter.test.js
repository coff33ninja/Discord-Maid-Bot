/**
 * Rate Limiter Property Tests
 * 
 * Property-based tests for the rate limiter.
 * Uses fast-check for generating random test inputs.
 * 
 * @module tests/server-admin/rate-limiter.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  RATE_LIMIT,
  checkRateLimit,
  recordCommand,
  getRateLimitStatus,
  resetRateLimit,
  clearAllRateLimits,
  getStoreSize
} from '../../plugins/server-admin/rate-limiter.js';

describe('Rate Limiter', () => {
  // Clear rate limits before each test
  beforeEach(() => {
    clearAllRateLimits();
  });

  /**
   * **Feature: ai-server-admin, Property 7: Rate Limit Enforcement**
   * *For any* user who has executed 10 commands within the past hour,
   * the rate limiter SHALL return allowed=false for subsequent requests.
   * **Validates: Requirements 5.4**
   */
  describe('Property 7: Rate Limit Enforcement', () => {
    it('should allow first command for any user', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          (userId) => {
            clearAllRateLimits();
            const result = checkRateLimit(userId);
            
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(RATE_LIMIT.maxCommands);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should block user after exceeding rate limit', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          (userId) => {
            clearAllRateLimits();
            
            // Execute maxCommands commands
            for (let i = 0; i < RATE_LIMIT.maxCommands; i++) {
              recordCommand(userId);
            }
            
            // Next check should be blocked
            const result = checkRateLimit(userId);
            
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track remaining commands correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.integer({ min: 1, max: RATE_LIMIT.maxCommands - 1 }),
          (userId, commandCount) => {
            clearAllRateLimits();
            
            // Execute some commands
            for (let i = 0; i < commandCount; i++) {
              recordCommand(userId);
            }
            
            const result = checkRateLimit(userId);
            
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(RATE_LIMIT.maxCommands - commandCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should isolate rate limits between users', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 15 }),
          fc.string({ minLength: 1, maxLength: 15 }),
          (userId1, userId2) => {
            // Skip if same user
            if (userId1 === userId2) return;
            
            clearAllRateLimits();
            
            // Exhaust rate limit for user1
            for (let i = 0; i < RATE_LIMIT.maxCommands; i++) {
              recordCommand(userId1);
            }
            
            // User2 should still be allowed
            const result1 = checkRateLimit(userId1);
            const result2 = checkRateLimit(userId2);
            
            expect(result1.allowed).toBe(false);
            expect(result2.allowed).toBe(true);
            expect(result2.remaining).toBe(RATE_LIMIT.maxCommands);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide reset time in the future', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          (userId) => {
            clearAllRateLimits();
            recordCommand(userId);
            
            const now = Date.now();
            const result = checkRateLimit(userId);
            
            expect(result.resetTime).toBeGreaterThan(now);
            expect(result.resetTime).toBeLessThanOrEqual(now + RATE_LIMIT.windowMs);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Rate Limit Status', () => {
    it('should return correct status for new users', () => {
      const status = getRateLimitStatus('new-user');
      
      expect(status.count).toBe(0);
      expect(status.remaining).toBe(RATE_LIMIT.maxCommands);
      expect(status.windowStart).toBeNull();
    });

    it('should track command count accurately', () => {
      const userId = 'test-user';
      
      recordCommand(userId);
      recordCommand(userId);
      recordCommand(userId);
      
      const status = getRateLimitStatus(userId);
      
      expect(status.count).toBe(3);
      expect(status.remaining).toBe(RATE_LIMIT.maxCommands - 3);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset rate limit for specific user', () => {
      const userId = 'reset-test-user';
      
      // Use up some rate limit
      for (let i = 0; i < 5; i++) {
        recordCommand(userId);
      }
      
      expect(getRateLimitStatus(userId).count).toBe(5);
      
      // Reset
      resetRateLimit(userId);
      
      expect(getRateLimitStatus(userId).count).toBe(0);
      expect(checkRateLimit(userId).allowed).toBe(true);
    });

    it('should clear all rate limits', () => {
      // Create multiple users with rate limits
      recordCommand('user1');
      recordCommand('user2');
      recordCommand('user3');
      
      expect(getStoreSize()).toBe(3);
      
      clearAllRateLimits();
      
      expect(getStoreSize()).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined user IDs', () => {
      expect(checkRateLimit(null).allowed).toBe(false);
      expect(checkRateLimit(undefined).allowed).toBe(false);
      expect(checkRateLimit('').allowed).toBe(false);
    });

    it('should handle recording with invalid user IDs', () => {
      const result = recordCommand(null);
      expect(result.allowed).toBe(false);
    });

    it('should handle exactly at the limit', () => {
      const userId = 'exact-limit-user';
      
      // Execute exactly maxCommands
      for (let i = 0; i < RATE_LIMIT.maxCommands; i++) {
        const result = recordCommand(userId);
        // Should be allowed up to and including the 10th command
        expect(result.allowed).toBe(true);
      }
      
      // 11th command should be blocked
      const finalCheck = checkRateLimit(userId);
      expect(finalCheck.allowed).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should have correct default rate limit values', () => {
      expect(RATE_LIMIT.maxCommands).toBe(10);
      expect(RATE_LIMIT.windowMs).toBe(3600000); // 1 hour
    });
  });
});
