# Plugin Dependency System

**Date:** December 14, 2025  
**Status:** ✅ Implemented

---

## Overview

The plugin system now supports dependency management. Plugins can declare required and optional dependencies, and the system will check them at load time.

---

## How It Works

### 1. Declaring Dependencies

In your plugin's constructor, pass dependencies in the options:

```javascript
export default class MyPlugin extends Plugin {
  constructor() {
    super('my-plugin', '1.0.0', 'My plugin description', {
      // Required dependencies - plugin won't load without these
      dependencies: ['network-management', 'core-commands'],
      
      // Optional dependencies - plugin loads but some features may not work
      optionalDependencies: ['integrations/speedtest', 'integrations/weather'],
      
      // Additional metadata
      category: 'automation',
      author: 'Your Name',
      keywords: ['automation', 'tasks']
    });
  }
}
```

### 2. Dependency Types

**Required Dependencies (`dependencies`)**
- Plugin **will not load** if these are missing
- System shows error message with missing plugins
- User must install required plugins first

**Optional Dependencies (`optionalDependencies`)**
- Plugin **will load** even if these are missing
- System shows warning about missing features
- Some functionality may be unavailable

### 3. Load-Time Checking

When a plugin loads, the system:
1. Checks all required dependencies
2. If any are missing, plugin fails to load with error
3. Checks optional dependencies
4. If any are missing, shows warning but continues

---

## Example Output

### Missing Required Dependencies
```
❌ Plugin my-plugin has missing required dependencies:
   ❌ network-management (required)
   ❌ core-commands (required)
   Install missing plugins to enable my-plugin
```

### Missing Optional Dependencies
```
⚠️  Plugin automation has missing optional dependencies:
   ⚠️  integrations/speedtest (optional - some features may not work)
   ⚠️  integrations/weather (optional - some features may not work)
⏰ Automation plugin loaded
```

---

## Viewing Dependencies

Use the `/plugin list` command to see plugin dependencies:

```
🔌 Loaded Plugins

automation v1.0.0
Task scheduling and automation system
✅ Enabled
⚙️ Optional: integrations/speedtest, integrations/weather
```

---

## Current Plugin Dependencies

### Automation Plugin
**Optional Dependencies:**
- `integrations/speedtest` - For scheduled speed tests
- `integrations/weather` - For scheduled weather updates

**Why Optional?**
- Automation works without them
- Only specific scheduled tasks need them
- Users can still use cron scheduling

---

## Best Practices

### When to Use Required Dependencies

Use `dependencies` when:
- Plugin cannot function without another plugin
- Core functionality depends on it
- Would cause errors if missing

**Example:**
```javascript
dependencies: ['network-management']  // Plugin needs network scanning
```

### When to Use Optional Dependencies

Use `optionalDependencies` when:
- Plugin works but some features are unavailable
- Enhances functionality but not required
- Graceful degradation is possible

**Example:**
```javascript
optionalDependencies: ['integrations/speedtest']  // Nice to have, not required
```

### Handling Missing Optional Dependencies

In your plugin code, check if optional dependencies are available:

```javascript
async executeSpeedtestTask(channel) {
  try {
    // Try to import optional dependency
    const { runSpeedtest } = await import('./integrations/speedtest/commands.js');
    const result = await runSpeedtest();
    // Use the feature
  } catch (error) {
    // Gracefully handle missing dependency
    console.error('Speedtest plugin not available:', error);
    if (channel) {
      await channel.send('❌ Speedtest plugin not installed. Install integrations/speedtest to use this feature.');
    }
  }
}
```

---

## Plugin Metadata

Plugins can also declare additional metadata:

```javascript
super('my-plugin', '1.0.0', 'Description', {
  dependencies: [],
  optionalDependencies: [],
  category: 'automation',      // Plugin category
  author: 'Your Name',         // Plugin author
  keywords: ['task', 'cron']   // Search keywords
});
```

**Categories:**
- `automation` - Automation and scheduling
- `network` - Network management
- `integration` - External service integrations
- `game` - Games and entertainment
- `utility` - Utility commands
- `ai` - AI-powered features
- `general` - General purpose

---

## Future Enhancements

