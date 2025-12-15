/**
 * Rate Limiter for Server Admin
 * 
 * Tracks command execution per user and enforces rate limits
 * to prevent abuse of server admin commands.
 * 
 * @module plugins/server-admin/rate-limiter
 */

import { createLogger } from '../../src/logging/logger.js';

const logger = createLogger('server-admin:rate-limiter');

/**
 * Rate limit configuration
 */
export const RATE_LIMIT = {
  maxCommands: 10,      // Maximum commands per window
  windowMs: 3600000     // 1 hour in milliseconds
};

/**
 * In-memory store for rate limit tracking
 * Map<userId, { count: number, windowStart: number }>
 */
const rateLimitStore = new Map();

/**
 * Check if a user is rate limited
 * @param {string} userId - User ID to check
 * @returns {Object} Rate limit status
 */
export function checkRateLimit(userId) {
  if (!userId || typeof userId !== 'string') {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + RATE_LIMIT.windowMs,
      reason: 'Invalid user ID'
    };
  }

  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  // No existing record - user is allowed
  if (!userLimit) {
    return {
      allowed: true,
      remaining: RATE_LIMIT.maxCommands,
      resetTime: now + RATE_LIMIT.windowMs
    };
  }

  // Check if window has expired
  if (now - userLimit.windowStart >= RATE_LIMIT.windowMs) {
    // Window expired, reset
    return {
      allowed: true,
      remaining: RATE_LIMIT.maxCommands,
      resetTime: now + RATE_LIMIT.windowMs
    };
  }

  // Window still active, check count
  const remaining = RATE_LIMIT.maxCommands - userLimit.count;
  const resetTime = userLimit.windowStart + RATE_LIMIT.windowMs;

  if (remaining <= 0) {
    logger.warn(`User ${userId} is rate limited. Reset at ${new Date(resetTime).toISOString()}`);
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      reason: `Rate limit exceeded. Try again after ${formatTimeRemaining(resetTime - now)}`
    };
  }

  return {
    allowed: true,
    remaining,
    resetTime
  };
}

/**
 * Record a command execution for rate limiting
 * @param {string} userId - User ID executing the command
 * @returns {Object} Updated rate limit status
 */
export function recordCommand(userId) {
  if (!userId || typeof userId !== 'string') {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + RATE_LIMIT.windowMs,
      reason: 'Invalid user ID'
    };
  }

  const now = Date.now();
  let userLimit = rateLimitStore.get(userId);

  // Initialize or reset if window expired
  if (!userLimit || now - userLimit.windowStart >= RATE_LIMIT.windowMs) {
    userLimit = {
      count: 0,
      windowStart: now
    };
  }

  // Increment count
  userLimit.count++;
  rateLimitStore.set(userId, userLimit);

  const remaining = Math.max(0, RATE_LIMIT.maxCommands - userLimit.count);
  const resetTime = userLimit.windowStart + RATE_LIMIT.windowMs;

  logger.debug(`User ${userId} command recorded. ${remaining} commands remaining.`);

  return {
    allowed: remaining > 0 || userLimit.count <= RATE_LIMIT.maxCommands,
    remaining,
    resetTime,
    count: userLimit.count
  };
}

/**
 * Get current rate limit status for a user
 * @param {string} userId - User ID to check
 * @returns {Object} Current rate limit info
 */
export function getRateLimitStatus(userId) {
  if (!userId || typeof userId !== 'string') {
    return {
      count: 0,
      remaining: RATE_LIMIT.maxCommands,
      resetTime: Date.now() + RATE_LIMIT.windowMs,
      windowStart: null
    };
  }

  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now - userLimit.windowStart >= RATE_LIMIT.windowMs) {
    return {
      count: 0,
      remaining: RATE_LIMIT.maxCommands,
      resetTime: now + RATE_LIMIT.windowMs,
      windowStart: null
    };
  }

  return {
    count: userLimit.count,
    remaining: Math.max(0, RATE_LIMIT.maxCommands - userLimit.count),
    resetTime: userLimit.windowStart + RATE_LIMIT.windowMs,
    windowStart: userLimit.windowStart
  };
}

/**
 * Reset rate limit for a user (admin function)
 * @param {string} userId - User ID to reset
 */
export function resetRateLimit(userId) {
  if (userId) {
    rateLimitStore.delete(userId);
    logger.info(`Rate limit reset for user ${userId}`);
  }
}

/**
 * Clear all rate limits (admin function)
 */
export function clearAllRateLimits() {
  rateLimitStore.clear();
  logger.info('All rate limits cleared');
}

/**
 * Format time remaining in human-readable format
 * @param {number} ms - Milliseconds remaining
 * @returns {string} Formatted time string
 */
function formatTimeRemaining(ms) {
  if (ms <= 0) return '0 seconds';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours} hour${hours > 1 ? 's' : ''}${remainingMinutes > 0 ? ` ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}` : ''}`;
  }
  
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes} minute${minutes > 1 ? 's' : ''}${remainingSeconds > 0 ? ` ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}` : ''}`;
  }
  
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

/**
 * Get the internal store size (for testing)
 * @returns {number} Number of users being tracked
 */
export function getStoreSize() {
  return rateLimitStore.size;
}

export default {
  RATE_LIMIT,
  checkRateLimit,
  recordCommand,
  getRateLimitStatus,
  resetRateLimit,
  clearAllRateLimits,
  getStoreSize
};
