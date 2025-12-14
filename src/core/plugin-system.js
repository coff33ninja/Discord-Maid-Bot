import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import { pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLUGINS_DIR = path.join(__dirname, '../../plugins');
const loadedPlugins = new Map();
const pluginCommands = new Map(); // Store plugin commands
let watcher = null;

// Core request handlers (injected by core system)
let coreRequestHandlers = {};

export function registerCoreHandler(event, handler) {
  coreRequestHandlers[event] = handler;
}

// Plugin interface
export class Plugin {
  constructor(name, version, description, options = {}) {
    this.name = name;
    this.version = version;
    this.description = description;
    this.enabled = true;
    
    // Plugin metadata
    this.dependencies = options.dependencies || []; // Required plugins
    this.optionalDependencies = options.optionalDependencies || []; // Optional plugins
    this.category = options.category || 'general'; // Plugin category
    this.author = options.author || 'Unknown';
    this.keywords = options.keywords || [];
  }
  
  // Lifecycle hooks
  async onLoad() {}
  async onUnload() {}
  async onEnable() {}
  async onDisable() {}
  
  // Command registration
  registerCommand(command) {
    return command;
  }
  
  // Event listeners
  on(event, handler) {
    // To be implemented by plugin manager
  }
  
  // Request data/actions from core system (never imports core directly)
  async requestFromCore(event, data = null) {
    const handler = coreRequestHandlers[event];
    if (!handler) {
      throw new Error(`Core handler not registered for event: ${event}`);
    }
    return await handler(data);
  }
}

// Initialize plugin system
export async function initPluginSystem() {
  try {
    // Create plugins directory if it doesn't exist
    await fs.mkdir(PLUGINS_DIR, { recursive: true });
    
    // Create example plugin if none exist
    const files = await fs.readdir(PLUGINS_DIR);
    if (files.length === 0) {
      await createExamplePlugin();
    }
    
    // Load all plugins
    await loadAllPlugins();
    
    // Watch for plugin changes (hot reload)
    startPluginWatcher();
    
    console.log(`✅ Plugin system initialized (${loadedPlugins.size} plugins loaded)`);
  } catch (error) {
    console.error('Failed to initialize plugin system:', error);
  }
}

// Check plugin dependencies
function checkDependencies(plugin) {
  const missing = {
    required: [],
    optional: []
  };
  
  // Check required dependencies
  if (plugin.dependencies && plugin.dependencies.length > 0) {
    for (const dep of plugin.dependencies) {
      if (!loadedPlugins.has(dep)) {
        missing.required.push(dep);
      }
    }
  }
  
  // Check optional dependencies
  if (plugin.optionalDependencies && plugin.optionalDependencies.length > 0) {
    for (const dep of plugin.optionalDependencies) {
      if (!loadedPlugins.has(dep)) {
        missing.optional.push(dep);
      }
    }
  }
  
  return missing;
}

// Get plugin dependencies (for display)
export function getPluginDependencies(pluginName) {
  const pluginData = loadedPlugins.get(pluginName);
  if (!pluginData) return null;
  
  const plugin = pluginData.plugin;
  return {
    required: plugin.dependencies || [],
    optional: plugin.optionalDependencies || [],
    dependents: getPluginDependents(pluginName)
  };
}

// Get plugins that depend on this plugin
function getPluginDependents(pluginName) {
  const dependents = [];
  
  for (const [name, data] of loadedPlugins.entries()) {
    const plugin = data.plugin;
    if (plugin.dependencies && plugin.dependencies.includes(pluginName)) {
      dependents.push(name);
    }
  }
  
  return dependents;
}

// Load all plugins
export async function loadAllPlugins() {
  try {
    const entries = await fs.readdir(PLUGINS_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      // Load from directories (new structure: plugins/name/plugin.js)
      if (entry.isDirectory()) {
        const pluginFile = path.join(entry.name, 'plugin.js');
        const pluginPath = path.join(PLUGINS_DIR, pluginFile);
        
        try {
          await fs.access(pluginPath);
          await loadPlugin(pluginFile);
        } catch {
          // No plugin.js in this directory, skip
        }
      }
      // Also support old structure (plugins/name.js) for backwards compatibility
      else if (entry.name.endsWith('.js') && !entry.name.includes('.planned')) {
        await loadPlugin(entry.name);
      }
    }
  } catch (error) {
    console.error('Failed to load plugins:', error);
  }
}

// Load single plugin
export async function loadPlugin(filename) {
  try {
    const pluginPath = path.join(PLUGINS_DIR, filename);
    const pluginUrl = pathToFileURL(pluginPath).href;
    
    // Add timestamp to bypass cache
    const module = await import(`${pluginUrl}?t=${Date.now()}`);
    
    if (!module.default) {
      console.error(`Plugin ${filename} has no default export`);
      return false;
    }
    
    const PluginClass = module.default;
    const plugin = new PluginClass();
    
    // Validate plugin
    if (!plugin.name) {
      console.error(`Plugin ${filename} has no name`);
      return false;
    }
    
    // Check dependencies
    const missingDeps = checkDependencies(plugin);
    if (missingDeps.required.length > 0) {
      console.warn(`⚠️  Plugin ${plugin.name} has missing required dependencies:`);
      missingDeps.required.forEach(dep => {
        console.warn(`   ❌ ${dep} (required)`);
      });
      console.warn(`   Install missing plugins to enable ${plugin.name}`);
      return false;
    }
    
    if (missingDeps.optional.length > 0) {
      console.warn(`⚠️  Plugin ${plugin.name} has missing optional dependencies:`);
      missingDeps.optional.forEach(dep => {
        console.warn(`   ⚠️  ${dep} (optional - some features may not work)`);
      });
    }
    
    // Unload existing version if present
    if (loadedPlugins.has(plugin.name)) {
      await unloadPlugin(plugin.name);
    }
    
    // Load plugin
    await plugin.onLoad();
    
    // Try to load plugin commands (if they exist)
    await loadPluginCommands(plugin.name);
    
    loadedPlugins.set(plugin.name, {
      plugin,
      filename,
      loadedAt: new Date()
    });
    
    console.log(`✅ Loaded plugin: ${plugin.name} v${plugin.version}`);
    return true;
  } catch (error) {
    console.error(`Failed to load plugin ${filename}:`, error);
    return false;
  }
}

// Unload plugin
export async function unloadPlugin(pluginName) {
  const pluginData = loadedPlugins.get(pluginName);
  if (!pluginData) {
    return false;
  }
  
  try {
    await pluginData.plugin.onUnload();
    loadedPlugins.delete(pluginName);
    console.log(`✅ Unloaded plugin: ${pluginName}`);
    return true;
  } catch (error) {
    console.error(`Failed to unload plugin ${pluginName}:`, error);
    return false;
  }
}

// Reload plugin
export async function reloadPlugin(pluginName) {
  const pluginData = loadedPlugins.get(pluginName);
  if (!pluginData) {
    return false;
  }
  
  console.log(`🔄 Reloading plugin: ${pluginName}`);
  await unloadPlugin(pluginName);
  return await loadPlugin(pluginData.filename);
}

// Get all loaded plugins
export function getLoadedPlugins() {
  return Array.from(loadedPlugins.values()).map(data => ({
    name: data.plugin.name,
    version: data.plugin.version,
    description: data.plugin.description,
    enabled: data.plugin.enabled,
    loadedAt: data.loadedAt
  }));
}

// Get plugin by name
export function getPlugin(pluginName) {
  const pluginData = loadedPlugins.get(pluginName);
  return pluginData?.plugin || null;
}

// Enable plugin
export async function enablePlugin(pluginName) {
  const plugin = getPlugin(pluginName);
  if (!plugin) {
    return false;
  }
  
  plugin.enabled = true;
  await plugin.onEnable();
  console.log(`✅ Enabled plugin: ${pluginName}`);
  return true;
}

// Disable plugin
export async function disablePlugin(pluginName) {
  const plugin = getPlugin(pluginName);
  if (!plugin) {
    return false;
  }
  
  plugin.enabled = false;
  await plugin.onDisable();
  console.log(`⏸️  Disabled plugin: ${pluginName}`);
  return true;
}

// Watch for plugin changes (hot reload)
function startPluginWatcher() {
  if (watcher) {
    watcher.close();
  }
  
  watcher = chokidar.watch(PLUGINS_DIR, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true
  });
  
  watcher
    .on('add', async (filePath) => {
      const filename = path.basename(filePath);
      const dirname = path.dirname(filePath);
      
      // Ignore commands.js files in subdirectories
      if (filename === 'commands.js' || dirname !== PLUGINS_DIR) {
        return;
      }
      
      if (filename.endsWith('.js')) {
        console.log(`📦 New plugin detected: ${filename}`);
        await loadPlugin(filename);
      }
    })
    .on('change', async (filePath) => {
      const filename = path.basename(filePath);
      const dirname = path.dirname(filePath);
      
      // Ignore commands.js files in subdirectories
      if (filename === 'commands.js' || dirname !== PLUGINS_DIR) {
        return;
      }
      
      if (filename.endsWith('.js')) {
        console.log(`🔄 Plugin changed: ${filename}`);
        // Find plugin by filename
        for (const [name, data] of loadedPlugins.entries()) {
          if (data.filename === filename) {
            await reloadPlugin(name);
            break;
          }
        }
      }
    })
    .on('unlink', async (filePath) => {
      const filename = path.basename(filePath);
      const dirname = path.dirname(filePath);
      
      // Ignore commands.js files in subdirectories
      if (filename === 'commands.js' || dirname !== PLUGINS_DIR) {
        return;
      }
      
      console.log(`🗑️  Plugin removed: ${filename}`);
      // Find and unload plugin
      for (const [name, data] of loadedPlugins.entries()) {
        if (data.filename === filename) {
          await unloadPlugin(name);
          break;
        }
      }
    });
  
  console.log('👀 Plugin hot-reload enabled');
}

