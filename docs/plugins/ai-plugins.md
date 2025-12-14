# Conversational AI Architecture - Design Document

## Vision

Transform the bot from a command-driven tool into an intelligent conversational participant with contextual memory, natural language understanding, and modular extensibility.

## Core Principles

1. **Conversational First** - Natural language over rigid commands
2. **Context-Aware** - Remembers relevant past interactions
3. **Modular Architecture** - Plugin-first design for maintainability
4. **Intelligent Forgetting** - Selective memory, not blind history replay
5. **Multi-Modal Interaction** - Slash commands, mentions, natural language, passive triggers

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Discord Message                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Message Router                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Detect interaction type:                                │   │
│  │  • Slash command                                         │   │
│  │  • Prefix command (!help, ?status)                       │   │
│  │  • Bot mention (@bot what's the weather?)                │   │
│  │  • Natural language (conversational)                     │   │
│  │  • Passive trigger (code block, error log)               │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌────────────┐  ┌────────────┐  ┌────────────────┐
│  Command   │  │ Contextual │  │    Passive     │
│  Handler   │  │    Chat    │  │   Triggers     │
└────────────┘  └─────┬──────┘  └────────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │   Context Manager          │
         │  ┌──────────────────────┐  │
         │  │ Short-Term Memory    │  │
         │  │ (Rolling Window)     │  │
         │  └──────────────────────┘  │
         │  ┌──────────────────────┐  │
         │  │ Long-Term Semantic   │  │
         │  │ Memory (Summaries)   │  │
         │  └──────────────────────┘  │
         │  ┌──────────────────────┐  │
         │  │ User Preferences     │  │
         │  │ (Optional)           │  │
         │  └──────────────────────┘  │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  Context Reconstruction    │
         │  • Relevance scoring       │
         │  • Semantic search         │
         │  • Token budget management │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │   Gemini AI Processing     │
         │  • Conversational response │
         │  • Intent detection        │
         │  • Action extraction       │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │   Response Handler         │
         │  • Format response         │
         │  • Execute actions         │
         │  • Update memory           │
         └────────────────────────────┘
```

---

## Memory System

### 1. Short-Term Context (Rolling Window)

**Purpose:** Maintain conversational continuity within recent messages

**Implementation:**
```javascript
class ShortTermMemory {
  constructor() {
    this.channelContexts = new Map(); // channelId -> MessageWindow
    this.maxTokens = 4000; // Configurable per channel
    this.maxMessages = 50; // Hard limit
  }
  
  addMessage(channelId, message) {
    let context = this.channelContexts.get(channelId) || [];
    
    // Add new message
    context.push({
      userId: message.author.id,
      username: message.author.username,
      content: message.content,
      timestamp: message.createdTimestamp,
      tokens: this.estimateTokens(message.content)
    });
    
    // Trim to token budget
    context = this.trimToTokenBudget(context, this.maxTokens);
    
    // Hard limit on message count
    if (context.length > this.maxMessages) {
      context = context.slice(-this.maxMessages);
    }
    
    this.channelContexts.set(channelId, context);
  }
  
  getContext(channelId, maxTokens = 2000) {
    const context = this.channelContexts.get(channelId) || [];
    return this.trimToTokenBudget(context, maxTokens);
  }
  
  trimToTokenBudget(messages, budget) {
    let totalTokens = 0;
    const result = [];
    
    // Work backwards from most recent
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (totalTokens + msg.tokens > budget) break;
      
      totalTokens += msg.tokens;
      result.unshift(msg);
    }
    
    return result;
  }
  
  estimateTokens(text) {
    // Rough estimate: ~4 chars per token
    return Math.ceil(text.length / 4);
  }
}
```

**Storage:** In-memory (ephemeral, cleared on restart)

**Retention:** Rolling window, token-limited

**Use Case:** "What did I just say?", "Continue that thought", follow-up questions

---

### 2. Long-Term Semantic Memory

**Purpose:** Store summarized conversation fragments for later retrieval

**Implementation:**
```javascript
class SemanticMemory {
  constructor() {
    this.db = null; // SQLite database
  }
  
