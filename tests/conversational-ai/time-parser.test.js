/**
 * Time Parser Property Tests
 * 
 * Property-based tests for the time parser utility.
 * Uses fast-check for generating random test inputs.
 * 
 * @module tests/conversational-ai/time-parser.test
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  TimeType,
  parseDuration,
  parseClockTime,
  parseTimeExpression,
  extractTimeFromSentence,
  formatDuration
} from '../../plugins/conversational-ai/utils/time-parser.js';

describe('Time Parser', () => {
  /**
   * **Feature: ai-plugin-enhancements, Property 1: Time Expression Parsing Consistency**
   * *For any* valid time expression (duration like "5m", "2h", "1d" or clock time like "15:00", "3pm"),
   * parsing the expression SHALL produce a future timestamp within the expected range.
   * **Validates: Requirements 1.1, 1.2**
   */
  describe('Property 1: Time Expression Parsing Consistency', () => {
    it('should parse duration expressions to future timestamps', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.constantFrom('m', 'h', 'd'),
          (value, unit) => {
            const input = `${value}${unit}`;
            const result = parseTimeExpression(input);
            
            expect(result.type).toBe(TimeType.DURATION);
            expect(result.triggerTime).toBeGreaterThan(Date.now());
            
            // Verify the duration is within expected range
            const expectedMs = unit === 'm' ? value * 60000 :
                              unit === 'h' ? value * 3600000 :
                              value * 86400000;
            expect(result.durationMs).toBe(expectedMs);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse "in X" duration expressions to future timestamps', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 60 }),
          fc.constantFrom('minutes', 'hours', 'days'),
          (value, unit) => {
            const input = `in ${value} ${unit}`;
            const result = parseTimeExpression(input);
            
            expect(result.type).toBe(TimeType.DURATION);
            expect(result.triggerTime).toBeGreaterThan(Date.now());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse clock time expressions to valid future timestamps', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 12 }),
          fc.constantFrom('am', 'pm'),
          (hour, period) => {
            const input = `at ${hour}${period}`;
            const result = parseTimeExpression(input);
            
            expect(result.type).toBe(TimeType.CLOCK);
            expect(result.triggerTime).toBeGreaterThan(Date.now());
            
            // Verify it's within 24 hours
            const maxTime = Date.now() + 24 * 60 * 60 * 1000;
            expect(result.triggerTime).toBeLessThanOrEqual(maxTime);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse 24-hour clock times correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 59 }),
          (hour, minute) => {
            const input = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const result = parseTimeExpression(input);
            
            expect(result.type).toBe(TimeType.CLOCK);
            expect(result.triggerTime).toBeGreaterThan(Date.now());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-plugin-enhancements, Property 2: Recurring Interval Parsing**
   * *For any* valid interval expression (e.g., "every 30m", "every 2h", "every day"),
   * parsing SHALL produce a valid interval string that the reminder system accepts.
   * **Validates: Requirements 1.3**
   */
  describe('Property 2: Recurring Interval Parsing', () => {
    it('should parse "every X" expressions as recurring type', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 60 }),
          fc.constantFrom('m', 'h', 'd'),
          (value, unit) => {
            const input = `every ${value}${unit}`;
            const result = parseTimeExpression(input);
            
            expect(result.type).toBe(TimeType.RECURRING);
            expect(result.interval).toBeDefined();
            expect(result.intervalMs).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse word intervals correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('minute', 'hour', 'day', 'week'),
          (unit) => {
            const input = `every ${unit}`;
            const result = parseTimeExpression(input);
            
            expect(result.type).toBe(TimeType.RECURRING);
            expect(result.intervalMs).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce consistent interval milliseconds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.constantFrom('m', 'h', 'd'),
          (value, unit) => {
            const input = `every ${value}${unit}`;
            const result = parseTimeExpression(input);
            
            const expectedMs = unit === 'm' ? value * 60000 :
                              unit === 'h' ? value * 3600000 :
                              value * 86400000;
            
            expect(result.intervalMs).toBe(expectedMs);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Duration Parsing', () => {
    it('should return null for invalid inputs', () => {
      expect(parseDuration(null)).toBeNull();
      expect(parseDuration('')).toBeNull();
      expect(parseDuration('invalid')).toBeNull();
      expect(parseDuration('abc')).toBeNull();
    });

    it('should parse various duration formats', () => {
      expect(parseDuration('5m')).toBe(5 * 60 * 1000);
      expect(parseDuration('2h')).toBe(2 * 60 * 60 * 1000);
      expect(parseDuration('1d')).toBe(24 * 60 * 60 * 1000);
      expect(parseDuration('30s')).toBe(30 * 1000);
      expect(parseDuration('1w')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should handle word formats', () => {
      expect(parseDuration('5 minutes')).toBe(5 * 60 * 1000);
      expect(parseDuration('2 hours')).toBe(2 * 60 * 60 * 1000);
      expect(parseDuration('1 day')).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('Clock Time Parsing', () => {
    it('should return null for invalid inputs', () => {
      expect(parseClockTime(null)).toBeNull();
      expect(parseClockTime('')).toBeNull();
      expect(parseClockTime('invalid')).toBeNull();
      expect(parseClockTime('25:00')).toBeNull();
      expect(parseClockTime('13pm')).toBeNull();
    });

    it('should parse special times', () => {
      const noon = parseClockTime('noon');
      expect(noon).not.toBeNull();
      expect(noon.getHours()).toBe(12);
      
      const midnight = parseClockTime('midnight');
      expect(midnight).not.toBeNull();
      expect(midnight.getHours()).toBe(0);
    });
  });

  describe('Sentence Extraction', () => {
    it('should extract time and message from reminder sentences', () => {
      const result1 = extractTimeFromSentence('remind me in 5 minutes to check the server');
      expect(result1.time).not.toBeNull();
      expect(result1.time.type).toBe(TimeType.DURATION);
      expect(result1.message).toBe('check the server');

      const result2 = extractTimeFromSentence('remind me at 3pm to call mom');
      expect(result2.time).not.toBeNull();
      expect(result2.time.type).toBe(TimeType.CLOCK);
      expect(result2.message).toBe('call mom');

      const result3 = extractTimeFromSentence('remind me every hour to drink water');
      expect(result3.time).not.toBeNull();
      expect(result3.time.type).toBe(TimeType.RECURRING);
      expect(result3.message).toBe('drink water');
    });

    it('should return null for non-reminder sentences', () => {
      const result = extractTimeFromSentence('hello world');
      expect(result.time).toBeNull();
      expect(result.message).toBeNull();
    });
  });

  describe('Format Duration', () => {
    it('should format durations human-readably', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(5000)).toBe('5 seconds');
      expect(formatDuration(300000)).toBe('5 minutes');
      expect(formatDuration(7200000)).toBe('2 hours');
      expect(formatDuration(172800000)).toBe('2 days');
    });
  });
});
