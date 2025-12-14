# Discord Maid Bot - Documentation Hub

**Version:** 1.0.0.0-beta
**Last Updated:** December 14, 2025

Welcome to the Discord Maid Bot documentation! This hub provides organized access to all documentation for users, developers, and contributors.

---

## 🚀 Quick Start

### For Users
1. [Getting Started](user/getting-started.md) - Installation and setup
2. [Commands Reference](user/commands.md) - All available commands
3. [Configuration Guide](user/configuration.md) - Configure the bot
4. [Troubleshooting](user/troubleshooting.md) - Common issues

### For Developers
1. [Architecture Overview](developer/architecture.md) - System design
2. [Plugin Development](developer/plugin-development.md) - Create plugins
3. [API Reference](developer/api-reference.md) - Core APIs
4. [Contributing Guide](developer/contributing.md) - How to contribute

### For Plugin Users
1. [Plugin Catalog](plugins/README.md) - All available plugins
2. [Core Plugins](plugins/core-plugins.md) - Essential plugins
3. [Integration Plugins](plugins/integration-plugins.md) - Third-party integrations
4. [Game Plugins](plugins/game-plugins.md) - Interactive games

---

## 📚 Documentation Structure

### User Documentation (`docs/user/`)
Documentation for end users of the bot:
- **Getting Started** - Installation, setup, first steps
- **Commands** - Complete command reference with examples
- **Configuration** - Environment variables, settings, customization
- **Troubleshooting** - Common issues and solutions

### Developer Documentation (`docs/developer/`)
Documentation for developers and contributors:
- **Architecture** - System design, patterns, decisions
- **Plugin Development** - Creating custom plugins
- **API Reference** - Core APIs and interfaces
- **Contributing** - Contribution guidelines and workflow
- **Testing** - Testing guide and best practices

### Plugin Documentation (`docs/plugins/`)
Documentation for all plugins:
- **Plugin Catalog** - Overview of all plugins
- **Core Plugins** - Essential bot functionality
- **Integration Plugins** - Third-party service integrations
- **Game Plugins** - Interactive games and entertainment

Each plugin also has its own documentation in `plugins/[plugin-name]/docs/`:
- README.md - Plugin overview
- COMMANDS.md - Command reference
- EXAMPLES.md - Usage examples
- API.md - Plugin API (if applicable)

### Archive (`docs/archive/`)
Historical documentation from the refactor process:
- Phase completion documents
- Refactor tracking and decisions
- Migration guides
- [Refactor Summary](archive/REFACTOR_SUMMARY.md)

---

## 🎯 Find What You Need

### By Role

#### 👤 End Users
- [Getting Started](user/getting-started.md)
- [Commands](user/commands.md)
- [Configuration](user/configuration.md)
- [Troubleshooting](user/troubleshooting.md)

#### 💻 Developers
- [Architecture](developer/architecture.md)
- [Plugin Development](developer/plugin-development.md)
- [API Reference](developer/api-reference.md)
- [Contributing](developer/contributing.md)

#### 🔌 Plugin Developers
- [Plugin Development Guide](developer/plugin-development.md)
- [Plugin Template](../plugins/example-plugin/)
- [Plugin Catalog](plugins/README.md)
- [API Reference](developer/api-reference.md)

#### 🛠️ System Administrators
- [Configuration](user/configuration.md)
- [Troubleshooting](user/troubleshooting.md)
- [Architecture](developer/architecture.md)

### By Topic

