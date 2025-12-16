# plugin-awareness.js

**Path:** `plugins\conversational-ai\context\plugin-awareness.js`

## Description
* Plugin Awareness Module

## Dependencies
- `../../../src/logging/logger.js` → createLogger (L10)
- `../../../src/core/plugin-system.js` (dynamic, L27)
- `./action-registry.js` (dynamic, L200)

## Exports
- **buildPluginAwareness** [function] (L39) - Build plugin awareness context
- **formatPluginAwarenessForPrompt** [function] (L168) - Format plugin awareness for AI prompt
- **suggestCommand** [function] (L227) - Get command suggestion for a user query
- **clearCache** [function] (L280) - Clear the plugin cache (call when plugins change)
- **getActionAwareness** [function] (L289) - Get action awareness - what the AI can do directly

## Functions
- `async getLoadedPlugins()` (L25) - Get loaded plugins from the plugin system
- ✓ `async buildPluginAwareness()` (L39) - Build plugin awareness context
- ✓ `async formatPluginAwarenessForPrompt()` (L168) - Format plugin awareness for AI prompt
- ✓ `async suggestCommand(query)` (L227) - Get command suggestion for a user query
- ✓ `clearCache()` (L280) - Clear the plugin cache (call when plugins change)
- ✓ `getActionAwareness()` (L289) - Get action awareness - what the AI can do directly

