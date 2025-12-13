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
    
    // Check if ESPHome dashboard is accessible (even if integration not in component list)
    let esphomeDashboardAccessible = false;
    try {
      const esphomeUrl = haClient.defaults.baseURL.replace(':8123', ':6052');
      await axios.get(esphomeUrl, { timeout: 3000 });
      esphomeDashboardAccessible = true;
      console.log('✅ ESPHome dashboard detected at port 6052');
    } catch (error) {
      console.log('⚠️  ESPHome dashboard not accessible');
    }
    
    if (!hasESPHome && !esphomeDashboardAccessible) {
      console.warn('⚠️  ESPHome integration not installed in Home Assistant');
      return {
        devices: [],
        warning: 'ESPHome integration not installed',
        instructions: [
          'Go to Settings > Devices & Services in Home Assistant',
          'Click "+ ADD INTEGRATION"',
          'Search for "ESPHome"',
          'Follow the setup wizard',
          'Or check ESPHome dashboard at http://YOUR_HA_IP:6052'
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
    
    // Method 3: Look for common ESP device patterns (controller, pc_controller, etc.)
    if (espDevices.length === 0) {
      espDevices = entities.filter(entity => 
        entity.entity_id.includes('controller') ||
        entity.entity_id.includes('pc_') ||
        entity.attributes?.friendly_name?.toLowerCase().includes('controller')
      );
      
      if (espDevices.length > 0) {
        console.log(`ℹ️  Found ${espDevices.length} potential ESP devices by pattern matching`);
      }
    }
    
    // Method 4: Check MQTT devices (ESP might be using MQTT)
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
      const instructions = [
        'Make sure your ESP devices are powered on and connected',
        'Check if devices appear in Settings > Devices & Services',
        'Verify ESPHome dashboard at http://YOUR_HA_IP:6052'
      ];
      
      if (esphomeDashboardAccessible) {
        instructions.push('ESPHome dashboard is accessible - check device status there');
      }
      
      return {
        devices: [],
        warning: 'No ESP devices found',
        instructions
      };
    }
    
    // Group by device name (extract from entity_id or friendly_name)
    const devices = {};
    for (const entity of espDevices) {
      // Try to extract device name from entity_id (e.g., "pc_controller_kusanagi" -> "KUSANAGI")
      let deviceName = 'Unknown';
      
      if (entity.attributes?.friendly_name) {
        // Use first word of friendly name (e.g., "KUSANAGI Wake on LAN" -> "KUSANAGI")
        deviceName = entity.attributes.friendly_name.split(' ')[0];
      } else {
        // Extract from entity_id
        const parts = entity.entity_id.split('_');
        if (parts.length > 2) {
          deviceName = parts[parts.length - 1].toUpperCase();
        }
      }
      
      if (!devices[deviceName]) {
        devices[deviceName] = {
          name: deviceName,
          entities: [],
          online: entity.state !== 'unavailable' && entity.state !== 'unknown'
        };
      }
      
      devices[deviceName].entities.push({
        id: entity.entity_id,
        name: entity.attributes?.friendly_name || entity.entity_id,
        state: entity.state,
        type: entity.entity_id.split('.')[0],
        platform: entity.attributes?.platform || 'unknown',
        available: entity.state !== 'unavailable'
      });
      
      // Update device online status
      if (entity.state !== 'unavailable' && entity.state !== 'unknown') {
        devices[deviceName].online = true;
      }
    }
    
    const deviceList = Object.values(devices);
    
    // Add warning if all devices are unavailable
    const allUnavailable = deviceList.every(d => !d.online);
    if (allUnavailable && deviceList.length > 0) {
      return {
        devices: deviceList,
        count: deviceList.length,
        warning: 'All ESP devices are currently unavailable/offline',
        instructions: [
          'Check if ESP devices are powered on',
          'Verify network connectivity',
          'Check ESPHome dashboard at http://YOUR_HA_IP:6052',
          'Restart Home Assistant if devices were recently added'
        ]
      };
    }
    
    return {
      devices: deviceList,
      count: deviceList.length
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

// Get all scenes
export async function getAllScenes() {
  const entities = await getEntities();
  return entities.filter(e => e.entity_id.startsWith('scene.'));
}

// Get all automations
export async function getAllAutomations() {
  const entities = await getEntities();
  return entities.filter(e => e.entity_id.startsWith('automation.'));
}

// Get all scripts
export async function getAllScripts() {
  const entities = await getEntities();
  return entities.filter(e => e.entity_id.startsWith('script.'));
}

// Activate a scene
export async function activateScene(sceneId) {
  return await callService('scene', 'turn_on', {
    entity_id: sceneId
  });
}

// Trigger an automation
export async function triggerAutomation(automationId) {
  return await callService('automation', 'trigger', {
    entity_id: automationId
  });
}

// Toggle automation on/off
export async function toggleAutomation(automationId, state) {
  const service = state ? 'turn_on' : 'turn_off';
  return await callService('automation', service, {
    entity_id: automationId
  });
}

// Run a script
export async function runScript(scriptId) {
  return await callService('script', 'turn_on', {
    entity_id: scriptId
  });
}

// Get climate devices
export async function getAllClimate() {
  const entities = await getEntities();
  return entities.filter(e => e.entity_id.startsWith('climate.'));
}

// Set climate temperature
export async function setClimateTemperature(entityId, temperature) {
  return await callService('climate', 'set_temperature', {
    entity_id: entityId,
    temperature
  });
}

// Set climate mode
export async function setClimateMode(entityId, hvacMode) {
  return await callService('climate', 'set_hvac_mode', {
    entity_id: entityId,
    hvac_mode: hvacMode
  });
}

// Get climate control details
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
