# Conversational AI Plugin

**Version:** 2.0.0  
**Category:** AI  
**Author:** Discord Maid Bot Team

Transform your Discord bot from a command-driven tool into an intelligent conversational participant with contextual memory, natural language understanding, and modular extensibility.

## Features

### 🧠 Intelligent Memory System
- **Short-Term Memory** - Rolling window of recent messages per channel (up to 4000 tokens, 50 messages)
- **Semantic Memory** - Long-term storage of conversation summaries (coming soon)
- **Context Reconstruction** - Intelligently assembles relevant context for each response

### 💬 Multi-Modal Interaction
- **Slash Commands** - `/chat`, `/memory`, `/ai` for structured interactions
- **Prefix Commands** - `!help`, `?status`, `.ping` for quick actions
- **Mentions** - `@bot what's the weather?` for direct addressing
- **Natural Language** - Conversational responses in DMs
- **Passive Triggers** - Automatic detection of code blocks, errors, long messages

### 🎭 Personality Integration
- Seamless integration with the Personality plugin
- Per-user personality preferences
- Context-aware personality application

### 🔗 Reply Context Awareness
- Understands when users reply to previous messages
- Extracts content from bot embeds (games, research, etc.)
- Allows follow-up questions about any previous response

## Commands

| Command | Description |
|---------|-------------|
| `/chat <message>` | Chat with the AI bot |
| `/memory view` | View short-term memory for this channel |
| `/memory clear` | Clear short-term memory for this channel |
| `/memory search <query>` | Search semantic memory |
| `/memory stats` | View memory statistics |
| `/ai settings` | View AI configuration |
| `/ai context` | Show current context being used |
| `/ai personality <style>` | Quick personality switch |

## Prefix Commands

| Prefix | Type | Example |
|--------|------|---------|
| `!` | Command | `!help`, `!status` |
| `?` | Query | `?weather`, `?devices` |
| `.` | Quick Action | `.ping`, `.scan` |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Discord Message                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Message Router                                │
│  • Classify: slash | prefix | mention | natural | passive       │
│  • Route to appropriate handler                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┬───────────────┐
         │               │               │               │
         ▼               ▼               ▼               ▼
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│  Command   │  │  Prefix    │  │Conversational│ │  Passive   │
│  Handler   │  │  Handler   │  │   Handler   │  │  Triggers  │
└────────────┘  └────────────┘  └──────┬──────┘  └────────────┘
                                       │
                                       ▼
                          ┌────────────────────────┐
                          │   Context Manager      │
                          │  • Short-Term Memory   │
                          │  • Semantic Memory     │
                          │  • Reply Context       │
                          └────────────┬───────────┘
                                       │
                                       ▼
                          ┌────────────────────────┐
                          │   Gemini AI Engine     │
                          │  • Response generation │
                          │  • Personality applied │
                          └────────────────────────┘
```

## Configuration

Configure via environment variables:

```env
# Memory Settings
CONVERSATIONAL_AI_SHORT_TERM_MAX_TOKENS=4000
CONVERSATIONAL_AI_SHORT_TERM_MAX_MESSAGES=50
CONVERSATIONAL_AI_SEMANTIC_MEMORY_ENABLED=true
CONVERSATIONAL_AI_SEMANTIC_MEMORY_RETENTION_DAYS=90

# Interaction Settings
CONVERSATIONAL_AI_PREFIX_COMMANDS_ENABLED=true
CONVERSATIONAL_AI_PASSIVE_TRIGGERS_ENABLED=true
CONVERSATIONAL_AI_MENTION_REQUIRED=false

# Context Settings
CONVERSATIONAL_AI_MAX_CONTEXT_TOKENS=6000
CONVERSATIONAL_AI_SEMANTIC_SEARCH_LIMIT=5
```

## Documentation

- [Commands Reference](COMMANDS.md)
- [Usage Examples](EXAMPLES.md)
- [API Reference](API.md)
- [Changelog](CHANGELOG.md)

## Dependencies

- **Optional:** `personality` plugin for personality support

## Support

For issues or questions, please open an issue on GitHub.
