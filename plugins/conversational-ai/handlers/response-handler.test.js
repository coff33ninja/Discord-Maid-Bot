/**
 * Response Handler Tests
 * 
 * Property-based tests for the Response Handler.
 * Tests Property 12: Memory Update After Response
 * 
 * @module plugins/conversational-ai/handlers/response-handler.test
 */

import fc from 'fast-check';
import { ResponseHandler } from './response-handler.js';
import { ShortTermMemory } from '../memory/short-term.js';

// Test configuration
const TEST_ITERATIONS = 50;

console.log('🧪 Running Response Handler Property Tests...\n');

let passed = 0;
let failed = 0;

/**
 * Helper to create a fresh handler for each test
 */
function createTestHandler() {
  const shortTermMemory = new ShortTermMemory({
    maxTokens: 4000,
    maxMessages: 50
  });
  
  // Mock AI generation function
  const mockGenerateFn = async (prompt) => {
    return `Response to: ${prompt.slice(0, 50)}...`;
  };
  
  const handler = new ResponseHandler({
    shortTermMemory,
    semanticMemory: null,
    generateFn: mockGenerateFn
  });
  
  return { handler, shortTermMemory };
}

/**
 * **Feature: conversational-ai-core, Property 12: Memory Update After Response**
 * *For any* conversational response generated, both the user message and bot response 
 * SHALL be added to short-term memory.
 * **Validates: Requirements 5.3**
 */
console.log('Property 12: Memory Update After Response');
try {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        channelId: fc.string({ minLength: 1, maxLength: 20 }),
        userId: fc.string({ minLength: 1, maxLength: 20 }),
        username: fc.string({ minLength: 1, maxLength: 32 }),
        content: fc.string({ minLength: 1, maxLength: 500 })
      }),
      async (options) => {
        const { handler, shortTermMemory } = createTestHandler();
        
        // Clear memory before test
        shortTermMemory.clear(options.channelId);
        
        // Get initial count
        const initialCount = shortTermMemory.getMessageCount(options.channelId);
        if (initialCount !== 0) return false;
        
        // Generate response
        await handler.generateResponse(options);
        
        // Check that exactly 2 messages were added (user + bot)
        const finalCount = shortTermMemory.getMessageCount(options.channelId);
        if (finalCount !== 2) return false;
        
        // Get the messages
        const messages = shortTermMemory.getContext(options.channelId, 10000);
        
        // First message should be user's
        if (messages[0].isBot !== false) return false;
        if (messages[0].userId !== options.userId) return false;
        if (messages[0].username !== options.username) return false;
        if (messages[0].content !== options.content) return false;
        
        // Second message should be bot's
        if (messages[1].isBot !== true) return false;
        if (messages[1].userId !== 'bot') return false;
        
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
 * Property: Message Order Preserved Across Multiple Responses
 */
console.log('Property: Message Order Preserved Across Multiple Responses');
try {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 20 }), // channelId
      fc.array(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 20 }),
          username: fc.string({ minLength: 1, maxLength: 32 }),
          content: fc.string({ minLength: 1, maxLength: 200 })
        }),
        { minLength: 1, maxLength: 5 }
      ),
      async (channelId, messageList) => {
        const { handler, shortTermMemory } = createTestHandler();
        
        // Clear memory
        shortTermMemory.clear(channelId);
        
        // Generate responses for each message
        for (const msg of messageList) {
          await handler.generateResponse({
            channelId,
            userId: msg.userId,
            username: msg.username,
            content: msg.content
          });
        }
        
        // Should have 2 messages per input (user + bot)
        const expectedCount = messageList.length * 2;
        const actualCount = shortTermMemory.getMessageCount(channelId);
        if (actualCount !== expectedCount) return false;
        
        // Get all messages
        const messages = shortTermMemory.getContext(channelId, 100000);
        
        // Verify alternating pattern: user, bot, user, bot...
        for (let i = 0; i < messages.length; i++) {
          const isUserMessage = i % 2 === 0;
          if (messages[i].isBot !== !isUserMessage) return false;
        }
        
        return true;
      }
    ),
    { numRuns: 20 }
  );
  console.log('  ✅ PASSED\n');
  passed++;
} catch (error) {
  console.log('  ❌ FAILED:', error.message, '\n');
  failed++;
}

/**
 * Property: User Message Content Preserved Exactly
 */
