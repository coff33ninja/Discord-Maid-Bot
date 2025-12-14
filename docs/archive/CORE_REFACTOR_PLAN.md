# Core Refactor & Plugin-First Architecture

## Philosophy

**The core must remain small, stable, and boring.**

The current monolithic core has grown too large. Continuing this pattern will:
- Slow development velocity
- Increase system fragility
- Discourage contributors
- Make testing difficult
- Create tight coupling

**Solution:** Decompose the core into a minimal framework and move all feature logic into plugins.

---

## Core Responsibilities (Minimal by Design)

The core should **only** handle:

### 1. Plugin System
- Plugin discovery and loading
- Lifecycle management (load, enable, disable, reload)
- Dependency resolution
- Hot-reload support
- Plugin isolation and sandboxing

### 2. Event Routing
- Discord event handling
- Message dispatch to plugins
- Event prioritization
- Error boundaries per plugin

### 3. Security & Permissions
- Authentication
- Authorization checks
- Permission enforcement
- Rate limiting
- Abuse protection

### 4. Shared Utilities
- Logging framework
- Configuration management
- Database connections
- Storage interfaces
- HTTP client
- Caching layer

### 5. Context Assembly Framework
- Provides interfaces for context providers
- Assembles context from multiple sources
- Manages token budgets
- **Does NOT contain context logic** (that's plugin territory)

---

## What Should NOT Be in Core

❌ **Feature-Specific Logic**
- Conversational behavior
- Command implementations
- AI prompt strategies
- Memory retrieval logic
- Personality systems
- Response formatting

❌ **Integration Logic**
- Gemini API calls
- Home Assistant integration
- Weather services
- Database queries (beyond connection)

❌ **Business Logic**
- Device management
- Network scanning
- Speed testing
- Game implementations

**Rule of Thumb:** If it can be disabled without breaking the bot, it should be a plugin.

---

## Current State Analysis

### index.js (Current: ~3500 lines)

**What's in there now:**
```
├── Discord client setup (core)
├── Plugin system (core)
├── Authentication (core)
├── Slash command definitions (should be plugins)
├── Command handlers (should be plugins)
├── Chat functionality (should be plugin)
├── Network scanning (should be plugin)
├── Device management (should be plugin)
├── Speed testing (should be plugin)
├── Home Assistant integration (should be plugin)
├── Game implementations (should be plugins)
├── Research functionality (should be plugin)
├── Scheduler (should be plugin)
└── Personality system (should be plugin)
```

**What it should be:**
```
├── Discord client setup (core)
├── Plugin system (core)
├── Authentication (core)
├── Event router (core)
├── Permission enforcer (core)
└── Shared utilities (core)
```

**Target: ~500 lines**

---

## Refactored Architecture

```
discord-maid-bot/
├── src/
│   ├── core/
│   │   ├── bot.js                    # Main bot class (minimal)
│   │   ├── plugin-system.js          # Plugin loader & lifecycle
│   │   ├── event-router.js           # Event dispatch
│   │   ├── permission-manager.js     # Auth & permissions
│   │   ├── rate-limiter.js           # Abuse protection
│   │   └── context-framework.js      # Context assembly interface
│   │
│   ├── shared/                       # Shared utilities
│   │   ├── logger.js
│   │   ├── config.js
│   │   ├── database.js
│   │   ├── cache.js
│   │   └── http-client.js
│   │
│   └── interfaces/                   # Plugin interfaces
│       ├── plugin.js                 # Base plugin class
│       ├── command-provider.js       # Command registration
│       ├── context-provider.js       # Context contribution
│       ├── event-handler.js          # Event subscription
│       └── interaction-handler.js    # Interaction types
│
├── plugins/
│   ├── core-commands/                # Essential commands
│   │   ├── plugin.js
│   │   └── commands/
│   │       ├── help.js
│   │       ├── ping.js
│   │       └── stats.js
│   │
│   ├── conversational-ai/            # Chat & memory
│   │   ├── plugin.js
│   │   ├── chat-handler.js
│   │   ├── memory/
│   │   │   ├── short-term.js
│   │   │   ├── semantic.js
│   │   │   └── user-prefs.js
│   │   └── context-providers/
│   │       ├── conversation.js
│   │       └── user-history.js
│   │
│   ├── network-management/           # Network features
│   │   ├── plugin.js
│   │   ├── scanner.js
│   │   ├── device-manager.js
│   │   └── commands/
│   │
│   ├── automation/                   # Automation features
│   │   ├── plugin.js
│   │   ├── scheduler.js
│   │   ├── triggers.js
│   │   └── commands/
│   │
│   ├── integrations/                 # External services
│   │   ├── home-assistant/
│   │   ├── weather/
│   │   └── speedtest/
│   │
│   ├── games/                        # Game implementations
│   │   ├── trivia/
│   │   ├── wordle/
│   │   └── hangman/
│   │
│   └── personality/                  # Personality system
│       ├── plugin.js
│       ├── personalities/
│       └── response-formatter.js
│
└── index.js                          # Entry point (~100 lines)
```

---

## Migration Strategy

### Phase 1: Foundation (Week 1-2)

**Goal:** Establish core framework without breaking existing functionality

**Tasks:**
1. Create `src/core/` directory structure
2. Extract plugin system to `src/core/plugin-system.js`
3. Create event router in `src/core/event-router.js`
4. Move shared utilities to `src/shared/`
5. Define plugin interfaces in `src/interfaces/`

**Validation:** Existing functionality still works

---

### Phase 2: Core Commands Plugin (Week 3)

**Goal:** Prove the plugin pattern with essential commands

**Tasks:**
1. Create `plugins/core-commands/`
2. Move help, ping, stats to plugin
3. Implement command registration interface
4. Test hot-reload

**Validation:** Commands work identically, can be disabled

---

### Phase 3: Conversational AI Plugin (Week 4-5)

**Goal:** Extract chat and memory systems

**Tasks:**
1. Create `plugins/conversational-ai/`
2. Move chat handler to plugin
3. Implement memory systems as plugin modules
4. Create context provider interface
5. Move personality system to plugin

**Validation:** Chat works identically, memory persists

---

### Phase 4: Network Management Plugin (Week 6)

**Goal:** Extract network features

**Tasks:**
1. Create `plugins/network-management/`
2. Move network scanner
3. Move device management
4. Move related commands
5. Implement device context provider

**Validation:** Network features work, can be disabled

---

### Phase 5: Automation Plugin (Week 7)

**Goal:** Extract scheduler and triggers

**Tasks:**
1. Create `plugins/automation/`
2. Move scheduler
3. Move device triggers
4. Move speed alerts
5. Implement automation context provider

**Validation:** Scheduled tasks work, triggers fire

---

### Phase 6: Integrations Plugins (Week 8)

**Goal:** Extract external service integrations

**Tasks:**
1. Create `plugins/integrations/home-assistant/`
2. Create `plugins/integrations/weather/`
3. Create `plugins/integrations/speedtest/`
4. Implement integration interfaces

**Validation:** Integrations work independently

---

### Phase 7: Games Plugins (Week 9)

**Goal:** Extract game implementations

**Tasks:**
1. Create individual game plugins
2. Implement game framework interface
3. Move trivia, wordle, hangman, etc.

**Validation:** Games work, can be enabled/disabled individually

---

### Phase 8: Cleanup & Optimization (Week 10)

**Goal:** Finalize refactor, optimize core

**Tasks:**
1. Remove dead code from core
2. Optimize plugin loading
3. Improve error handling
4. Add plugin dependency resolution
5. Document plugin API

**Validation:** Core is <500 lines, all features work

---

## Core Architecture

### Minimal Bot Core

```javascript
// src/core/bot.js
import { Client, GatewayIntentBits } from 'discord.js';
import { PluginSystem } from './plugin-system.js';
import { EventRouter } from './event-router.js';
import { PermissionManager } from './permission-manager.js';
import { RateLimiter } from './rate-limiter.js';
import { Logger } from '../shared/logger.js';

export class MaidBot {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('core');
    
    // Core systems
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ]
    });
    
    this.pluginSystem = new PluginSystem(this);
    this.eventRouter = new EventRouter(this);
    this.permissions = new PermissionManager(this);
    this.rateLimiter = new RateLimiter(this);
  }
  
  async start() {
    this.logger.info('Starting Maid Bot...');
    
    // Initialize core systems
    await this.permissions.initialize();
    await this.pluginSystem.initialize();
    
    // Setup event routing
    this.setupEventRouting();
    
    // Login to Discord
    await this.client.login(this.config.token);
    
    this.logger.info('Maid Bot started successfully');
  }
  
  setupEventRouting() {
    // Route Discord events to plugins
    this.client.on('messageCreate', (message) => {
      this.eventRouter.route('message', message);
    });
    
    this.client.on('interactionCreate', (interaction) => {
      this.eventRouter.route('interaction', interaction);
    });
    
    // Add more event routing as needed
  }
  
  async stop() {
    this.logger.info('Stopping Maid Bot...');
    await this.pluginSystem.shutdown();
    await this.client.destroy();
    this.logger.info('Maid Bot stopped');
  }
}
```

### Event Router

```javascript
// src/core/event-router.js
export class EventRouter {
  constructor(bot) {
    this.bot = bot;
    this.handlers = new Map(); // event -> [handlers]
    this.logger = bot.logger.child('event-router');
  }
  
  register(event, handler, priority = 0) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    
    this.handlers.get(event).push({ handler, priority });
    
    // Sort by priority (higher first)
    this.handlers.get(event).sort((a, b) => b.priority - a.priority);
  }
  
  unregister(event, handler) {
    if (!this.handlers.has(event)) return;
    
    const handlers = this.handlers.get(event);
    const index = handlers.findIndex(h => h.handler === handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
  
  async route(event, data) {
    const handlers = this.handlers.get(event) || [];
    
    for (const { handler } of handlers) {
      try {
        // Each handler can stop propagation by returning false
        const result = await handler(data);
        if (result === false) break;
      } catch (error) {
        this.logger.error(`Handler error for event ${event}`, {
          error: error.message,
          handler: handler.name
        });
        // Continue to next handler (error boundary)
      }
    }
  }
}
```

### Plugin Interface

```javascript
// src/interfaces/plugin.js
export class Plugin {
  constructor(name, version, description) {
    this.name = name;
    this.version = version;
    this.description = description;
    this.enabled = true;
    this.bot = null; // Injected by plugin system
  }
  
  // Lifecycle hooks
  async onLoad() {}
  async onEnable() {}
  async onDisable() {}
  async onUnload() {}
  
  // Event handling
  getEventHandlers() {
    // Return: { event: handler, priority: number }[]
    return [];
  }
  
  // Command registration
  getCommands() {
    // Return: SlashCommandBuilder[]
    return [];
  }
  
  // Context providers
  getContextProviders() {
    // Return: { name: string, provider: function }[]
    return [];
  }
  
  // Interaction handlers
  getInteractionHandlers() {
    // Return: { type: string, handler: function }[]
    return [];
  }
  
  // Dependencies
  getDependencies() {
    // Return: string[] (plugin names)
    return [];
  }
  
  // Configuration schema
  getConfigSchema() {
    // Return: JSON schema for plugin config
    return {};
  }
}
```

---

## Plugin Examples

### Core Commands Plugin

```javascript
// plugins/core-commands/plugin.js
import { Plugin } from '../../src/interfaces/plugin.js';
import { SlashCommandBuilder } from 'discord.js';

export default class CoreCommandsPlugin extends Plugin {
  constructor() {
    super('core-commands', '1.0.0', 'Essential bot commands');
  }
  
  getCommands() {
    return [
      new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help information'),
      
      new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency'),
      
      new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Show bot statistics')
    ];
  }
  
  getInteractionHandlers() {
    return [
      {
        type: 'command',
        handler: this.handleCommand.bind(this)
      }
    ];
  }
  
  async handleCommand(interaction) {
    const { commandName } = interaction;
    
    switch (commandName) {
      case 'help':
        return this.handleHelp(interaction);
      case 'ping':
        return this.handlePing(interaction);
      case 'stats':
        return this.handleStats(interaction);
    }
  }
  
  async handleHelp(interaction) {
    // Implementation
  }
  
  async handlePing(interaction) {
    const latency = Date.now() - interaction.createdTimestamp;
    await interaction.reply(`🏓 Pong! Latency: ${latency}ms`);
  }
  
  async handleStats(interaction) {
    // Implementation
  }
}
```

### Conversational AI Plugin

```javascript
// plugins/conversational-ai/plugin.js
import { Plugin } from '../../src/interfaces/plugin.js';
import { ShortTermMemory } from './memory/short-term.js';
import { SemanticMemory } from './memory/semantic.js';
import { ChatHandler } from './chat-handler.js';

export default class ConversationalAIPlugin extends Plugin {
  constructor() {
    super('conversational-ai', '1.0.0', 'AI-powered conversations with memory');
  }
  
  async onLoad() {
    this.shortTermMemory = new ShortTermMemory();
    this.semanticMemory = new SemanticMemory();
    this.chatHandler = new ChatHandler(this);
    
    await this.semanticMemory.initialize();
  }
  
  getEventHandlers() {
    return [
      {
        event: 'message',
        handler: this.handleMessage.bind(this),
        priority: 10 // Higher priority for conversational handling
      }
    ];
  }
  
  getContextProviders() {
    return [
      {
        name: 'conversation-history',
        provider: this.provideConversationContext.bind(this)
      },
      {
        name: 'semantic-memory',
        provider: this.provideSemanticContext.bind(this)
      }
    ];
  }
  
  async handleMessage(message) {
    // Store in short-term memory
    this.shortTermMemory.addMessage(message.channelId, message);
    
    // Check if bot should respond
    if (this.shouldRespond(message)) {
      await this.chatHandler.respond(message);
      return false; // Stop propagation
    }
    
    return true; // Continue to other handlers
  }
  
  shouldRespond(message) {
    // Bot mention, DM, or conversational trigger
    return message.mentions.has(this.bot.client.user) ||
           message.channel.type === 'DM' ||
           this.detectConversationalIntent(message);
  }
  
  async provideConversationContext(channelId) {
    return this.shortTermMemory.getContext(channelId);
  }
  
  async provideSemanticContext(query, channelId) {
    return this.semanticMemory.search(query, channelId);
  }
}
```

---

## Benefits of This Architecture

### 1. Maintainability
- Small, focused modules
- Clear separation of concerns
- Easy to understand and modify

### 2. Testability
- Plugins can be tested in isolation
- Mock core dependencies easily
- Unit tests per plugin

### 3. Flexibility
- Enable/disable features without code changes
- Replace implementations without breaking others
- Experiment with new features safely

### 4. Scalability
- Add features without touching core
- Distribute plugins independently
- Community contributions easier

### 5. Stability
- Core remains stable
- Plugin errors don't crash bot
- Gradual rollout of changes

---

## Migration Rules

### When to Move to Plugin

✅ **Move to plugin if:**
- Feature can be disabled without breaking core
- Logic is domain-specific
- Functionality is self-contained
- Multiple implementations possible
- Users might want to customize it

### When to Keep in Core

✅ **Keep in core if:**
- Required for bot to function
- Shared by all plugins
- Security-critical
- Performance-critical
- Truly universal utility

### When in Doubt

**Start as a plugin.** It's easier to move from plugin → core than core → plugin.

---

## Success Metrics

### Code Metrics
- Core size: <500 lines (target)
- Plugin count: 15+ (target)
- Test coverage: >80% (target)
- Cyclomatic complexity: <10 per function

### Developer Experience
- Time to add new feature: <1 day
- Time to understand codebase: <1 week
- Contributor confidence: High
- Code review time: <2 hours

### System Health
- Plugin load time: <5 seconds
- Memory per plugin: <50MB
- Hot-reload success rate: >95%
- Error isolation: 100%

---

## Conclusion

This refactor transforms the bot from a monolithic application into a flexible platform.

**Key Principles:**
1. **Core is minimal** - Only essential framework
2. **Plugins are powerful** - All features live here
3. **Migration is gradual** - No big-bang rewrites
4. **Stability is paramount** - Users don't notice the change

**End State:**
- Core: ~500 lines (stable, boring)
- Plugins: 15+ (growing, evolving)
- Contributors: Confident
- Users: Happy

The bot becomes a **platform**, not just a tool.
