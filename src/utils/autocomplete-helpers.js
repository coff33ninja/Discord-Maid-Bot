/**
 * Autocomplete Helpers
 * 
 * Shared autocomplete logic for plugins to reduce code duplication
 */

import { deviceOps } from '../database/db.js';

/**
 * Get device autocomplete suggestions
 * 
 * @param {string} focusedValue - The current input value
 * @param {Array} devices - Optional device list (if not provided, fetches from DB)
 * @param {Object} options - Additional options
 * @param {boolean} options.onlineOnly - Only show online devices
 * @param {number} options.limit - Maximum number of suggestions (default: 25)
 * @returns {Array} Array of autocomplete choices
 */
export function getDeviceAutocomplete(focusedValue = '', devices = null, options = {}) {
  const {
    onlineOnly = false,
    limit = 25
  } = options;
  
  // Get devices from DB if not provided
  if (!devices) {
    devices = deviceOps.getAll();
  }
  
  // Filter by online status if requested
  if (onlineOnly) {
    devices = devices.filter(d => d.online);
  }
  
  const focusedLower = focusedValue.toLowerCase();
  
  // Score-based filtering and sorting
  const scored = devices.map(d => {
    const hostname = (d.hostname || '').toLowerCase();
    const ip = d.ip.toLowerCase();
    const name = (d.name || '').toLowerCase();
    const mac = d.mac.toLowerCase();
    
    let score = 0;
    
    if (!focusedValue) {
      // No input - prioritize online devices and those with names
      score = (d.online ? 100 : 0) + (d.name || d.hostname ? 50 : 0);
    } else {
      // Exact match gets highest score
      if (name === focusedLower || hostname === focusedLower) {
        score = 1000;
      } else if (name.startsWith(focusedLower) || hostname.startsWith(focusedLower)) {
        score = 500;
      } else if (name.includes(focusedLower) || hostname.includes(focusedLower)) {
        score = 200;
      } else if (ip.startsWith(focusedLower)) {
        score = 150;
      } else if (ip.includes(focusedLower)) {
        score = 50;
      } else if (mac.includes(focusedLower)) {
        score = 25;
      }
    }
    
    return { device: d, score };
  });
  
  // Sort by score and take top N
  const filtered = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  // Format as autocomplete choices
  const choices = filtered.map(s => {
    const d = s.device;
    const emoji = d.emoji || '';
    const displayName = d.name || d.hostname || d.ip;
    const status = d.online ? '🟢' : '🔴';
    
    return {
      name: `${emoji} ${displayName} ${status} (${d.ip})`.substring(0, 100),
      value: d.mac
    };
  });
  
  return choices;
}

/**
 * Get group autocomplete suggestions
 * 
 * @param {string} focusedValue - The current input value
 * @param {number} limit - Maximum number of suggestions (default: 25)
 * @returns {Array} Array of autocomplete choices
 */
export function getGroupAutocomplete(focusedValue = '', limit = 25) {
  const groups = deviceOps.getAllGroups();
  const focusedLower = focusedValue.toLowerCase();
  
  const filtered = groups
    .filter(g => g.toLowerCase().includes(focusedLower))
    .slice(0, limit);
  
  const choices = filtered.map(g => ({
    name: g,
    value: g
  }));
  
  return choices;
}

/**
 * Get personality autocomplete suggestions
 * 
 * @param {string} focusedValue - The current input value
 * @param {Object} personalities - Personalities object
 * @param {number} limit - Maximum number of suggestions (default: 25)
 * @returns {Array} Array of autocomplete choices
 */
export function getPersonalityAutocomplete(focusedValue = '', personalities = {}, limit = 25) {
  const focusedLower = focusedValue.toLowerCase();
  
  const choices = Object.entries(personalities)
    .filter(([key, p]) => {
      if (!focusedValue) return true;
      return key.toLowerCase().includes(focusedLower) || 
             p.name.toLowerCase().includes(focusedLower);
    })
    .slice(0, limit)
    .map(([key, p]) => ({
      name: `${p.emoji} ${p.name} - ${p.description}`.substring(0, 100),
      value: key
    }));
  
  return choices;
}

/**
 * Generic string list autocomplete
 * 
 * @param {Array} items - Array of strings or objects with 'name' property
 * @param {string} focusedValue - The current input value
 * @param {number} limit - Maximum number of suggestions (default: 25)
 * @returns {Array} Array of autocomplete choices
 */
export function getStringListAutocomplete(items, focusedValue = '', limit = 25) {
  const focusedLower = focusedValue.toLowerCase();
  
  const filtered = items
    .filter(item => {
      const str = typeof item === 'string' ? item : item.name;
      return str.toLowerCase().includes(focusedLower);
    })
    .slice(0, limit);
  
  const choices = filtered.map(item => {
    if (typeof item === 'string') {
      return { name: item, value: item };
    } else {
      return { name: item.name, value: item.value || item.name };
    }
  });
  
  return choices;
}
