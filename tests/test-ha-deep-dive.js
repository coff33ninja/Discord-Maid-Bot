#!/usr/bin/env node

/**
 * Deep dive into Home Assistant to find ESP devices
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

const haClient = axios.create({
  baseURL: HA_URL,
  headers: {
    'Authorization': `Bearer ${HA_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

console.log('🔍 Deep Dive into Home Assistant');
console.log('='.repeat(80));

async function main() {
  try {
    // Get all entities with full details
    console.log('\n📋 Fetching ALL entities with full details...\n');
    const response = await haClient.get('/api/states');
    const entities = response.data;
    
    console.log(`Total entities: ${entities.length}\n`);
    
    // Save full entity dump
    await fs.writeFile('ha-entities-full-dump.json', JSON.stringify(entities, null, 2));
    console.log('✅ Full entity dump saved to: ha-entities-full-dump.json\n');
    
    // Analyze each entity in detail
    console.log('🔎 Analyzing entities for ESP/ESPHome indicators...\n');
    
    const possibleESP = [];
    
    entities.forEach((entity, index) => {
      const entityId = entity.entity_id;
      const attrs = entity.attributes || {};
      
      // Check multiple fields for ESP indicators
      const checks = {
        entity_id_has_esp: entityId.toLowerCase().includes('esp'),
        friendly_name_has_esp: (attrs.friendly_name || '').toLowerCase().includes('esp'),
        platform_is_esphome: attrs.platform === 'esphome',
        integration_is_esphome: attrs.integration === 'esphome',
        device_class_indicator: attrs.device_class,
        has_device_id: !!attrs.device_id,
        attribution: attrs.attribution,
        manufacturer: attrs.manufacturer,
        model: attrs.model,
        sw_version: attrs.sw_version
      };
      
      // If any ESP indicator found
      if (Object.values(checks).some(v => v && v !== false)) {
        possibleESP.push({
          entity_id: entityId,
          friendly_name: attrs.friendly_name,
          state: entity.state,
          checks,
          all_attributes: attrs
        });
      }
    });
    
    console.log(`Found ${possibleESP.length} entities with ESP indicators\n`);
    
    if (possibleESP.length > 0) {
      console.log('📝 Entities with ESP indicators:\n');
      possibleESP.forEach((e, i) => {
        console.log(`${i + 1}. ${e.entity_id}`);
        console.log(`   Name: ${e.friendly_name || 'N/A'}`);
        console.log(`   State: ${e.state}`);
        console.log(`   Indicators:`);
        Object.entries(e.checks).forEach(([key, value]) => {
          if (value && value !== false) {
            console.log(`     - ${key}: ${value}`);
          }
        });
        console.log('');
      });
      
      await fs.writeFile('ha-esp-devices.json', JSON.stringify(possibleESP, null, 2));
      console.log('✅ ESP devices saved to: ha-esp-devices.json\n');
    }
    
    // Check for devices by domain that might be ESP
    console.log('🔍 Checking specific domains for ESP devices...\n');
    
    const domains = ['light', 'switch', 'sensor', 'binary_sensor', 'climate', 'fan', 'cover'];
    
    for (const domain of domains) {
      const domainEntities = entities.filter(e => e.entity_id.startsWith(`${domain}.`));
      
      if (domainEntities.length > 0) {
        console.log(`\n${domain.toUpperCase()}: ${domainEntities.length} entities`);
        
        // Show first 5 with details
        domainEntities.slice(0, 5).forEach(e => {
          console.log(`  - ${e.entity_id}`);
          console.log(`    Name: ${e.attributes?.friendly_name || 'N/A'}`);
          console.log(`    Platform: ${e.attributes?.platform || 'N/A'}`);
          console.log(`    Integration: ${e.attributes?.integration || 'N/A'}`);
          console.log(`    Device ID: ${e.attributes?.device_id || 'N/A'}`);
          console.log(`    Manufacturer: ${e.attributes?.manufacturer || 'N/A'}`);
        });
        
        if (domainEntities.length > 5) {
          console.log(`  ... and ${domainEntities.length - 5} more`);
        }
      }
    }
    
    // Try to get integrations list
    console.log('\n\n🔌 Checking integrations via config endpoint...\n');
    const config = await haClient.get('/api/config');
    const components = config.data.components;
    
    console.log(`Total components: ${components.length}`);
    
    // Search for ESP-related components
    const espComponents = components.filter(c => 
      c.toLowerCase().includes('esp') || 
      c.toLowerCase().includes('mqtt') ||
      c.toLowerCase().includes('tasmota')
    );
    
    if (espComponents.length > 0) {
      console.log('\nESP-related components found:');
      espComponents.forEach(c => console.log(`  ✅ ${c}`));
    } else {
      console.log('\n⚠️  No ESP-related components found in component list');
      console.log('\nAll components:');
      components.sort().forEach(c => console.log(`  - ${c}`));
    }
    
    // Try to access ESPHome API directly (if it exists)
    console.log('\n\n🔧 Attempting to access ESPHome dashboard...\n');
    try {
      const esphomeResponse = await axios.get('http://192.168.0.250:6052', { timeout: 5000 });
      console.log('✅ ESPHome dashboard is accessible at http://192.168.0.250:6052');
    } catch (error) {
      console.log('❌ ESPHome dashboard not accessible at port 6052');
      console.log(`   Error: ${error.message}`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total entities: ${entities.length}`);
    console.log(`Entities with ESP indicators: ${possibleESP.length}`);
    console.log(`Components loaded: ${components.length}`);
    console.log(`ESP-related components: ${espComponents.length}`);
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Check ha-entities-full-dump.json for all entity details');
    console.log('2. Look for your ESP device names in the dump');
    console.log('3. Check what platform/integration they use');
    console.log('4. If using ESPHome, check http://192.168.0.250:6052 for ESPHome dashboard');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
    }
  }
}

main();
