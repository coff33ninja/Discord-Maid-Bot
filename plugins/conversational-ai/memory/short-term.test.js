/**
 * Property-Based Tests for Short-Term Memory
 * 
 * Uses fast-check for property-based testing.
 * 
 * @module plugins/conversational-ai/memory/short-term.test
 */

import fc from 'fast-check';
import { ShortTermMemory } from './short-term.js';

// Test configuration
const TEST_ITERATIONS = 100;

/**
 * Generate a random message for testing
 */
const messageArbitrary = fc.record({
  userId: fc.string({ minLength: 1, maxLength: 20 }),
  username: fc.string({ minLength: 1, maxLength: 32 }),
  content: fc.string({ minLength: 0, maxLength: 2000 }),
  timestamp: fc.integer({ min: 0, max: Date.now() + 1000000 }),
  isBot: fc.boolean()
});

/**
 * Generate a channel ID
 */
const channelIdArbitrary = fc.string({ minLength: 1, maxLength: 20 });

/**
 * Generate a sequence of messages
 */
const messageSequenceArbitrary = fc.array(messageArbitrary, { minLength: 1, maxLength: 100 });

console.log('🧪 Running Short-Term Memory Property Tests...\n');

let passed = 0;
let failed = 0;

/**
 * **Feature: conversational-ai-core, Property 3: Short-Term Memory Token Invariant**
 * *For any* channel's short-term memory, the total token count SHALL never exceed 
 * the configured maximum (default 4000), and adding a new message SHALL trigger 
 * trimming of oldest messages when necessary.
 * **Validates: Requirements 2.2, 2.3**
 */
console.log('Property 3: Short-Term Memory Token Invariant');
try {
  fc.assert(
    fc.property(
      channelIdArbitrary,
      messageSequenceArbitrary,
      fc.integer({ min: 100, max: 5000 }), // maxTokens config
      (channelId, messages, maxTokens) => {
        const memory = new ShortTermMemory({ maxTokens, maxMessages: 100 });
        
        // Add all messages
        for (const msg of messages) {
          memory.addMessage(channelId, msg);
          
          // INVARIANT: Total tokens should never exceed maxTokens
          const totalTokens = memory.getTotalTokens(channelId);
          if (totalTokens > maxTokens) {
            return false;
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
 * **Feature: conversational-ai-core, Property 4: Short-Term Memory Message Count Invariant**
 * *For any* channel's short-term memory, the message count SHALL never exceed 
 * the configured maximum (default 50), regardless of individual message token counts.
 * **Validates: Requirements 2.3**
 */
console.log('Property 4: Short-Term Memory Message Count Invariant');
try {
  fc.assert(
    fc.property(
      channelIdArbitrary,
      messageSequenceArbitrary,
      fc.integer({ min: 5, max: 100 }), // maxMessages config
      (channelId, messages, maxMessages) => {
        const memory = new ShortTermMemory({ maxTokens: 100000, maxMessages });
        
        // Add all messages
        for (const msg of messages) {
          memory.addMessage(channelId, msg);
          
          // INVARIANT: Message count should never exceed maxMessages
          const count = memory.getMessageCount(channelId);
          if (count > maxMessages) {
            return false;
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
 * **Feature: conversational-ai-core, Property 5: Short-Term Memory Retrieval Order**
 * *For any* context retrieval request, the Short-Term Memory SHALL return messages 
 * in chronological order with most recent messages prioritized when trimming to token budget.
 * **Validates: Requirements 2.4**
 */
console.log('Property 5: Short-Term Memory Retrieval Order');
try {
  fc.assert(
    fc.property(
      channelIdArbitrary,
      messageSequenceArbitrary,
      fc.integer({ min: 100, max: 5000 }), // maxTokens for retrieval
      (channelId, messages, retrievalBudget) => {
        const memory = new ShortTermMemory({ maxTokens: 10000, maxMessages: 200 });
        
        // Add messages with sequential timestamps to ensure order
        const timestampedMessages = messages.map((msg, i) => ({
          ...msg,
          timestamp: 1000000 + i * 1000 // Sequential timestamps
        }));
        
        for (const msg of timestampedMessages) {
          memory.addMessage(channelId, msg);
        }
        
        // Get context with budget
        const context = memory.getContext(channelId, retrievalBudget);
        
        // INVARIANT: Messages should be in chronological order
        for (let i = 1; i < context.length; i++) {
          if (context[i].timestamp < context[i - 1].timestamp) {
            return false;
          }
        }
        
        // INVARIANT: Retrieved messages should be within token budget
        const totalTokens = context.reduce((sum, msg) => sum + msg.tokens, 0);
        if (totalTokens > retrievalBudget) {
          return false;
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

// Additional property: Token estimation consistency
console.log('Property: Token Estimation Consistency');
try {
  fc.assert(
    fc.property(
      fc.string({ minLength: 0, maxLength: 10000 }),
      (text) => {
        const memory = new ShortTermMemory();
        const tokens = memory.estimateTokens(text);
        
        // Token count should be non-negative
        if (tokens < 0) return false;
        
        // Token count should be roughly proportional to text length
        // (allowing for rounding)
        const expectedMin = Math.floor(text.length / 5);
        const expectedMax = Math.ceil(text.length / 3) + 1;
        
        return tokens >= expectedMin && tokens <= expectedMax;
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
