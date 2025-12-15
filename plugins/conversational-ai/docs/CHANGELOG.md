# Conversational AI - Changelog

All notable changes to the Conversational AI plugin.

## [2.0.0] - 2025-12-15

### 🚀 Major Release - Intelligent Conversational AI

This release transforms the bot from a simple chat command into a full conversational AI system with memory, context awareness, and multi-modal interaction.

### Added

#### Memory System
- **Short-Term Memory** - Rolling window of recent messages per channel
  - Configurable token limit (default: 4000)
  - Configurable message limit (default: 50)
  - Automatic trimming to stay within budget
  - Per-channel isolation

- **Semantic Memory** - Long-term conversation storage (foundation)
  - Database schema for persistent storage
  - Search functionality
  - Cleanup for retention policy

- **Context Reconstructor** - Intelligent context assembly
  - Combines short-term and semantic memory
  - Detects when historical context is needed
  - Token budget management with priority-based compression

#### New Commands
- `/memory view` - View short-term memory for channel
- `/memory clear` - Clear channel memory
- `/memory search` - Search semantic memory
- `/memory stats` - View memory statistics
- `/ai settings` - View AI configuration
- `/ai context` - Show current context
- `/ai personality` - Quick personality switch with autocomplete

#### Interaction Modes
- **Prefix Commands** - `!`, `?`, `.` prefixes for quick actions
  - `!` for commands (help, status)
  - `?` for queries (weather, devices)
  - `.` for quick actions (ping, scan)
  - Typo suggestions for invalid commands

- **Mention Detection** - `@bot` triggers conversation
  - Shows help if no content after mention
  - Full context-aware responses

- **Passive Triggers** - Automatic detection
  - Code block detection (offers to analyze)
  - Error keyword detection (offers troubleshooting)
  - Long message detection (offers to summarize)
  - Configurable enable/disable

#### Reply Context Awareness
- Detects when users reply to previous messages
- Extracts content from bot embeds (games, research, etc.)
- Includes reply context in AI prompt
- Stores reply reference in memory

#### Response Handler
- Full context integration
- Personality-aware responses
- Automatic memory updates
- Network context support

#### Configuration System
- Environment variable configuration
- Validation with min/max bounds
- Sensible defaults
- Runtime configuration access

#### Testing
- 69 property-based tests using fast-check
- 13 correctness properties validated
- 8 test files covering all components

### Changed
- `/chat` command now uses full context system
- Response footer shows context stats
- Plugin version bumped to 2.0.0

### Technical Details
- New directory structure:
  - `memory/` - Short-term and semantic memory
  - `router/` - Message router and prefix handler
  - `context/` - Context reconstructor
  - `handlers/` - Response and message handlers
  - `triggers/` - Passive trigger system
  - `commands/` - Slash command definitions

---

## [1.0.0] - 2024-XX-XX

### Initial Release
- Basic `/chat` command
- Gemini AI integration
- Personality support
- Chat history tracking

---

## Roadmap

### [2.1.0] - Planned
- [ ] Full semantic memory with AI summarization
- [ ] Vector embeddings for semantic search
- [ ] User preferences storage
- [ ] Custom trigger registration API

### [2.2.0] - Planned
- [ ] Multi-language support
- [ ] Conversation export
- [ ] Memory visualization dashboard
- [ ] Plugin extension API for custom intents

---

## Migration Guide

### From 1.x to 2.0

The 2.0 release is backwards compatible. Existing `/chat` usage continues to work.

**New features to try:**
1. Use `/memory view` to see conversation context
2. Use `/ai personality` for quick personality changes
3. Try replying to bot messages for follow-up questions
4. Use prefix commands like `!help` for quick actions

**Configuration changes:**
- New environment variables available (all optional with defaults)
- See README.md for full configuration options
