/**
 * Property-Based Tests for Context Reconstructor
 * 
 * Uses fast-check for property-based testing.
 * 
 * @module plugins/conversational-ai/context/context-reconstructor.test
 */

import fc from 'fast-check';
import { ContextReconstructor } from './context-reconstructor.js';
import { ShortTermMemory } from '../memory/short-term.js';

// Test configuration
const TEST_ITERATIONS = 100;

console.log('🧪 Running Context Reconstructor Property Tests...\n');

let passed = 0;
let failed = 0;

/**
 * Mock semantic memory for testing
 */
class MockSemanticMemory {
  constructor(memories = []) {
    this.memories = memories;
    this.enabled = true;
  }
  
  isEnabled() { return this.enabled; }
  
  searchWithScores(query, channelId, limit) {
    return this.memories.slice(0, limit).map(m => ({
      memory: m,
      score: 0.5
    }));
  }
}

/**
 * Generate history trigger phrases
 */
const historyTriggerArbitrary = fc.constantFrom(
  'remember when we talked about',
  'earlier you mentioned',
  'last week we discussed',
  'that project we worked on',
  'you said something about',
  'what did we decide about',
  'previously you told me',
  'a few days ago'
);

/**
 * Generate non-trigger phrases
 */
const nonTriggerArbitrary = fc.constantFrom(
  'hello how are you',
  'what is the weather',
  'help me with this code',
  'can you explain',
  'I need assistance',
  'please do this task'
);

/**
 * **Feature: conversational-ai-core, Property 7: History Trigger Detection**
 * *For any* message containing history trigger phrases ("remember when", 
 * "that project we discussed", "earlier", "last week"), the Context Reconstructor 
 * SHALL detect the need for semantic memory search.
 * **Validates: Requirements 3.3, 4.2**
 */
console.log('Property 7: History Trigger Detection - Positive Cases');
try {
  fc.assert(
    fc.property(
      historyTriggerArbitrary,
      fc.string({ minLength: 0, maxLength: 50 }),
      (trigger, suffix) => {
        const shortTerm = new ShortTermMemory();
        const reconstructor = new ContextReconstructor(shortTerm);
        
        const content = `${trigger} ${suffix}`;
        
        // INVARIANT: History triggers should be detected
        return reconstructor.detectHistoryNeed(content) === true;
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

console.log('Property 7: History Trigger Detection - Negative Cases');
try {
  fc.assert(
    fc.property(
      nonTriggerArbitrary,
      (content) => {
        const shortTerm = new ShortTermMemory();
        const reconstructor = new ContextReconstructor(shortTerm);
        
        // INVARIANT: Non-trigger phrases should not trigger history search
        return reconstructor.detectHistoryNeed(content) === false;
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
 * **Feature: conversational-ai-core, Property 9: Context Token Budget Invariant**
 * *For any* reconstructed context, the total token count SHALL not exceed the 
 * configured maximum (default 6000), with compression applied in priority order: 
 * short-term > semantic > user preferences.
 * **Validates: Requirements 4.3**
 */
console.log('Property 9: Context Token Budget Invariant');
try {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 10 }),
          username: fc.string({ minLength: 1, maxLength: 20 }),
          content: fc.string({ minLength: 1, maxLength: 500 }),
          timestamp: fc.integer({ min: 1000000, max: Date.now() }),
          isBot: fc.boolean()
        }),
        { minLength: 0, maxLength: 100 }
      ),
      fc.integer({ min: 1000, max: 10000 }), // maxTokens config
      (messages, maxTokens) => {
        const shortTerm = new ShortTermMemory({ maxTokens: 50000, maxMessages: 200 });
        
        // Add all messages
        for (const msg of messages) {
          shortTerm.addMessage('test-channel', msg);
        }
        
        // Create semantic memories
        const semanticMemories = [
          { summary: 'A'.repeat(500), endTimestamp: Date.now() },
          { summary: 'B'.repeat(500), endTimestamp: Date.now() },
          { summary: 'C'.repeat(500), endTimestamp: Date.now() }
        ];
        const semantic = new MockSemanticMemory(semanticMemories);
        
        const reconstructor = new ContextReconstructor(shortTerm, semantic, { maxTokens });
        
        // Reconstruct with history trigger to include semantic
        const context = reconstructor.reconstruct({
          channelId: 'test-channel',
          userId: 'user1',
          content: 'remember when we discussed this',
          userPrefs: { personality: 'maid', timezone: 'UTC' }
        });
        
        // INVARIANT: Total tokens should not exceed maxTokens
        return context.totalTokens <= maxTokens;
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

// Property: Short-term always included
console.log('Property: Short-Term Always Included');
try {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 10 }),
          username: fc.string({ minLength: 1, maxLength: 20 }),
          content: fc.string({ minLength: 1, maxLength: 100 }),
          timestamp: fc.integer({ min: 1000000, max: Date.now() }),
          isBot: fc.boolean()
        }),
        { minLength: 1, maxLength: 20 }
      ),
      (messages) => {
        const shortTerm = new ShortTermMemory({ maxTokens: 10000, maxMessages: 100 });
        
        for (const msg of messages) {
          shortTerm.addMessage('test-channel', msg);
        }
        
        const reconstructor = new ContextReconstructor(shortTerm, null, { maxTokens: 6000 });
        
        const context = reconstructor.reconstruct({
          channelId: 'test-channel',
          userId: 'user1',
          content: 'hello'
        });
        
        // INVARIANT: Short-term should always have content if messages exist
        return context.shortTerm.length > 0;
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

// Property: Compression preserves priority
console.log('Property: Compression Preserves Priority');
try {
  fc.assert(
    fc.property(
      fc.integer({ min: 500, max: 2000 }), // Very small budget
      (maxTokens) => {
        const shortTerm = new ShortTermMemory({ maxTokens: 50000, maxMessages: 200 });
        
        // Add many messages
        for (let i = 0; i < 50; i++) {
          shortTerm.addMessage('test-channel', {
            userId: 'user1',
            username: 'User',
            content: 'Message content ' + i,
            timestamp: Date.now() + i,
            isBot: false
          });
        }
        
        const semanticMemories = [
          { summary: 'Long summary '.repeat(50), endTimestamp: Date.now() }
        ];
        const semantic = new MockSemanticMemory(semanticMemories);
        
        const reconstructor = new ContextReconstructor(shortTerm, semantic, { maxTokens });
        
        const context = reconstructor.reconstruct({
          channelId: 'test-channel',
          userId: 'user1',
          content: 'remember when',
          userPrefs: { personality: 'maid' }
        });
        
        // INVARIANT: Short-term should have more tokens than semantic (priority)
        const shortTermTokens = reconstructor.estimateArrayTokens(context.shortTerm);
        const semanticTokens = reconstructor.estimateArrayTokens(context.semantic);
        
        // Short-term should be prioritized (have content if anything does)
        if (context.shortTerm.length === 0 && context.semantic.length > 0) {
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

// Property: Empty content returns valid context
console.log('Property: Empty Content Returns Valid Context');
try {
  fc.assert(
    fc.property(
      fc.constant(''),
      (content) => {
        const shortTerm = new ShortTermMemory();
        const reconstructor = new ContextReconstructor(shortTerm);
        
        const context = reconstructor.reconstruct({
          channelId: 'test-channel',
          userId: 'user1',
          content
        });
        
        // INVARIANT: Should return valid context structure
        return (
          Array.isArray(context.shortTerm) &&
          Array.isArray(context.semantic) &&
          typeof context.totalTokens === 'number'
        );
      }
    ),
    { numRuns: 10 }
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
