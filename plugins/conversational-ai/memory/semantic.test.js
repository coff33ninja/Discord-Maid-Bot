/**
 * Property-Based Tests for Semantic Memory
 * 
 * Uses fast-check for property-based testing.
 * Uses in-memory SQLite for testing.
 * 
 * @module plugins/conversational-ai/memory/semantic.test
 */

import fc from 'fast-check';
import Database from 'better-sqlite3';
import { SemanticMemory } from './semantic.js';

// Test configuration
const TEST_ITERATIONS = 50;

console.log('🧪 Running Semantic Memory Property Tests...\n');

let passed = 0;
let failed = 0;

// Create in-memory database for testing
function createTestDb() {
  return new Database(':memory:');
}

/**
 * Generate valid memory data
 */
const memoryDataArbitrary = fc.record({
  channelId: fc.string({ minLength: 1, maxLength: 20 }),
  guildId: fc.string({ minLength: 1, maxLength: 20 }),
  summary: fc.string({ minLength: 1, maxLength: 500 }),
  topics: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 10 }),
  participants: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
  messageCount: fc.integer({ min: 1, max: 100 }),
  startTimestamp: fc.integer({ min: 1000000000000, max: Date.now() }),
  endTimestamp: fc.integer({ min: 1000000000000, max: Date.now() + 1000000 })
});

/**
 * **Feature: conversational-ai-core, Property 6: Semantic Memory Data Completeness**
 * *For any* stored semantic memory entry, all required fields (channel_id, guild_id, 
 * summary, topics, participants, message_count, timestamps) SHALL be present and non-null.
 * **Validates: Requirements 3.1**
 */
console.log('Property 6: Semantic Memory Data Completeness');
try {
  fc.assert(
    fc.property(
      memoryDataArbitrary,
      (data) => {
        const db = createTestDb();
        const memory = new SemanticMemory(db, { enabled: true });
        memory.initialize();
        
        // Store the data
        const id = memory.store(data);
        if (!id) return false;
        
        // Retrieve and verify
        const retrieved = memory.getById(id);
        if (!retrieved) return false;
        
        // INVARIANT: All required fields must be present
        if (!retrieved.channelId) return false;
        if (!retrieved.guildId) return false;
        if (!retrieved.summary) return false;
        if (!Array.isArray(retrieved.topics)) return false;
        if (!Array.isArray(retrieved.participants)) return false;
        if (typeof retrieved.messageCount !== 'number') return false;
        if (typeof retrieved.startTimestamp !== 'number') return false;
        if (typeof retrieved.endTimestamp !== 'number') return false;
        
        db.close();
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
 * **Feature: conversational-ai-core, Property 8: Semantic Search Ordering**
 * *For any* semantic memory search result, entries SHALL be returned in 
 * descending order of relevance score.
 * **Validates: Requirements 3.4**
 */
console.log('Property 8: Semantic Search Ordering');
try {
  fc.assert(
    fc.property(
      fc.array(memoryDataArbitrary, { minLength: 3, maxLength: 10 }),
      fc.string({ minLength: 1, maxLength: 20 }),
      (dataArray, searchQuery) => {
        const db = createTestDb();
        const memory = new SemanticMemory(db, { enabled: true, searchLimit: 20 });
        memory.initialize();
        
        // Use same channel for all
        const channelId = 'test-channel';
        
        // Store all data with same channel
        for (const data of dataArray) {
          memory.store({ ...data, channelId });
        }
        
        // Search with scores
        const results = memory.searchWithScores(searchQuery, channelId, 20);
        
        // INVARIANT: Results should be sorted by score descending
        for (let i = 1; i < results.length; i++) {
          if (results[i].score > results[i - 1].score) {
            db.close();
            return false;
          }
        }
        
        db.close();
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

// Property: Cleanup removes old entries
console.log('Property: Cleanup Removes Old Entries');
try {
  fc.assert(
    fc.property(
      memoryDataArbitrary,
      (data) => {
        const db = createTestDb();
        const memory = new SemanticMemory(db, { enabled: true, retentionDays: 30 });
        memory.initialize();
        
        // Store with old timestamp (100 days ago)
        const oldTimestamp = Date.now() - (100 * 24 * 60 * 60 * 1000);
        const id = memory.store({
          ...data,
          startTimestamp: oldTimestamp,
          endTimestamp: oldTimestamp
        });
        
        if (!id) {
          db.close();
          return false;
        }
        
        // Verify it exists
        const before = memory.getById(id);
        if (!before) {
          db.close();
          return false;
        }
        
        // Run cleanup
        memory.cleanup(30);
        
        // INVARIANT: Old entry should be deleted
        const after = memory.getById(id);
        
        db.close();
        return after === null;
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

// Property: Recent entries are not cleaned up
console.log('Property: Recent Entries Not Cleaned Up');
try {
  fc.assert(
    fc.property(
      memoryDataArbitrary,
      (data) => {
        const db = createTestDb();
        const memory = new SemanticMemory(db, { enabled: true, retentionDays: 30 });
        memory.initialize();
        
        // Store with recent timestamp
        const recentTimestamp = Date.now() - (5 * 24 * 60 * 60 * 1000); // 5 days ago
        const id = memory.store({
          ...data,
          startTimestamp: recentTimestamp,
          endTimestamp: recentTimestamp
        });
        
        if (!id) {
          db.close();
          return false;
        }
        
        // Run cleanup
        memory.cleanup(30);
        
        // INVARIANT: Recent entry should still exist
        const after = memory.getById(id);
        
        db.close();
        return after !== null;
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

// Property: Disabled memory returns empty results
console.log('Property: Disabled Memory Returns Empty');
try {
  fc.assert(
    fc.property(
      memoryDataArbitrary,
      (data) => {
        const db = createTestDb();
        const memory = new SemanticMemory(db, { enabled: false });
        
        // Store should return null
        const id = memory.store(data);
        if (id !== null) return false;
        
        // Search should return empty
        const results = memory.search('test', 'channel');
        if (results.length !== 0) return false;
        
        db.close();
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

// Property: Delete removes entry
console.log('Property: Delete Removes Entry');
try {
  fc.assert(
    fc.property(
      memoryDataArbitrary,
      (data) => {
        const db = createTestDb();
        const memory = new SemanticMemory(db, { enabled: true });
        memory.initialize();
        
        const id = memory.store(data);
        if (!id) {
          db.close();
          return false;
        }
        
        // Delete
        const deleted = memory.delete(id);
        if (!deleted) {
          db.close();
          return false;
        }
        
        // INVARIANT: Entry should be gone
        const after = memory.getById(id);
        
        db.close();
        return after === null;
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
