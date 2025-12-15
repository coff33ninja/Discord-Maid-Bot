# Conversational AI - Commands Reference

**Version:** 2.0.0

Complete command reference for the Conversational AI plugin.

## Slash Commands

### `/chat`

Chat with the AI bot using full context awareness.

**Usage:**
```
/chat message:<your message>
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `message` | String | Yes | Your message to the bot |

**Features:**
- Uses short-term memory for conversation continuity
- Applies your preferred personality
- Tracks conversation in memory
- Shows context stats in footer

**Example:**
```
/chat message:What's the best way to learn Python?
```

---

### `/memory view`

View the short-term memory for the current channel.

**Usage:**
```
/memory view
```

**Response includes:**
- Recent messages (user and bot)
- Message count
- Token count
- Channel reference

**Note:** Memory is ephemeral and cleared on bot restart.

---

### `/memory clear`

Clear the short-term memory for the current channel.

**Usage:**
```
/memory clear
```

**Use cases:**
- Start a fresh conversation
- Clear sensitive information
- Reset context after topic change

---

### `/memory search`

Search semantic memory for past conversations.

**Usage:**
```
/memory search query:<search terms>
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `query` | String | Yes | Search query |

**Note:** Requires semantic memory to be enabled.

---

### `/memory stats`

View memory statistics across all channels.

**Usage:**
```
/memory stats
```

**Response includes:**
- Active channel count
- Total messages stored
- Total tokens used
- Semantic memory status

---

### `/ai settings`

View current AI configuration.

**Usage:**
```
/ai settings
```

**Shows:**
- Memory settings (max tokens, max messages)
- Interaction settings (prefix, passive triggers, mention required)
- Context settings (max context tokens, search limit)

---

### `/ai context`

Show the current context being used for AI responses.

**Usage:**
```
/ai context
```

**Shows:**
- Short-term memory summary
- Current personality
- Semantic memory status
- Channel and user info

---

### `/ai personality`

Quick personality switch with autocomplete.

**Usage:**
```
/ai personality style:<personality>
```

**Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `style` | String | Yes | Personality style (autocomplete enabled) |

**Available personalities** (from personality plugin):
- 🌸 Maid
- 🤖 Assistant
- 😊 Friendly
- And more...

---

## Prefix Commands

Prefix commands provide quick access to common actions.

### Command Prefix (`!`)

Execute commands quickly.

| Command | Description |
|---------|-------------|
| `!help` | Show help information |
| `!status` | Check bot status |
| `!commands` | List available commands |

### Query Prefix (`?`)

Ask questions or query information.

| Command | Description |
|---------|-------------|
| `?weather` | Get weather info |
| `?devices` | List network devices |
| `?status` | Query system status |

### Quick Action Prefix (`.`)

Perform quick actions.

| Command | Description |
|---------|-------------|
| `.ping` | Quick ping test |
| `.scan` | Quick network scan |
| `.wake` | Wake a device |

---

## Mention-Based Interaction

Mention the bot to start a conversation:

```
@Bot what's the weather like today?
@Bot help me debug this error
@Bot explain this code
```

**Behavior:**
- Removes mention from content
- Generates contextual response
- If no content after mention, shows help

---

## Passive Triggers

The bot can automatically detect and respond to certain patterns:

### Code Block Detection
When you share code with triple backticks:
```javascript
console.log("Hello World");
```
Bot offers to analyze or explain the code.

### Error Detection
When messages contain error keywords:
- `error`, `exception`, `failed`, `traceback`

Bot offers troubleshooting assistance.

### Long Message Detection
Messages over 1000 characters trigger an offer to summarize.

---

## Reply Context

When you reply to a previous message, the bot understands the context:

1. **Reply to bot response** - Ask follow-up questions about games, research, etc.
2. **Reply to user message** - Reference what someone else said
3. **Reply to embeds** - Bot extracts content from embedded responses

**Example:**
```
User A: /game play trivia
Bot: [Trivia results embed]
User B: [Replies to bot] What was the answer to question 3?
Bot: [Understands the trivia context and answers]
```

---

## See Also

- [Plugin Overview](README.md)
- [Usage Examples](EXAMPLES.md)
- [API Reference](API.md)