#### Features
- [Commands](user/commands.md) - All bot commands
- [Plugins](plugins/README.md) - Plugin catalog
- [Games](plugins/game-plugins.md) - Game system
- [Network](plugins/core-plugins.md#network-management) - Network features
- [AI Chat](plugins/core-plugins.md#conversational-ai) - AI conversations

#### Setup & Configuration
- [Getting Started](user/getting-started.md) - Initial setup
- [Configuration](user/configuration.md) - Environment setup
- [Troubleshooting](user/troubleshooting.md) - Issue resolution

#### Development
- [Architecture](developer/architecture.md) - System design
- [Plugin Development](developer/plugin-development.md) - Create plugins
- [API Reference](developer/api-reference.md) - Core APIs
- [Contributing](developer/contributing.md) - Contribution process
- [Testing](developer/testing.md) - Testing guide

---

## 📖 Documentation Standards

### Writing Guidelines
- **Clear and Concise** - Use simple language
- **Examples** - Include code examples
- **Visual Aids** - Add diagrams where helpful
- **Up-to-Date** - Keep documentation current
- **Consistent** - Follow markdown standards

### File Organization
- User docs in `docs/user/`
- Developer docs in `docs/developer/`
- Plugin docs in `docs/plugins/` and `plugins/[name]/docs/`
- Historical docs in `docs/archive/`

### Markdown Format
- Use proper heading hierarchy (H1 → H2 → H3)
- Include table of contents for long documents
- Use code blocks with language tags
- Add links between related documents
- Use emoji sparingly for visual hierarchy

---

## 🔍 Search Tips

### Finding Commands
- Browse [Commands Reference](user/commands.md)
- Check specific plugin docs in `plugins/[name]/docs/COMMANDS.md`
- Use Ctrl+F to search within documents

### Finding Configuration Options
- Check [Configuration Guide](user/configuration.md)
- Look in `.env.example` for all variables
- Check plugin-specific configuration in plugin docs

### Finding Development Info
- Start with [Architecture](developer/architecture.md)
- Check [Plugin Development](developer/plugin-development.md) for plugin creation
- Review [API Reference](developer/api-reference.md) for available APIs

---

## � Plugin Documentation

All 14 plugins have comprehensive documentation:

### Core Plugins
- [automation](../plugins/automation/docs/) - Scheduler and automation
- [conversational-ai](../plugins/conversational-ai/docs/) - AI chat
- [core-commands](../plugins/core-commands/docs/) - Essential commands
- [network-management](../plugins/network-management/docs/) - Network scanning
- [personality](../plugins/personality/docs/) - AI personalities

### Feature Plugins
- [device-bulk-ops](../plugins/device-bulk-ops/docs/) - Bulk operations
- [device-health](../plugins/device-health/docs/) - Device monitoring
- [device-triggers](../plugins/device-triggers/docs/) - Device automation
- [network-insights](../plugins/network-insights/docs/) - Network analytics
- [smart-reminders](../plugins/smart-reminders/docs/) - Reminder system
- [speed-alerts](../plugins/speed-alerts/docs/) - Speed monitoring

### Integration Plugins
- [homeassistant](../plugins/integrations/homeassistant/docs/) - Home Assistant
- [speedtest](../plugins/integrations/speedtest/docs/) - Speed testing
- [weather](../plugins/integrations/weather/docs/) - Weather info

### Game Plugins
- [games](../plugins/games/docs/) - 18 interactive games
- [research](../plugins/research/docs/) - AI research

---

## 🔄 Keeping Documentation Updated

### For Contributors
When making changes:
1. Update relevant documentation
2. Add examples for new features
3. Update version numbers
4. Update changelog

### For Maintainers
Regular maintenance tasks:
1. Review documentation quarterly
2. Archive outdated documentation
3. Update examples and screenshots
4. Keep external links current

---

## 📝 Contributing to Documentation

Found an error or want to improve the docs?

1. **Small Fixes** - Open a pull request directly
2. **Large Changes** - Open an issue first to discuss
3. **New Sections** - Follow existing structure and style
4. **Examples** - Always include working code examples

See [Contributing Guide](developer/contributing.md) for details.

---

## 🆘 Need Help?

1. **Check Documentation** - Search this hub
2. **Check Troubleshooting** - [Troubleshooting Guide](user/troubleshooting.md)
3. **Search Issues** - [GitHub Issues](https://github.com/coff33ninja/Discord-Maid-Bot/issues)
4. **Ask Community** - [GitHub Discussions](https://github.com/coff33ninja/Discord-Maid-Bot/discussions)
5. **Open Issue** - Create a new issue if needed

---

## 📚 External Resources

### Technologies
- [Discord.js Documentation](https://discord.js.org/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

### Related Projects
- [Discord Developer Portal](https://discord.com/developers/docs)
- [Home Assistant](https://www.home-assistant.io/)
- [Google Gemini AI](https://ai.google.dev/)

---

## 📜 Version History

**Current Version:** 1.0.0.0-beta

See [CHANGELOG.md](../CHANGELOG.md) for version history.

For the complete refactor story, see [Refactor Summary](archive/REFACTOR_SUMMARY.md).

---

**Last Updated:** December 14, 2025  
**Version:** 1.0.0.0-beta
**Status:** Beta Release

Need help? Start with [Getting Started](user/getting-started.md) or check [Troubleshooting](user/troubleshooting.md)!
