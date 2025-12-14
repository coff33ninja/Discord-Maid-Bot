# Command Bridge Architecture

## Problem

The initial implementation of the command bridge violated the plugin-first architecture by hardcoding a routing map that listed which plugins handle which commands. This meant the core had explicit knowledge of plugins, which breaks the fundamental principle: **"The core should never know which plugins exist."**

## Solution: Dynamic Plugin Discovery

The command bridge now dynamically discovers which plugin handles a command at runtime, without any hardcoded knowledge.

### How It Works

1. **Plugins Advertise Their Commands**
   - Plugins with `parentCommand` set (e.g., `'automation'`, `'device'`) automatically advertise they handle that command
   - Handler-only plugins (with `parentCommand = null`) export a `handlesCommands` array listing the commands they handle

2. **Plugin System Stores Command Metadata**
   - When loading plugins, the plugin system stores:
     - `parentCommand`: Single parent command (if any)
     - `handlesCommands`: Array of commands handled (for multi-command plugins)
     - `commandGroup`: Command group definition (or null for handler-only)
     - `handleCommand`: The command handler function
     - `handleAutocomplete`: The autocomplete handler function (optional)

3. **Command Bridge Discovers Plugins Dynamically**
   - When a command is executed, the bridge calls `getPluginsByParentCommand(commandName)`
   - This function searches all loaded plugins and returns those that handle the command
   - No hardcoded map needed - plugins are discovered at runtime

### Example: Network Management Plugin

```javascript
// plugins/network-management/commands.js

// This plugin handles multiple parent commands
export const parentCommand = null;
export const commandGroup = null;

// Advertise which commands this plugin handles
export const handlesCommands = ['network', 'device'];

// Handler receives commandName to determine which command was called
export async function handleCommand(interaction, commandName, subcommand) {
  if (commandName === 'network') {
    // Handle /network commands
  } else if (commandName === 'device') {
    // Handle /device commands
  }
}
```

### Example: Power Management Plugin

```javascript
// plugins/power-management/commands.js

// This plugin handles a single parent command
export const parentCommand = 'device';

// Command group definition
export const commandGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('power')
  .setDescription('Power management commands');

// Handler only receives interaction (commandName is implicit)
export async function handleCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  // Handle power subcommands
}
```

## Benefits

1. **True Plugin-First Architecture**
   - Core has zero knowledge of which plugins exist
   - Plugins can be added/removed without touching core code
   - New commands automatically discovered

2. **Flexibility**
   - Plugins can handle single or multiple parent commands
   - Handler-only plugins (commands defined in slash-commands.js)
   - Normal plugins (commands injected dynamically)

3. **Maintainability**
   - No hardcoded routing maps to maintain
   - Plugin changes don't require core updates
   - Clear separation of concerns

## Plugin Types

### Type 1: Normal Plugin (Single Parent Command)
- Sets `parentCommand` to command name (e.g., `'automation'`)
- Defines `commandGroup` with subcommands
- Handler receives `interaction` only

**Examples:** automation, research, games, personality, power-management

### Type 2: Handler-Only Plugin (Multiple Parent Commands)
- Sets `parentCommand = null`
- Sets `commandGroup = null`
- Exports `handlesCommands` array
- Handler receives `interaction, commandName, subcommand`

**Examples:** network-management (handles 'network' and 'device')

### Type 3: Standalone Plugin (No Parent Command)
- Sets `parentCommand = null`
- Exports `commands` array with command definitions
- Handled by event-router, not command-bridge

**Examples:** conversational-ai (/chat), core-commands (/core)

## Code Flow

```
User executes /network scan
    ↓
Event Router receives interaction
    ↓
Checks if standalone plugin command (no)
    ↓
Routes to Command Bridge
    ↓
Command Bridge calls getPluginsByParentCommand('network')
    ↓
Plugin System searches all plugins:
  - Checks if plugin.parentCommand === 'network'
  - Checks if plugin.handlesCommands.includes('network')
    ↓
Returns: network-management plugin
    ↓
Command Bridge calls plugin.handleCommand(interaction, 'network', 'scan')
    ↓
Network Management Plugin handles the command
```

## Architecture Rules

✅ **DO:**
- Plugins advertise which commands they handle
- Core discovers plugins dynamically at runtime
- Use `handlesCommands` for multi-command plugins
- Use `parentCommand` for single-command plugins

❌ **DON'T:**
- Hardcode plugin names in core
- Create routing maps in core
- Import plugins statically in core
- Make core aware of which plugins exist

## Future Enhancements

1. **Command Priorities**
   - If multiple plugins handle the same command, use priority system
   - Higher priority plugins handle command first

2. **Command Delegation**
   - Plugins can delegate to other plugins
   - Chain of responsibility pattern

3. **Command Middleware**
   - Plugins can register middleware for commands
   - Pre/post processing hooks

---

**Status:** ✅ Implemented and deployed  
**Date:** December 14, 2025  
**Branch:** dev-plugin-first-refactor
