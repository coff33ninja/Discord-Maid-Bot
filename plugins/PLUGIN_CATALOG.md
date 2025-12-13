# Plugin Catalog

This document lists all available plugins for the Discord Maid Bot.

## 🎯 Active Plugins (6)

### 1. 🏥 Device Health Monitoring
**Plugin:** `device-health`  
**Version:** 1.0.0  
**Commands:** `/automation health`  
**Description:** Track device uptime, response times, and generate health reports

**Features:**
- Uptime percentage tracking per device
- Response time trends and averages
- Offline duration tracking
- Predictive alerts (device usually online at this time)
- Health reports and comparisons
- Reliability rankings

**Subcommands:**
- `/automation health report [device]` - View device health report
- `/automation health summary` - Network health overview
- `/automation health unhealthy` - List devices with poor health (<90% uptime)
- `/automation health reliable` - List most reliable devices (>99% uptime)
- `/automation health compare <device1> <device2>` - Compare two devices
- `/automation health alerts` - Check for predictive alerts

---

### 2. 🔔 Device Automation Triggers
**Plugin:** `device-triggers`  
**Version:** 1.0.0  
**Commands:** `/automation devicetrigger`  
**Description:** Create automation rules based on device network status

**Features:**
- Trigger on device online/offline events
- Trigger on unknown device detection
- Discord DM or channel notifications
- Home Assistant integration
- Custom messages and context
- Enable/disable triggers

**Subcommands:**
- `/automation devicetrigger add` - Create a new trigger
- `/automation devicetrigger list` - List all triggers
- `/automation devicetrigger remove <trigger>` - Remove a trigger
- `/automation devicetrigger toggle <trigger> <enabled>` - Enable/disable trigger

**Example Use Cases:**
- "When my gaming PC comes online, send me a DM"
- "When my phone disconnects, turn off bedroom lights"
- "Alert me when unknown devices join the network"

---

### 3. 🚨 Speed Alerts
**Plugin:** `speed-alerts`  
**Version:** 1.0.0  
**Commands:** `/automation speedalert`  
**Description:** Monitor internet speed and send alerts when speed drops

**Features:**
- Configurable speed threshold
- Automatic alerts on speed drops
- Critical vs warning severity levels
- Performance percentage tracking
- Channel-based notifications

**Subcommands:**
- `/automation speedalert config <threshold> <channel>` - Configure alerts
- `/automation speedalert status` - View current settings
- `/automation speedalert enable` - Enable speed alerts
- `/automation speedalert disable` - Disable speed alerts

---

### 4. 🧠 Network Insights
**Plugin:** `network-insights`  
**Version:** 1.0.0  
**Commands:** `/network insights`  
**Description:** AI-powered network analysis and insights using Gemini

**Features:**
- Network statistics analysis
- Speed trend detection (improving/declining/stable)
- Device pattern recognition
- AI-generated actionable insights
- Insight history tracking
- Anomaly detection

**Subcommands:**
- `/network insights analyze` - Generate AI insights about your network
- `/network insights latest` - View the latest network insights
- `/network insights history [limit]` - View past network insights

**What It Analyzes:**
- Device uptime patterns
- Speed test trends
- New and unknown devices
- Device type distribution (mobile, computers, IoT)
- Performance issues and optimization opportunities

---

### 5. ⏰ Smart Reminders & Automation
**Plugin:** `smart-reminders`  
**Version:** 1.0.0  
**Commands:** `/bot reminder`  
**Description:** Context-aware reminder and automation system with presence detection

**Features:**
- Time-based reminders (5m, 2h, 1d, or absolute time like 18:00)
- Recurring reminders with intervals
- Presence-based reminders (when device comes online)
- **Automation actions** (Home Assistant, Wake-on-LAN, Network Scan, Speed Test)
- Context storage for reminders
- AI-generated message variations
- DM, channel, or automation-only delivery
- Enable/disable reminders

**Subcommands:**
- `/bot reminder add <message> <when>` - Create a time-based reminder
- `/bot reminder automation <name> <when> <action_type>` - Create automation with actions
- `/bot reminder recurring <message> <interval>` - Create recurring reminder
- `/bot reminder presence <message> <device>` - Remind when device comes online
- `/bot reminder list` - List your reminders
- `/bot reminder remove <reminder>` - Remove a reminder
- `/bot reminder toggle <reminder> <active>` - Enable/disable reminder

**Automation Actions:**
- **Home Assistant** - Control lights, switches, scenes, etc.
- **Wake-on-LAN** - Wake up devices automatically
- **Network Scan** - Trigger network scans
- **Speed Test** - Run speed tests

**Example Use Cases:**
- "Remind me to check the oven in 30m"
- "Remind me to take breaks every 2h" (recurring)
- "Turn on my PC at 18:00 every day" (automation + WOL)
- "Turn on lights when I get home" (presence + Home Assistant)
- "Run network scan every morning at 8:00" (automation + scan)

---

### 6. 📝 Example Plugin
**Plugin:** `example-plugin`  
**Version:** 1.0.0  
**Commands:** None (demonstration only)  
**Description:** Example plugin demonstrating the plugin system

**Features:**
- Shows plugin lifecycle hooks
- Demonstrates event handlers
- Example custom commands
- Reference implementation

---

## 📊 Plugin Statistics

- **Total Plugins:** 6
- **Active Plugins:** 6
- **Commands Added:** 5 command groups
- **Total Subcommands:** 30+
- **Lines of Code:** ~2,500+

---

## 🔮 Planned Plugins

### 🎤 Voice Message Transcription
**Status:** Planned  
**Description:** Transcribe Discord voice messages using speech-to-text

### 🎵 Collaborative Playlist Manager
**Status:** Planned  
**Description:** Integrate music control with Spotify/YouTube Music

### 📊 Discord Server Analytics
**Status:** Planned  
**Description:** Track and visualize server activity with AI sentiment analysis

### 🎨 Custom Emoji/Sticker Generator
**Status:** Planned  
**Description:** Generate custom emoji and stickers using AI image generation

### 🗣️ Natural Language Automation Builder
**Status:** Planned  
**Description:** Create automations using plain English with Gemini NLP

---

## 🏪 Plugin Store (Future)

We're planning a **Plugin Store** system that will allow you to:
- 📦 Browse available plugins from a central repository
- ⬇️ Install plugins directly from the dashboard or bot commands
- 🔄 Update plugins with one click
- 🌟 Rate and review plugins
- 📝 Submit your own plugins to the store

**Timeline:** Coming in a future update!

---

## 🛠️ Creating Your Own Plugin

See `plugins/README.md` for detailed documentation on creating plugins.

**Quick Start:**
1. Create `plugins/my-plugin.js` with your plugin logic
2. Create `plugins/my-plugin/commands.js` with slash command definitions
3. Plugin manager auto-discovers and loads your plugin
4. Commands are automatically injected into parent commands
5. Zero core file changes needed!

**Example Structure:**
```
plugins/
├── my-plugin.js              # Plugin logic
└── my-plugin/
    └── commands.js           # Slash command definitions
```

---

*Last updated: December 13, 2025*
