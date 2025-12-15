# Plugin Catalog

**Version:** 1.0.0.0-beta  
**Last Updated:** December 15, 2025  
**Total Plugins:** 17  
**AI Actions:** 56

Complete catalog of all available plugins for Discord Maid Bot.

---

## Table of Contents

- [Core Plugins](#core-plugins) (3)
- [AI Plugins](#ai-plugins) (3)
- [Network Plugins](#network-plugins) (6)
- [Automation Plugins](#automation-plugins) (2)
- [Entertainment Plugins](#entertainment-plugins) (1)
- [Utility Plugins](#utility-plugins) (1)
- [Integration Plugins](#integration-plugins) (3)

---

## Core Plugins

Essential plugins that provide fundamental bot functionality.

### 1. Core Commands
**Path:** `plugins/core-commands/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active

Essential bot commands and utilities.

**Commands:**
- `/help` - Show all available commands
- `/stats` - Display bot statistics
- `/ping` - Check bot latency
- `/dashboard` - Get dashboard URL
- `/bot plugin` - Manage plugins (admin only)

**Features:**
- Bot management
- System utilities
- Plugin management
- Help system

**Documentation:** [View Docs](core-commands/docs/README.md)

---

### 2. Automation
**Path:** `plugins/automation/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active

Scheduler, triggers, and automation system for recurring tasks.

**Commands:**
- `/automation schedule` - Manage scheduled tasks
- `/automation devicetrigger` - Device-based automation
- `/automation health` - Device health monitoring
- `/automation speedalert` - Internet speed alerts

**Features:**
- Cron-based task scheduling
- Device status triggers
- Speed monitoring and alerts
- Device health tracking

**Documentation:** [View Docs](automation/docs/README.md)

---

### 3. Network Management
**Path:** `plugins/network-management/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active

Network scanning, device management, and Wake-on-LAN.

**Commands:**
- `/network scan` - Scan network for devices
- `/network devices` - List all devices
- `/network wol` - Wake device with WOL
- `/device config` - Configure device
- `/device group` - Manage device groups

**Features:**
- Network scanning (local + Tailscale)
- Device discovery
- Wake-on-LAN
- Device groups
- Friendly names and emoji

**Documentation:** [View Docs](network-management/docs/README.md)

---

## AI Plugins

Plugins powered by Google Gemini AI.

### 4. Conversational AI
**Path:** `plugins/conversational-ai/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active

AI-powered conversational chat using Google Gemini with **56 natural language actions**.

**Commands:**
- `/chat` - Chat with the AI bot
- Natural language commands (no slash needed!)

**Features:**
- Natural language conversations
- **56 AI-powered action commands** 🆕
- Personality-aware responses
- Chat history tracking
- Context-aware replies
- Intent classification using Gemini AI

**AI Action Categories:**
- Network & Devices (10 actions)
- Device Health (5 actions)
- Speed & Internet (3 actions)
- Server Admin (6 actions)
- Discord Moderation (7 actions)
- Games (3 actions)
- Reminders & Automation (5 actions)
- Smart Home (3 actions)
- Research & Info (3 actions)
- User & Bot (8 actions)
- Utilities (3 actions)

**Example Natural Commands:**
- "Scan the network"
- "Wake up my PC"
- "Show unhealthy devices"
- "Play trivia"
- "What's the weather?"

**Dependencies:** personality (optional)

**Documentation:** [View Docs](conversational-ai/docs/README.md)

---

### 5. Personality
**Path:** `plugins/personality/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active

AI personality system with 10+ unique personalities.

**Commands:**
- `/bot personality` - Manage AI personalities

**Features:**
- 10+ unique personalities (maid, tsundere, kuudere, etc.)
- Per-user personality settings
- Custom personality prompts
- Personality-aware responses

**Personalities:**
- � Maid - PolSite and helpful
- �  Tsundere - Defensive but caring
- ❄️ Kuudere - Cool and collected
- 🌺 Deredere - Cheerful and energetic
- 😊 Dandere - Shy and quiet
- 🎭 Yandere - Obsessively devoted
- 🤖 Robot - Logical and precise
- 🎩 Butler - Professional and refined
- 😈 Sarcastic - Witty and snarky
- 🧙 Wizard - Mystical and wise

**Documentation:** [View Docs](personality/docs/README.md)

---

### 6. Research
**Path:** `plugins/research/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active

AI-powered research and web search using Gemini.

**Commands:**
- `/research query` - AI-powered research
- `/research history` - View research history
- `/research search` - Search past research
- `/research web` - Web search

**Features:**
- AI-powered research
- Web search integration
- Research history
- SMB file saving

**Documentation:** [View Docs](research/docs/README.md)

---

## Network Plugins

Plugins for network management and monitoring.

### 7. Power Management
**Path:** `plugins/power-management/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active  
**NEW!** 🆕

Device power control with Wake-on-LAN and remote shutdown/restart.

**Commands:**
- `/power control wake` - Wake device using WOL
- `/power control shutdown` - Shutdown device remotely
- `/power control restart` - Restart device remotely
- `/power control status` - Check device power status
- `/power control configure` - Configure device for remote power control

**Features:**
- Wake-on-LAN support
- Remote shutdown (via API)
- Remote restart (via API)
- Power status monitoring
- Device configuration
- Schema extensions for API keys

**Schema Extensions:**
- `shutdown_api_key` - API key for shutdown server
- `shutdown_port` - Port for shutdown server (default: 5000)

**Complements:** `scripts/remote-shutdown/` server implementation

**Documentation:** [View Docs](power-management/docs/README.md)

---

### 8. Device Health Monitoring
**Path:** `plugins/device-health/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active

Monitor device uptime, health metrics, and reliability.

**Commands:**
- `/automation health report` - Generate health report
- `/automation health summary` - Quick health summary
- `/automation health unhealthy` - List unhealthy devices
- `/automation health reliable` - List most reliable devices
- `/automation health compare` - Compare device reliability
- `/automation health alerts` - Configure health alerts

**Features:**
- Uptime tracking
- Response time monitoring
- Health reports
- Reliability metrics

**Documentation:** [View Docs](device-health/docs/README.md)

---

### 9. Device Triggers
**Path:** `plugins/device-triggers/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active

Automation triggers based on device network status.

**Commands:**
- `/automation devicetrigger add` - Add new trigger
- `/automation devicetrigger list` - List all triggers
- `/automation devicetrigger remove` - Remove trigger
- `/automation devicetrigger toggle` - Enable/disable trigger

**Features:**
- Device online/offline triggers
- Custom actions
- Notification system
- Rule management

**Documentation:** [View Docs](device-triggers/docs/README.md)

---

### 10. Speed Alerts
**Path:** `plugins/speed-alerts/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active

Internet speed monitoring with automatic alerts.

**Commands:**
- `/automation speedalert add` - Add speed alert
- `/automation speedalert list` - List all alerts
- `/automation speedalert remove` - Remove alert
- `/automation speedalert test` - Test alert

**Features:**
- Automatic speed monitoring
- Threshold-based alerts
- Speed history tracking
- Channel notifications

**Documentation:** [View Docs](speed-alerts/docs/README.md)

---

### 11. Network Insights
**Path:** `plugins/network-insights/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active

AI-powered network analytics and insights using Gemini.

**Commands:**
- `/network insights analyze` - Analyze network patterns
- `/network insights latest` - View latest insights
- `/network insights history` - View insight history

**Features:**
- AI-powered analysis
- Network statistics
- Trend detection
- Actionable insights

**Documentation:** [View Docs](network-insights/docs/README.md)

---

### 12. Device Bulk Operations
**Path:** `plugins/device-bulk-ops/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active

Bulk operations for managing multiple devices at once.

**Commands:**
- `/device bulk assign` - Bulk group assignment
- `/device bulk addmultiple` - Add multiple devices to group
- `/device bulk assignpattern` - Assign by pattern
- `/device bulk assignall` - Assign all filtered devices

**Features:**
- Bulk device configuration
- Group assignments
- Pattern matching
- Filter-based operations

**Documentation:** [View Docs](device-bulk-ops/docs/README.md)

---

## Automation Plugins

Plugins for task automation and scheduling.

### 13. Smart Reminders
**Path:** `plugins/smart-reminders/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active

Context-aware reminder system with time and presence-based triggers.

**Commands:**
- `/bot reminder add` - Add time-based reminder
- `/bot reminder recurring` - Add recurring reminder
- `/bot reminder presence` - Add presence-based reminder
- `/bot reminder list` - List all reminders
- `/bot reminder remove` - Remove reminder
- `/bot reminder toggle` - Enable/disable reminder

**Features:**
- Time-based reminders (5m, 2h, 1d)
- Recurring reminders with intervals
- Presence-based reminders (when device comes online)
- Context storage for reminders
- AI-generated message variations
- DM or channel delivery

**Documentation:** [View Docs](smart-reminders/docs/README.md)

---

## Entertainment Plugins

Plugins for games and entertainment.

### 14. Games
**Path:** `plugins/games/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active

18 interactive games including trivia, hangman, word games, and more.

**Commands:**
- `/game trivia` - Trivia game (AI, Research, Speed modes)
- `/game hangman` - Hangman game
- `/game wordchain` - Word chain game
- `/game tictactoe` - Tic Tac Toe
- `/game connect4` - Connect Four
- `/game rps` - Rock Paper Scissors
- `/game numguess` - Number guessing
- `/game riddles` - Riddle game
- `/game 20questions` - 20 Questions with AI
- `/game emojidecode` - Emoji decoding
- `/game wouldyourather` - Would You Rather
- `/game caption` - Caption contest
- `/game acronym` - Acronym game
- `/game story` - Collaborative story builder
- `/game mathblitz` - Math blitz
- `/game reaction` - Reaction race
- `/game mafia` - Mafia/Werewolf
- `/game stats` - Game statistics
- `/game leaderboard` - View leaderboards
- `/game stop` - Stop active game

**Features:**
- 18 different games
- Single and multiplayer support
- Statistics tracking
- Leaderboards
- AI-powered game content

**Documentation:** [View Docs](games/docs/README.md)

---

## Utility Plugins

General utility plugins.

*No utility plugins currently installed.*

---

## Integration Plugins

Plugins that integrate with external services.

### 15. Home Assistant
**Path:** `plugins/integrations/homeassistant/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active

Control Home Assistant devices from Discord.

**Commands:**
- `/homeassistant lights` - List all lights
- `/homeassistant light` - Control a light
- `/homeassistant switches` - List all switches
- `/homeassistant switch` - Control a switch
- `/homeassistant sensors` - List all sensors
- `/homeassistant sensor` - Read a sensor
- `/homeassistant scenes` - List all scenes
- `/homeassistant scene` - Activate a scene
- `/homeassistant automations` - List automations
- `/homeassistant scripts` - List scripts

**Features:**
- Light control (on/off, brightness, color)
- Switch control
- Sensor reading
- Scene activation
- Automation triggers
- Script execution

**Configuration Required:** Home Assistant URL and API token in `.env`

**Documentation:** [View Docs](integrations/homeassistant/docs/README.md)

---

### 16. Speed Test
**Path:** `plugins/integrations/speedtest/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active

Internet speed testing and monitoring.

**Commands:**
- `/network speedtest` - Run speed test
- `/network speedhistory` - View speed history

**Features:**
- Download/upload speed testing
- Ping measurement
- Speed history
- Statistics and trends

**Documentation:** [View Docs](integrations/speedtest/docs/README.md)

---

### 17. Weather
**Path:** `plugins/integrations/weather/`  
**Version:** 1.0.0.0-beta  
**Status:** ✅ Active

Weather information and forecasts.

**Commands:**
- `/weather` - Get weather information

**Features:**
- Current weather
- Weather forecasts
- Multiple locations
- Temperature units

**Configuration Required:** Weather API key in `.env`

**Documentation:** [View Docs](integrations/weather/docs/README.md)

---

## Plugin Statistics

**Total Plugins:** 17
- Core: 3
- AI: 3
- Network: 6
- Automation: 2
- Entertainment: 1
- Utility: 0
- Integration: 3

**Total Commands:** 100+

**New in 1.0.0.0-beta:**
- ✨ **56 AI Natural Language Actions** - Chat naturally to control the bot
- ✨ Power Management plugin with remote shutdown/restart
- ✨ Schema extension system for plugins
- ✨ Core handler system for shared services
- ✨ Complete plugin-first architecture
- ✨ Comprehensive documentation for all plugins

---

## Plugin Development

Want to create your own plugin? See:
- [Plugin Development Guide](../docs/developer/plugin-development.md)
- [Plugin Template](example-plugin/)
- [Architecture Documentation](../REFACTOR_PLUGIN_ARCHITECTURE.md)

---

## Support

For issues or questions:
- Open an issue on GitHub
- Check plugin documentation
- Review bot logs
- Contact bot administrators

---

**Last Updated:** December 14, 2025  
**Documentation Version:** 1.0.0.0-beta
