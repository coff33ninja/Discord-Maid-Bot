# Plugin Development Guide

## Overview

The bot supports hot-reloadable plugins that can extend functionality without modifying core code.

## Quick Start

Create a file in `plugins/` directory:

```javascript
// plugins/my-plugin.js
import { Plugin } from '../src/plugins/plugin-manager.js';

export default class MyPlugin extends Plugin {
  constructor() {
    super('my-plugin', '1.0.0', 'My awesome plugin');
  }
  
  async onLoad() {
    console.log('My plugin loaded!');
  }
}
```

Save the file - it auto-loads immediately (hot-reload).

## Plugin Lifecycle

```
File Created/Modified → onLoad() → Plugin Active
                                        ↓
                              onEnable() / onDisable()
                                        ↓
File Deleted / Bot Stop → onUnload() → Plugin Removed
```

### Lifecycle Hooks

| Hook | When Called |
|------|-------------|
| `onLoad()` | Plugin file loaded/reloaded |
| `onUnload()` | Plugin being removed |
| `onEnable()` | Plugin enabled via API |
| `onDisable()` | Plugin disabled via API |

## Event Handlers

Plugins can react to bot events:

```javascript
export default class MyPlugin extends Plugin {
  constructor() {
    super('event-plugin', '1.0.0', 'Reacts to events');
  }
  
  // Called after network scan
  async onNetworkScan(devices) {
    console.log(`Found ${devices.length} devices`);
    
    // Find new devices
    const newDevices = devices.filter(d => d.firstSeen === d.lastSeen);
    if (newDevices.length > 0) {
      // Do something with new devices
    }
    
    return { processed: true };
  }
  
  // Called after speed test
  async onSpeedTest(results) {
    console.log(`Speed: ${results.download} Mbps`);
    
    // Alert if speed is low
    if (results.download < 10) {
      // Send notification
    }
    
    return { processed: true };
  }
  
  // Called on chat message
  async onChat(message, response) {
    // Log all conversations
    console.log(`${message.author}: ${message.content}`);
  }
}
```

## Custom Commands

Add custom methods callable via API:

```javascript
export default class CommandPlugin extends Plugin {
  constructor() {
    super('command-plugin', '1.0.0', 'Custom commands');
  }
  
  // Custom command
  async greet(name) {
    return `Hello, ${name}!`;
  }
  
  // Another command
  async calculate(a, b, operation) {
    switch (operation) {
      case 'add': return a + b;
      case 'subtract': return a - b;
      case 'multiply': return a * b;
      case 'divide': return a / b;
      default: throw new Error('Unknown operation');
    }
  }
}
```

Call via API:
```javascript
// From dashboard or other code
import { executePluginCommand } from './src/plugins/plugin-manager.js';

const result = await executePluginCommand('command-plugin', 'greet', 'World');
// result: "Hello, World!"
```

## Accessing Bot Resources

```javascript
export default class ResourcePlugin extends Plugin {
  constructor() {
    super('resource-plugin', '1.0.0', 'Access bot resources');
  }
  
  async onLoad() {
    // Access database
    const { deviceOps, configOps } = await import('../src/database/db.js');
    
    // Get all devices
    const devices = deviceOps.getAll();
    
    // Read/write config
    const value = configOps.get('my_plugin_setting');
    configOps.set('my_plugin_setting', 'new_value');
  }
}
```

## Plugin Configuration

Store plugin settings in bot config:

```javascript
export default class ConfigurablePlugin extends Plugin {
  constructor() {
    super('configurable', '1.0.0', 'Has settings');
    this.settings = {};
  }
  
  async onLoad() {
    const { configOps } = await import('../src/database/db.js');
    
    // Load settings
    const saved = configOps.get('plugin_configurable_settings');
    this.settings = saved ? JSON.parse(saved) : {
      enabled: true,
      threshold: 100,
      notifyChannel: null
    };
  }
  
  async saveSettings() {
    const { configOps } = await import('../src/database/db.js');
    configOps.set('plugin_configurable_settings', JSON.stringify(this.settings));
  }
  
  async updateSetting(key, value) {
    this.settings[key] = value;
    await this.saveSettings();
    return this.settings;
  }
}
```

## Example: Notification Plugin

Complete example that sends Discord notifications:

```javascript
import { Plugin } from '../src/plugins/plugin-manager.js';

export default class NotificationPlugin extends Plugin {
  constructor() {
    super('notifications', '1.0.0', 'Send notifications on events');
    this.client = null;
    this.channelId = null;
  }
  
  async onLoad() {
    const { configOps } = await import('../src/database/db.js');
    this.channelId = configOps.get('notification_channel');
    console.log('Notification plugin ready');
  }
  
  setClient(client) {
    this.client = client;
  }
  
  setChannel(channelId) {
    this.channelId = channelId;
    // Save to config
    import('../src/database/db.js').then(({ configOps }) => {
      configOps.set('notification_channel', channelId);
    });
  }
  
  async notify(message) {
    if (!this.client || !this.channelId) return false;
    
    try {
      const channel = await this.client.channels.fetch(this.channelId);
      await channel.send(message);
      return true;
    } catch (error) {
      console.error('Notification failed:', error);
      return false;
    }
  }
  
  async onNetworkScan(devices) {
    const offline = devices.filter(d => !d.online);
    if (offline.length > 0) {
      await this.notify(`⚠️ ${offline.length} devices went offline!`);
    }
  }
  
  async onSpeedTest(results) {
    if (results.download < 10) {
      await this.notify(`🐌 Slow internet detected: ${results.download} Mbps`);
    }
  }
}
```

## Best Practices

1. **Handle errors gracefully** - Don't crash the bot
2. **Clean up in onUnload** - Close connections, clear intervals
3. **Use async/await** - All hooks support promises
4. **Log meaningfully** - Help with debugging
5. **Version your plugins** - Track changes
6. **Document your plugins** - Help other users

## Plugin API Reference

### Plugin Base Class

```javascript
class Plugin {
  name: string;        // Plugin identifier
  version: string;     // Semantic version
  description: string; // What it does
  enabled: boolean;    // Current state
  
  async onLoad(): void;
  async onUnload(): void;
  async onEnable(): void;
  async onDisable(): void;
}
```

### Plugin Manager Functions

```javascript
import {
  loadPlugin,           // Load single plugin
  unloadPlugin,         // Unload plugin
  reloadPlugin,         // Reload plugin
  getLoadedPlugins,     // List all plugins
  getPlugin,            // Get plugin instance
  enablePlugin,         // Enable plugin
  disablePlugin,        // Disable plugin
  executePluginCommand, // Run plugin command
  emitToPlugins         // Emit event to all plugins
} from './src/plugins/plugin-manager.js';
```
