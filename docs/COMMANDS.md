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
Scan both local and Tailscale networks for devices (unified scan).

```
/scan
```

**Features:**
- Scans local network (192.168.x.x)
- Scans Tailscale VPN network
- Shows devices grouped by network type
- Displays friendly names if assigned
- Shows latency and online status

**Example Output:**
```
📡 Unified Network Scan Results
Total: 15 devices (12 online)
├─ 🏠 Local Network: 12 devices
└─ 🌐 Tailscale: 3 devices
```

---

### /namedevice
Assign a friendly name to a device.

```
/namedevice <device> <name>
```

**Options:**
- `device` (required) - Device MAC, IP, or current name (autocomplete)
- `name` (required) - Friendly name to assign

**Example:**
```
/namedevice device:aa:bb:cc:dd:ee:ff name:Gaming PC
```

**Features:**
- Autocomplete shows all known devices
- Names persist across scans
- Names appear in all device lists
- Prioritizes devices with existing names

---

### /wol
Send Wake-on-LAN magic packet to a device.

```
/wol <device>
```

**Options:**
- `device` (required) - Device MAC address (autocomplete)

**Example:**
```
/wol device:aa:bb:cc:dd:ee:ff
```

**Features:**
- Autocomplete shows device names if assigned
- Shows device status and info
- Requires Operator+ permission

---

### /devices
List all known network devices.

```
/devices [filter]
```

**Options:**
- `filter` - Show: `all`, `online`, or `offline`

**Features:**
- Shows friendly names if assigned
- Displays IP, MAC, and status
- Shows device notes

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

### /homeassistant
Unified Home Assistant control command with multiple subcommands.

#### Subcommands:

**lights** - List all lights
```
/homeassistant lights
```

**light** - Control a specific light
```
/homeassistant light entity:<entity_id> action:<on|off|toggle>
```
- Autocomplete available for entity selection
- Shows current state (💡 on / ⚫ off)

**switches** - List all switches
```
/homeassistant switches
```

**switch** - Control a specific switch
```
/homeassistant switch entity:<entity_id> action:<on|off|toggle>
```
- Autocomplete available for entity selection

**sensors** - List all sensors
```
/homeassistant sensors
```

**sensor** - View specific sensor data
```
/homeassistant sensor entity:<entity_id>
```
- Shows current value with unit of measurement

**scenes** - List all scenes (Admin only)
```
/homeassistant scenes
```

**scene** - Activate a scene (Admin only)
```
/homeassistant scene entity:<scene_id>
```
- Autocomplete available (🎬 icon)
- Requires CONTROL_LIGHTS permission

**automations** - List all automations (Admin only)
```
/homeassistant automations
```

**automation** - Trigger an automation (Admin only)
```
/homeassistant automation entity:<automation_id> action:<trigger|on|off>
```
- Autocomplete available (▶️ on / ⏸️ off)
- Requires TRIGGER_AUTOMATION permission

**scripts** - List all scripts (Admin only)
```
/homeassistant scripts
```

**script** - Run a script (Admin only)
```
/homeassistant script entity:<script_id>
```
- Autocomplete available (📜 icon)
- Requires RUN_SCRIPT permission

**climate** - List all climate devices (Admin only)
```
/homeassistant climate
```

**diagnose** - Test Home Assistant connection
```
/homeassistant diagnose
```
- Shows connection status
- Lists available entities
- Detects ESPHome devices

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

| Command | Default Access | Required Permission |
|---------|---------------|---------------------|
| `/chat`, `/personality` | Everyone | - |
| `/scan`, `/wake` | Operator+ | SCAN_NETWORK, WAKE_DEVICE |
| `/speedtest` | Operator+ | RUN_SPEEDTEST |
| `/research` | Operator+ | RESEARCH |
| All games | Everyone | - |
| `/schedule` | Admin | MANAGE_TASKS |
| `/config` | Admin | MANAGE_CONFIG |
| `/homeassistant lights/switches/sensors` | Operator+ | VIEW_DEVICES |
| `/homeassistant light/switch` | Operator+ | CONTROL_LIGHTS, CONTROL_SWITCHES |
| `/homeassistant scene` | Admin | CONTROL_LIGHTS |
| `/homeassistant automation` | Admin | TRIGGER_AUTOMATION |
| `/homeassistant script` | Admin | RUN_SCRIPT |
| `/homeassistant climate` | Operator+ | CONTROL_CLIMATE |

**Permission Roles:**
- **Admin**: All permissions
- **Operator**: All except MANAGE_CONFIG, MANAGE_TASKS, TRIGGER_AUTOMATION, RUN_SCRIPT, ACTIVATE_SCENE
- **User**: Basic commands only (chat, games)

Permissions can be customized via dashboard.
