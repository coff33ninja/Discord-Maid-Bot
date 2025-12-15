/**
 * Property-Based Tests for Trigger System
 * 
 * Uses fast-check for property-based testing.
 * 
 * @module plugins/conversational-ai/triggers/trigger-system.test
 */

import fc from 'fast-check';
import { TriggerSystem } from './trigger-system.js';

// Test configuration
const TEST_ITERATIONS = 100;

console.log('🧪 Running Trigger System Property Tests...\n');

let passed = 0;
let failed = 0;

/**
 * **Feature: conversational-ai-core, Property 10: Passive Trigger Detection**
 * *For any* message matching a passive trigger pattern (code block, error keywords, 
 * length > 1000), the Trigger System SHALL detect and return the appropriate trigger(s).
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */
console.log('Property 10: Passive Trigger Detection - Code Blocks');
try {
  fc.assert(
    fc.property(
      fc.string({ minLength: 10, maxLength: 500 }),
      (codeContent) => {
        const system = new TriggerSystem({ enabled: true });
        const content = '```javascript\n' + codeContent + '\n```';
        
        const triggers = system.detect(content);
        
        // INVARIANT: Code blocks should trigger 'code-block'
        return triggers.includes('code-block');
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

console.log('Property 10: Passive Trigger Detection - Error Keywords');
try {
  fc.assert(
    fc.property(
      fc.constantFrom('error', 'Error', 'ERROR', 'exception', 'Exception', 'failed', 'Failed', 'traceback', 'stack trace'),
      fc.string({ minLength: 0, maxLength: 100 }),
      (keyword, suffix) => {
        const system = new TriggerSystem({ enabled: true });
        const content = `Something went wrong: ${keyword} ${suffix}`;
        
        const triggers = system.detect(content);
        
        // INVARIANT: Error keywords should trigger 'error-log'
        return triggers.includes('error-log');
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

console.log('Property 10: Passive Trigger Detection - Long Messages');
try {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1001, maxLength: 2000 }),
      (content) => {
        const system = new TriggerSystem({ enabled: true });
        
        const triggers = system.detect(content);
        
        // INVARIANT: Messages > 1000 chars should trigger 'long-message'
        return triggers.includes('long-message');
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
 * **Feature: conversational-ai-core, Property 11: Passive Trigger Configuration Respect**
 * *For any* message, when passive triggers are disabled in configuration, the 
 * Trigger System SHALL not activate any triggers regardless of content.
 * **Validates: Requirements 6.5**
 */
console.log('Property 11: Passive Trigger Configuration Respect - System Disabled');
try {
  fc.assert(
    fc.property(
      fc.string({ minLength: 0, maxLength: 2000 }),
      (content) => {
        const system = new TriggerSystem({ enabled: false });
        
        const triggers = system.detect(content);
        
        // INVARIANT: When system is disabled, no triggers should fire
        return triggers.length === 0;
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

console.log('Property 11: Passive Trigger Configuration Respect - Individual Trigger Disabled');
try {
  fc.assert(
    fc.property(
      fc.string({ minLength: 10, maxLength: 500 }),
      (codeContent) => {
        const system = new TriggerSystem({ enabled: true });
        system.disableTrigger('code-block');
        
        const content = '```javascript\n' + codeContent + '\n```';
        const triggers = system.detect(content);
        
        // INVARIANT: Disabled trigger should not fire
        return !triggers.includes('code-block');
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

// Additional property: Empty content returns no triggers
console.log('Property: Empty Content Returns No Triggers');
try {
  fc.assert(
    fc.property(
      fc.constant(''),
      (content) => {
        const system = new TriggerSystem({ enabled: true });
        const triggers = system.detect(content);
        return triggers.length === 0;
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

// Property: Trigger results include suggestions
console.log('Property: Trigger Results Include Suggestions');
try {
  fc.assert(
    fc.property(
      fc.string({ minLength: 10, maxLength: 500 }),
      (codeContent) => {
        const system = new TriggerSystem({ enabled: true });
        const content = '```javascript\n' + codeContent + '\n```';
        
        const results = system.getResults(content);
        
        // INVARIANT: Results should have suggestions
        for (const result of results) {
          if (!result.suggestion || typeof result.suggestion !== 'string') {
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

// Property: Re-enabling trigger works
console.log('Property: Re-enabling Trigger Works');
try {
  fc.assert(
    fc.property(
      fc.string({ minLength: 10, maxLength: 500 }),
      (codeContent) => {
        const system = new TriggerSystem({ enabled: true });
        const content = '```javascript\n' + codeContent + '\n```';
        
        // Disable then re-enable
        system.disableTrigger('code-block');
        system.enableTrigger('code-block');
        
        const triggers = system.detect(content);
        
        // INVARIANT: Re-enabled trigger should fire
        return triggers.includes('code-block');
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
