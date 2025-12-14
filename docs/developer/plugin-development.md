# Plugin Development Guide

**Version:** 1.0.0.0-beta
**Last Updated:** December 14, 2025

This guide will teach you how to create custom plugins for Discord Maid Bot.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Plugin Structure](#plugin-structure)
3. [Creating Your First Plugin](#creating-your-first-plugin)
4. [Plugin Class](#plugin-class)
5. [Commands](#commands)
6. [Events](#events)
7. [Dependencies](#dependencies)
8. [Documentation](#documentation)
9. [Testing](#testing)
10. [Best Practices](#best-practices)
11. [Publishing](#publishing)

---

## Overview

### What is a Plugin?

A plugin is a self-contained module that extends the bot's functionality. Plugins can:
- Add new slash commands
- Listen to Discord events
- Interact with other plugins
- Store data in the database
- Provide APIs for other plugins

### Plugin Philosophy

**"If it can be a plugin, it should be a plugin"**

- **Modular** - Each plugin is independent
- **Reusable** - Plugins can be shared across bots
- **Maintainable** - Easy to update and debug
- **Optional** - Can be enabled/disabled
- **Isolated** - Errors don't crash the bot

---

## Plugin Structure

### Basic Structure

```
plugins/my-plugin/
├── plugin.js                    # Main plugin file (required)
├── commands.js                  # Command definitions (optional)
├── README.md                    # Plugin overview (required)
└── docs/                        # Plugin documentation (required)
    ├── README.md               # Detailed documentation
    ├── COMMANDS.md             # Command reference
    ├── EXAMPLES.md             # Usage examples
    └── CHANGELOG.md            # Version history
```

### Advanced Structure

```
plugins/my-plugin/
├── plugin.js                    # Main plugin file
├── commands.js                  # Command definitions
├── events.js                    # Event handlers
├── utils.js                     # Utility functions
├── config.js                    # Plugin configuration
├── README.md                    # Plugin overview
└── docs/                        # Documentation
    ├── README.md
    ├── COMMANDS.md
    ├── EXAMPLES.md
    ├── API.md                  # Plugin API reference
    └── CHANGELOG.md
```

---

## Creating Your First Plugin

### Step 1: Create Plugin Directory

```bash
mkdir plugins/my-plugin
cd plugins/my-plugin
```

### Step 2: Create plugin.js

```javascript
/**
 * My Plugin
 * 
 * Description of what your plugin does.
 * 
 * @module plugins/my-plugin
 * @version 1.0.0.0-beta
 * @author Your Name
 */

import { Plugin } from '../../src/core/plugin-system.js';

export default class MyPlugin extends Plugin {
  constructor() {
    super('my-plugin', '1.0.0.0-beta', 'Short description of your plugin', {
      // Optional dependencies
      optionalDependencies: ['other-plugin'],
      // Required dependencies
      dependencies: [],
      // Plugin metadata
      category: 'utility',
      author: 'Your Name',
      keywords: ['keyword1', 'keyword2']
    });
  }

  async onLoad() {
    console.log(`[${this.name}] Loading my plugin...`);
    
    // Initialize your plugin here
    // - Set up database tables
    // - Load configuration
    // - Initialize services
    
    console.log(`[${this.name}] ✅ My plugin loaded`);
  }

  async onUnload() {
    console.log(`[${this.name}] Unloading my plugin...`);
    
    // Cleanup here
    // - Close connections
    // - Save state
    // - Clear timers
  }

  // Your plugin methods here
  async myMethod() {
    return 'Hello from my plugin!';
  }
}
```

### Step 3: Create commands.js (Optional)

```javascript
/**
 * My Plugin Commands
 * 
 * Handles all commands for my plugin.
 */

import { SlashCommandSubcommandBuilder, EmbedBuilder } from 'discord.js';

// Parent command to inject into (e.g., 'bot', 'automation', 'network')
export const parentCommand = 'bot';

// Command definition
export const commandGroup = new SlashCommandSubcommandBuilder()
  .setName('mycommand')
  .setDescription('My custom command')
  .addStringOption(option =>
    option
      .setName('input')
      .setDescription('Some input')
      .setRequired(true)
  );

/**
 * Handle command execution
 */
export async function handleCommand(interaction, commandName, subcommand) {
  // Only handle our commands
  if (commandName !== 'bot' || subcommand !== 'mycommand') {
    return false;
  }

  await interaction.deferReply();

  try {
    const input = interaction.options.getString('input');
    
    // Get plugin instance
    const { getPlugin } = await import('../../src/core/plugin-system.js');
    const myPlugin = getPlugin('my-plugin');
    
    if (!myPlugin) {
      await interaction.editReply('❌ Plugin not available!');
      return true;
    }

    // Use plugin method
    const result = await myPlugin.myMethod();

    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle('My Command')
      .setDescription(`Input: ${input}\\nResult: ${result}`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return true;

  } catch (error) {
    console.error('My command error:', error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}`,
      ephemeral: true
    });
    return true;
  }
}

/**
 * Handle autocomplete (optional)
 */
export async function handleAutocomplete(interaction) {
  // Provide autocomplete suggestions
  const focusedOption = interaction.options.getFocused(true);
  
  if (focusedOption.name === 'input') {
    const choices = ['option1', 'option2', 'option3'];
    const filtered = choices.filter(choice => 
      choice.toLowerCase().includes(focusedOption.value.toLowerCase())
    );
    
    await interaction.respond(
      filtered.map(choice => ({ name: choice, value: choice }))
    );
  }
}
```

### Step 4: Create README.md

```markdown
# My Plugin

**Version:** 1.0.0.0-beta
**Author:** Your Name  
**Category:** Utility

Short description of your plugin.

## Features

- Feature 1
- Feature 2
- Feature 3

## Commands

- \`/bot mycommand\` - Description

## Configuration

No configuration required.

## Dependencies

- None

## Installation

This plugin is included by default.

## Documentation

See [docs/README.md](docs/README.md) for detailed documentation.
```

### Step 5: Create Documentation

Create `docs/README.md`, `docs/COMMANDS.md`, `docs/EXAMPLES.md` with detailed information about your plugin.

### Step 6: Test Your Plugin

```bash
# Start the bot
node index.js

# Check if plugin loaded
# Look for: "✅ Loaded plugin: my-plugin v1.0.0.0-beta"

# Test command in Discord
/bot mycommand input:test
```

---

## Plugin Class

### Constructor

```javascript
constructor() {
  super(name, version, description, options);
}
```

**Parameters:**
- `name` (string) - Plugin identifier (kebab-case)
- `version` (string) - Plugin version (1.0.0.0-beta)
- `description` (string) - Short description
- `options` (object) - Plugin options

**Options:**
```javascript
{
  dependencies: [],              // Required plugins
  optionalDependencies: [],      // Optional plugins
  category: 'utility',           // Plugin category
  author: 'Your Name',           // Plugin author
  keywords: ['tag1', 'tag2']     // Search keywords
}
```

### Lifecycle Methods

#### onLoad()

Called when the plugin is loaded.

```javascript
async onLoad() {
  // Initialize plugin
  // - Set up database
  // - Load configuration
  // - Start services
}
```

#### onUnload()

Called when the plugin is unloaded.

```javascript
async onUnload() {
  // Cleanup
  // - Close connections
  // - Save state
  // - Stop services
}
```

#### onClientReady(client)

Called when Discord client is ready.

```javascript
async onClientReady(client) {
  // Access Discord client
  // - Set up event listeners
  // - Initialize Discord-specific features
}
```

### Plugin Methods

Add custom methods to your plugin class:

```javascript
export default class MyPlugin extends Plugin {
  // ... constructor and lifecycle methods ...

  async getData() {
    return this.data;
  }

  async processData(input) {
    // Process data
    return result;
  }

  async saveData(data) {
    // Save to database
  }
}
```

---

## Commands

### Command Types

#### 1. Subcommand (Injected into Parent)

Adds a subcommand to an existing command (e.g., `/bot mycommand`).

```javascript
export const parentCommand = 'bot';
export const commandGroup = new SlashCommandSubcommandBuilder()
  .setName('mycommand')
  .setDescription('My command');
```

#### 2. Standalone Command

Creates a new top-level command (e.g., `/mycommand`).

```javascript
export const parentCommand = null;
export const commandGroup = new SlashCommandBuilder()
  .setName('mycommand')
  .setDescription('My standalone command');
```

#### 3. Handler-Only

Handles commands defined elsewhere (no command injection).

```javascript
export const parentCommand = null;
export const commandGroup = null;

export async function handleCommand(interaction, commandName, subcommand) {
  // Handle command
}
```

### Command Options

```javascript
.addStringOption(option =>
  option
    .setName('name')
    .setDescription('Description')
    .setRequired(true)
    .setAutocomplete(true)
    .addChoices(
      { name: 'Option 1', value: 'opt1' },
      { name: 'Option 2', value: 'opt2' }
    )
)
.addIntegerOption(option =>
  option
    .setName('number')
    .setDescription('A number')
    .setMinValue(1)
    .setMaxValue(100)
)
.addBooleanOption(option =>
  option
    .setName('flag')
    .setDescription('True or false')
)
.addUserOption(option =>
  option
    .setName('user')
    .setDescription('Select a user')
)
```

### Command Handler

```javascript
export async function handleCommand(interaction, commandName, subcommand) {
  // Check if this is our command
  if (commandName !== 'bot' || subcommand !== 'mycommand') {
    return false; // Not our command
  }

  // Defer reply for long operations
  await interaction.deferReply();

  try {
    // Get options
    const input = interaction.options.getString('input');
    const user = interaction.user;

    // Do something
    const result = await doSomething(input);

    // Reply
    await interaction.editReply(`Result: ${result}`);
    return true; // Command handled

  } catch (error) {
    console.error('Command error:', error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}`,
      ephemeral: true
    });
    return true;
  }
}
```

### Autocomplete Handler

```javascript
export async function handleAutocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  
  if (focusedOption.name === 'input') {
    // Get suggestions
    const suggestions = await getSuggestions(focusedOption.value);
    
    // Respond with choices
    await interaction.respond(
      suggestions.map(s => ({ name: s.name, value: s.value }))
    );
  }
}
```

---

## Events

### Listening to Events

```javascript
export default class MyPlugin extends Plugin {
  async onClientReady(client) {
    // Listen to Discord events
    client.on('messageCreate', this.handleMessage.bind(this));
    client.on('guildMemberAdd', this.handleMemberJoin.bind(this));
  }

  async handleMessage(message) {
    if (message.author.bot) return;
    // Handle message
  }

  async handleMemberJoin(member) {
    // Welcome new member
  }
}
```

### Plugin Events

Listen to events from other plugins:

```javascript
async onLoad() {
  // Listen to plugin events
  const { onPluginEvent } = await import('../../src/core/plugin-system.js');
  
  onPluginEvent('networkScan', this.handleNetworkScan.bind(this));
  onPluginEvent('deviceOnline', this.handleDeviceOnline.bind(this));
}

async handleNetworkScan(devices) {
  console.log(`Network scan found ${devices.length} devices`);
}

async handleDeviceOnline(device) {
  console.log(`Device ${device.name} came online`);
}
```

### Emitting Events

```javascript
async myMethod() {
  // Do something
  const result = await doSomething();
  
  // Emit event to other plugins
  const { emitToPlugins } = await import('../../src/core/plugin-system.js');
  await emitToPlugins('myEvent', result);
}
```

---

## Dependencies

### Declaring Dependencies

```javascript
constructor() {
  super('my-plugin', '1.0.0.0-beta', 'Description', {
    // Required - plugin won't load without these
    dependencies: ['required-plugin'],
    
    // Optional - plugin loads but features may be limited
    optionalDependencies: ['optional-plugin']
  });
}
```

### Using Other Plugins

```javascript
async myMethod() {
  const { getPlugin } = await import('../../src/core/plugin-system.js');
  
  // Get another plugin
  const otherPlugin = getPlugin('other-plugin');
  
  if (!otherPlugin) {
    throw new Error('Required plugin not available');
  }
  
  // Use plugin methods
  const result = await otherPlugin.someMethod();
  return result;
}
```

### Checking Dependencies

```javascript
async onLoad() {
  const { getPlugin } = await import('../../src/core/plugin-system.js');
  
  // Check if optional dependency is available
  const optionalPlugin = getPlugin('optional-plugin');
  
  if (optionalPlugin) {
    console.log('Optional plugin available, enabling extra features');
    this.extraFeaturesEnabled = true;
  } else {
    console.log('Optional plugin not available, using basic features');
    this.extraFeaturesEnabled = false;
  }
}
```

---

## Documentation

### Required Documentation

Every plugin must have:

1. **README.md** - Plugin overview
2. **docs/README.md** - Detailed documentation
3. **docs/COMMANDS.md** - Command reference
4. **docs/EXAMPLES.md** - Usage examples
5. **docs/CHANGELOG.md** - Version history

### Documentation Template

See `plugins/example-plugin/` for a complete documentation template.

### Documentation Standards

- Use clear, concise language
- Include code examples
- Add screenshots where helpful
- Keep it up-to-date
- Follow markdown best practices

---

## Testing

### Manual Testing

```bash
# Start bot
node index.js

# Check plugin loaded
# Look for: "✅ Loaded plugin: my-plugin v1.0.0.0-beta"

# Test commands in Discord
/bot mycommand input:test

# Check logs for errors
# Look for: "[my-plugin]" messages
```

### Testing Checklist

- [ ] Plugin loads without errors
- [ ] Commands register correctly
- [ ] Commands execute successfully
- [ ] Error handling works
- [ ] Dependencies load correctly
- [ ] Events are handled
- [ ] Database operations work
- [ ] No memory leaks
- [ ] No console errors

---

## Best Practices

### Code Style

- Use ES6+ features
- Use async/await for async operations
- Handle errors gracefully
- Log important events
- Comment complex logic
- Use descriptive variable names

### Error Handling

```javascript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error(`[${this.name}] Error:`, error);
  // Handle error gracefully
  return null;
}
```

### Logging

```javascript
// Use plugin name in logs
console.log(`[${this.name}] Operation started`);
console.error(`[${this.name}] Error occurred:`, error);
console.warn(`[${this.name}] Warning: something unusual`);
```

### Database Operations

```javascript
// Import database operations
import { db } from '../../src/database/db.js';