  async initialize() {
    // Create semantic memory table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS semantic_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        summary TEXT NOT NULL,
        topics TEXT, -- JSON array of topics
        participants TEXT, -- JSON array of user IDs
        message_count INTEGER,
        start_timestamp INTEGER,
        end_timestamp INTEGER,
        embedding BLOB, -- Vector embedding for semantic search
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_semantic_channel ON semantic_memory(channel_id);
      CREATE INDEX idx_semantic_topics ON semantic_memory(topics);
      CREATE INDEX idx_semantic_timestamp ON semantic_memory(end_timestamp DESC);
    `);
  }
  
  async summarizeAndStore(channelId, guildId, messages) {
    // Use Gemini to create summary
    const summary = await this.generateSummary(messages);
    const topics = await this.extractTopics(summary);
    const participants = [...new Set(messages.map(m => m.userId))];
    
    // Generate embedding for semantic search
    const embedding = await this.generateEmbedding(summary);
    
    // Store in database
    this.db.run(`
      INSERT INTO semantic_memory 
      (channel_id, guild_id, summary, topics, participants, message_count, start_timestamp, end_timestamp, embedding)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      channelId,
      guildId,
      summary,
      JSON.stringify(topics),
      JSON.stringify(participants),
      messages.length,
      messages[0].timestamp,
      messages[messages.length - 1].timestamp,
      embedding
    ]);
  }
  
  async search(query, channelId, limit = 5) {
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Semantic search using cosine similarity
    const memories = this.db.all(`
      SELECT id, summary, topics, participants, start_timestamp, end_timestamp
      FROM semantic_memory
      WHERE channel_id = ?
      ORDER BY end_timestamp DESC
      LIMIT 20
    `, [channelId]);
    
    // Score by relevance
    const scored = memories.map(mem => ({
      ...mem,
      score: this.cosineSimilarity(queryEmbedding, mem.embedding)
    }));
    
    // Return top matches
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  async generateSummary(messages) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const conversation = messages.map(m => 
      `${m.username}: ${m.content}`
    ).join('\n');
    
    const prompt = `Summarize this Discord conversation in 2-3 sentences. Focus on key topics, decisions, and action items:\n\n${conversation}`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
  
  async extractTopics(text) {
    // Simple keyword extraction (can be enhanced with NLP)
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    
    return words
      .filter(w => w.length > 3 && !stopWords.has(w))
      .slice(0, 10);
  }
  
  async generateEmbedding(text) {
    // Use Gemini embedding API or simple TF-IDF
    // For now, placeholder
    return Buffer.from(text);
  }
  
  cosineSimilarity(a, b) {
    // Placeholder - implement actual cosine similarity
    return Math.random();
  }
}
```

**Storage:** SQLite database (persistent)

**Retention:** Indefinite (with optional cleanup of old memories)

**Use Case:** "Remember that ESP project we discussed last week?", "What did we decide about the API?"

---

### 3. User Preferences (Optional)

**Purpose:** Store long-lived user-specific preferences and interaction styles

**Implementation:**
```javascript
class UserPreferences {
  constructor() {
    this.db = null;
  }
  
  async initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        personality TEXT, -- Preferred bot personality
        timezone TEXT,
        language TEXT,
        notification_style TEXT,
        interaction_history TEXT, -- JSON: common commands, topics
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  
  async get(userId) {
    return this.db.get('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
  }
  
  async set(userId, preferences) {
    this.db.run(`
      INSERT INTO user_preferences (user_id, personality, timezone, language, notification_style, interaction_history, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        personality = excluded.personality,
        timezone = excluded.timezone,
        language = excluded.language,
        notification_style = excluded.notification_style,
        interaction_history = excluded.interaction_history,
        updated_at = CURRENT_TIMESTAMP
    `, [
      userId,
      preferences.personality,
      preferences.timezone,
      preferences.language,
      preferences.notificationStyle,
      JSON.stringify(preferences.interactionHistory)
    ]);
  }
}
```

**Storage:** SQLite database (persistent)

**Use Case:** Personalization, preferred interaction style, recurring projects

---

## Context Reconstruction

### Relevance Detection

**Triggers for Context Retrieval:**
1. **Explicit References**
   - "remember when..."
   - "that project we discussed..."
   - "like I said earlier..."

2. **Implicit References**
   - Follow-up questions without context
   - Pronouns referring to previous topics
   - Continuation of interrupted conversations

3. **Entity Mentions**
   - Bot mentions
   - User mentions
   - Project/topic names

**Implementation:**
```javascript
class ContextReconstructor {
  constructor(shortTermMemory, semanticMemory, userPreferences) {
    this.shortTerm = shortTermMemory;
    this.semantic = semanticMemory;
    this.userPrefs = userPreferences;
  }
  
