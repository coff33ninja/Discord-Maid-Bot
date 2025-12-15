/**
 * Context System Exports
 * 
 * @module plugins/conversational-ai/context
 */

export { ContextReconstructor } from './context-reconstructor.js';
export { 
  buildPluginAwareness, 
  formatPluginAwarenessForPrompt, 
  suggestCommand, 
  clearCache as clearPluginCache,
  getActionAwareness
} from './plugin-awareness.js';

// Action Registry - allows plugins to register their own actions
export {
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
} from './action-registry.js';
