/**
 * Plugin Awareness Module
 * 
 * Provides the AI with knowledge of available plugins and commands
 * so it can suggest and help users interact with the bot's capabilities.
 * 
 * @module plugins/conversational-ai/context/plugin-awareness
 */

import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('plugin-awareness');

/**
 * Cache for plugin info (refreshed periodically)
 */
let pluginCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Get loaded plugins from the plugin system
 * @returns {Promise<Array>}
 */
async function getLoadedPlugins() {
  try {
    const { getLoadedPlugins } = await import('../../../src/core/plugin-system.js');
    return getLoadedPlugins();
  } catch (e) {
    logger.debug('Could not get loaded plugins:', e.message);
    return [];
  }
}

/**
 * Build plugin awareness context
 * @returns {Promise<Object>}
 */
export async function buildPluginAwareness() {
  // Check cache
  if (pluginCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return pluginCache;
  }

  const plugins = await getLoadedPlugins();
  const enabledPlugins = plugins.filter(p => p.enabled);

  // Build command registry
  const commands = {
    core: [],
    plugins: {}
  };

  // Core commands (always available)
  commands.core = [
    { name: '/help', description: 'Show all available commands' },
    { name: '/stats', description: 'Display bot statistics' },
    { name: '/ping', description: 'Check bot latency' },
    { name: '/dashboard', description: 'Get web dashboard URL' },
    { name: '/bot', description: 'Bot management (stats, dashboard, help, logs, plugin)' },
    { name: '/admin', description: 'Administration (permissions, config) - Admin only' },
    { name: '/plugin', description: 'Manage plugins (list, enable, disable, reload)' }
  ];

  // Plugin-specific commands
  const pluginCommands = {
    'conversational-ai': [
      { name: '/chat', description: 'Chat with AI', usage: '/chat message:<text>' },
      { name: '/memory', description: 'Manage AI memory', subcommands: ['view', 'clear', 'search', 'stats'] },
      { name: '/ai', description: 'AI settings', subcommands: ['settings', 'context', 'personality'] }
    ],
    'games': [
      { name: '/game play', description: 'Play a game', usage: '/game play game:<name>' },
      { name: '/game list', description: 'List all 18 available games' },
      { name: '/game stats', description: 'View your game statistics' },
      { name: '/game leaderboard', description: 'View leaderboards' }
    ],
    'network-management': [
      { name: '/network scan', description: 'Scan the network for devices' },
      { name: '/network devices', description: 'List all known devices' },
      { name: '/network wol', description: 'Wake on LAN - wake a device' },
      { name: '/network groups', description: 'Manage device groups' }
    ],
    'device-management': [
      { name: '/device list', description: 'List all devices' },
      { name: '/device info', description: 'Get device details' },
      { name: '/device rename', description: 'Rename a device' }
    ],
    'power-management': [
      { name: '/device power wake', description: 'Wake a device' },
      { name: '/device power shutdown', description: 'Shutdown a device' },
      { name: '/device power restart', description: 'Restart a device' }
    ],
    'research': [
      { name: '/research query', description: 'AI-powered research on a topic' },
      { name: '/research web', description: 'Search the web' },
      { name: '/research history', description: 'View past research' }
    ],
    'integrations': [
      { name: '/homeassistant', description: 'Control Home Assistant devices' },
      { name: '/weather', description: 'Get weather information' },
      { name: '/speedtest', description: 'Run internet speed test' }
    ],
    'smart-reminders': [
      { name: '/bot reminder set', description: 'Set a reminder' },
      { name: '/bot reminder list', description: 'List your reminders' },
      { name: '/bot reminder delete', description: 'Delete a reminder' }
    ],
    'personality': [
      { name: '/bot personality set', description: 'Set your AI personality' },
      { name: '/bot personality list', description: 'List available personalities' },
      { name: '/bot personality preview', description: 'Preview a personality' }
    ],
    'automation': [
      { name: '/automation tasks', description: 'Manage scheduled tasks' },
      { name: '/automation health', description: 'Device health monitoring' },
      { name: '/automation speedalert', description: 'Speed alert settings' }
    ]
  };

  // Add commands for enabled plugins
  for (const plugin of enabledPlugins) {
    if (pluginCommands[plugin.name]) {
      commands.plugins[plugin.name] = {
        description: plugin.description,
        commands: pluginCommands[plugin.name]
      };
    }
  }

  // Build capabilities summary
  const capabilities = [];
  
  if (commands.plugins['games']) {
    capabilities.push('Play games (trivia, hangman, tic-tac-toe, and 15 more)');
  }
  if (commands.plugins['network-management']) {
    capabilities.push('Scan and manage network devices');
  }
  if (commands.plugins['integrations']) {
    capabilities.push('Control Home Assistant, check weather, run speed tests');
  }
  if (commands.plugins['research']) {
    capabilities.push('Research topics using AI and web search');
  }
  if (commands.plugins['smart-reminders']) {
    capabilities.push('Set and manage reminders');
  }
  if (commands.plugins['power-management']) {
    capabilities.push('Wake, shutdown, or restart devices remotely');
  }

  pluginCache = {
    enabledPlugins: enabledPlugins.map(p => p.name),
    pluginCount: enabledPlugins.length,
    commands,
    capabilities
  };
  cacheTimestamp = Date.now();

  return pluginCache;
}

