# Conversational AI Plugin

**Version:** 2.1.0  
**Category:** AI  
**Author:** Discord Maid Bot Team  
**Last Updated:** December 15, 2025

Transform your Discord bot from a command-driven tool into an intelligent conversational participant with contextual memory, natural language understanding, **56 AI-powered action commands**, and modular extensibility.

## 🆕 What's New in 2.1.0

### 56 Natural Language Actions
Users can now control the bot by simply chatting! No need to memorize slash commands.

**Examples:**
```
"Scan the network"           → Runs /network scan
"Wake up my gaming PC"       → Sends Wake-on-LAN
"What's the weather?"        → Gets weather info
"Play trivia"                → Starts a game
"Show unhealthy devices"     → Lists devices with issues
"Is the bot running?"        → Shows server status
"Change personality to tsundere" → Switches bot personality
"List my reminders"          → Shows active reminders
```

### AI Intent Classification
Uses Gemini AI to intelligently classify user intent and route to the appropriate action with high accuracy.

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

### 🤖 AI Action Executor (56 Actions)
- **Network & Devices (10)** - scan, wake, shutdown, rename, groups, tailscale
- **Device Health (5)** - health reports, alerts, reliability metrics
- **Speed & Internet (3)** - speedtest, history, alert config
- **Server Admin (6)** - status, logs, restart, deploy, SSH
- **Discord Moderation (7)** - kick, ban, timeout, roles, channels
- **Games (3)** - play, list, leaderboard
- **Reminders & Automation (5)** - create, list, delete, scheduled tasks
- **Smart Home (3)** - weather, Home Assistant control
- **Research & Info (3)** - AI research, web search, help
- **User & Bot (8)** - stats, profiles, personalities, plugins
- **Utilities (3)** - dashboard, insights history

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

## Natural Language Actions

Just chat with the bot! Examples:

| Say This | Action Executed |
|----------|-----------------|
| "scan the network" | `network-scan` |
| "wake up [device]" | `wake-device` |
| "run a speed test" | `speedtest` |
| "what's the weather" | `weather` |
| "play trivia" | `game-play` |
| "show device health" | `device-health` |
| "list my reminders" | `reminder-list` |
| "restart the bot" | `server-restart` |
| "kick @user" | `discord-kick` |
| "change personality to butler" | `personality-change` |
| "show unhealthy devices" | `device-health-unhealthy` |
| "what plugins are loaded" | `plugin-list` |
| "where's the dashboard" | `dashboard-url` |

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
