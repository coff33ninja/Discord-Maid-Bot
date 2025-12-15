/**
 * Conversational AI Configuration
 * 
 * Centralized configuration with environment variable support and defaults.
 * 
 * @module plugins/conversational-ai/config
 */

/**
 * @typedef {Object} ConversationalAIConfig
 * @property {number} shortTermMaxTokens - Max tokens in short-term memory
 * @property {number} shortTermMaxMessages - Max messages in short-term memory
 * @property {boolean} semanticMemoryEnabled - Enable semantic memory
 * @property {number} semanticMemoryRetentionDays - Days to retain semantic memories
 * @property {boolean} prefixCommandsEnabled - Enable prefix commands
 * @property {boolean} passiveTriggersEnabled - Enable passive triggers
 * @property {boolean} mentionRequired - Require mention in guild channels
 * @property {number} maxContextTokens - Max tokens for context reconstruction
 * @property {number} semanticSearchLimit - Max semantic search results
 */

/**
 * Configuration schema with defaults and types
 */
const CONFIG_SCHEMA = {
  // Memory settings
  SHORT_TERM_MAX_TOKENS: { default: 4000, type: 'number', min: 500, max: 10000 },
  SHORT_TERM_MAX_MESSAGES: { default: 50, type: 'number', min: 10, max: 200 },
  SEMANTIC_MEMORY_ENABLED: { default: true, type: 'boolean' },
  SEMANTIC_MEMORY_RETENTION_DAYS: { default: 90, type: 'number', min: 1, max: 365 },
  
  // Interaction settings
  PREFIX_COMMANDS_ENABLED: { default: true, type: 'boolean' },
  PASSIVE_TRIGGERS_ENABLED: { default: true, type: 'boolean' },
  MENTION_REQUIRED: { default: false, type: 'boolean' },
  
  // Context settings
  MAX_CONTEXT_TOKENS: { default: 6000, type: 'number', min: 1000, max: 15000 },
  SEMANTIC_SEARCH_LIMIT: { default: 5, type: 'number', min: 1, max: 20 }
};

/**
 * Parse environment variable value based on type
 * @param {string} value - Raw value
 * @param {string} type - Expected type
 * @returns {*} Parsed value
 */
function parseValue(value, type) {
  if (value === undefined || value === null) return undefined;
  
  switch (type) {
    case 'boolean':
      return value === 'true' || value === '1' || value === true;
    case 'number':
      const num = parseInt(value, 10);
      return isNaN(num) ? undefined : num;
    default:
      return value;
  }
}

/**
 * Validate value against schema
 * @param {*} value - Value to validate
 * @param {Object} schema - Schema definition
 * @returns {*} Validated value or default
 */
function validateValue(value, schema) {
  if (value === undefined) return schema.default;
  
  if (schema.type === 'number') {
    if (schema.min !== undefined && value < schema.min) return schema.min;
    if (schema.max !== undefined && value > schema.max) return schema.max;
  }
  
  return value;
}

/**
 * Load configuration from environment variables
 * @returns {ConversationalAIConfig} Configuration object
 */
export function loadConfig() {
  const config = {};
  
  for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
    const envKey = `CONVERSATIONAL_AI_${key}`;
    const envValue = process.env[envKey];
    const parsed = parseValue(envValue, schema.type);
    config[key] = validateValue(parsed, schema);
  }
  
  // Convert to camelCase for easier use
  return {
    shortTermMaxTokens: config.SHORT_TERM_MAX_TOKENS,
    shortTermMaxMessages: config.SHORT_TERM_MAX_MESSAGES,
    semanticMemoryEnabled: config.SEMANTIC_MEMORY_ENABLED,
    semanticMemoryRetentionDays: config.SEMANTIC_MEMORY_RETENTION_DAYS,
    prefixCommandsEnabled: config.PREFIX_COMMANDS_ENABLED,
    passiveTriggersEnabled: config.PASSIVE_TRIGGERS_ENABLED,
    mentionRequired: config.MENTION_REQUIRED,
    maxContextTokens: config.MAX_CONTEXT_TOKENS,
    semanticSearchLimit: config.SEMANTIC_SEARCH_LIMIT
  };
}

/**
 * Get default configuration
 * @returns {ConversationalAIConfig} Default configuration
 */
export function getDefaults() {
  const defaults = {};
  for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
    defaults[key] = schema.default;
  }
  return defaults;
}

/**
 * Validate a configuration object
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result with errors array
 */
export function validateConfig(config) {
  const errors = [];
  
  for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
    const value = config[key];
    
    if (value === undefined) continue;
    
    if (schema.type === 'number') {
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`${key} must be a number`);
      } else {
        if (schema.min !== undefined && value < schema.min) {
          errors.push(`${key} must be at least ${schema.min}`);
        }
        if (schema.max !== undefined && value > schema.max) {
          errors.push(`${key} must be at most ${schema.max}`);
        }
      }
    }
    
    if (schema.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${key} must be a boolean`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export default { loadConfig, getDefaults, validateConfig, CONFIG_SCHEMA };
