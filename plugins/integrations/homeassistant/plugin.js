import { Plugin } from '../../../src/core/plugin-system.js';
import { createLogger } from '../../../src/logging/logger.js';
import { configOps } from '../../../src/database/db.js';
import axios from 'axios';

/**
 * Home Assistant Integration Plugin
 * 
 * Provides integration with Home Assistant for smart home control.
 * 
 * Features:
 * - Light control
 * - Switch control
 * - Sensor monitoring
 * - Scene activation
 * - Automation control
 * - Climate control
 * - ESPHome device support
 * 
 * Configuration:
 * - Set HA_URL and HA_TOKEN in .env file
 * - Or use /homeassistant configure command
 */
export default class HomeAssistantPlugin extends Plugin {
  constructor() {
    super('integrations/homeassistant', '1.0.0', 'Home Assistant smart home integration');
    this.logger = createLogger('homeassistant');
    this.client = null;
    this.connected = false;
  }

  async onLoad() {
    this.logger.info('🏠 Home Assistant plugin loading...');
    
    // Try to initialize from env variables first, then from database
    const haUrl = process.env.HA_URL || configOps.get('ha_url');
    const haToken = process.env.HA_TOKEN || configOps.get('ha_token');
    
    if (haUrl && haToken) {
      this.connect(haUrl, haToken);
    } else {
      this.logger.warn('   Home Assistant not configured');
      this.logger.warn('   Set HA_URL and HA_TOKEN in .env or use /homeassistant configure');
    }
  }

  async onUnload() {
    this.logger.info('🏠 Home Assistant plugin unloaded');
    this.client = null;
    this.connected = false;
  }

