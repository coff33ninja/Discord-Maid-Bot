# Documentation Index

This file provides a quick reference to all documentation in the Discord Maid Bot project.

---

## 📚 Main Documentation

### Getting Started
- **[README.md](README.md)** - Main project documentation, features, and quick start
- **[CONFIGURATION.md](docs/CONFIGURATION.md)** - Setup and configuration guide
- **[COMMANDS.md](docs/COMMANDS.md)** - Complete command reference

### Architecture & Development
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture and design
- **[PLUGINS.md](docs/PLUGINS.md)** - Plugin system and catalog
- **[API.md](docs/API.md)** - Core API reference
- **[Plugin Development](plugins/README.md)** - Creating custom plugins

### Guides
- **[Contributing Guide](docs/guides/CONTRIBUTING.md)** - How to contribute
- **[Testing Guide](docs/guides/TESTING_GUIDE.md)** - Testing procedures
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

### Project Information
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and updates
- **[SECURITY.md](SECURITY.md)** - Security policy and reporting
- **[LICENSE](LICENSE)** - Project license

---

## 📁 Documentation Structure

```
discord-maid-bot/
├── README.md                    # Main documentation
├── DOCUMENTATION.md             # This file
├── CHANGELOG.md                 # Version history
├── SECURITY.md                  # Security policy
├── docs/                        # Technical documentation
│   ├── README.md               # Documentation overview
│   ├── ARCHITECTURE.md         # System architecture
│   ├── COMMANDS.md             # Command reference
│   ├── CONFIGURATION.md        # Setup guide
│   ├── PLUGINS.md              # Plugin catalog
│   ├── API.md                  # API reference
│   ├── guides/                 # Development guides
│   │   ├── CONTRIBUTING.md    # Contribution guidelines
│   │   └── TESTING_GUIDE.md   # Testing procedures
│   └── archive/                # Historical documentation
│       └── REFACTOR_SUMMARY.md # Refactor history
└── plugins/                     # Plugin documentation
    ├── README.md               # Plugin development guide
    └── */README.md             # Individual plugin docs
```

---

## 🎯 Quick Navigation

### By Role

#### End Users
1. [README.md](README.md) - Start here
2. [COMMANDS.md](docs/COMMANDS.md) - Available commands
3. [CONFIGURATION.md](docs/CONFIGURATION.md) - Setup instructions

