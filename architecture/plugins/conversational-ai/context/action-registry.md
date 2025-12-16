# action-registry.js

**Path:** `plugins\conversational-ai\context\action-registry.js`

## Description
* Action Registry

## Dependencies
- `../../../src/logging/logger.js` → createLogger (L11)

## Exports
- **registerAction** [function] (L57) - Register an action that the AI can execute
- **unregisterAction** [function] (L122) - Unregister an action
- **unregisterPluginActions** [function] (L145) - Unregister all actions for a plugin
- **getPluginActions** [function] (L168) - Get actions registered by a specific plugin
- **getActions** [function] (L177) - Get all registered actions
- **getAction** [function] (L186) - Get action by ID
- **registerCapabilities** [function] (L212) - Register plugin capabilities for AI awareness
- **unregisterCapabilities** [function] (L230) - Unregister plugin capabilities
- **getCapabilities** [function] (L238) - Get all registered capabilities
- **formatCapabilitiesForPrompt** [function] (L246) - Format all capabilities for AI prompt
- **detectRegisteredAction** [function] (L273) - Detect action from query using registered actions
- **clearRegistry** [function] (L297) - Clear all registrations (useful for testing or reload)
- **checkActionPermission** [function] (L309) - Check if a user has permission to execute an action

## Functions
- ✓ `registerAction(actionId, action)` (L57) - Register an action that the AI can execute
- ✓ `unregisterAction(actionId)` (L122) - Unregister an action
- ✓ `unregisterPluginActions(pluginName)` (L145) - Unregister all actions for a plugin
- ✓ `getPluginActions(pluginName)` (L168) - Get actions registered by a specific plugin
- ✓ `getActions()` (L177) - Get all registered actions
- ✓ `getAction(actionId)` (L186) - Get action by ID
- ✓ `registerCapabilities(pluginName, capabilities)` (L212) - Register plugin capabilities for AI awareness
- ✓ `unregisterCapabilities(pluginName)` (L230) - Unregister plugin capabilities
- ✓ `getCapabilities()` (L238) - Get all registered capabilities
- ✓ `formatCapabilitiesForPrompt()` (L246) - Format all capabilities for AI prompt
- ✓ `detectRegisteredAction(query)` (L273) - Detect action from query using registered actions
- ✓ `clearRegistry()` (L297) - Clear all registrations (useful for testing or reload)
- ✓ `async checkActionPermission(action, context)` (L309) - Check if a user has permission to execute an action

## Constants
- **actionRegistry** [value] (L19) - Registry of actions from all plugins
- **capabilityRegistry** [value] (L25) - Registry of plugin capabilities (for AI context)
- **pluginActions** [value] (L31) - Track which actions belong to which plugin

