# Discord Commands Reference

## Chat & AI

### /chat
Talk to the AI maid assistant.

```
/chat message:<your message>
```

**Options:**
- `message` (required) - What you want to say

**Example:**
```
/chat message:What's the weather like today?
```

---

### /personality
Change the bot's personality.

```
/personality [style]
```

**Options:**
- `style` - Choose from: maid, tsundere, kuudere, dandere, yandere, genki, oneesan, chuunibyou, butler, catgirl

**Example:**
```
/personality style:tsundere
```

---

## Network Tools

### /scan
Scan the local network for devices.

```
/scan [network]
```

**Options:**
- `network` - Network type: `local` or `tailscale`

**Example:**
```
/scan network:local
```

---

### /wake
Send Wake-on-LAN magic packet to a device.

```
/wake <device>
```

**Options:**
- `device` (required) - Device name or MAC address

**Example:**
```
/wake device:gaming-pc
```

---

### /devices
List all known network devices.

```
/devices [filter]
```

**Options:**
- `filter` - Show: `all`, `online`, or `offline`

---

## Speed Test

### /speedtest
Run an internet speed test.

```
/speedtest
```

Returns download speed, upload speed, and ping.

---

## Research

### /research
Perform AI-powered web research.

```
/research <topic>
```

**Options:**
- `topic` (required) - What to research

**Example:**
```
/research topic:best practices for Discord bots
```

---

## Games

### /trivia
Start a trivia game.

```
/trivia [category] [difficulty] [rounds]
```

**Options:**
- `category` - Topic category
- `difficulty` - easy, medium, hard
- `rounds` - Number of questions (1-20)

---

### /wordchain
Start a word chain game.

```
/wordchain [start] [trust_mode]
```

**Options:**
- `start` - Starting word
- `trust_mode` - Skip word validation (honor system)

---

### /hangman
Play hangman.

```
/hangman [category]
```

**Options:**
- `category` - Word category

---

### /tictactoe
Play tic-tac-toe against another player.

```
/tictactoe <opponent>
```

**Options:**
- `opponent` (required) - User to play against

---

### /connectfour
Play Connect Four.

```
/connectfour <opponent>
```

**Options:**
- `opponent` (required) - User to play against

---

### /rps
Play Rock Paper Scissors.

```
/rps <opponent> [rounds]
```

**Options:**
- `opponent` (required) - User to play against
- `rounds` - Best of 3, 5, or 7

---

### /numguess
Guess the number game.

```
/numguess [max]
```

**Options:**
- `max` - Maximum number (default: 100)

---

### /mathblitz
Rapid-fire math problems.

```
/mathblitz [difficulty] [rounds]
```

**Options:**
- `difficulty` - easy, medium, hard
- `rounds` - Number of problems

---

### /riddles
Solve AI-generated riddles.

```
/riddles [difficulty]
```

---

### /reaction
Test your reaction speed.

```
/reaction
```

---

### /storybuilder
Collaborative story writing.

```
/storybuilder [genre]
```

---

### /emojidecode
Guess from emoji clues.

```
/emojidecode [category] [rounds]
```

**Options:**
- `category` - movies, songs, anime, games, tvshows, phrases
- `rounds` - Number of puzzles

---

### /wouldyourather
Would you rather questions.

```
/wouldyourather [rounds]
```

---

### /acronym
Create meanings for acronyms.

```
/acronym [rounds]
```

---

### /caption
Caption contest game.

```
/caption [rounds]
```

---

### /20questions
20 Questions guessing game.

```
/20questions
```

---

### /mafia
Social deduction party game.

```
/mafia
```

Requires 5+ players.

---

### /gamestats
View your game statistics.

```
/gamestats [user] [game]
```

**Options:**
- `user` - Check another user's stats
- `game` - Specific game stats

---

### /leaderboard
View game leaderboards.

```
/leaderboard [game]
```

**Options:**
- `game` - Specific game or global

---

### /stopgame
Stop the current game in channel.

```
/stopgame
```

Requires game starter or admin.

---

## Scheduling

### /schedule
Manage scheduled tasks.

```
/schedule <action> [options]
```

**Actions:**
- `list` - Show all tasks
- `add` - Create new task
- `remove` - Delete task
- `toggle` - Enable/disable task

**Example:**
```
/schedule add name:daily-scan cron:0 9 * * * command:scan
```

---

## Home Assistant

### /lights
Control Home Assistant lights.

```
/lights [action] [entity]
```

**Actions:**
- `list` - Show all lights
- `on` - Turn on
- `off` - Turn off
- `toggle` - Toggle state

---

### /switches
Control Home Assistant switches.

```
/switches [action] [entity]
```

---

### /sensors
View Home Assistant sensor data.

```
/sensors [entity]
```

---

## Admin

### /config
Bot configuration.

```
/config <section> [action]
```

**Sections:**
- `smb` - SMB storage settings
- `homeassistant` - HA connection
- `gemini` - API key stats

---

### /help
Show command help.

```
/help [command]
```

**Options:**
- `command` - Get help for specific command

---

## Command Permissions

| Command | Default Access |
|---------|---------------|
| `/chat`, `/personality` | Everyone |
| `/scan`, `/wake` | Operator+ |
| `/speedtest` | Operator+ |
| `/research` | Operator+ |
| All games | Everyone |
| `/schedule` | Admin |
| `/config` | Admin |

Permissions can be customized via dashboard.
