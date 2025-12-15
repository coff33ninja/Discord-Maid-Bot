/**
 * Time Parser Utility
 * 
 * Parses natural language time expressions into structured data.
 * Supports durations, clock times, and recurring intervals.
 * 
 * @module plugins/conversational-ai/utils/time-parser
 */

/**
 * Time expression types
 */
export const TimeType = {
  DURATION: 'duration',      // "in 5 minutes", "5m"
  CLOCK: 'clock',            // "at 3pm", "15:00"
  RECURRING: 'recurring',    // "every hour", "every 30m"
  INVALID: 'invalid'
};

/**
 * Parse a duration string into milliseconds
 * @param {string} str - Duration string like "5m", "2h", "1d"
 * @returns {number|null} Milliseconds or null if invalid
 */
export function parseDuration(str) {
  if (!str) return null;
  
  const clean = str.toLowerCase().trim();
  
  // Match patterns like "5m", "2h", "1d", "30s"
  const match = clean.match(/^(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes|h|hr|hour|hours|d|day|days|w|week|weeks)s?$/);
  
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2].charAt(0);
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    }
  }
  
  return null;
}

/**
 * Parse a clock time string into a Date
 * @param {string} str - Clock time like "15:00", "3pm", "3:30pm"
 * @returns {Date|null} Date object or null if invalid
 */
export function parseClockTime(str) {
  if (!str) return null;
  
  const clean = str.toLowerCase().trim();
  const now = new Date();
  
  // Match 24-hour format: "15:00", "9:30"
  let match = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      const target = new Date(now);
      target.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      return target;
    }
  }
  
  // Match 12-hour format: "3pm", "3:30pm", "3 pm", "3:30 am"
  match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3];
    
    if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
      // Convert to 24-hour
      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      
      const target = new Date(now);
      target.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      return target;
    }
  }
  
  // Match special times: "noon", "midnight"
  if (clean === 'noon') {
    const target = new Date(now);
    target.setHours(12, 0, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }
  
  if (clean === 'midnight') {
    const target = new Date(now);
    target.setHours(0, 0, 0, 0);
    target.setDate(target.getDate() + 1); // Always tomorrow's midnight
    return target;
  }
  
  return null;
}

/**
 * Parse a natural language time expression
 * @param {string} input - Natural language input
 * @returns {Object} Parsed result with type, value, and metadata
 */
export function parseTimeExpression(input) {
  if (!input || typeof input !== 'string') {
    return { type: TimeType.INVALID, error: 'Empty or invalid input' };
  }
  
  const clean = input.toLowerCase().trim();
  
  // Check for recurring patterns first: "every X"
  const recurringMatch = clean.match(/^every\s+(.+)$/);
  if (recurringMatch) {
    const intervalStr = recurringMatch[1];
    
    // Handle "every day", "every hour", etc.
    const wordIntervals = {
      'second': '1s',
      'minute': '1m',
      'hour': '1h',
      'day': '1d',
      'week': '1w'
    };
    
    const wordMatch = intervalStr.match(/^(second|minute|hour|day|week)s?$/);
    if (wordMatch) {
      const interval = wordIntervals[wordMatch[1]];
      const ms = parseDuration(interval);
      return {
        type: TimeType.RECURRING,
        interval,
        intervalMs: ms,
        original: input
      };
    }
    
    // Handle "every 30m", "every 2 hours"
    const ms = parseDuration(intervalStr);
    if (ms) {
      return {
        type: TimeType.RECURRING,
        interval: intervalStr,
        intervalMs: ms,
        original: input
      };
    }
  }
  
  // Check for "in X" duration patterns
  const inMatch = clean.match(/^in\s+(\d+)\s*(seconds?|minutes?|hours?|days?|weeks?)$/);
  if (inMatch) {
    const value = inMatch[1];
    const unit = inMatch[2].charAt(0);
    const durationStr = `${value}${unit}`;
    const ms = parseDuration(durationStr);
    
    if (ms) {
      return {
        type: TimeType.DURATION,
        durationMs: ms,
        triggerTime: Date.now() + ms,
        original: input
      };
    }
  }
  
  // Check for "at X" clock time patterns
  const atMatch = clean.match(/^at\s+(.+)$/);
  if (atMatch) {
    const clockTime = parseClockTime(atMatch[1]);
    if (clockTime) {
      return {
        type: TimeType.CLOCK,
        triggerTime: clockTime.getTime(),
        clockTime: atMatch[1],
        original: input
      };
    }
  }
  
  // Try direct duration parsing: "5m", "2h"
  const directDuration = parseDuration(clean);
  if (directDuration) {
    return {
      type: TimeType.DURATION,
      durationMs: directDuration,
      triggerTime: Date.now() + directDuration,
      original: input
    };
  }
  
  // Try direct clock time parsing: "15:00", "3pm"
  const directClock = parseClockTime(clean);
  if (directClock) {
    return {
      type: TimeType.CLOCK,
      triggerTime: directClock.getTime(),
      clockTime: clean,
      original: input
    };
  }
  
  return { type: TimeType.INVALID, error: 'Could not parse time expression', original: input };
}

/**
 * Extract time expression from a natural language sentence
 * @param {string} sentence - Full sentence like "remind me in 5 minutes to check the server"
 * @returns {Object} Extracted time and remaining message
 */
export function extractTimeFromSentence(sentence) {
  if (!sentence) return { time: null, message: null };
  
  const clean = sentence.toLowerCase().trim();
  
  // Patterns to extract time expressions
  const patterns = [
    // "remind me in X to Y" or "remind me in X Y"
    /remind\s+me\s+(in\s+\d+\s*(?:seconds?|minutes?|hours?|days?|weeks?))\s+(?:to\s+)?(.+)/i,
    // "remind me at X to Y"
    /remind\s+me\s+(at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+(?:to\s+)?(.+)/i,
    // "remind me every X to Y"
    /remind\s+me\s+(every\s+(?:\d+\s*)?(?:seconds?|minutes?|hours?|days?|weeks?))\s+(?:to\s+)?(.+)/i,
    // "set reminder for X: Y" or "set reminder in X: Y"
    /set\s+(?:a\s+)?reminder\s+(?:for|in)\s+(\d+\s*(?:m|h|d|min|hour|day)\w*)\s*[:\s]+(.+)/i,
    // "in X remind me to Y"
    /(in\s+\d+\s*(?:seconds?|minutes?|hours?|days?|weeks?))\s+remind\s+me\s+(?:to\s+)?(.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = sentence.match(pattern);
    if (match) {
      const timeStr = match[1].trim();
      const message = match[2].trim();
      const parsed = parseTimeExpression(timeStr);
      
      if (parsed.type !== TimeType.INVALID) {
        return { time: parsed, message };
      }
    }
  }
  
  return { time: null, message: null };
}

/**
 * Format a duration in milliseconds to human-readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Human-readable duration
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)} seconds`;
  if (ms < 3600000) return `${Math.round(ms / 60000)} minutes`;
  if (ms < 86400000) return `${Math.round(ms / 3600000)} hours`;
  return `${Math.round(ms / 86400000)} days`;
}

export default {
  TimeType,
  parseDuration,
  parseClockTime,
  parseTimeExpression,
  extractTimeFromSentence,
  formatDuration
};
