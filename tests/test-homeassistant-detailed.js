#!/usr/bin/env node

/**
 * Home Assistant Detailed Troubleshooting Script
 * Comprehensive analysis of HA setup and ESP device detection
 */

import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const HA_URL = process.env.HA_URL || 'http://192.168.0.250:8123';
const HA_TOKEN = process.env.HA_TOKEN;

console.log('🏠 Home Assistant Detailed Analysis');
console.log('='.repeat(80));
console.log(`URL: ${HA_URL}`);
console.log(`Token: ${HA_TOKEN ? '✅ Configured' : '❌ Missing'}`);
console.log('='.repeat(80));

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

// Get all integrations
async function getIntegrations() {
  console.log('\n🔌 Checking installed integrations...');
  try {
    const response = await haClient.get('/api/config');
    const components = response.data.components;
    
    console.log(`✅ Found ${components.length} components/integrations`);
    
    // Check for common IoT integrations
    const iotIntegrations = {
      'esphome': components.includes('esphome'),
      'mqtt': components.includes('mqtt'),
      'tasmota': components.includes('tasmota'),
      'shelly': components.includes('shelly'),
      'tuya': components.includes('tuya'),
      'zigbee': components.includes('zha') || components.includes('zigbee2mqtt'),
      'zwave': components.includes('zwave_js') || components.includes('zwave'),
      'homekit': components.includes('homekit_controller'),
      'matter': components.includes('matter')
    };
    
    console.log('\n   IoT Integration Status:');
    Object.entries(iotIntegrations).forEach(([name, installed]) => {
      console.log(`   ${installed ? '✅' : '❌'} ${name.toUpperCase()}`);
    });
    
    return { components, iotIntegrations };
  } catch (error) {
    console.error('❌ Failed to get integrations');
    return { components: [], iotIntegrations: {} };
  }
}

// Check for MQTT devices
async function checkMQTT(entities) {
  console.log('\n📡 Checking MQTT devices...');
  
  const mqttDevices = entities.filter(e => 
    e.attributes?.platform === 'mqtt' ||
    e.entity_id.includes('mqtt')
  );
  
  console.log(`   Found ${mqttDevices.length} MQTT entities`);
  
  if (mqttDevices.length > 0) {
    console.log('\n   Sample MQTT devices:');
    mqttDevices.slice(0, 10).forEach(d => {
      console.log(`   - ${d.entity_id} (${d.attributes?.friendly_name || 'No name'})`);
    });
  }
  
  return mqttDevices;
}

// Analyze network devices
async function analyzeNetworkDevices(entities) {
  console.log('\n🌐 Analyzing network-connected devices...');
  
  // Look for device trackers (might show ESP devices on network)
  const trackers = entities.filter(e => e.entity_id.startsWith('device_tracker.'));
  console.log(`   Device Trackers: ${trackers.length}`);
  
  if (trackers.length > 0) {
    trackers.forEach(t => {
      const name = t.attributes?.friendly_name || t.entity_id;
      const ip = t.attributes?.ip;
      const mac = t.attributes?.mac;
      console.log(`   - ${name}`);
      if (ip) console.log(`     IP: ${ip}`);
      if (mac) console.log(`     MAC: ${mac}`);
    });
  }
  
  return trackers;
}

// Check for Tasmota devices
async function checkTasmota(entities) {
  console.log('\n💡 Checking Tasmota devices...');
  
  const tasmotaDevices = entities.filter(e => 
    e.attributes?.platform === 'tasmota' ||
    e.entity_id.includes('tasmota')
  );
  
  console.log(`   Found ${tasmotaDevices.length} Tasmota entities`);
  
  if (tasmotaDevices.length > 0) {
    console.log('\n   Tasmota devices:');
    tasmotaDevices.slice(0, 10).forEach(d => {
      console.log(`   - ${d.entity_id} (${d.attributes?.friendly_name || 'No name'})`);
    });
  }
  
  return tasmotaDevices;
}

// Generate detailed report
async function generateReport(data) {
  const report = `
Home Assistant Analysis Report
Generated: ${new Date().toISOString()}
================================================================================

CONNECTION STATUS
✅ Home Assistant is reachable at ${HA_URL}
✅ Authentication successful
✅ Version: ${data.config?.version || 'Unknown'}

INTEGRATION STATUS
${Object.entries(data.iotIntegrations || {})
  .map(([name, installed]) => `${installed ? '✅' : '❌'} ${name.toUpperCase()}`)
  .join('\n')}

ENTITY SUMMARY
- Total Entities: ${data.totalEntities}
- Lights: ${data.lights}
- Switches: ${data.switches}
- Sensors: ${data.sensors}
- Binary Sensors: ${data.binarySensors}
- Device Trackers: ${data.trackers}

ESP DEVICE DETECTION
- By Name: ${data.espByName}
- By Platform: ${data.espByPlatform}
- MQTT Devices: ${data.mqttDevices}
- Tasmota Devices: ${data.tasmotaDevices}

DIAGNOSIS
${data.diagnosis}

RECOMMENDATIONS
${data.recommendations}

NEXT STEPS
${data.nextSteps}
`;

  await fs.writeFile('ha-analysis-report.txt', report);
  console.log('\n📄 Detailed report saved to: ha-analysis-report.txt');
  
  return report;
}