// Stop plugin watcher
export function stopPluginWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

// Execute plugin command
export async function executePluginCommand(pluginName, commandName, ...args) {
  const plugin = getPlugin(pluginName);
  if (!plugin || !plugin.enabled) {
    throw new Error(`Plugin ${pluginName} not found or disabled`);
  }
  
  if (typeof plugin[commandName] !== 'function') {
    throw new Error(`Command ${commandName} not found in plugin ${pluginName}`);
  }
  
  return await plugin[commandName](...args);
}

// Emit event to all plugins
export async function emitToPlugins(eventName, ...args) {
  const results = [];
  
  for (const [name, data] of loadedPlugins.entries()) {
    if (!data.plugin.enabled) continue;
    
    const eventHandler = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
    if (typeof data.plugin[eventHandler] === 'function') {
      try {
        const result = await data.plugin[eventHandler](...args);
        results.push({ plugin: name, result });
      } catch (error) {
        console.error(`Plugin ${name} error on ${eventName}:`, error);
      }
    }
  }
  
  return results;
}

// Create example plugin
async function createExamplePlugin() {
  const examplePlugin = `import { Plugin } from '../src/core/plugin-system.js';

export default class ExamplePlugin extends Plugin {
  constructor() {
    super('example-plugin', '1.0.0', 'An example plugin demonstrating the plugin system');
  }
  
  async onLoad() {
    console.log('Example plugin loaded!');
  }
  
  async onUnload() {
    console.log('Example plugin unloaded!');
  }
  
  async onEnable() {
    console.log('Example plugin enabled!');
  }
  
  async onDisable() {
    console.log('Example plugin disabled!');
  }
  
  // Custom command
  async greet(name) {
    return \`Hello, \${name}! This is the example plugin.\`;
  }
  
  // Event handlers
  async onNetworkScan(devices) {
    console.log(\`Example plugin: Network scan found \${devices.length} devices\`);
    return { processed: true, deviceCount: devices.length };
  }
  
  async onSpeedTest(results) {
    console.log(\`Example plugin: Speed test completed - \${results.download} Mbps\`);
    return { processed: true };
  }
}
`;
  
  await fs.writeFile(
    path.join(PLUGINS_DIR, 'example-plugin.js'),
    examplePlugin,
    'utf8'
  );
  
  console.log('✅ Created example plugin');
}

