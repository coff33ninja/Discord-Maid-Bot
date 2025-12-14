# Discord Maid Bot - Plugins

**Version:** 1.0.0.0-beta  
**Last Updated:** December 14, 2025  
**Total Plugins:** 17

Complete plugin system for Discord Maid Bot with dynamic command loading and plugin-first architecture.

---

## 📋 Quick Links

- **[Plugin Catalog](PLUGIN_CATALOG.md)** - Complete list of all 17 plugins
- **[Architecture Documentation](../REFACTOR_PLUGIN_ARCHITECTURE.md)** - Plugin architecture details
- **[Validation Report](../PLUGIN_VALIDATION_REPORT.md)** - Plugin validation results
- **[Development Guide](#plugin-development)** - Create your own plugins

---

## 🆕 What's New in 1.0.0.0-beta

### New Plugin: Power Management 🔌
Complete device power control with Wake-on-LAN and remote shutdown/restart.

**Features:**
- Wake devices using Wake-on-LAN
- Remote shutdown via API
- Remote restart via API
- Power status monitoring
- Device configuration with API keys

**Commands:** `/power control wake|shutdown|restart|status|configure`

**Documentation:** [View Docs](power-management/docs/README.md)

### Plugin-First Architecture 🏗️
Complete refactor to plugin-first architecture:
- ✅ 17 independent plugins
- ✅ Clean separation of concerns
- ✅ Schema extension system
- ✅ Core handler system
- ✅ Zero architecture violations
- ✅ 100% validated

### Comprehensive Documentation 📚
Every plugin now has complete documentation:
- `README.md` - Plugin overview
- `COMMANDS.md` - Command reference
- `EXAMPLES.md` - Usage examples
- `CHANGELOG.md` - Version history

---

## 📦 Plugin Categories

### Core Plugins (3)
Essential bot functionality:
- **Core Commands** - Help, stats, ping, dashboard
- **Automation** - Scheduler, triggers, device automation
- **Network Management** - Scanning, WOL, device management

### AI Plugins (3)
Powered by Google Gemini:
- **Conversational AI** - Natural language chat
- **Personality** - 10+ unique AI personalities
- **Research** - AI-powered research and web search

### Network Plugins (6)
Network management and monitoring:
- **Power Management** 🆕 - Remote power control
- **Device Health** - Uptime and reliability monitoring
- **Device Triggers** - Automation based on device status
- **Speed Alerts** - Internet speed monitoring
- **Network Insights** - AI-powered network analytics
- **Device Bulk Ops** - Bulk device operations

### Automation Plugins (2)
Task automation:
- **Smart Reminders** - Context-aware reminders
- *(Automation plugin also provides scheduling)*

### Entertainment Plugins (1)
Games and fun:
- **Games** - 18 interactive games

### Integration Plugins (3)
External service integrations:
- **Home Assistant** - Smart home control
- **Speed Test** - Internet speed testing
- **Weather** - Weather information

---

## 🚀 Plugin System Features

### Dynamic Command Loading
Plugins can define their own slash commands without modifying core files:

```javascript
// plugins/my-plugin/commands.js
export const commandGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('mycommand')
  .setDescription('My plugin commands');

export const parentCommand = 'automation'; // Attach to /automation

export async function handleCommand(interaction, plugin) {
  // Handle command
}
```

### Schema Extensions
Plugins can extend database schema safely:

```javascript
// In plugin constructor
this.registerSchemaExtension('devices', [
  { name: 'my_field', type: 'TEXT', defaultValue: null }
]);
```

### Core Handlers
Plugins can request services from core:

```javascript
// Request Gemini AI generation
const { result } = await this.requestFromCore('gemini-generate', { prompt });

// Save to SMB
await this.requestFromCore('smb-save', { filename, content });
```

### Plugin Communication
Plugins can communicate with each other:

```javascript
const { getPlugin } = await import('../../src/core/plugin-system.js');
const otherPlugin = getPlugin('other-plugin');
const result = await otherPlugin.someMethod();
```

---

## 📖 Plugin Development

### Creating a New Plugin

1. **Create plugin directory:**
```bash
mkdir plugins/my-plugin
```

2. **Create plugin.js:**
```javascript
import { Plugin } from '../../src/core/plugin-system.js';

export default class MyPlugin extends Plugin {
  constructor() {
    super('my-plugin', '1.0.0', 'My plugin description');
  }
  
  async onLoad() {
    console.log('My plugin loaded!');
  }
}
```

3. **Create commands.js (optional):**
```javascript
export const commandGroup = /* ... */;
export const parentCommand = 'automation';
export async function handleCommand(interaction, plugin) { /* ... */ }
```

4. **Create documentation:**
```bash
node scripts/create-plugin-docs.js
```

### Plugin Lifecycle

```javascript
constructor()  // Plugin initialization
onLoad()       // Called when plugin loads
onEnable()     // Called when plugin is enabled
onDisable()    // Called when plugin is disabled
onUnload()     // Called when plugin unloads
```

### Best Practices

✅ **DO:**
- Import from `../../src/database/db.js` for READ access
- Use `registerSchemaExtension()` for schema changes
- Use core handlers for shared services
- Store plugin data in `bot_config` table
- Provide comprehensive documentation

❌ **DON'T:**
- Import from `src/config/` (use core handlers)
- Modify database schema directly
- Import plugins from core (use dynamic imports)
- Create tight coupling between plugins

---

## 🔧 Plugin Management

### Enable/Disable Plugins

```javascript
// Via dashboard or commands
/bot plugin list          // List all plugins
/bot plugin enable <name>  // Enable plugin
/bot plugin disable <name> // Disable plugin
/bot plugin reload <name>  // Reload plugin
```

### Plugin Configuration

Each plugin can store configuration in the `bot_config` table:

```javascript
const { configOps } = await import('../../src/database/db.js');

// Save config
configOps.set('myplugin_config', JSON.stringify(config));

// Load config
const saved = configOps.get('myplugin_config');
const config = saved ? JSON.parse(saved) : defaultConfig;
```

---

## 📊 Plugin Statistics

**Total Plugins:** 17
- Core: 3
- AI: 3
- Network: 6
- Automation: 2
- Entertainment: 1
- Integration: 3

**Total Commands:** 100+

**Code Metrics:**
- Core: 35 lines (down from 3,553)
- Plugins: ~15,000 lines
- Average plugin size: ~880 lines
- Documentation: 68 files

---

## 🏗️ Architecture

### Plugin-First Design

```
src/
├── core/
│   ├── bot.js              # Minimal bot core (35 lines)
│   ├── plugin-system.js    # Plugin management
│   └── ...
└── ...

plugins/
├── conversational-ai/      # AI chat plugin
├── personality/            # Personality system
├── network-management/     # Network features
├── power-management/       # Power control (NEW!)
└── ...                     # 13 more plugins
```

### Benefits

✅ **Maintainability** - Each plugin is independent  
✅ **Scalability** - Easy to add new features  
✅ **Testability** - Plugins can be tested in isolation  
✅ **Flexibility** - Enable/disable features as needed  
✅ **Clarity** - Clear separation of concerns

---

## 📚 Documentation

### Plugin Documentation Structure

Each plugin has its own `docs/` folder:

```
plugins/my-plugin/
├── plugin.js
├── commands.js
└── docs/
    ├── README.md       # Overview
    ├── COMMANDS.md     # Command reference
    ├── EXAMPLES.md     # Usage examples
    └── CHANGELOG.md    # Version history
```

### Generate Documentation

```bash
node scripts/create-plugin-docs.js
```

This creates documentation for all plugins automatically.

---

## 🔍 Validation

All plugins are validated against the backup code to ensure functionality is preserved:

```bash
node scripts/validate-plugins.js    # Validate plugin structure
node scripts/compare-features.js    # Compare with backup
```

**Validation Results:**
- ✅ All 17 plugins validated
- ✅ All features preserved
- ✅ Zero breaking changes
- ✅ Architecture 100% clean

See [PLUGIN_VALIDATION_REPORT.md](../PLUGIN_VALIDATION_REPORT.md) for details.

---

## 🐛 Troubleshooting

### Plugin Won't Load

1. Check plugin.js exists
2. Verify plugin exports default class
3. Check console for errors
4. Verify plugin extends Plugin base class

### Commands Not Working

1. Check commands.js exists
2. Verify commandGroup is exported
3. Check parentCommand is valid
4. Verify handleCommand is exported

### Schema Extensions Not Applied

1. Check registerSchemaExtension() is called in constructor
2. Verify core applies extensions (check logs)
3. Check database for new columns

---

## 🤝 Contributing

Want to contribute a plugin?

1. Fork the repository
2. Create your plugin following best practices
3. Add comprehensive documentation
4. Test thoroughly
5. Submit a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for details.

---

## 📄 License

See [LICENSE](../LICENSE) for details.

---

## 🆘 Support

- **Issues:** Open an issue on GitHub
- **Documentation:** Check plugin docs folders
- **Logs:** Check bot console output
- **Community:** Join our Discord server

---

**Last Updated:** December 14, 2025  
**Version:** 1.0.0.0-beta  
**Plugins:** 17 active