  async reconstruct(message, channelId, userId) {
    const context = {
      shortTerm: [],
      semantic: [],
      userPrefs: null,
      totalTokens: 0
    };
    
    // 1. Always include recent short-term context
    context.shortTerm = this.shortTerm.getContext(channelId, 2000);
    context.totalTokens += this.estimateTokens(context.shortTerm);
    
    // 2. Detect if semantic memory is needed
    const needsHistory = this.detectHistoryNeed(message.content);
    
    if (needsHistory) {
      // Search semantic memory
      const memories = await this.semantic.search(message.content, channelId, 3);
      context.semantic = memories;
      context.totalTokens += this.estimateTokens(memories);
    }
    
    // 3. Load user preferences if available
    const prefs = await this.userPrefs.get(userId);
    if (prefs) {
      context.userPrefs = prefs;
      context.totalTokens += 100; // Rough estimate
    }
    
    // 4. Compress if over budget
    if (context.totalTokens > 6000) {
      context = this.compressContext(context, 6000);
    }
    
    return context;
  }
  
  detectHistoryNeed(content) {
    const triggers = [
      /remember/i,
      /earlier/i,
      /before/i,
      /last (week|month|time)/i,
      /that (project|discussion|conversation)/i,
      /we (talked|discussed|decided)/i,
      /you (said|mentioned|told)/i
    ];
    
    return triggers.some(pattern => pattern.test(content));
  }
  
  compressContext(context, maxTokens) {
    // Prioritize: short-term > semantic > user prefs
    let budget = maxTokens;
    
    // Keep all short-term (most important)
    const shortTermTokens = this.estimateTokens(context.shortTerm);
    budget -= shortTermTokens;
    
    // Trim semantic memories
    if (budget < this.estimateTokens(context.semantic)) {
      context.semantic = context.semantic.slice(0, Math.floor(budget / 500));
    }
    
    return context;
  }
  
  estimateTokens(data) {
    const text = JSON.stringify(data);
    return Math.ceil(text.length / 4);
  }
}
```

---

## Interaction Models

### 1. Slash Commands (Structured)

**Use Case:** Discoverability, complex operations with parameters

**Example:**
```
/network scan
/device wake mac:AA:BB:CC:DD:EE:FF
/automation health report
```

**Handler:** Existing slash command system

---

### 2. Prefix Commands (Quick)

**Use Case:** Fast, familiar commands for power users

**Example:**
```
!help
?status
.ping
```

**Implementation:**
```javascript
const PREFIX_PATTERNS = {
  '!': 'command',
  '?': 'query',
  '.': 'quick'
};

function detectPrefix(message) {
  const firstChar = message.content[0];
  if (PREFIX_PATTERNS[firstChar]) {
    return {
      type: PREFIX_PATTERNS[firstChar],
      command: message.content.slice(1).trim()
    };
  }
  return null;
}
```

---

### 3. Natural Language (Conversational)

**Use Case:** Casual interaction, questions, requests

**Example:**
```
"What's the weather like?"
"Can you check if the bot is running?"
"Show me the last 10 speed tests"
```

**Handler:** Gemini with intent detection

---

### 4. Mention-Based (Direct)

**Use Case:** Explicitly addressing the bot

**Example:**
```
@bot what's the server status?
@bot help me debug this error
```

**Handler:** Conversational with high priority

---

### 5. Passive Triggers (Automatic)

**Use Case:** Helpful interventions without explicit requests

**Examples:**
- **Code Block Detection** → Offer to analyze/explain
- **Error Log Detection** → Suggest solutions
- **Long Message** → Offer to summarize
- **Question Pattern** → Provide answer

**Implementation:**
```javascript
const PASSIVE_TRIGGERS = [
  {
    name: 'code-block',
    pattern: /```[\s\S]+```/,
    handler: async (message) => {
      return "I noticed you shared code. Would you like me to review it or explain what it does?";
    }
  },
  {
    name: 'error-log',
    pattern: /error|exception|failed|traceback/i,
    handler: async (message) => {
      return "I see an error message. Would you like help troubleshooting?";
    }
  },
  {
    name: 'long-message',
    threshold: 1000, // characters
    handler: async (message) => {
      return "That's a lot of text! Would you like me to summarize it?";
    }
  }
];
```

---

## Modular Architecture

### Plugin System Enhancement

**Current State:** Plugins can add slash commands

**Future State:** Plugins can add:
- Conversational intents
- Passive triggers
- Context providers
- Memory extensions
- Custom interaction models

**Example Plugin:**
```javascript
export default class CodeReviewPlugin extends Plugin {
  constructor() {
    super('code-review', '1.0.0', 'AI-powered code review');
  }
  