#### Developers
1. [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design
2. [Plugin Development](plugins/README.md) - Create plugins
3. [API.md](docs/API.md) - API reference
4. [Contributing Guide](docs/guides/CONTRIBUTING.md) - Contribution process

#### System Administrators
1. [CONFIGURATION.md](docs/CONFIGURATION.md) - Configuration
2. [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - Issue resolution
3. [CROSS_PLATFORM.md](docs/CROSS_PLATFORM.md) - Platform notes

### By Topic

#### Features
- [Commands](docs/COMMANDS.md) - All available commands
- [Plugins](docs/PLUGINS.md) - Plugin catalog
- [Games](docs/GAMES.md) - Games system
- [Network Scanning](docs/NETWORK_SCANNING.md) - Network features
- [Conversational AI](docs/CONVERSATIONAL_AI_ARCHITECTURE.md) - AI chat

#### Setup & Configuration
- [Configuration Guide](docs/CONFIGURATION.md) - Main setup
- [SMB Setup](docs/SMB_SETUP.md) - Network storage
- [Cross-Platform](docs/CROSS_PLATFORM.md) - Platform-specific

#### Development
- [Architecture](docs/ARCHITECTURE.md) - System design
- [Plugin System](docs/PLUGINS.md) - Plugin architecture
- [Plugin Dependencies](docs/PLUGIN_DEPENDENCIES.md) - Dependency system
- [API Reference](docs/API.md) - Core APIs

#### Maintenance
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues
- [Dependencies](docs/DEPENDENCIES.md) - Required packages
- [Testing](docs/guides/TESTING_GUIDE.md) - Testing guide

---

## 🔍 Finding Specific Information

### Commands
- **List all commands:** [COMMANDS.md](docs/COMMANDS.md)
- **Network commands:** [NETWORK_SCANNING.md](docs/NETWORK_SCANNING.md)
- **Game commands:** [GAMES.md](docs/GAMES.md)

### Configuration
- **Environment variables:** [CONFIGURATION.md](docs/CONFIGURATION.md)
- **SMB storage:** [SMB_SETUP.md](docs/SMB_SETUP.md)
- **Platform-specific:** [CROSS_PLATFORM.md](docs/CROSS_PLATFORM.md)

### Development
- **Creating plugins:** [plugins/README.md](plugins/README.md)
- **System architecture:** [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **API reference:** [API.md](docs/API.md)
- **Contributing:** [CONTRIBUTING.md](docs/guides/CONTRIBUTING.md)

### Troubleshooting
- **Common issues:** [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- **Dependencies:** [DEPENDENCIES.md](docs/DEPENDENCIES.md)
- **Platform issues:** [CROSS_PLATFORM.md](docs/CROSS_PLATFORM.md)

---

## 📖 Documentation by Plugin

Each plugin has its own README with specific documentation:

- [automation](plugins/automation/README.md) - Scheduler and automation
- [conversational-ai](plugins/conversational-ai/README.md) - AI chat
- [core-commands](plugins/core-commands/README.md) - Essential commands
- [device-bulk-ops](plugins/device-bulk-ops/README.md) - Bulk operations
- [device-health](plugins/device-health/README.md) - Device monitoring
- [device-triggers](plugins/device-triggers/README.md) - Device automation
- [games](plugins/games/README.md) - Interactive games
- [integrations/homeassistant](plugins/integrations/homeassistant/README.md) - Home Assistant
- [integrations/speedtest](plugins/integrations/speedtest/README.md) - Speed testing
- [integrations/weather](plugins/integrations/weather/README.md) - Weather info
- [network-insights](plugins/network-insights/README.md) - Network analytics
- [network-management](plugins/network-management/README.md) - Network scanning
- [personality](plugins/personality/README.md) - AI personalities
- [research](plugins/research/README.md) - AI research
- [smart-reminders](plugins/smart-reminders/README.md) - Reminders
- [speed-alerts](plugins/speed-alerts/README.md) - Speed monitoring

---

## 🔄 Keeping Documentation Updated

### For Contributors
When making changes:
1. Update relevant documentation
2. Add examples if needed
3. Update version numbers
4. Update changelog

### For Maintainers
Regular tasks:
1. Review and update docs quarterly
2. Archive outdated documentation
3. Add new features to docs
4. Keep examples current

---

## 📝 Documentation Standards

### Writing Style
- Clear and concise
- Include code examples
- Use diagrams where helpful
- Keep it up-to-date

### File Organization
- Core docs in `docs/`
- Guides in `docs/guides/`
- Historical in `docs/archive/`
- Plugin docs in `plugins/*/`

### Markdown Format
- Use proper headings
- Include table of contents for long docs
- Use code blocks with language tags
- Add links between related docs

---

## 🌟 Featured Documentation

### Most Useful
1. [README.md](README.md) - Start here!
2. [COMMANDS.md](docs/COMMANDS.md) - Command reference
3. [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design
4. [Plugin Development](plugins/README.md) - Create plugins

### Recently Updated
1. [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Plugin-first architecture
2. [PLUGINS.md](docs/PLUGINS.md) - Updated plugin catalog
3. [PLUGIN_DEPENDENCIES.md](docs/PLUGIN_DEPENDENCIES.md) - New dependency system
4. [docs/README.md](docs/README.md) - Reorganized structure

---

## 📚 External Resources

### Technologies Used
- [Discord.js](https://discord.js.org/) - Discord API wrapper
- [Node.js](https://nodejs.org/) - JavaScript runtime
- [SQLite](https://www.sqlite.org/) - Database
- [Express](https://expressjs.com/) - Web framework

### Related Projects
- [Discord Developer Portal](https://discord.com/developers/docs)
- [Home Assistant](https://www.home-assistant.io/)
- [Google Gemini AI](https://ai.google.dev/)

---

## 🆘 Need Help?

1. Check [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
2. Search [existing issues](https://github.com/yourusername/discord-maid-bot/issues)
3. Read relevant documentation
4. Ask in [discussions](https://github.com/yourusername/discord-maid-bot/discussions)
5. Open a new issue if needed

---

**Last Updated:** December 14, 2025  
**Version:** 1.0.0.0-beta

For the complete refactor story, see [docs/archive/REFACTOR_SUMMARY.md](docs/archive/REFACTOR_SUMMARY.md)
