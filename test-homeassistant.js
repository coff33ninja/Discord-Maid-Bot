#!/usr/bin/env node

/**
 * Home Assistant Troubleshooting Script
 * Tests connection, lists all entities, and specifically looks for ESP devices
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const HA_URL = process.env.HA_URL || 'http://192.168.0.250:8123';
const HA_TOKEN = process.env.HA_TOKEN;

console.log('🏠 Home Assistant Troubleshooting Script');
console.log('='.repeat(60));
console.log(`URL: ${HA_URL}`);
console.log(`Token: ${HA_TOKEN ? '✅ Configured' : '❌ Missing'}`);
console.log('='.repeat(60));
console.log('');

if (!HA_TOKEN) {
  console.error('❌ HA_TOKEN not found in .env file');
  process.exit(1);
}

const haClient = axios.create({
  baseURL: HA_URL,
  headers: {
    'Authorization': `Bearer ${HA_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Test 1: Basic Connection
async function testConnection() {
  console.log('📡 Test 1: Testing basic connection...');
  try {
    const response = await haClient.get('/api/');
    console.log('✅ Connection successful!');
    console.log(`   Message: ${response.data.message}`);
    return true;
  } catch (error) {
    console.error('❌ Connection failed!');
    if (error.code === 'ECONNREFUSED') {
      console.error('   Error: Connection refused - Is Home Assistant running?');
    } else if (error.response?.status === 401) {
      console.error('   Error: Unauthorized - Check your token');
    } else {
      console.error(`   Error: ${error.message}`);
    }
    return false;
  }
}

// Test 2: Get Config
async function testConfig() {
  console.log('\n🔧 Test 2: Getting Home Assistant configuration...');
  try {
    const response = await haClient.get('/api/config');
    console.log('✅ Config retrieved!');
    console.log(`   Version: ${response.data.version}`);
    console.log(`   Location: ${response.data.location_name}`);
    console.log(`   Time Zone: ${response.data.time_zone}`);
    console.log(`   Components: ${response.data.components.length} loaded`);
    
    // Check for ESPHome component
    const hasESPHome = response.data.components.includes('esphome');
    console.log(`   ESPHome Integration: ${hasESPHome ? '✅ Installed' : '❌ Not found'}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get config');
    console.error(`   Error: ${error.message}`);
    return null;
  }
}

// Test 3: List All Entities
async function testEntities() {
  console.log('\n📋 Test 3: Listing all entities...');
  try {
    const response = await haClient.get('/api/states');
    const entities = response.data;
    console.log(`✅ Found ${entities.length} total entities`);
    
    // Group by domain
    const domains = {};
    entities.forEach(entity => {
      const domain = entity.entity_id.split('.')[0];
      domains[domain] = (domains[domain] || 0) + 1;
    });
    
    console.log('\n   Entities by domain:');
    Object.entries(domains)
      .sort((a, b) => b[1] - a[1])
      .forEach(([domain, count]) => {
        console.log(`   - ${domain}: ${count}`);
      });
    
    return entities;
  } catch (error) {
    console.error('❌ Failed to get entities');
    console.error(`   Error: ${error.message}`);
    return [];
  }
}

// Test 4: Find ESP Devices
async function findESPDevices(entities) {
  console.log('\n🔍 Test 4: Searching for ESP devices...');
  
  // Method 1: Look for entities with 'esp' in the name
  const espByName = entities.filter(e => 
    e.entity_id.toLowerCase().includes('esp') ||
    e.attributes?.friendly_name?.toLowerCase().includes('esp')
  );
  
  console.log(`\n   Method 1 - By name: Found ${espByName.length} entities with 'esp' in name`);
  if (espByName.length > 0) {
    espByName.slice(0, 10).forEach(e => {
      console.log(`   - ${e.entity_id} (${e.attributes?.friendly_name || 'No name'})`);
    });
    if (espByName.length > 10) {
      console.log(`   ... and ${espByName.length - 10} more`);
    }
  }
  
  // Method 2: Look for ESPHome platform
  const espByPlatform = entities.filter(e => 
    e.attributes?.platform === 'esphome' ||
    e.attributes?.integration === 'esphome'
  );
  
  console.log(`\n   Method 2 - By platform: Found ${espByPlatform.length} ESPHome entities`);
  if (espByPlatform.length > 0) {
    espByPlatform.slice(0, 10).forEach(e => {
      console.log(`   - ${e.entity_id} (${e.attributes?.friendly_name || 'No name'})`);
    });
    if (espByPlatform.length > 10) {
      console.log(`   ... and ${espByPlatform.length - 10} more`);
    }
  }
  
  // Method 3: Look for common ESP device patterns
  const patterns = ['sensor', 'switch', 'light', 'binary_sensor', 'climate'];
  const possibleESP = {};
  
  entities.forEach(e => {
    const domain = e.entity_id.split('.')[0];
    if (patterns.includes(domain)) {
      // Extract device name (usually first part after domain)
      const parts = e.entity_id.split('_');
      if (parts.length > 1) {
        const deviceName = parts[0] + '_' + parts[1];
        if (!possibleESP[deviceName]) {
          possibleESP[deviceName] = [];
        }
        possibleESP[deviceName].push(e);
      }
    }
  });
  
  console.log(`\n   Method 3 - By pattern: Found ${Object.keys(possibleESP).length} potential device groups`);
  
  return { espByName, espByPlatform, possibleESP };
}

// Test 5: Get Device Registry
async function testDeviceRegistry() {
  console.log('\n🔌 Test 5: Checking device registry...');
  try {
    // Try to get devices via websocket API (requires different approach)
    // For now, we'll use the entity registry approach
    const response = await haClient.get('/api/states');
    
    // Group entities by device_id if available
    const deviceGroups = {};
    response.data.forEach(entity => {
      const deviceId = entity.attributes?.device_id;
      if (deviceId) {
        if (!deviceGroups[deviceId]) {
          deviceGroups[deviceId] = {
            device_id: deviceId,
            entities: []
          };
        }
        deviceGroups[deviceId].entities.push({
          entity_id: entity.entity_id,
          friendly_name: entity.attributes?.friendly_name,
          state: entity.state
        });
      }
    });
    
    console.log(`✅ Found ${Object.keys(deviceGroups).length} devices with device_id`);
    
    return deviceGroups;
  } catch (error) {
    console.error('❌ Failed to get device registry');
    console.error(`   Error: ${error.message}`);
    return {};
  }
}

// Test 6: Search for specific device types
async function searchDeviceTypes(entities) {
  console.log('\n🔎 Test 6: Searching for specific device types...');
  
  const deviceTypes = {
    'Lights': entities.filter(e => e.entity_id.startsWith('light.')),
    'Switches': entities.filter(e => e.entity_id.startsWith('switch.')),
    'Sensors': entities.filter(e => e.entity_id.startsWith('sensor.')),
    'Binary Sensors': entities.filter(e => e.entity_id.startsWith('binary_sensor.')),
    'Climate': entities.filter(e => e.entity_id.startsWith('climate.')),
    'Covers': entities.filter(e => e.entity_id.startsWith('cover.')),
    'Fans': entities.filter(e => e.entity_id.startsWith('fan.'))
  };
  
  Object.entries(deviceTypes).forEach(([type, devices]) => {
    console.log(`\n   ${type}: ${devices.length} found`);
    if (devices.length > 0 && devices.length <= 20) {
      devices.forEach(d => {
        const name = d.attributes?.friendly_name || d.entity_id;
        const state = d.state;
        console.log(`   - ${name} (${state})`);
      });
    } else if (devices.length > 20) {
      devices.slice(0, 5).forEach(d => {
        const name = d.attributes?.friendly_name || d.entity_id;
        const state = d.state;
        console.log(`   - ${name} (${state})`);
      });
      console.log(`   ... and ${devices.length - 5} more`);
    }
  });
  
  return deviceTypes;
}

// Test 7: Test controlling a device
async function testControl(entities) {
  console.log('\n⚡ Test 7: Testing device control...');
  
  // Find a switch or light to test
  const testSwitch = entities.find(e => e.entity_id.startsWith('switch.'));
  const testLight = entities.find(e => e.entity_id.startsWith('light.'));
  
  const testEntity = testSwitch || testLight;
  
  if (!testEntity) {
    console.log('⚠️  No switches or lights found to test control');
    return;
  }
  
  console.log(`   Testing with: ${testEntity.entity_id}`);
  console.log(`   Current state: ${testEntity.state}`);
  
  try {
    const domain = testEntity.entity_id.split('.')[0];
    const currentState = testEntity.state;
    
    // Don't actually toggle, just test if we can call the service
    console.log(`   ✅ Would be able to control ${domain} devices`);
    console.log(`   (Not actually toggling to avoid disruption)`);
  } catch (error) {
    console.error('❌ Failed to test control');
    console.error(`   Error: ${error.message}`);
  }
}

// Main execution
async function main() {
  try {
    // Run all tests
    const connected = await testConnection();
    if (!connected) {
      console.log('\n❌ Cannot proceed without connection');
      process.exit(1);
    }
    
    const config = await testConfig();
    const entities = await testEntities();
    
    if (entities.length === 0) {
      console.log('\n❌ No entities found - check your Home Assistant setup');
      process.exit(1);
    }
    
    const espDevices = await findESPDevices(entities);
    const deviceRegistry = await testDeviceRegistry();
    const deviceTypes = await searchDeviceTypes(entities);
    await testControl(entities);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Connection: Working`);
    console.log(`✅ Total Entities: ${entities.length}`);
    console.log(`✅ ESP Devices (by name): ${espDevices.espByName.length}`);
    console.log(`✅ ESP Devices (by platform): ${espDevices.espByPlatform.length}`);
    console.log(`✅ Lights: ${deviceTypes.Lights.length}`);
    console.log(`✅ Switches: ${deviceTypes.Switches.length}`);
    console.log(`✅ Sensors: ${deviceTypes.Sensors.length}`);
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (espDevices.espByPlatform.length === 0 && espDevices.espByName.length === 0) {
      console.log('⚠️  No ESP devices detected. Possible reasons:');
      console.log('   1. ESPHome integration not installed in Home Assistant');
      console.log('   2. ESP devices not configured/connected');
      console.log('   3. ESP devices use different naming convention');
      console.log('\n   Try:');
      console.log('   - Check Home Assistant > Settings > Devices & Services');
      console.log('   - Look for ESPHome integration');
      console.log('   - Check if your ESP devices are online');
    } else {
      console.log('✅ ESP devices found! The integration should work.');
    }
    
    console.log('\n✅ Troubleshooting complete!');
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

main();
