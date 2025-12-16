# rate-limiter.js

**Path:** `plugins\server-admin\rate-limiter.js`

## Description
* Rate Limiter for Server Admin

## Dependencies
- `../../src/logging/logger.js` → createLogger (L10)

## Exports
- **RATE_LIMIT** [const] (L17) - Rate limit configuration
- **checkRateLimit** [function] (L33) - Check if a user is rate limited
- **recordCommand** [function] (L91) - Record a command execution for rate limiting
- **getRateLimitStatus** [function] (L134) - Get current rate limit status for a user
- **resetRateLimit** [function] (L168) - Reset rate limit for a user (admin function)
- **clearAllRateLimits** [function] (L178) - Clear all rate limits (admin function)
- **getStoreSize** [function] (L212) - Get the internal store size (for testing)

## Functions
- ✓ `checkRateLimit(userId)` (L33) - Check if a user is rate limited
- ✓ `recordCommand(userId)` (L91) - Record a command execution for rate limiting
- ✓ `getRateLimitStatus(userId)` (L134) - Get current rate limit status for a user
- ✓ `resetRateLimit(userId)` (L168) - Reset rate limit for a user (admin function)
- ✓ `clearAllRateLimits()` (L178) - Clear all rate limits (admin function)
- `formatTimeRemaining(ms)` (L188) - Format time remaining in human-readable format
- ✓ `getStoreSize()` (L212) - Get the internal store size (for testing)

## Constants
- ✓ **RATE_LIMIT** [object] (L17) - Rate limit configuration
- **rateLimitStore** [value] (L26) - In-memory store for rate limit tracking

