# Conversational AI - API Reference

**Version:** 2.0.0

Developer reference for integrating with the Conversational AI plugin.

## Plugin API

### Getting the Plugin Instance

```javascript
import { getPlugin } from '../../src/core/plugin-system.js';

const conversationalAI = getPlugin('conversational-ai');
```

### Public Methods

#### `generateResponse(options)`

Generate an AI response with full context.

```javascript
const result = await conversationalAI.generateResponse({
  channelId: '123456789',
  userId: '987654321',
  username: 'User',
  content: 'Hello, how are you?',
  replyContext: null  // Optional: context from replied message
});

// Result:
// {
//   response: "Hello! I'm doing great, thank you for asking!",
//   context: { shortTerm: [...], semantic: [...], ... },
//   stats: { shortTermMessages: 5, budgetUsed: '42%', ... },
//   personalityKey: 'maid',
//   hadReplyContext: false
// }
```

#### `trackMessage(channelId, message)`

Track a message in memory without generating a response.

```javascript
conversationalAI.trackMessage('123456789', {
  userId: '987654321',
  username: 'User',
  content: 'This is a message to track',
  isBot: false
});
```

#### `addToMemory(channelId, message)`

Add a message directly to short-term memory.

```javascript
conversationalAI.addToMemory('123456789', {
  userId: '987654321',
  username: 'User',
  content: 'Message content',
  timestamp: Date.now(),
  isBot: false
});
```

#### `getContext(channelId, maxTokens)`

Get context for a channel within token budget.

```javascript
const messages = conversationalAI.getContext('123456789', 2000);
// Returns array of StoredMessage objects
```

#### `clearMemory(channelId)`

Clear memory for a specific channel.

```javascript
conversationalAI.clearMemory('123456789');
```

#### `classifyMessage(message)`

Classify a Discord message.

```javascript
const classification = conversationalAI.classifyMessage(discordMessage);
// Returns: { type: 'natural', priority: 50 }
// Types: 'slash', 'prefix', 'mention', 'natural', 'passive', 'ignore'
```

#### `getMemoryStats()`

Get memory statistics.

```javascript
const stats = conversationalAI.getMemoryStats();
// Returns: { channelCount: 5, totalMessages: 47, totalTokens: 2891 }
```

#### `getConfig()`

Get current configuration.

```javascript
const config = conversationalAI.getConfig();
// Returns configuration object
```

---

## Component APIs

### ShortTermMemory

```javascript
import { ShortTermMemory } from './memory/short-term.js';

const memory = new ShortTermMemory({
  maxTokens: 4000,
  maxMessages: 50
});

// Add message
memory.addMessage(channelId, {
  userId: 'user123',
  username: 'User',
  content: 'Hello',
  timestamp: Date.now(),
  isBot: false
});

// Get context
const context = memory.getContext(channelId, 2000);

// Get stats
const stats = memory.getStats();

// Clear channel
memory.clear(channelId);

// Clear all
memory.clearAll();
```

### MessageRouter

```javascript
import { MessageRouter } from './router/message-router.js';

const router = new MessageRouter({
  prefixEnabled: true,
  passiveEnabled: true,
  mentionRequired: false
});

router.setBotId('bot-user-id');

const classification = router.classify(message);
// Returns: { type: 'prefix', priority: 90, prefixType: 'command', command: 'help', args: [] }
```

### ContextReconstructor

```javascript
import { ContextReconstructor } from './context/context-reconstructor.js';

const reconstructor = new ContextReconstructor(
  shortTermMemory,
  semanticMemory,  // optional
  { maxTokens: 6000, shortTermBudget: 2000, semanticLimit: 3 }
);

// Reconstruct context
const context = reconstructor.reconstruct({
  channelId: '123',
  userId: '456',
  content: 'Remember that project we discussed?'
});

// Detect history need
const needsHistory = reconstructor.detectHistoryNeed('Remember when...');
// Returns: true

// Format for prompt
const promptText = reconstructor.formatForPrompt(context);

// Get stats
const stats = reconstructor.getStats(context);
```

### ResponseHandler

```javascript
import { ResponseHandler } from './handlers/response-handler.js';

const handler = new ResponseHandler({
  shortTermMemory,
  semanticMemory,  // optional
  generateFn: async (prompt) => { /* AI generation */ },
  config: { maxContextTokens: 6000 }
});

// Generate response
const result = await handler.generateResponse({
  channelId: '123',
  userId: '456',
  username: 'User',
  content: 'Hello!',
  replyContext: null
});

// Build prompt manually
const prompt = handler.buildPrompt(userMessage, context, personality, {
  networkContext: { deviceCount: 5 },
  replyContext: { ... }
});
```

### PrefixHandler

