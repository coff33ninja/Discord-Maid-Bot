/**
 * Property-Based Tests for Message Router
 * 
 * Uses fast-check for property-based testing.
 * 
 * @module plugins/conversational-ai/router/message-router.test
 */

import fc from 'fast-check';
import { MessageRouter } from './message-router.js';

// Test configuration
const TEST_ITERATIONS = 100;

const BOT_ID = '123456789';

/**
 * Generate a mock Discord message
 */
const mockMessageArbitrary = fc.record({
  content: fc.string({ minLength: 0, maxLength: 2000 }),
  author: fc.record({
    bot: fc.boolean(),
    id: fc.string({ minLength: 1, maxLength: 20 })
  }),
  channel: fc.record({
    type: fc.constantFrom(0, 1, 'DM', 'GUILD_TEXT') // 0=GUILD_TEXT, 1=DM
  }),
  mentions: fc.record({
    users: fc.constant(new Map())
  })
});

/**
 * Generate a message with specific prefix
 */
const prefixMessageArbitrary = (prefix) => fc.record({
  content: fc.string({ minLength: 1, maxLength: 50 }).map(s => `${prefix}${s.replace(/^[!?.]/g, '')}`),
  author: fc.record({
    bot: fc.constant(false),
    id: fc.string({ minLength: 1, maxLength: 20 })
  }),
  channel: fc.record({
    type: fc.constant(0)
  }),
  mentions: fc.record({
    users: fc.constant(new Map())
  })
});

/**
 * Generate a message with bot mention
 */
const mentionMessageArbitrary = fc.record({
  content: fc.string({ minLength: 0, maxLength: 100 }).map(s => `<@${BOT_ID}> ${s}`),
  author: fc.record({
    bot: fc.constant(false),
    id: fc.string({ minLength: 1, maxLength: 20 })
  }),
  channel: fc.record({
    type: fc.constant(0)
  }),
  mentions: fc.record({
    users: fc.constant(new Map([[BOT_ID, { id: BOT_ID }]]))
  })
});

console.log('🧪 Running Message Router Property Tests...\n');

let passed = 0;
let failed = 0;

/**
 * **Feature: conversational-ai-core, Property 1: Message Classification Completeness**
 * *For any* message received by the bot, the Message Router SHALL classify it into 
 * exactly one primary type (slash, prefix, mention, natural, or passive), and the 
 * classification SHALL be deterministic for the same input.
 * **Validates: Requirements 1.1, 1.2, 1.3, 7.1, 7.2, 7.3**
 */
console.log('Property 1: Message Classification Completeness');
try {
  fc.assert(
    fc.property(
      mockMessageArbitrary,
      (message) => {
        const router = new MessageRouter({ botId: BOT_ID });
        
        const classification = router.classify(message);
        
        // INVARIANT: Classification must have a type
        if (!classification.type) return false;
        
        // INVARIANT: Type must be one of the valid types
        const validTypes = ['slash', 'prefix', 'mention', 'natural', 'passive', 'ignore'];
        if (!validTypes.includes(classification.type)) return false;
        
        // INVARIANT: Classification must be deterministic
        const classification2 = router.classify(message);
        if (classification.type !== classification2.type) return false;
        if (classification.priority !== classification2.priority) return false;
        
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
 * **Feature: conversational-ai-core, Property 2: Prefix Detection Correctness**
 * *For any* message starting with a configured prefix character (!, ?, .), the 
 * Message Router SHALL correctly identify the prefix type and extract the command portion.
 * **Validates: Requirements 1.2, 7.1, 7.2, 7.3**
 */
console.log('Property 2: Prefix Detection Correctness - ! prefix');
try {
  fc.assert(
    fc.property(
      prefixMessageArbitrary('!'),
      (message) => {
        const router = new MessageRouter({ botId: BOT_ID });
        
        const classification = router.classify(message);
        
        // INVARIANT: Messages starting with ! should be classified as prefix
        if (classification.type !== 'prefix') return false;
        
        // INVARIANT: Prefix type should be 'command'
        if (classification.prefixType !== 'command') return false;
        
        // INVARIANT: Command should be extracted
        if (!classification.command) return false;
        
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

console.log('Property 2: Prefix Detection Correctness - ? prefix');
try {
  fc.assert(
    fc.property(
      prefixMessageArbitrary('?'),
      (message) => {
        const router = new MessageRouter({ botId: BOT_ID });
        
        const classification = router.classify(message);
        
        // INVARIANT: Messages starting with ? should be classified as prefix
        if (classification.type !== 'prefix') return false;
        
        // INVARIANT: Prefix type should be 'query'
        if (classification.prefixType !== 'query') return false;
        
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

console.log('Property 2: Prefix Detection Correctness - . prefix');
try {
  fc.assert(
    fc.property(
      prefixMessageArbitrary('.'),
      (message) => {
        const router = new MessageRouter({ botId: BOT_ID });
        
        const classification = router.classify(message);
        
        // INVARIANT: Messages starting with . should be classified as prefix
        if (classification.type !== 'prefix') return false;
        
        // INVARIANT: Prefix type should be 'quick'
        if (classification.prefixType !== 'quick') return false;
        
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

// Property: Bot mention detection
console.log('Property: Bot Mention Detection');
try {
  fc.assert(
    fc.property(
      mentionMessageArbitrary,
      (message) => {
        const router = new MessageRouter({ botId: BOT_ID });
        
        const classification = router.classify(message);
        
        // INVARIANT: Messages with bot mention should be classified as mention
        // (unless they also have a prefix, which takes priority)
        if (message.content.startsWith('!') || message.content.startsWith('?') || message.content.startsWith('.')) {
          return classification.type === 'prefix';
        }
        
        return classification.type === 'mention';
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

// Property: Bot messages are ignored
console.log('Property: Bot Messages Ignored');
try {
  fc.assert(
    fc.property(
      fc.record({
        content: fc.string({ minLength: 0, maxLength: 100 }),
        author: fc.record({
          bot: fc.constant(true),
          id: fc.string({ minLength: 1, maxLength: 20 })
        }),
        channel: fc.record({ type: fc.constant(0) }),
        mentions: fc.record({ users: fc.constant(new Map()) })
      }),
      (message) => {
        const router = new MessageRouter({ botId: BOT_ID });
        
        const classification = router.classify(message);
        
        // INVARIANT: Bot messages should be ignored
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

// Property: DM messages are natural language (when no prefix)
console.log('Property: DM Messages as Natural Language');
try {
  fc.assert(
    fc.property(
      fc.record({
        content: fc.string({ minLength: 1, maxLength: 100 }).filter(s => !['!', '?', '.'].includes(s[0])),
        author: fc.record({
          bot: fc.constant(false),
          id: fc.string({ minLength: 1, maxLength: 20 })
        }),
        channel: fc.record({ type: fc.constant(1) }), // DM
        mentions: fc.record({ users: fc.constant(new Map()) })
      }),
      (message) => {
        const router = new MessageRouter({ botId: BOT_ID, mentionRequired: true });
        
        const classification = router.classify(message);
        
        // INVARIANT: DM messages without prefix should be natural language
        // (even when mentionRequired is true)
        return classification.type === 'natural' || classification.type === 'passive';
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

// Summary
console.log('═'.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(50));

if (failed > 0) {
  process.exit(1);
}