// Get plugin statistics
export function getPluginStats() {
  const plugins = getLoadedPlugins();
  return {
    total: plugins.length,
    enabled: plugins.filter(p => p.enabled).length,
    disabled: plugins.filter(p => !p.enabled).length,
    withCommands: pluginCommands.size
  };
}

// Load plugin commands from plugin folder
async function loadPluginCommands(pluginName) {
  try {
    const commandsPath = path.join(PLUGINS_DIR, pluginName, 'commands.js');
    const commandsUrl = pathToFileURL(commandsPath).href;
    
    // Check if commands file exists
    try {
      await fs.access(commandsPath);
    } catch {
      // No commands file - that's okay
      return;
    }
    
    // Load commands module
    const commandsModule = await import(`${commandsUrl}?t=${Date.now()}`);
    
    // Check for required exports
    // commandGroup can be null for plugins that only provide handlers (commands defined elsewhere)
    if (!commandsModule.handleCommand) {
      console.warn(`Plugin ${pluginName} commands.js missing required exports (handleCommand)`);
      return;
    }
    
    // If commandGroup is null, this plugin only provides handlers (commands defined in slash-commands.js)
    if (commandsModule.commandGroup === null) {
      // Store handler only - no command injection needed
      pluginCommands.set(pluginName, {
        commandGroup: null,
        parentCommand: commandsModule.parentCommand,
        handleCommand: commandsModule.handleCommand,
        handleAutocomplete: commandsModule.handleAutocomplete || null
      });
      console.log(`   📋 Loaded command handlers for plugin: ${pluginName}`);
      return;
    }
    
    // Normal plugin with command definition
    if (!commandsModule.commandGroup) {
      console.warn(`Plugin ${pluginName} commands.js missing commandGroup export`);
      return;
    }
    
    pluginCommands.set(pluginName, {
      commandGroup: commandsModule.commandGroup,
      parentCommand: commandsModule.parentCommand !== undefined ? commandsModule.parentCommand : 'automation',
      handleCommand: commandsModule.handleCommand,
      handleAutocomplete: commandsModule.handleAutocomplete || null
    });
    
    console.log(`   📋 Loaded commands for plugin: ${pluginName}`);
  } catch (error) {
    // Silently ignore if no commands file exists
    if (error.code !== 'ENOENT') {
      console.error(`Failed to load commands for plugin ${pluginName}:`, error);
    }
  }
}