console.log('Property: User Message Content Preserved Exactly');
try {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 20 }), // channelId
      fc.string({ minLength: 1, maxLength: 20 }), // userId
      fc.string({ minLength: 1, maxLength: 32 }), // username
      fc.string({ minLength: 1, maxLength: 1000 }), // content
      async (channelId, userId, username, content) => {
        const { handler, shortTermMemory } = createTestHandler();
        shortTermMemory.clear(channelId);
        
        await handler.generateResponse({
          channelId,
          userId,
          username,
          content
        });
        
        const messages = shortTermMemory.getContext(channelId, 100000);
        const userMessage = messages.find(m => !m.isBot);
        
        // Content should be preserved exactly
        return userMessage.content === content;
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
 * Property: trackMessage Adds Without Response
 */
console.log('Property: trackMessage Adds Without Response');
try {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 20 }), // channelId
      fc.record({
        userId: fc.string({ minLength: 1, maxLength: 20 }),
        username: fc.string({ minLength: 1, maxLength: 32 }),
        content: fc.string({ minLength: 1, maxLength: 500 }),
        isBot: fc.boolean()
      }),
      (channelId, message) => {
        const { handler, shortTermMemory } = createTestHandler();
        shortTermMemory.clear(channelId);
        
        handler.trackMessage(channelId, message);
        
        const count = shortTermMemory.getMessageCount(channelId);
        if (count !== 1) return false;
        
        const messages = shortTermMemory.getContext(channelId, 10000);
        if (messages[0].content !== message.content) return false;
        if (messages[0].isBot !== message.isBot) return false;
        
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
 * Property: buildPrompt Includes Required Elements
 */
console.log('Property: buildPrompt Includes Required Elements');
try {
  const { handler } = createTestHandler();
  
  const personality = {
    name: 'Test',
    prompt: 'You are a test personality.'
  };
  
  const context = {
    shortTerm: [],
    semantic: [],
    userPrefs: null,
    totalTokens: 0
  };
  
  const userMessage = 'This is my test message';
  const prompt = handler.buildPrompt(userMessage, context, personality);
  
  // Should include personality prompt
  if (!prompt.includes('You are a test personality.')) {
    throw new Error('Missing personality prompt');
  }
  
  // Should include user message
  if (!prompt.includes(userMessage)) {
    throw new Error('Missing user message');
  }
  
  // Test with network context
  const promptWithNetwork = handler.buildPrompt(userMessage, context, personality, {
    networkContext: { deviceCount: 5 }
  });
  
  if (!promptWithNetwork.includes('5 devices online')) {
    throw new Error('Missing network context');
  }
  
  console.log('  ✅ PASSED\n');
  passed++;
} catch (error) {
  console.log('  ❌ FAILED:', error.message, '\n');
  failed++;
}

/**
 * Property: getChannelStats Returns Correct Statistics
 */
console.log('Property: getChannelStats Returns Correct Statistics');
try {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 20 }), // channelId
      fc.array(
        fc.string({ minLength: 1, maxLength: 100 }),
        { minLength: 0, maxLength: 10 }
      ),
      (channelId, contents) => {
        const { handler, shortTermMemory } = createTestHandler();
        shortTermMemory.clear(channelId);
        
        // Add messages
        for (const content of contents) {
          shortTermMemory.addMessage(channelId, {
            userId: 'user1',
            username: 'User',
            content,
            isBot: false
          });
        }
        
        const stats = handler.getChannelStats(channelId);
        
        if (stats.messageCount !== contents.length) return false;
        if (stats.tokenCount < 0) return false;
        
        return true;
      }
    ),
    { numRuns: 30 }
  );
  console.log('  ✅ PASSED\n');
  passed++;
} catch (error) {
  console.log('  ❌ FAILED:', error.message, '\n');
  failed++;
}

/**
 * Property: Reply Context Included in Prompt
 */
console.log('Property: Reply Context Included in Prompt');
try {
  const { handler } = createTestHandler();
  
  const personality = {
    name: 'Test',
    prompt: 'You are a test personality.'
  };
  
  const context = {
    shortTerm: [],
    semantic: [],
    userPrefs: null,
    totalTokens: 0
  };
  
  const replyContext = {
    messageId: '123456789',
    authorId: 'user456',
    authorUsername: 'OriginalUser',
    isBot: false,
    content: 'This is the original message being replied to',
    timestamp: Date.now()
  };
  
  const userMessage = 'What do you think about that?';
  const prompt = handler.buildPrompt(userMessage, context, personality, {
    replyContext
  });
  
  // Should include reply context
  if (!prompt.includes('Message Being Replied To')) {
    throw new Error('Missing reply context header');
  }
  
  if (!prompt.includes('OriginalUser')) {
    throw new Error('Missing original author');
  }
  
  if (!prompt.includes('This is the original message being replied to')) {
    throw new Error('Missing original message content');
  }
  
  // Test with bot reply context
  const botReplyContext = {
    ...replyContext,
    isBot: true,
    authorUsername: 'Bot'
  };
  
  const promptWithBotReply = handler.buildPrompt(userMessage, context, personality, {
    replyContext: botReplyContext
  });
  
  if (!promptWithBotReply.includes('From: Bot')) {
    throw new Error('Bot reply context should show "Bot" as author');
  }
  
  console.log('  ✅ PASSED\n');
  passed++;
} catch (error) {
  console.log('  ❌ FAILED:', error.message, '\n');
  failed++;
}

/**
 * Property: Reply Context Stored in Memory
 */
console.log('Property: Reply Context Stored in Memory');
try {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        channelId: fc.string({ minLength: 1, maxLength: 20 }),
        userId: fc.string({ minLength: 1, maxLength: 20 }),
        username: fc.string({ minLength: 1, maxLength: 32 }),
        content: fc.string({ minLength: 1, maxLength: 200 })
      }),
      fc.record({
        messageId: fc.string({ minLength: 1, maxLength: 20 }),
        authorId: fc.string({ minLength: 1, maxLength: 20 }),
        authorUsername: fc.string({ minLength: 1, maxLength: 32 }),
        isBot: fc.boolean(),
        content: fc.string({ minLength: 1, maxLength: 200 }),
        timestamp: fc.integer({ min: 0, max: Date.now() })
      }),
      async (options, replyContext) => {
        const { handler, shortTermMemory } = createTestHandler();
        shortTermMemory.clear(options.channelId);
        
        // Generate response with reply context
        await handler.generateResponse({
          ...options,
          replyContext
        });
        
        // Get messages
        const messages = shortTermMemory.getContext(options.channelId, 100000);
        const userMessage = messages.find(m => !m.isBot);
        
        // User message should include reply reference
        const expectedPrefix = `[Replying to ${replyContext.isBot ? 'Bot' : replyContext.authorUsername}]`;
        return userMessage.content.includes(expectedPrefix);
      }
    ),
    { numRuns: 30 }
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

process.exit(failed > 0 ? 1 : 0);