```javascript
import { PrefixHandler } from './router/prefix-handler.js';

const handler = new PrefixHandler();

// Parse prefix command
const parsed = handler.parse('!help arg1 arg2');
// Returns: { prefix: '!', type: 'command', command: 'help', args: ['arg1', 'arg2'] }

// Check if command exists
const exists = handler.hasCommand('help');

// Get suggestions for typos
const suggestions = handler.getSuggestions('hlep');
// Returns: ['help', 'health', ...]

// Register custom command
handler.registerCommand({
  name: 'mycommand',
  aliases: ['mc'],
  description: 'My custom command',
  prefix: '!',
  handler: async (args, message) => { ... }
});
```

### TriggerSystem

```javascript
import { TriggerSystem } from './triggers/trigger-system.js';

const triggers = new TriggerSystem({ enabled: true });

// Detect triggers
const detected = triggers.detect(messageContent);
// Returns: [{ name: 'code-block', suggestion: '...' }, ...]

// Enable/disable triggers
triggers.setEnabled('code-block', false);
triggers.setSystemEnabled(false);

// Register custom trigger
triggers.register({
  name: 'custom-trigger',
  pattern: /custom pattern/i,
  suggestion: 'I noticed a custom pattern!',
  enabled: true
});
```

---

## Data Types

### StoredMessage

```typescript
interface StoredMessage {
  userId: string;
  username: string;
  content: string;
  timestamp: number;
  tokens: number;
  isBot: boolean;
}
```

### MessageClassification

```typescript
interface MessageClassification {
  type: 'slash' | 'prefix' | 'mention' | 'natural' | 'passive' | 'ignore';
  priority: number;
  prefixType?: 'command' | 'query' | 'quick';
  command?: string;
  args?: string[];
  triggers?: string[];
}
```

### ReconstructedContext

```typescript
interface ReconstructedContext {
  shortTerm: StoredMessage[];
  semantic: SemanticMemoryEntry[];
  userPrefs: object | null;
  totalTokens: number;
}
```

### ReplyContext

```typescript
interface ReplyContext {
  messageId: string;
  authorId: string;
  authorUsername: string;
  isBot: boolean;
  content: string;
  timestamp: number;
}
```

### ResponseResult

```typescript
interface ResponseResult {
  response: string;
  context: ReconstructedContext;
  stats: object;
  personalityKey: string;
  hadReplyContext: boolean;
}
```

---

## Events

The plugin emits events through the Discord client:

### Message Handling

The `MessageHandler` registers for `messageCreate` events:

```javascript
// Automatically registered when plugin loads
client.on('messageCreate', messageHandler.handleMessage);
```

---

## Configuration Schema

```javascript
const CONFIG_SCHEMA = {
  SHORT_TERM_MAX_TOKENS: { default: 4000, type: 'number', min: 500, max: 10000 },
  SHORT_TERM_MAX_MESSAGES: { default: 50, type: 'number', min: 10, max: 200 },
  SEMANTIC_MEMORY_ENABLED: { default: true, type: 'boolean' },
  SEMANTIC_MEMORY_RETENTION_DAYS: { default: 90, type: 'number', min: 1, max: 365 },
  PREFIX_COMMANDS_ENABLED: { default: true, type: 'boolean' },
  PASSIVE_TRIGGERS_ENABLED: { default: true, type: 'boolean' },
  MENTION_REQUIRED: { default: false, type: 'boolean' },
  MAX_CONTEXT_TOKENS: { default: 6000, type: 'number', min: 1000, max: 15000 },
  SEMANTIC_SEARCH_LIMIT: { default: 5, type: 'number', min: 1, max: 20 }
};
```

---

## Testing

The plugin includes comprehensive property-based tests using `fast-check`:

```bash
# Run all conversational-ai tests
node plugins/conversational-ai/handlers/response-handler.test.js
node plugins/conversational-ai/memory/short-term.test.js
node plugins/conversational-ai/router/message-router.test.js
node plugins/conversational-ai/context/context-reconstructor.test.js
node plugins/conversational-ai/router/prefix-handler.test.js
node plugins/conversational-ai/triggers/trigger-system.test.js
node plugins/conversational-ai/memory/semantic.test.js
node plugins/conversational-ai/config.test.js
```

### Validated Properties

| Property | Description |
|----------|-------------|
| 1 | Message Classification Completeness |
| 2 | Prefix Detection Correctness |
| 3 | Short-Term Memory Token Invariant |
| 4 | Short-Term Memory Message Count Invariant |
| 5 | Short-Term Memory Retrieval Order |
| 6 | Semantic Memory Data Completeness |
| 7 | History Trigger Detection |
| 8 | Semantic Search Ordering |
| 9 | Context Token Budget Invariant |
| 10 | Passive Trigger Detection |
| 11 | Passive Trigger Configuration Respect |
| 12 | Memory Update After Response |
| 13 | Mention Requirement Enforcement |

---

## See Also

- [Plugin Overview](README.md)
- [Commands Reference](COMMANDS.md)
- [Usage Examples](EXAMPLES.md)
