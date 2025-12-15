/**
 * Configuration System Tests
 * 
 * Property-based tests for the Configuration System.
 * Tests Property 13: Mention Requirement Enforcement
 * 
 * @module plugins/conversational-ai/config.test
 */

import fc from 'fast-check';
import { loadConfig, getDefaults, validateConfig } from './config.js';
import { MessageRouter } from './router/message-router.js';

// Test configuration
const TEST_ITERATIONS = 50;

console.log('🧪 Running Configuration System Property Tests...\n');

let passed = 0;
let failed = 0;

/**
 * **Feature: conversational-ai-core, Property 13: Mention Requirement Enforcement**
 * *For any* message in a guild channel when mention_required is true, the bot 
 * SHALL only respond if the message contains a bot mention.
 * **Validates: Requirements 8.5**
 */
console.log('Property 13: Mention Requirement Enforcement - When Enabled');
try {
  fc.assert(
    fc.property(
      // Generate alphanumeric content to avoid whitespace-only strings
      fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{4,100}$/),
      fc.stringMatching(/^[a-zA-Z0-9]{5,20}$/), // bot ID
      (content, botId) => {
        // Create router with mention required
        const router = new MessageRouter({
          prefixEnabled: false,
          passiveEnabled: false,
          mentionRequired: true
        });
        router.setBotId(botId);
        
        // Create mock message without mention (guild channel, not DM)
        const message = {
          content: content,
          author: { bot: false, id: 'user123' },
          channel: { type: 0 }, // GUILD_TEXT = 0, not DM
          mentions: { users: { has: () => false } }
        };
        
        const classification = router.classify(message);
        
        // Natural language without mention should be ignored in guild when mention required
        return classification.type === 'ignore';
      }
    ),
    { numRuns: TEST_ITERATIONS }
  );
  console.log('  ✅ PASSED\n');
  passed++;
} catch (error) {
  console.log('  ❌ FAILED:', error.message, '\n');
  failed++;
}

console.log('Property 13: Mention Requirement Enforcement - When Disabled');
try {
  fc.assert(
    fc.property(
      // Generate alphanumeric content to avoid whitespace-only strings
      fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{4,100}$/),
      fc.stringMatching(/^[a-zA-Z0-9]{5,20}$/), // bot ID
      (content, botId) => {
        // Create router with mention NOT required
        const router = new MessageRouter({
          prefixEnabled: false,
          passiveEnabled: false,
          mentionRequired: false
        });
        router.setBotId(botId);
        
        // Create mock message without mention (guild channel)
        const message = {
          content: content,
          author: { bot: false, id: 'user123' },
          channel: { type: 0 }, // GUILD_TEXT = 0
          mentions: { users: { has: () => false } }
        };
        
        const classification = router.classify(message);
        
        // Should be classified as natural language (not ignored)
        // when mention is not required
        return classification.type === 'natural';
      }
    ),
    { numRuns: TEST_ITERATIONS }
  );
  console.log('  ✅ PASSED\n');
  passed++;
} catch (error) {
  console.log('  ❌ FAILED:', error.message, '\n');
  failed++;
}

console.log('Property 13: Mention Requirement - DMs Always Respond');
try {
  fc.assert(
    fc.property(
      // Generate alphanumeric content to avoid whitespace-only strings
      fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{4,100}$/),
      fc.stringMatching(/^[a-zA-Z0-9]{5,20}$/), // bot ID
      (content, botId) => {
        // Create router with mention required
        const router = new MessageRouter({
          prefixEnabled: false,
          passiveEnabled: false,
          mentionRequired: true
        });
        router.setBotId(botId);
        
        // Create mock DM message (channel type 1 = DM)
        const message = {
          content: content,
          author: { bot: false, id: 'user123' },
          channel: { type: 1 }, // DM channel type
          mentions: { users: { has: () => false } }
        };
        
        const classification = router.classify(message);
        
        // DMs should always be classified as natural language
        // regardless of mention requirement
        return classification.type === 'natural';
      }
    ),
    { numRuns: TEST_ITERATIONS }
  );
  console.log('  ✅ PASSED\n');
  passed++;
} catch (error) {
  console.log('  ❌ FAILED:', error.message, '\n');
  failed++;
}

