# Discord Commands Reference

> **📢 New Unified Command Structure!**  
> Commands have been reorganized into 8 main categories for easier navigation.  
> All commands are now grouped logically with subcommands.

---

## Table of Contents

1. [Network Operations](#network-operations) - `/network`
2. [Device Management](#device-management) - `/device`
3. [Automation & Triggers](#automation--triggers) - `/automation`
4. [Research & Search](#research--search) - `/research`
5. [Games](#games) - `/game`
6. [Bot Management](#bot-management) - `/bot`
7. [Administration](#administration) - `/admin`
8. [Home Assistant](#home-assistant) - `/homeassistant`
9. [Standalone Commands](#standalone-commands)
10. [Permissions](#command-permissions)

---

## Network Operations

### `/network`
🌐 Network operations and monitoring

#### `/network scan`
Scan both local and Tailscale networks for devices.

```
/network scan
```

**Features:**
- Scans local network (192.168.x.x)
- Scans Tailscale VPN network
- Shows devices grouped by network type
- Displays friendly names, emojis, and groups
- Shows latency and online status

**Example Output:**
```
📡 Unified Network Scan Results
Total: 15 devices (12 online)
├─ 🏠 Local Network: 12 devices
└─ 🌐 Tailscale: 3 devices

🏠 Local Network
  1. 🎮 Gaming PC 📁Gaming
     192.168.0.100 | aa:bb:cc:dd:ee:ff | 2ms
```

---

#### `/network devices`
List all known network devices.

```
/network devices [filter]
```

**Options:**
- `filter` - Show: `all`, `online`, or `offline` (default: online)

**Features:**
- Shows friendly names, emojis, and groups
- Displays IP, MAC, and status
- Filterable by status

---

#### `/network wol`
Send Wake-on-LAN magic packet to a device.

```
/network wol device:<device>
```

**Options:**
- `device` (required) - Device to wake (autocomplete)

**Example:**
```
/network wol device:Gaming PC
```

**Features:**
- Autocomplete shows device names with status
- Requires Operator+ permission

---

#### `/network speedtest`
Run an internet speed test.

```
/network speedtest
```

**Returns:**
- Download speed (Mbps)
- Upload speed (Mbps)
- Ping (ms)
- ISP information

---

#### `/network speedhistory`
View speed test history.

```
/network speedhistory [days]
```

**Options:**
- `days` - Number of days to show (1-30, default: 7)

**Features:**
- Shows historical speed test results
- Displays trends and averages
- Filterable by time period

---

## Device Management

### `/device`
📱 Device management and configuration

#### `/device config`
Configure device properties (name, emoji, group) in one command.

```
/device config device:<device> [name:<name>] [emoji:<emoji>] [group:<group>]
```

**Options:**
- `device` (required) - Device to configure (autocomplete)
- `name` - Friendly name to assign
- `emoji` - Emoji to display (e.g., 🎮 💻 📱 🖥️)
- `group` - Group name (e.g., Family Devices, IoT)

**Examples:**
```
/device config device:192.168.0.100 name:Gaming PC emoji:🎮 group:Gaming
/device config device:Gaming PC emoji:💻
/device config device:aa:bb:cc:dd:ee:ff name:Smart Light group:IoT Devices
```

**Features:**
- All fields optional - update only what you want
- Autocomplete shows all known devices
- Changes persist across scans

---

#### `/device group assign`
Assign a device to a group.

```
/device group assign device:<device> group:<group_name>
```

**Options:**
- `device` (required) - Device to assign (autocomplete)
- `group` (required) - Group name (creates if doesn't exist)

**Example:**
```
/device group assign device:Gaming PC group:Family Devices
```

---

#### `/device group addmultiple`
Add multiple devices to a group at once.

```
/device group addmultiple group:<group> device1:<device> [device2:<device>] ...
```

**Options:**
- `group` (required) - Group name
- `device1` (required) - First device (autocomplete)
- `device2-5` - Additional devices (autocomplete)

**Example:**
```
/device group addmultiple group:IoT Devices device1:Smart Light device2:Smart Plug device3:Thermostat
```

**Features:**
- Add up to 5 devices at once
- Shows success/failure for each device

---

#### `/device group assignpattern`
Assign devices by name pattern matching.

```
/device group assignpattern group:<group> pattern:<pattern>
```

**Options:**
- `group` (required) - Group name
- `pattern` (required) - Pattern to match (case-insensitive)

**Examples:**
```
/device group assignpattern group:Smart Home pattern:smart
/device group assignpattern group:Phones pattern:phone
```

**Features:**
- Matches against device names and hostnames
- Shows how many devices were assigned

---

#### `/device group assignall`
Bulk assign devices by filter.

```
/device group assignall group:<group> filter:<filter>
```

**Options:**
- `group` (required) - Group name
- `filter` (required) - Which devices to add:
  - `online` - All online devices
  - `offline` - All offline devices
  - `all` - All devices
  - `local` - Local network only
  - `tailscale` - Tailscale only

**Example:**
```
/device group assignall group:Active Devices filter:online
```

---

#### `/device group list`
List all device groups.

```
/device group list
```

**Features:**
- Shows group names
- Displays device count per group
- Shows online/offline status

---

#### `/device group view`
View devices in a specific group.

```
/device group view group:<group_name>
```

**Options:**
- `group` (required) - Group name (autocomplete)

**Features:**
- Shows all devices in the group
- Displays online/offline status
- Shows device details

---

#### `/device group remove`
Remove a device from its group.

```
/device group remove device:<device>
```

**Options:**
- `device` (required) - Device to remove (autocomplete)

---

#### `/device list`
List all known devices with filters.

```
/device list [filter]
```

**Options:**
- `filter` - Show: `all`, `online`, or `offline`

**Features:**
- Same as `/network devices`
- Alternative command for convenience

---

## Automation & Triggers

### `/automation`
⚙️ Automation and triggers

#### `/automation speedalert config`
Configure automatic alerts when internet speed drops below threshold.

```
/automation speedalert config threshold:<mbps> channel:<channel>
```

**Options:**
- `threshold` (required) - Alert when speed drops below (Mbps)
- `channel` (required) - Channel to send alerts

**Example:**
```
/automation speedalert config threshold:50 channel:#alerts
```

---

#### `/automation speedalert status`
View current speed alert settings.

```
/automation speedalert status
```

---

#### `/automation speedalert enable`
Enable speed alerts.

```
/automation speedalert enable
```

---

#### `/automation speedalert disable`
Disable speed alerts.

```
/automation speedalert disable
```

---

#### `/automation devicetrigger add`
Create automation rules based on device network status.

```
/automation devicetrigger add name:<name> device:<device> event:<event> action:<action> [options]
```

**Options:**
- `name` (required) - Trigger name
- `device` (required) - Device to monitor (autocomplete, or "any" for unknown devices)
- `event` (required) - When to trigger:
  - `online` - Device comes online
  - `offline` - Device goes offline
  - `unknown` - Unknown device detected
- `action` (required) - What to do:
  - `discord_dm` - Send you a direct message
  - `discord_channel` - Post in a channel
  - `homeassistant` - Control Home Assistant device
- `message` - Custom message
- `channel` - Channel for alerts (if action is discord_channel)
- `ha_entity` - Home Assistant entity (if action is homeassistant, autocomplete)
- `ha_service` - HA service (e.g., light.turn_on, switch.turn_off)

**Examples:**
```
# Get notified when gaming PC comes online
/automation devicetrigger add name:PC Online device:Gaming PC event:online action:discord_dm message:Your PC is ready!

# Turn off lights when phone disconnects
/automation devicetrigger add name:Phone Left device:My Phone event:offline action:homeassistant ha_entity:light.bedroom ha_service:light.turn_off

# Alert on unknown devices
/automation devicetrigger add name:Security Alert device:any event:unknown action:discord_channel channel:#security
```

---

#### `/automation devicetrigger list`
List all device triggers.

```
/automation devicetrigger list
```

**Features:**
- Shows all triggers with status
- Displays trigger details
- Shows enabled/disabled state

---

#### `/automation devicetrigger remove`
Remove a trigger.

```
/automation devicetrigger remove trigger:<trigger>
```

**Options:**
- `trigger` (required) - Trigger to remove (autocomplete)

---

#### `/automation devicetrigger toggle`
Enable or disable a trigger.

```
/automation devicetrigger toggle trigger:<trigger> enabled:<true/false>
```

**Options:**
- `trigger` (required) - Trigger to toggle (autocomplete)
- `enabled` (required) - Enable (true) or disable (false)

---

#### `/automation schedule add`
Add a scheduled task.

```
/automation schedule add name:<name> cron:<expression> command:<command> [channel:<channel>]
```

**Options:**
- `name` (required) - Task name
- `cron` (required) - Cron expression (e.g., "0 9 * * *" for 9 AM daily)
- `command` (required) - Command to run:
  - `scan` - Network scan
  - `speedtest` - Speed test
  - `weather` - Weather update
- `channel` - Channel to post results

**Example:**
```
/automation schedule add name:Daily Scan cron:0 9 * * * command:scan channel:#network
```

---

#### `/automation schedule list`
List all scheduled tasks.

```
/automation schedule list
```

---

#### `/automation schedule remove`
Remove a scheduled task.

```
/automation schedule remove name:<name>
```

---

#### `/automation schedule enable`
Enable a task.

```
/automation schedule enable name:<name>
```

---

#### `/automation schedule disable`
Disable a task.

```
/automation schedule disable name:<name>
```

---

## Research & Search

### `/research`
🔎 Research and search tools

#### `/research query`
Perform AI-powered research on a topic.

```
/research query query:<topic>
```

**Options:**
- `query` (required) - What to research

**Example:**
```
/research query query:best practices for Discord bots
```

**Features:**
- AI-powered research using Gemini
- Comprehensive answers
- Saves to research history

---

#### `/research history`
View past research queries.

```
/research history [limit]
```

**Options:**
- `limit` - Number of results to show (5-50, default: 10)

---

#### `/research search`
Search through past research.

```
/research search query:<terms> [id:<id>]
```

**Options:**
- `query` (required) - Search terms
- `id` - View full result by ID

---

#### `/research web`
Search the web using DuckDuckGo.

```
/research web query:<query> [results:<count>]
```

**Options:**
- `query` (required) - What to search for
- `results` - Number of results (1-10, default: 5)

**Example:**
```
/research web query:Discord.js documentation results:3
```

---

## Games

### `/game`
🎮 Play games

#### `/game trivia`
Play trivia game.

```
/game trivia [category] [difficulty] [rounds]
```

**Options:**
- `category` - General Knowledge, Science, History, Geography, Entertainment, Sports, Random
- `difficulty` - Easy, Medium, Hard
- `rounds` - Number of rounds (1-20)

---

#### `/game hangman`
Play hangman.

```
/game hangman [category] [difficulty]
```

**Options:**
- `category` - Animals, Countries, Movies, Random
- `difficulty` - Easy, Medium, Hard

---

#### `/game wordchain`
Word chain game.

```
/game wordchain [rounds] [trust_mode] [hints]
```

**Options:**
- `rounds` - Number of rounds (5-50)
- `trust_mode` - Skip validation (honor system)
- `hints` - Enable hints

---

#### `/game tictactoe`
Play Tic Tac Toe.

```
/game tictactoe opponent:<user>
```

**Options:**
- `opponent` (required) - Player to challenge

---

#### `/game connect4`
Play Connect Four.

```
/game connect4 opponent:<user>
```

**Options:**
- `opponent` (required) - Player to challenge

---

#### `/game rps`
Rock Paper Scissors.

```
/game rps opponent:<user> [rounds]
```

**Options:**
- `opponent` (required) - Player to challenge
- `rounds` - Best of 3, 5, or 7

---

#### `/game numguess`
Number guessing game.

```
/game numguess [max]
```

**Options:**
- `max` - Maximum number (10-1000)

---

#### `/game riddle`
Riddle game.

```
/game riddle [difficulty]
```

**Options:**
- `difficulty` - Easy, Medium, Hard

---

#### `/game 20questions`
20 Questions with AI.

```
/game 20questions [category]
```

**Options:**
- `category` - Animals, Objects, People, Places, Random

---

#### `/game emojidecode`
Guess from emojis.

```
/game emojidecode [category]
```

**Options:**
- `category` - Movies, Songs, Books, Random

---

#### `/game wouldyourather`
Would You Rather.

```
/game wouldyourather [category]
```

**Options:**
- `category` - Funny, Serious, Random

---

#### `/game caption`
Caption contest.

```
/game caption
```

---

#### `/game acronym`
Acronym game.

```
/game acronym [length]
```

**Options:**
- `length` - Acronym length (3-6)

---

#### `/game story`
Collaborative story builder.

```
/game story [genre] [rounds]
```

**Options:**
- `genre` - Fantasy, Sci-Fi, Horror, Comedy, Random
- `rounds` - Number of rounds (3-20)

---

#### `/game mathblitz`
Math blitz.

```
/game mathblitz [difficulty] [rounds]
```

**Options:**
- `difficulty` - Easy, Medium, Hard
- `rounds` - Number of rounds (5-30)

---

#### `/game reaction`
Reaction race.

```
/game reaction
```

---

#### `/game mafia`
Mafia/Werewolf game.

```
/game mafia [players]
```

**Options:**
- `players` - Number of players (5-20)

---

#### `/game stats`
View your game statistics.

```
/game stats
```

---

#### `/game stop`
Stop the current game in this channel.

```
/game stop
```

---

#### `/game leaderboard`
View the games leaderboard.

```
/game leaderboard
```

---

## Bot Management

### `/bot`
🤖 Bot management and settings

#### `/bot chat`
Chat with AI assistant.

```
/bot chat message:<message>
```

**Options:**
- `message` (required) - Your message

**Example:**
```
/bot chat message:What's the weather like today?
```

---

#### `/bot personality`
Change bot personality.

```
/bot personality style:<style>
```

**Options:**
- `style` - Choose from:
  - 🌸 Maid
  - 💢 Tsundere
  - ❄️ Kuudere
  - 🥺 Dandere
  - 🖤 Yandere
  - ⭐ Genki
  - 💋 Onee-san
  - 🔮 Chuunibyou
  - 🎩 Butler
  - 🐱 Catgirl

**Example:**
```
/bot personality style:tsundere
```

---

#### `/bot stats`
View bot statistics.

```
/bot stats
```

**Shows:**
- Uptime
- Commands executed
- Active users
- Memory usage
- Database stats

---

#### `/bot dashboard`
Get web dashboard URL.

```
/bot dashboard
```

**Features:**
- Web-based control panel
- Real-time device monitoring
- Configuration management
- Statistics and graphs

---

#### `/bot help`
Show help and available commands.

```
/bot help
```

---

#### `/bot plugin list`
List all plugins.

```
/bot plugin list
```

---

#### `/bot plugin enable`
Enable a plugin.

```
/bot plugin enable name:<plugin_name>
```

---

#### `/bot plugin disable`
Disable a plugin.

```
/bot plugin disable name:<plugin_name>
```

---

#### `/bot plugin reload`
Reload a plugin.

```
/bot plugin reload name:<plugin_name>
```

---

#### `/bot plugin stats`
View plugin statistics.

```
/bot plugin stats
```

---

## Administration

### `/admin`
👑 Administration (Admin only)

#### `/admin permissions list`
List all users and their permissions.

```
/admin permissions list
```

---

#### `/admin permissions set`
Set user role.

```
/admin permissions set user:<user> role:<role>
```

**Options:**
- `user` (required) - User to modify
- `role` (required) - Role to assign:
  - `admin` - All permissions
  - `operator` - Most permissions
  - `user` - Basic permissions

---

#### `/admin permissions grant`
Grant specific permission to a user.

```
/admin permissions grant user:<user> permission:<permission>
```

**Options:**
- `user` (required) - User to grant permission
- `permission` (required) - Permission to grant

---

#### `/admin permissions revoke`
Revoke specific permission from a user.

```
/admin permissions revoke user:<user> permission:<permission>
```

**Options:**
- `user` (required) - User to revoke permission
- `permission` (required) - Permission to revoke

---

#### `/admin config view`
View bot configuration.

```
/admin config view [section]
```

**Options:**
- `section` - Config section:
  - `smb` - SMB Storage
  - `homeassistant` - Home Assistant
  - `gemini` - Gemini API

---

#### `/admin config set`
Set configuration value.

```
/admin config set key:<key> value:<value>
```

**Options:**
- `key` (required) - Configuration key
- `value` (required) - Configuration value

---

## Home Assistant

### `/homeassistant`
🏠 Control Home Assistant devices

#### `/homeassistant lights`
List all lights.

```
/homeassistant lights
```

---

#### `/homeassistant light`
Control a specific light.

```
/homeassistant light entity:<entity_id> state:<on/off> [brightness:<0-255>]
```

**Options:**
- `entity` (required) - Light entity ID (autocomplete)
- `state` (required) - Turn on or off
- `brightness` - Brightness level (0-255)

**Example:**
```
/homeassistant light entity:light.living_room state:on brightness:200
```

---

#### `/homeassistant switches`
List all switches.

```
/homeassistant switches
```

---

#### `/homeassistant switch`
Control a specific switch.

```
/homeassistant switch entity:<entity_id> state:<on/off>
```

**Options:**
- `entity` (required) - Switch entity ID (autocomplete)
- `state` (required) - Turn on or off

---

#### `/homeassistant sensors`
List all sensors.

```
/homeassistant sensors
```

---

#### `/homeassistant sensor`
Read a sensor.

```
/homeassistant sensor entity:<entity_id>
```

**Options:**
- `entity` (required) - Sensor entity ID (autocomplete)

---

#### `/homeassistant esp`
List ESP devices.

```
/homeassistant esp
```

---

#### `/homeassistant diagnose`
Run Home Assistant diagnostics.

```
/homeassistant diagnose
```

---

#### `/homeassistant scenes`
List all scenes (Admin only).

```
/homeassistant scenes
```

---

#### `/homeassistant scene`
Activate a scene (Admin only).

```
/homeassistant scene entity:<scene_id>
```

**Options:**
- `entity` (required) - Scene entity ID (autocomplete)

---

#### `/homeassistant automations`
List all automations (Admin only).

```
/homeassistant automations
```

---

#### `/homeassistant automation`
Trigger an automation (Admin only).

```
/homeassistant automation entity:<automation_id>
```

**Options:**
- `entity` (required) - Automation entity ID (autocomplete)

---

#### `/homeassistant scripts`
List all scripts (Admin only).

```
/homeassistant scripts
```

---

#### `/homeassistant script`
Run a script (Admin only).

```
/homeassistant script entity:<script_id>
```

**Options:**
- `entity` (required) - Script entity ID (autocomplete)

---

## Standalone Commands

### `/weather`
🌤️ Get weather information.

```
/weather [city]
```

**Options:**
- `city` - City name (optional, uses default if not specified)

**Example:**
```
/weather city:Tokyo
```

---

## Command Permissions

### Permission Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **Admin** | Full access to all commands | All permissions |
| **Operator** | Most commands except critical admin functions | Most permissions |
| **User** | Basic commands only | Limited permissions |

### Permission Matrix

| Command Category | Admin | Operator | User |
|-----------------|-------|----------|------|
| `/network scan, devices` | ✅ | ✅ | ❌ |
| `/network wol` | ✅ | ✅ | ❌ |
| `/network speedtest` | ✅ | ✅ | ❌ |
| `/device *` | ✅ | ✅ | ❌ |
| `/automation speedalert` | ✅ | ✅ | ❌ |
| `/automation devicetrigger` | ✅ | ✅ | ❌ |
| `/automation schedule` | ✅ | ❌ | ❌ |
| `/research *` | ✅ | ✅ | ❌ |
| `/game *` | ✅ | ✅ | ✅ |
| `/bot chat, personality` | ✅ | ✅ | ✅ |
| `/bot stats, dashboard, help` | ✅ | ✅ | ✅ |
| `/bot plugin` | ✅ | ❌ | ❌ |
| `/admin *` | ✅ | ❌ | ❌ |
| `/homeassistant lights, switches, sensors` | ✅ | ✅ | ❌ |
| `/homeassistant light, switch` | ✅ | ✅ | ❌ |
| `/homeassistant scene, automation, script` | ✅ | ❌ | ❌ |
| `/weather` | ✅ | ✅ | ✅ |

### Specific Permissions

- `SCAN_NETWORK` - Scan network for devices
- `WAKE_DEVICE` - Send Wake-on-LAN packets
- `RUN_SPEEDTEST` - Run speed tests
- `RESEARCH` - Use research commands
- `MANAGE_TASKS` - Manage scheduled tasks
- `MANAGE_CONFIG` - Modify bot configuration
- `VIEW_DEVICES` - View Home Assistant devices
- `CONTROL_LIGHTS` - Control lights and switches
- `CONTROL_SWITCHES` - Control switches
- `CONTROL_CLIMATE` - Control climate devices
- `TRIGGER_AUTOMATION` - Trigger automations
- `RUN_SCRIPT` - Run scripts
- `ACTIVATE_SCENE` - Activate scenes

Permissions can be customized via the web dashboard or `/admin permissions` commands.

---

## Tips & Tricks

### Quick Access
- Use autocomplete to quickly find devices, groups, and entities
- Emojis make devices easier to identify at a glance
- Groups help organize large numbers of devices

### Automation Ideas
- Alert when your gaming PC comes online
- Turn off lights when everyone leaves (phones disconnect)
- Get notified of unknown devices on your network
- Schedule daily network scans
- Alert when internet speed drops

### Best Practices
- Assign friendly names to all your devices
- Use emojis for visual identification
- Organize devices into logical groups
- Set up device triggers for important events
- Configure speed alerts to monitor internet quality

---

**Need Help?** Use `/bot help` or visit the web dashboard for more information!
