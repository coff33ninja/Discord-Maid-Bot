/**
 * Cleanup Devices Script
 * 
 * Removes ghost devices from the database.
 * Ghost devices are devices with unknown MAC addresses that were
 * detected during network scans but couldn't be properly identified.
 */

import { deviceOps } from '../src/database/db.js';

console.log('🧹 Starting device cleanup...\n');

// Get current device count
const allDevices = deviceOps.getAll();
console.log(`📊 Current device count: ${allDevices.length}`);

// Count devices with unknown MAC
const unknownMacDevices = allDevices.filter(d => d.mac === 'unknown');
console.log(`❌ Devices with unknown MAC: ${unknownMacDevices.length}`);

// Count devices with valid MAC
const validMacDevices = allDevices.filter(d => d.mac !== 'unknown');
console.log(`✅ Devices with valid MAC: ${validMacDevices.length}\n`);

// Show breakdown by network
const localDevices = validMacDevices.filter(d => !d.mac.startsWith('ts:'));
const tailscaleDevices = validMacDevices.filter(d => d.mac.startsWith('ts:'));
console.log(`📍 Local devices: ${localDevices.length}`);
console.log(`📡 Tailscale devices: ${tailscaleDevices.length}\n`);

// Show what will be removed
if (unknownMacDevices.length > 0) {
  console.log('🗑️  This will remove all devices with unknown MAC addresses.');
  console.log('   These are typically ghost devices or temporary DHCP leases.\n');

  // Perform cleanup
  const result = deviceOps.cleanupUnknownDevices();
  console.log(`✅ Cleanup complete! Removed ${result.changes} devices.\n`);

  // Show new count
  const remainingDevices = deviceOps.getAll();
  console.log(`📊 Remaining devices: ${remainingDevices.length}`);
} else {
  console.log('✨ No ghost devices found! Database is already clean.\n');
}

console.log('\n✨ Database cleanup complete!');
