# Plugin System - Dynamic Command Loading

## Overview

The plugin system supports **fully dynamic command loading** without touching core files. Plugins can define their own slash commands that are automatically discovered and registered.

## How It Works

### 1. Plugin Structure

```
plugins/
├── my-plugin.js              # Plugin logic
└── my-plugin/
    └── commands.js           # Slash command definitions (optional)
```

### 2. Command Definition

Create a `commands.js` file in a folder matching your plugin name:

```javascript
import { SlashCommandSubcommandGroupBuilder } from 'discord.js';

// Define the command group
export const commandGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('mycommand')
  .setDescription('My plugin commands')
  .addSubcommand(subcommand =>
    subcommand
      .setName('action')
      .setDescription('Do something'));

// Specify which parent command to attach to
export const parentCommand = 'automation'; // or 'network', 'device', 'bot', etc.

// Command handler
export async function handleCommand(interaction, plugin) {
  const subcommand = interaction.options.getSubcommand();
  
  if (subcommand === 'action') {
    await interaction.reply('Action executed!');
  }
}

// Autocomplete handler (optional)
export async function handleAutocomplete(interaction, plugin) {
  const focusedOption = interaction.options.getFocused(true);
  // Return autocomplete suggestions
  await interaction.respond([
    { name: 'Option 1', value: 'opt1' },
    { name: 'Option 2', value: 'opt2' }
  ]);
}
```

### 3. Automatic Registration

When your plugin loads:
1. Plugin manager detects `plugins/my-plugin/commands.js`
2. Commands are automatically injected into the parent command
3. Routing is handled automatically via the `plugin:` prefix
4. No core files are touched!

## Example: Device Health Plugin

```
plugins/
├── device-health.js           # Plugin with health tracking logic
└── device-health/
    └── commands.js            # Defines /automation health commands
```

**Result:** `/automation health report`, `/automation health summary`, etc.

## Parent Commands

You can attach plugin commands to any parent command:

- `automation` - For automation and monitoring features
- `network` - For network-related features
- `device` - For device management features
- `bot` - For bot utilities
- `admin` - For admin features (requires permissions)
- `research` - For research/AI features
- `game` - For game features

## Command Routing

The system automatically routes commands:

1. User runs `/automation health report`
2. Dynamic router detects `health` is a plugin command group
3. Routes to `plugin:device-health`
4. Plugin manager calls `handleCommand()` with the plugin instance
5. Your handler processes the command

## Autocomplete

Autocomplete is also automatic:

1. User types in `/automation health report [device]`
2. Dynamic autocomplete handler detects plugin command
3. Calls your `handleAutocomplete()` function
4. Returns suggestions to Discord

## Hot Reload

Plugin commands support hot reload:

1. Edit `plugins/my-plugin/commands.js`
2. Plugin manager detects the change
3. Reloads the plugin and commands
4. Commands are re-registered automatically

## Best Practices

1. **Keep commands self-contained** - All logic should be in the plugin
2. **Use the plugin instance** - Access plugin methods via the `plugin` parameter
3. **Handle errors gracefully** - Wrap in try/catch and reply with error messages
4. **Use defer for slow operations** - `await interaction.deferReply()`
5. **Provide autocomplete** - Makes commands easier to use

## Example Plugins

- `device-health` - Device uptime monitoring with `/automation health` commands
- `speed-alerts` - Speed monitoring with `/automation speedalert` commands
- `device-triggers` - Device automation with `/automation devicetrigger` commands

## No Core File Changes Required!

The beauty of this system:
- ✅ Add new plugins → Commands appear automatically
- ✅ Remove plugins → Commands disappear automatically
- ✅ Update plugins → Commands update automatically
- ❌ Never touch `index.js` or `slash-commands.js`
- ❌ Never touch routing logic
- ❌ Never touch autocomplete logic

Everything is **100% dynamic and self-contained**!
