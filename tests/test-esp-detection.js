#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initHomeAssistant, getESPDevices } from '../src/integrations/homeassistant.js';
import { configOps } from '../src/database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Sync config
configOps.set('ha_url', process.env.HA_URL);
configOps.set('ha_token', process.env.HA_TOKEN);

console.log('🧪 Testing ESP Device Detection\n');

async function test() {
  // Initialize
  const initialized = initHomeAssistant();
  console.log(`Initialization: ${initialized ? '✅' : '❌'}\n`);
  
  if (!initialized) {
    console.error('Failed to initialize Home Assistant');
    return;
  }
  
  // Get ESP devices
  console.log('Fetching ESP devices...\n');
  const result = await getESPDevices();
  
  console.log('Result:', JSON.stringify(result, null, 2));
  
  if (result.warning) {
    console.log(`\n⚠️  Warning: ${result.warning}`);
    if (result.instructions) {
      console.log('\nInstructions:');
      result.instructions.forEach((inst, i) => {
        console.log(`  ${i + 1}. ${inst}`);
      });
    }
  }
  
  if (result.devices && result.devices.length > 0) {
    console.log(`\n✅ Found ${result.count} ESP device(s):\n`);
    result.devices.forEach(device => {
      console.log(`📱 ${device.name} (${device.online ? '🟢 Online' : '🔴 Offline'})`);
      console.log(`   Entities: ${device.entities.length}`);
      device.entities.forEach(e => {
        console.log(`   - ${e.name} (${e.type}): ${e.state}`);
      });
      console.log('');
    });
  }
}

test().catch(console.error);