// Main execution
async function main() {
  try {
    const data = {};
    
    // Test connection
    console.log('\n📡 Testing connection...');
    const configResponse = await haClient.get('/api/config');
    data.config = configResponse.data;
    console.log('✅ Connected successfully');
    
    // Get integrations
    const { components, iotIntegrations } = await getIntegrations();
    data.components = components;
    data.iotIntegrations = iotIntegrations;
    
    // Get all entities
    console.log('\n📋 Fetching all entities...');
    const entitiesResponse = await haClient.get('/api/states');
    const entities = entitiesResponse.data;
    data.totalEntities = entities.length;
    console.log(`✅ Found ${entities.length} entities`);
    
    // Count by type
    data.lights = entities.filter(e => e.entity_id.startsWith('light.')).length;
    data.switches = entities.filter(e => e.entity_id.startsWith('switch.')).length;
    data.sensors = entities.filter(e => e.entity_id.startsWith('sensor.')).length;
    data.binarySensors = entities.filter(e => e.entity_id.startsWith('binary_sensor.')).length;
    
    // Search for ESP devices
    console.log('\n🔍 Searching for ESP devices...');
    data.espByName = entities.filter(e => 
      e.entity_id.toLowerCase().includes('esp') ||
      e.attributes?.friendly_name?.toLowerCase().includes('esp')
    ).length;
    
    data.espByPlatform = entities.filter(e => 
      e.attributes?.platform === 'esphome'
    ).length;
    
    // Check other integrations
    const mqttDevices = await checkMQTT(entities);
    data.mqttDevices = mqttDevices.length;
    
    const tasmotaDevices = await checkTasmota(entities);
    data.tasmotaDevices = tasmotaDevices.length;
    
    const trackers = await analyzeNetworkDevices(entities);
    data.trackers = trackers.length;
    
    // Diagnosis
    console.log('\n' + '='.repeat(80));
    console.log('🔬 DIAGNOSIS');
    console.log('='.repeat(80));
    
    let diagnosis = [];
    let recommendations = [];
    let nextSteps = [];
    
    if (!iotIntegrations.esphome) {
      diagnosis.push('❌ ESPHome integration is NOT installed');
      recommendations.push('Install ESPHome integration from Home Assistant');
      nextSteps.push('1. Go to Settings > Devices & Services');
      nextSteps.push('2. Click "+ ADD INTEGRATION"');
      nextSteps.push('3. Search for "ESPHome"');
      nextSteps.push('4. Follow the setup wizard');
    } else {
      diagnosis.push('✅ ESPHome integration is installed');
      if (data.espByPlatform === 0) {
        diagnosis.push('⚠️  No ESP devices configured yet');
        recommendations.push('Add your ESP devices to ESPHome');
        nextSteps.push('1. Make sure your ESP devices are flashed with ESPHome firmware');
        nextSteps.push('2. Ensure they are on the same network as Home Assistant');
        nextSteps.push('3. They should auto-discover in Home Assistant');
      }
    }
    
    if (iotIntegrations.mqtt && data.mqttDevices > 0) {
      diagnosis.push(`✅ MQTT is active with ${data.mqttDevices} devices`);
      recommendations.push('Your ESP devices might be using MQTT instead of ESPHome');
    }
    
    if (data.lights === 0 && data.switches === 0) {
      diagnosis.push('⚠️  No controllable devices (lights/switches) found');
      recommendations.push('Add some smart devices to Home Assistant');
    }
    
    data.diagnosis = diagnosis.join('\n');
    data.recommendations = recommendations.join('\n');
    data.nextSteps = nextSteps.join('\n');
    
    // Print diagnosis
    diagnosis.forEach(d => console.log(d));
    
    console.log('\n💡 RECOMMENDATIONS:');
    recommendations.forEach(r => console.log(`   - ${r}`));
    
    console.log('\n📝 NEXT STEPS:');
    nextSteps.forEach(s => console.log(`   ${s}`));
    
    // Generate report
    await generateReport(data);
    
    // Print ESP device setup guide
    console.log('\n' + '='.repeat(80));
    console.log('📚 ESP DEVICE SETUP GUIDE');
    console.log('='.repeat(80));
    console.log(`
To add ESP devices to Home Assistant:

METHOD 1: ESPHome Integration (Recommended)
1. Install ESPHome add-on in Home Assistant
2. Flash your ESP devices with ESPHome firmware
3. Configure devices in ESPHome dashboard
4. Devices will auto-discover in Home Assistant

METHOD 2: MQTT Integration
1. Install MQTT broker (Mosquitto)
2. Configure ESP devices to publish to MQTT
3. Add MQTT integration in Home Assistant
4. Configure MQTT sensors/switches

METHOD 3: Tasmota
1. Flash ESP devices with Tasmota firmware
2. Configure Tasmota devices
3. Add Tasmota integration in Home Assistant
4. Devices will auto-discover

CURRENT STATUS:
- ESPHome: ${iotIntegrations.esphome ? '✅ Installed' : '❌ Not installed'}
- MQTT: ${iotIntegrations.mqtt ? '✅ Installed' : '❌ Not installed'}
- Tasmota: ${iotIntegrations.tasmota ? '✅ Installed' : '❌ Not installed'}
`);
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('\n❌ Error during analysis:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
    process.exit(1);
  }
}

main();