### Planned Features
- [ ] Automatic dependency installation
- [ ] Dependency version requirements
- [ ] Circular dependency detection
- [ ] Dependency graph visualization
- [ ] Plugin marketplace with dependencies

### Dependency Installation (Future)
```
/plugin install my-plugin
⚠️  my-plugin requires: network-management, core-commands
❓ Install dependencies? (yes/no)
✅ Installing network-management...
✅ Installing core-commands...
✅ Installing my-plugin...
✅ All plugins installed successfully!
```

---

## API Reference

### Plugin Constructor

```javascript
constructor(name, version, description, options)
```

**Parameters:**
- `name` (string) - Plugin name
- `version` (string) - Plugin version
- `description` (string) - Plugin description
- `options` (object) - Optional configuration
  - `dependencies` (array) - Required plugins
  - `optionalDependencies` (array) - Optional plugins
  - `category` (string) - Plugin category
  - `author` (string) - Plugin author
  - `keywords` (array) - Search keywords

### System Functions

```javascript
// Check if plugin is loaded
const isLoaded = loadedPlugins.has('plugin-name');

// Get plugin dependencies
const deps = getPluginDependencies('plugin-name');
// Returns: { required: [], optional: [], dependents: [] }

// Get plugins that depend on this plugin
const dependents = getPluginDependents('plugin-name');
```

---

## Migration Guide

### Updating Existing Plugins

1. **Add dependencies to constructor:**
```javascript
// Before
super('my-plugin', '1.0.0', 'Description');

// After
super('my-plugin', '1.0.0', 'Description', {
  optionalDependencies: ['other-plugin']
});
```

2. **Handle missing dependencies gracefully:**
```javascript
try {
  const { feature } = await import('./other-plugin/commands.js');
  await feature();
} catch (error) {
  console.warn('Optional feature not available');
}
```

3. **Test with and without dependencies:**
- Test plugin loads without optional dependencies
- Test features work with dependencies
- Test error handling for missing dependencies

---

## Examples

### Example 1: Plugin with Required Dependency

```javascript
export default class AdvancedNetworkPlugin extends Plugin {
  constructor() {
    super('advanced-network', '1.0.0', 'Advanced network features', {
      dependencies: ['network-management'],  // Must have network-management
      category: 'network',
      author: 'Your Name'
    });
  }
  
  async onLoad() {
    // Can safely use network-management features
    const { scanNetwork } = await import('../network-management/commands.js');
    // ...
  }
}
```

### Example 2: Plugin with Optional Dependencies

```javascript
export default class ReportingPlugin extends Plugin {
  constructor() {
    super('reporting', '1.0.0', 'Generate reports', {
      optionalDependencies: [
        'network-management',
        'integrations/speedtest',
        'device-health'
      ],
      category: 'utility',
      author: 'Your Name'
    });
  }
  
  async generateReport() {
    const report = {};
    
    // Try to include network data
    try {
      const { getNetworkStats } = await import('../network-management/commands.js');
      report.network = await getNetworkStats();
    } catch {
      report.network = 'Not available';
    }
    
    // Try to include speedtest data
    try {
      const { getSpeedHistory } = await import('../integrations/speedtest/commands.js');
      report.speed = await getSpeedHistory();
    } catch {
      report.speed = 'Not available';
    }
    
    return report;
  }
}
```

---

## Troubleshooting

### Plugin Won't Load

**Error:** "Plugin has missing required dependencies"

**Solution:**
1. Check which dependencies are missing
2. Install missing plugins
3. Restart bot

### Features Not Working

**Warning:** "Plugin has missing optional dependencies"

**Solution:**
1. Check which optional dependencies are missing
2. Install them if you want those features
3. Or continue without them (some features unavailable)

### Circular Dependencies

**Error:** "Circular dependency detected"

**Solution:**
- Redesign plugins to avoid circular dependencies
- Use events instead of direct imports
- Split functionality into separate plugins

---

## Conclusion

The dependency system makes plugins more robust and user-friendly by:
- ✅ Preventing load errors from missing dependencies
- ✅ Informing users about missing features
- ✅ Enabling graceful degradation
- ✅ Supporting complex plugin ecosystems

**Status:** Production ready and working! 🎉