// Use transactions for multiple operations
const stmt = db.prepare('INSERT INTO table VALUES (?, ?)');
const insert = db.transaction((items) => {
  for (const item of items) stmt.run(item.a, item.b);
});
insert(items);
```

### Performance

- Cache frequently accessed data
- Use database indexes
- Avoid blocking operations
- Clean up resources
- Monitor memory usage

### Security

- Validate user input
- Sanitize database queries
- Check permissions
- Rate limit operations
- Don't expose sensitive data

---

## Publishing

### Checklist

- [ ] Plugin works correctly
- [ ] All documentation complete
- [ ] Version number updated
- [ ] CHANGELOG.md updated
- [ ] No console errors
- [ ] Code reviewed
- [ ] Tests passing

### Versioning

Use semantic versioning: `MAJOR.MINOR.PATCH.BUILD-STAGE`

- **MAJOR** - Breaking changes
- **MINOR** - New features
- **PATCH** - Bug fixes
- **BUILD** - Build number
- **STAGE** - alpha, beta, rc, or omit for stable

Examples:
- `1.0.0.0-beta` - Beta release
- `1.0.0.0` - Stable release
- `1.1.0.0` - New features
- `2.0.0.0` - Breaking changes

### Sharing Your Plugin

1. Create a GitHub repository
2. Add comprehensive documentation
3. Include examples
4. Add license file
5. Share in community

---

## Examples

### Simple Plugin

See `plugins/example-plugin/` for a complete example.

### Complex Plugin

See `plugins/network-management/` for an advanced example with:
- Multiple commands
- Event handling
- Database operations
- External APIs
- Comprehensive documentation

---

## Support

### Getting Help

- Check [API Reference](api-reference.md)
- Review [example plugins](../../plugins/)
- Ask in [GitHub Discussions](https://github.com/coff33ninja/Discord-Maid-Bot/discussions)
- Open an [issue](https://github.com/coff33ninja/Discord-Maid-Bot/issues)

### Contributing

See [Contributing Guide](contributing.md) for how to contribute your plugin.

---

**Version:** 1.0.0.0-beta
**Last Updated:** December 14, 2025

Happy plugin development! 🚀