  // Connect to Home Assistant
  connect(url, token) {
    try {
      this.client = axios.create({
        baseURL: url,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      // Save to database for persistence
      configOps.set('ha_url', url);
      configOps.set('ha_token', token);
      
      this.connected = true;
      this.logger.info('   ✅ Connected to Home Assistant');
      this.logger.info(`   URL: ${url}`);
      return true;
    } catch (error) {
      this.logger.error('   ❌ Failed to connect:', error.message);
      this.connected = false;
      return false;
    }
  }

  // Configure Home Assistant (called from commands)
  configure(url, token) {
    return this.connect(url, token);
  }

  // Check if connected
  isConnected() {
    return this.connected && this.client !== null;
  }

  // Check connection health
  async checkConnection() {
    if (!this.client) return false;
    
    try {
      await this.client.get('/api/');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get all entities
  async getEntities() {
    this._requireConnection();
    const response = await this.client.get('/api/states');
    return response.data;
  }

  // Get specific entity state
  async getEntityState(entityId) {
    this._requireConnection();
    const response = await this.client.get(`/api/states/${entityId}`);
    return response.data;
  }

  // Call a service
  async callService(domain, service, data = {}) {
    this._requireConnection();
    const response = await this.client.post(`/api/services/${domain}/${service}`, data);
    return response.data;
  }



  // ============================================
  // LIGHT CONTROL
  // ============================================

  async getAllLights() {
    const entities = await this.getEntities();
    return entities.filter(e => e.entity_id.startsWith('light.'));
  }

  async controlLight(entityId, state, brightness = null) {
    const service = state ? 'turn_on' : 'turn_off';
    const data = { entity_id: entityId };
    if (brightness !== null && state) {
      data.brightness = brightness;
    }
    return await this.callService('light', service, data);
  }

  // ============================================
  // SWITCH CONTROL
  // ============================================

  async getAllSwitches() {
    const entities = await this.getEntities();
    return entities.filter(e => e.entity_id.startsWith('switch.'));
  }

  async controlSwitch(entityId, state) {
    const service = state ? 'turn_on' : 'turn_off';
    return await this.callService('switch', service, { entity_id: entityId });
  }

  // ============================================
  // SENSOR MONITORING
  // ============================================

  async getAllSensors() {
    const entities = await this.getEntities();
    return entities.filter(e => e.entity_id.startsWith('sensor.'));
  }

  async getSensorData(entityId) {
    const state = await this.getEntityState(entityId);
    return {
      value: state.state,
      unit: state.attributes?.unit_of_measurement,
      friendly_name: state.attributes?.friendly_name,
      last_updated: state.last_updated
    };
  }

  // ============================================
  // SCENES
  // ============================================

  async getAllScenes() {
    const entities = await this.getEntities();
    return entities.filter(e => e.entity_id.startsWith('scene.'));
  }

  async activateScene(sceneId) {
    return await this.callService('scene', 'turn_on', { entity_id: sceneId });
  }

  // ============================================
  // AUTOMATIONS
  // ============================================

  async getAllAutomations() {
    const entities = await this.getEntities();
    return entities.filter(e => e.entity_id.startsWith('automation.'));
  }

  async triggerAutomation(automationId) {
    return await this.callService('automation', 'trigger', { entity_id: automationId });
  }

  async toggleAutomation(automationId, state) {
    const service = state ? 'turn_on' : 'turn_off';
    return await this.callService('automation', service, { entity_id: automationId });
  }

  // ============================================
  // SCRIPTS
  // ============================================

  async getAllScripts() {
    const entities = await this.getEntities();
    return entities.filter(e => e.entity_id.startsWith('script.'));
  }

  async runScript(scriptId) {
    return await this.callService('script', 'turn_on', { entity_id: scriptId });
  }

  // ============================================
  // CLIMATE CONTROL
  // ============================================

  async getAllClimate() {
    const entities = await this.getEntities();
    return entities.filter(e => e.entity_id.startsWith('climate.'));
  }

  async getClimate(entityId) {
    const state = await this.getEntityState(entityId);
    return {
      current_temperature: state.attributes?.current_temperature,
      target_temperature: state.attributes?.temperature,
      mode: state.state,
      hvac_modes: state.attributes?.hvac_modes,
      friendly_name: state.attributes?.friendly_name
    };
  }

  async setClimateTemperature(entityId, temperature) {
    return await this.callService('climate', 'set_temperature', {
      entity_id: entityId,
      temperature
    });
  }

  async setClimateMode(entityId, hvacMode) {
    return await this.callService('climate', 'set_hvac_mode', {
      entity_id: entityId,
      hvac_mode: hvacMode
    });
  }

  // ============================================
  // ESPHOME DEVICES
  // ============================================

  async getESPDevices() {
    this._requireConnection();
    
    try {
      const config = await this.client.get('/api/config');
      const hasESPHome = config.data.components.includes('esphome');
      
      if (!hasESPHome) {
        return {
          devices: [],
          warning: 'ESPHome integration not installed',
          instructions: [
            'Go to Settings > Devices & Services in Home Assistant',
            'Click "+ ADD INTEGRATION"',
            'Search for "ESPHome"',
            'Follow the setup wizard'
          ]
        };
      }
      
      const entities = await this.getEntities();
      
      // Find ESPHome entities
      let espDevices = entities.filter(entity => 
        entity.attributes?.platform === 'esphome' ||
        entity.entity_id.toLowerCase().includes('esp')
      );
      
      if (espDevices.length === 0) {
        return {
          devices: [],
          warning: 'No ESP devices found',
          instructions: ['Make sure your ESP devices are powered on and connected']
        };
      }
      
      // Group by device name
      const devices = {};
      for (const entity of espDevices) {
        let deviceName = entity.attributes?.friendly_name?.split(' ')[0] || 'Unknown';
        
        if (!devices[deviceName]) {
          devices[deviceName] = {
            name: deviceName,
            entities: [],
            online: entity.state !== 'unavailable'
          };
        }
        
        devices[deviceName].entities.push({
          id: entity.entity_id,
          name: entity.attributes?.friendly_name || entity.entity_id,
          state: entity.state,
          type: entity.entity_id.split('.')[0]
        });
      }
      
      return {
        devices: Object.values(devices),
        count: Object.keys(devices).length
      };
    } catch (error) {
      this.logger.error('Failed to get ESP devices:', error.message);
      throw error;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  _requireConnection() {
    if (!this.client) {
      throw new Error('Home Assistant not configured. Set HA_URL and HA_TOKEN in .env or use /homeassistant configure');
    }
  }
}

// Export legacy functions for backward compatibility with dashboard
export async function initHomeAssistant() {
  const { getPlugin } = await import('../../../src/core/plugin-system.js');
  const plugin = getPlugin('integrations/homeassistant');
  return plugin?.isConnected() || false;
}

export async function checkConnection() {
  const { getPlugin } = await import('../../../src/core/plugin-system.js');
  const plugin = getPlugin('integrations/homeassistant');
  return plugin?.checkConnection() || false;
}

export async function getEntities() {
  const { getPlugin } = await import('../../../src/core/plugin-system.js');
  const plugin = getPlugin('integrations/homeassistant');
  if (!plugin) throw new Error('Home Assistant plugin not loaded');
  return plugin.getEntities();
}

export async function callService(domain, service, data) {
  const { getPlugin } = await import('../../../src/core/plugin-system.js');
  const plugin = getPlugin('integrations/homeassistant');
  if (!plugin) throw new Error('Home Assistant plugin not loaded');
  return plugin.callService(domain, service, data);
}

export async function getAllLights() {
  const { getPlugin } = await import('../../../src/core/plugin-system.js');
  const plugin = getPlugin('integrations/homeassistant');
  if (!plugin) throw new Error('Home Assistant plugin not loaded');
  return plugin.getAllLights();
}

export async function getAllSwitches() {
  const { getPlugin } = await import('../../../src/core/plugin-system.js');
  const plugin = getPlugin('integrations/homeassistant');
  if (!plugin) throw new Error('Home Assistant plugin not loaded');
  return plugin.getAllSwitches();
}

export async function getAllSensors() {
  const { getPlugin } = await import('../../../src/core/plugin-system.js');
  const plugin = getPlugin('integrations/homeassistant');
  if (!plugin) throw new Error('Home Assistant plugin not loaded');
  return plugin.getAllSensors();
}

export async function getAllScenes() {
  const { getPlugin } = await import('../../../src/core/plugin-system.js');
  const plugin = getPlugin('integrations/homeassistant');
  if (!plugin) throw new Error('Home Assistant plugin not loaded');
  return plugin.getAllScenes();
}

export async function getAllAutomations() {
  const { getPlugin } = await import('../../../src/core/plugin-system.js');
  const plugin = getPlugin('integrations/homeassistant');
  if (!plugin) throw new Error('Home Assistant plugin not loaded');
  return plugin.getAllAutomations();
}

export async function getAllScripts() {
  const { getPlugin } = await import('../../../src/core/plugin-system.js');
  const plugin = getPlugin('integrations/homeassistant');
  if (!plugin) throw new Error('Home Assistant plugin not loaded');
  return plugin.getAllScripts();
}