// Get all plugin commands (only those that inject commands, not handler-only plugins)
export function getPluginCommands() {
  return Array.from(pluginCommands.entries())
    .filter(([, commands]) => commands.commandGroup !== null) // Skip handler-only plugins
    .map(([pluginName, commands]) => ({
      pluginName,
      parentCommand: commands.parentCommand,
      commandGroup: commands.commandGroup
    }));
}

// Get plugin command handler
export function getPluginCommandHandler(pluginName) {
  return pluginCommands.get(pluginName);
}

// Handle plugin command
export async function handlePluginCommand(pluginName, interaction) {
  const commandData = pluginCommands.get(pluginName);
  if (!commandData) {
    throw new Error(`No commands found for plugin ${pluginName}`);
  }
  
  const plugin = getPlugin(pluginName);
  if (!plugin || !plugin.enabled) {
    throw new Error(`Plugin ${pluginName} not found or disabled`);
  }
  
  return await commandData.handleCommand(interaction, plugin);
}

// Handle plugin autocomplete
export async function handlePluginAutocomplete(pluginName, interaction) {
  const commandData = pluginCommands.get(pluginName);
  if (!commandData || !commandData.handleAutocomplete) {
    return;
  }
  
  const plugin = getPlugin(pluginName);
  if (!plugin || !plugin.enabled) {
    return;
  }
  
  return await commandData.handleAutocomplete(interaction, plugin);
}

// Get plugin name by parent command and subcommand group
export function getPluginCommandByGroup(parentCommand, subcommandGroup) {
  for (const [pluginName, commandData] of pluginCommands.entries()) {
    if (commandData.parentCommand === parentCommand && 
        commandData.commandGroup.name === subcommandGroup) {
      return pluginName;
    }
  }
  return null;
}
