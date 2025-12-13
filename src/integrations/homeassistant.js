import axios from 'axios';
import { configOps } from '../database/db.js';

let haClient = null;

// Initialize Home Assistant connection
export function initHomeAssistant() {
  const haUrl = configOps.get('ha_url');
  const haToken = configOps.get('ha_token');
  
  if (haUrl && haToken) {
    haClient = axios.create({
      baseURL: haUrl,
      headers: {
        'Authorization': `Bearer ${haToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Home Assistant connected');
    return true;
  }
  
  console.log('⚠️  Home Assistant not configured');
  return false;
}

// Configure Home Assistant
export function configureHomeAssistant(url, token) {
  configOps.set('ha_url', url);
  configOps.set('ha_token', token);
  return initHomeAssistant();
}

// Get all entities
export async function getEntities() {
  if (!haClient) {
    throw new Error('Home Assistant not configured');
  }
  
  try {
    const response = await haClient.get('/api/states');
    return response.data;
  } catch (error) {
    console.error('Failed to get HA entities:', error.message);
    throw error;
  }
}

// Get specific entity state
export async function getEntityState(entityId) {
  if (!haClient) {
    throw new Error('Home Assistant not configured');
  }
  
  try {
    const response = await haClient.get(`/api/states/${entityId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to get entity ${entityId}:`, error.message);
    throw error;
  }
}

// Call service
export async function callService(domain, service, data = {}) {
  if (!haClient) {
    throw new Error('Home Assistant not configured');
  }
  
  try {
    const response = await haClient.post(`/api/services/${domain}/${service}`, data);
    return response.data;
  } catch (error) {
    console.error(`Failed to call service ${domain}.${service}:`, error.message);
    throw error;
  }
}

// Get ESP devices (devices with esphome integration)
export async function getESPDevices() {
  if (!haClient) {
    throw new Error('Home Assistant not configured');
  }
  
  try {
    // First check if ESPHome integration is installed
    const config = await haClient.get('/api/config');
    const hasESPHome = config.data.components.includes('esphome');
    
    if (!hasESPHome) {
      console.warn('⚠️  ESPHome integration not installed in Home Assistant');
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
    
    const entities = await getEntities();
    
    // Method 1: Look for ESPHome platform
    let espDevices = entities.filter(entity => 
      entity.attributes?.platform === 'esphome'
    );
    
    // Method 2: Look for 'esp' in entity_id or friendly_name
    if (espDevices.length === 0) {
      espDevices = entities.filter(entity => 
        entity.entity_id.toLowerCase().includes('esp') || 
        entity.attributes?.friendly_name?.toLowerCase().includes('esp')
      );
    }
    
    // Method 3: Check MQTT devices (ESP might be using MQTT)
    const hasMQTT = config.data.components.includes('mqtt');
    if (espDevices.length === 0 && hasMQTT) {
      const mqttDevices = entities.filter(entity => 
        entity.attributes?.platform === 'mqtt'
      );
      
      if (mqttDevices.length > 0) {
        console.log(`ℹ️  Found ${mqttDevices.length} MQTT devices (ESP devices might be using MQTT)`);
      }
    }
    
    if (espDevices.length === 0) {
      return {
        devices: [],
        warning: 'No ESP devices found',
        instructions: [
          'Make sure your ESP devices are flashed with ESPHome firmware',
          'Ensure they are on the same network as Home Assistant',
          'Check if devices appear in Settings > Devices & Services > ESPHome',
          'Alternatively, configure ESP devices to use MQTT'
        ]
      };
    }
    
    // Group by device
    const devices = {};
    for (const entity of espDevices) {
      const deviceName = entity.attributes?.friendly_name?.split(' ')[0] || 'Unknown';
      if (!devices[deviceName]) {
        devices[deviceName] = {
          name: deviceName,
          entities: []
        };
      }
      devices[deviceName].entities.push({
        id: entity.entity_id,
        name: entity.attributes?.friendly_name,
        state: entity.state,
        type: entity.entity_id.split('.')[0],
        platform: entity.attributes?.platform
      });
    }
    
    return {
      devices: Object.values(devices),
      count: Object.keys(devices).length
    };
  } catch (error) {
    console.error('Failed to get ESP devices:', error.message);
    throw error;
  }
}

// Control light
export async function controlLight(entityId, state, brightness = null) {
  const service = state ? 'turn_on' : 'turn_off';
  const data = { entity_id: entityId };
  
  if (brightness !== null && state) {
    data.brightness = brightness;
  }
  
  return await callService('light', service, data);
}

// Control switch
export async function controlSwitch(entityId, state) {
  const service = state ? 'turn_on' : 'turn_off';
  return await callService('switch', service, { entity_id: entityId });
}

// Get sensor data
export async function getSensorData(entityId) {
  const state = await getEntityState(entityId);
  return {
    value: state.state,
    unit: state.attributes?.unit_of_measurement,
    friendly_name: state.attributes?.friendly_name,
    last_updated: state.last_updated
  };
}

// Get climate control
export async function getClimate(entityId) {
  const state = await getEntityState(entityId);
  return {
    current_temperature: state.attributes?.current_temperature,
    target_temperature: state.attributes?.temperature,
    mode: state.state,
    hvac_modes: state.attributes?.hvac_modes,
    friendly_name: state.attributes?.friendly_name
  };
}

// Set climate temperature
export async function setClimateTemperature(entityId, temperature) {
  return await callService('climate', 'set_temperature', {
    entity_id: entityId,
    temperature
  });
}

// Get all lights
export async function getAllLights() {
  const entities = await getEntities();
  return entities.filter(e => e.entity_id.startsWith('light.'));
}

// Get all switches
export async function getAllSwitches() {
  const entities = await getEntities();
  return entities.filter(e => e.entity_id.startsWith('switch.'));
}

// Get all sensors
export async function getAllSensors() {
  const entities = await getEntities();
  return entities.filter(e => e.entity_id.startsWith('sensor.'));
}

// Execute automation
export async function triggerAutomation(automationId) {
  return await callService('automation', 'trigger', {
    entity_id: automationId
  });
}

// Execute scene
export async function activateScene(sceneId) {
  return await callService('scene', 'turn_on', {
    entity_id: sceneId
  });
}

// Check Home Assistant connection
export async function checkConnection() {
  if (!haClient) {
    return false;
  }
  
  try {
    await haClient.get('/api/');
    return true;
  } catch (error) {
    return false;
  }
}