/**
 * Format plugin awareness for AI prompt
 * @returns {Promise<string>}
 */
export async function formatPluginAwarenessForPrompt() {
  const awareness = await buildPluginAwareness();
  
  const parts = [];
  
  parts.push('**Available Bot Capabilities:**');
  parts.push(`You are part of a Discord bot with ${awareness.pluginCount} plugins loaded.`);
  parts.push('');
  
  // List capabilities
  if (awareness.capabilities.length > 0) {
    parts.push('You can help users with:');
    for (const cap of awareness.capabilities) {
      parts.push(`• ${cap}`);
    }
    parts.push('');
  }
  
  // Key commands
  parts.push('**Key Commands to Suggest:**');
  
  // Core
  parts.push('Core: /help, /stats, /ping, /dashboard');
  
  // Plugin commands (abbreviated)
  const pluginCmdSummary = [];
  if (awareness.commands.plugins['conversational-ai']) {
    pluginCmdSummary.push('AI: /chat, /memory, /ai');
  }
  if (awareness.commands.plugins['games']) {
    pluginCmdSummary.push('Games: /game play, /game list');
  }
  if (awareness.commands.plugins['network-management']) {
    pluginCmdSummary.push('Network: /network scan, /network devices');
  }
  if (awareness.commands.plugins['integrations']) {
    pluginCmdSummary.push('Smart Home: /homeassistant, /weather');
  }
  if (awareness.commands.plugins['research']) {
    pluginCmdSummary.push('Research: /research query');
  }
  
  parts.push(pluginCmdSummary.join(' | '));
  parts.push('');
  
  parts.push('When users ask about capabilities, suggest relevant commands. If they want to do something the bot can do, guide them to the right command.');
  
  return parts.join('\n');
}

/**
 * Get command suggestion for a user query
 * @param {string} query - User's message
 * @returns {Promise<Object|null>}
 */
export async function suggestCommand(query) {
  const awareness = await buildPluginAwareness();
  const lowerQuery = query.toLowerCase();
  
  // Keyword to command mapping
  const suggestions = [
    { keywords: ['game', 'play', 'trivia', 'hangman', 'fun'], command: '/game play', plugin: 'games' },
    { keywords: ['scan', 'network', 'devices', 'find devices'], command: '/network scan', plugin: 'network-management' },
    { keywords: ['wake', 'turn on', 'power on', 'wol'], command: '/network wol', plugin: 'power-management' },
    { keywords: ['shutdown', 'turn off', 'power off'], command: '/device power shutdown', plugin: 'power-management' },
    { keywords: ['weather', 'temperature', 'forecast'], command: '/weather', plugin: 'integrations' },
    { keywords: ['home assistant', 'smart home', 'lights', 'switch'], command: '/homeassistant', plugin: 'integrations' },
    { keywords: ['speed test', 'internet speed', 'bandwidth'], command: '/speedtest', plugin: 'integrations' },
    { keywords: ['research', 'look up', 'find out', 'learn about'], command: '/research query', plugin: 'research' },
    { keywords: ['remind', 'reminder', 'remember to'], command: '/bot reminder set', plugin: 'smart-reminders' },
    { keywords: ['personality', 'change personality', 'be more'], command: '/ai personality', plugin: 'personality' },
    { keywords: ['help', 'commands', 'what can you do'], command: '/help', plugin: 'core' },
    { keywords: ['stats', 'statistics', 'status'], command: '/stats', plugin: 'core' },
    { keywords: ['memory', 'remember', 'context', 'conversation'], command: '/memory view', plugin: 'conversational-ai' }
  ];
  
  for (const suggestion of suggestions) {
    // Check if plugin is enabled (or is core)
    if (suggestion.plugin !== 'core' && !awareness.enabledPlugins.includes(suggestion.plugin)) {
      continue;
    }
    
    // Check if any keyword matches
    if (suggestion.keywords.some(kw => lowerQuery.includes(kw))) {
      return {
        command: suggestion.command,
        plugin: suggestion.plugin
      };
    }
  }
  
  return null;
}

/**
 * Clear the plugin cache (call when plugins change)
 */
export function clearCache() {
  pluginCache = null;
  cacheTimestamp = 0;
}

export default {
  buildPluginAwareness,
  formatPluginAwarenessForPrompt,
  suggestCommand,
  clearCache
};