/**
 * Property: Configuration Validation
 */
console.log('Property: Configuration Validation');
try {
  fc.assert(
    fc.property(
      fc.record({
        SHORT_TERM_MAX_TOKENS: fc.integer({ min: -1000, max: 20000 }),
        SHORT_TERM_MAX_MESSAGES: fc.integer({ min: -100, max: 500 }),
        SEMANTIC_MEMORY_ENABLED: fc.boolean(),
        MENTION_REQUIRED: fc.boolean()
      }),
      (config) => {
        const result = validateConfig(config);
        
        // Should return valid structure
        if (typeof result.valid !== 'boolean') return false;
        if (!Array.isArray(result.errors)) return false;
        
        // Should detect out-of-range values
        if (config.SHORT_TERM_MAX_TOKENS < 500 || config.SHORT_TERM_MAX_TOKENS > 10000) {
          if (result.valid && config.SHORT_TERM_MAX_TOKENS !== undefined) {
            // Should have error for out of range
            return result.errors.some(e => e.includes('SHORT_TERM_MAX_TOKENS'));
          }
        }
        
        return true;
      }
    ),
    { numRuns: TEST_ITERATIONS }
  );
  console.log('  ✅ PASSED\n');
  passed++;
} catch (error) {
  console.log('  ❌ FAILED:', error.message, '\n');
  failed++;
}

/**
 * Property: Default Configuration Valid
 */
console.log('Property: Default Configuration Valid');
try {
  const defaults = getDefaults();
  const result = validateConfig(defaults);
  
  if (!result.valid) {
    throw new Error(`Default config invalid: ${result.errors.join(', ')}`);
  }
  
  // Check all expected keys exist
  const expectedKeys = [
    'SHORT_TERM_MAX_TOKENS',
    'SHORT_TERM_MAX_MESSAGES',
    'SEMANTIC_MEMORY_ENABLED',
    'SEMANTIC_MEMORY_RETENTION_DAYS',
    'PREFIX_COMMANDS_ENABLED',
    'PASSIVE_TRIGGERS_ENABLED',
    'MENTION_REQUIRED',
    'MAX_CONTEXT_TOKENS',
    'SEMANTIC_SEARCH_LIMIT'
  ];
  
  for (const key of expectedKeys) {
    if (defaults[key] === undefined) {
      throw new Error(`Missing default for ${key}`);
    }
  }
  
  console.log('  ✅ PASSED\n');
  passed++;
} catch (error) {
  console.log('  ❌ FAILED:', error.message, '\n');
  failed++;
}

/**
 * Property: loadConfig Returns Valid Config
 */
console.log('Property: loadConfig Returns Valid Config');
try {
  const config = loadConfig();
  
  // Check all expected keys exist with correct types
  if (typeof config.shortTermMaxTokens !== 'number') {
    throw new Error('shortTermMaxTokens should be number');
  }
  if (typeof config.shortTermMaxMessages !== 'number') {
    throw new Error('shortTermMaxMessages should be number');
  }
  if (typeof config.semanticMemoryEnabled !== 'boolean') {
    throw new Error('semanticMemoryEnabled should be boolean');
  }
  if (typeof config.mentionRequired !== 'boolean') {
    throw new Error('mentionRequired should be boolean');
  }
  
  // Check values are within bounds
  if (config.shortTermMaxTokens < 500 || config.shortTermMaxTokens > 10000) {
    throw new Error('shortTermMaxTokens out of bounds');
  }
  
  console.log('  ✅ PASSED\n');
  passed++;
} catch (error) {
  console.log('  ❌ FAILED:', error.message, '\n');
  failed++;
}

// Summary
console.log('═'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(50));

process.exit(failed > 0 ? 1 : 0);