  // Register conversational intents
  getIntents() {
    return [
      {
        name: 'review-code',
        patterns: [
          /review (this|my) code/i,
          /what('s| is) wrong with this/i,
          /can you check this/i
        ],
        handler: this.handleCodeReview.bind(this)
      }
    ];
  }
  
  // Register passive triggers
  getTriggers() {
    return [
      {
        name: 'code-block-detected',
        pattern: /```(javascript|python|java)[\s\S]+```/,
        handler: this.offerReview.bind(this)
      }
    ];
  }
  
  // Provide context for AI
  async provideContext(message) {
    // Return relevant context for code review
    return {
      recentCodeBlocks: await this.getRecentCode(message.channelId),
      userLanguagePreference: await this.getUserLanguage(message.author.id)
    };
  }
  
  async handleCodeReview(message, context) {
    // Extract code from message or context
    const code = this.extractCode(message.content);
    
    // Use Gemini to review
    const review = await this.reviewCode(code);
    
    return {
      content: review,
      embeds: [{
        title: '🔍 Code Review',
        description: review,
        color: 0x00FF00
      }]
    };
  }
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Implement short-term memory system
- [ ] Create message router with interaction detection
- [ ] Add basic conversational handler
- [ ] Integrate with existing Gemini chat

### Phase 2: Memory System (Week 3-4)
- [ ] Implement semantic memory storage
- [ ] Add conversation summarization
- [ ] Create context reconstruction logic
- [ ] Build relevance scoring

### Phase 3: Interaction Models (Week 5-6)
- [ ] Add prefix command support
- [ ] Implement passive triggers
- [ ] Enhance mention-based interaction
- [ ] Create intent detection system

### Phase 4: Plugin Enhancement (Week 7-8)
- [ ] Extend plugin API for intents
- [ ] Add trigger registration
- [ ] Implement context providers
- [ ] Create example plugins

### Phase 5: Optimization (Week 9-10)
- [ ] Token budget optimization
- [ ] Memory cleanup strategies
- [ ] Performance tuning
- [ ] User testing and feedback

---

## Configuration

```env
# Conversational AI Settings
CONVERSATIONAL_AI_ENABLED=true
CONVERSATIONAL_AI_MODEL=gemini-1.5-pro

# Memory Settings
SHORT_TERM_MAX_TOKENS=4000
SHORT_TERM_MAX_MESSAGES=50
SEMANTIC_MEMORY_ENABLED=true
SEMANTIC_MEMORY_RETENTION_DAYS=90
USER_PREFERENCES_ENABLED=true

# Interaction Settings
PREFIX_COMMANDS_ENABLED=true
PASSIVE_TRIGGERS_ENABLED=true
MENTION_REQUIRED=false  # Respond without mention in DMs

# Context Settings
MAX_CONTEXT_TOKENS=6000
SEMANTIC_SEARCH_LIMIT=5
CONTEXT_COMPRESSION_ENABLED=true
```

---

## Success Metrics

1. **Conversational Quality**
   - Response relevance score
   - Context accuracy
   - User satisfaction ratings

2. **Memory Effectiveness**
   - Context retrieval accuracy
   - Token efficiency
   - Memory hit rate

3. **Interaction Diversity**
   - % of natural language vs commands
   - Passive trigger engagement
   - Mention-based interactions

4. **System Performance**
   - Response latency
   - Memory footprint
   - Token usage per conversation

---

## Conclusion

This architecture transforms the bot from a command-driven tool into an intelligent conversational participant while maintaining the existing command structure for discoverability and power users.

Key benefits:
- **Natural Interaction** - Users can talk to the bot naturally
- **Contextual Awareness** - Bot remembers relevant past conversations
- **Modular Design** - Easy to extend and maintain
- **Flexible Interaction** - Multiple ways to interact
- **Intelligent Memory** - Selective, not overwhelming

The system is designed to scale gracefully, with clear token budgets, compression strategies, and modular components that can evolve independently.
