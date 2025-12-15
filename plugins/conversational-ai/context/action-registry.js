/**
 * Action Registry
 * 
 * Allows plugins to register their own actions that the AI can execute.
 * This makes the system extensible - new plugins can add capabilities
 * without modifying the conversational-ai plugin.
 * 
 * @module plugins/conversational-ai/context/action-registry
 */

import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('action-registry');

/**
 * Registry of actions from all plugins
 * @type {Map<string, Object>}
 */
const actionRegistry = new Map();

/**
 * Registry of plugin capabilities (for AI context)
 * @type {Map<string, Object>}
 */
const capabilityRegistry = new Map();

/**
 * Register an action that the AI can execute
 * 
 * @param {string} actionId - Unique action identifier
 * @param {Object} action - Action definition
 * @param {string[]} action.keywords - Trigger keywords
 * @param {string} action.plugin - Plugin name
 * @param {string} action.description - Human-readable description
 * @param {Function} action.execute - Async function to execute
 * @param {Function} action.formatResult - Function to format result
 * @param {boolean} [action.needsTarget] - Whether action needs a target
 * @param {string} [action.permission] - Required permission: 'everyone', 'moderator', 'admin'
 * @param {boolean} [action.adminOnly] - Shorthand for permission: 'admin'
 * 
 * @example
 * registerAction('my-action', {
 *   keywords: ['do thing', 'make thing'],
 *   plugin: 'my-plugin',
 *   description: 'Does a thing',
 *   permission: 'everyone', // or 'moderator', 'admin'
 *   async execute(context) { return { result: 'done' }; },
 *   formatResult(result) { return `Done: ${result.result}`; }
 * });
 */
export function registerAction(actionId, action) {
  if (!actionId || !action) {
    logger.warn('Invalid action registration:', actionId);
    return false;
  }

  if (!action.keywords || !action.execute || !action.formatResult) {
    logger.warn(`Action ${actionId} missing required fields`);
    return false;
  }

  actionRegistry.set(actionId, {
    ...action,
    registeredAt: Date.now()
  });

  logger.debug(`Registered action: ${actionId} (${action.keywords.length} keywords)`);
  return true;
}

/**
 * Unregister an action
 * @param {string} actionId - Action to remove
 */
export function unregisterAction(actionId) {
  const removed = actionRegistry.delete(actionId);
  if (removed) {
    logger.debug(`Unregistered action: ${actionId}`);
  }
  return removed;
}

/**
 * Get all registered actions
 * @returns {Map<string, Object>}
 */
export function getActions() {
  return actionRegistry;
}

/**
 * Get action by ID
 * @param {string} actionId 
 * @returns {Object|null}
 */
export function getAction(actionId) {
  return actionRegistry.get(actionId) || null;
}

/**
 * Register plugin capabilities for AI awareness
 * 
 * @param {string} pluginName - Plugin name
 * @param {Object} capabilities - Capability definition
 * @param {string} capabilities.description - What the plugin does
 * @param {string[]} capabilities.features - List of features
 * @param {Object[]} capabilities.commands - Slash commands
 * @param {Object[]} capabilities.naturalLanguage - Natural language triggers
 * 
 * @example
 * registerCapabilities('my-plugin', {
 *   description: 'Does cool things',
 *   features: ['Feature A', 'Feature B'],
 *   commands: [
 *     { name: '/mycmd', description: 'My command' }
 *   ],
 *   naturalLanguage: [
 *     { triggers: ['do cool thing'], action: 'Executes cool thing' }
 *   ]
 * });
 */
export function registerCapabilities(pluginName, capabilities) {
  if (!pluginName || !capabilities) {
    return false;
  }

  capabilityRegistry.set(pluginName, {
    ...capabilities,
    registeredAt: Date.now()
  });

  logger.debug(`Registered capabilities for: ${pluginName}`);
  return true;
}

/**
 * Unregister plugin capabilities
 * @param {string} pluginName 
 */
export function unregisterCapabilities(pluginName) {
  return capabilityRegistry.delete(pluginName);
}

/**
 * Get all registered capabilities
 * @returns {Map<string, Object>}
 */
export function getCapabilities() {
  return capabilityRegistry;
}

/**
 * Format all capabilities for AI prompt
 * @returns {string}
 */
export function formatCapabilitiesForPrompt() {
  const parts = [];
  
  if (capabilityRegistry.size === 0) {
    return '';
  }

  parts.push('**Plugin Capabilities (dynamically registered):**');
  
  for (const [pluginName, caps] of capabilityRegistry) {
    parts.push(`\n• **${pluginName}**: ${caps.description || 'No description'}`);
    
    if (caps.naturalLanguage?.length > 0) {
      for (const nl of caps.naturalLanguage.slice(0, 3)) {
        parts.push(`  - "${nl.triggers[0]}" → ${nl.action}`);
      }
    }
  }

  return parts.join('\n');
}

/**
 * Detect action from query using registered actions
 * @param {string} query - User's message
 * @returns {Object|null} Detected action or null
 */
export function detectRegisteredAction(query) {
  if (!query) return null;
  
  const lowerQuery = query.toLowerCase();
  
  for (const [actionId, action] of actionRegistry) {
    for (const keyword of action.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        return {
          id: actionId,
          action,
          keyword,
          source: 'registry'
        };
      }
    }
  }
  
  return null;
}

/**
 * Clear all registrations (useful for testing or reload)
 */
export function clearRegistry() {
  actionRegistry.clear();
  capabilityRegistry.clear();
  logger.debug('Cleared action and capability registries');
}

/**
 * Check if a user has permission to execute an action
 * @param {Object} action - Action definition
 * @param {Object} context - Execution context with user info
 * @returns {Object} Permission check result
 */
export async function checkActionPermission(action, context) {
  const permission = action.permission || (action.adminOnly ? 'admin' : 'everyone');
  
  // Everyone can use 'everyone' actions
  if (permission === 'everyone') {
    return { allowed: true };
  }
  
  // Get user's permissions
  const userId = context.userId;
  const member = context.member || context.message?.member;
  
  if (!member && !userId) {
    return { allowed: false, reason: 'Could not determine user permissions' };
  }
  
  // Check admin permission
  if (permission === 'admin') {
    // Check if user is bot owner or has admin permissions
    const isOwner = process.env.BOT_OWNER_ID === userId;
    const hasAdminPerm = member?.permissions?.has?.('Administrator');
    
    if (isOwner || hasAdminPerm) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'This action requires administrator permissions' };
  }
  
  // Check moderator permission
  if (permission === 'moderator') {
    const isOwner = process.env.BOT_OWNER_ID === userId;
    const hasModPerm = member?.permissions?.has?.('ManageMessages') || 
                       member?.permissions?.has?.('ModerateMembers') ||
                       member?.permissions?.has?.('Administrator');
    
    if (isOwner || hasModPerm) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'This action requires moderator permissions' };
  }
  
  // Unknown permission level - deny by default
  return { allowed: false, reason: 'Unknown permission level' };
}

export default {
  registerAction,
  unregisterAction,
  getActions,
  getAction,
  registerCapabilities,
  unregisterCapabilities,
  getCapabilities,
  formatCapabilitiesForPrompt,
  detectRegisteredAction,
  clearRegistry,
  checkActionPermission
};
