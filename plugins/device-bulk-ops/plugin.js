import { Plugin } from '../../src/core/plugin-system.js';

/**
 * Device Bulk Operations Plugin
 * Bulk rename, emoji, and group operations for devices
 * 
 * Uses event system to request device operations from core
 */
export default class DeviceBulkOpsPlugin extends Plugin {
  constructor() {
    super('1.0.0.0-beta', '1.0.0', 'Bulk operations for device management');
  }
  
  async onLoad() {
    console.log('📦 Device Bulk Operations plugin loaded');
  }
  
  async bulkRename(pattern, prefix = '', suffix = '') {
    // Request devices from core via event system
    const devices = await this.requestFromCore('get-all-devices');
    
    const regex = new RegExp(pattern, 'i');
    const matched = devices.filter(d => 
      regex.test(d.hostname || '') || 
      regex.test(d.notes || '') ||
      regex.test(d.ip)
    );
    
    const updated = [];
    for (const device of matched) {
      const currentName = device.notes || device.hostname || device.ip;
      const newName = `${prefix}${currentName}${suffix}`;
      
      // Request core to update device
      await this.requestFromCore('update-device-notes', { 
        deviceId: device.id, 
        notes: newName 
      });
      
      updated.push({ device: currentName, newName });
    }
    
    return { count: updated.length, devices: updated };
  }
  
  async bulkEmoji(pattern, emoji) {
    // Request devices from core via event system
    const devices = await this.requestFromCore('get-all-devices');
    
    const regex = new RegExp(pattern, 'i');
    const matched = devices.filter(d => 
      regex.test(d.hostname || '') || 
      regex.test(d.notes || '') ||
      regex.test(d.ip)
    );
    
    const updated = [];
    for (const device of matched) {
      // Request core to set emoji
      await this.requestFromCore('set-device-emoji', { 
        mac: device.mac, 
        emoji 
      });
      
      updated.push({ 
        device: device.notes || device.hostname || device.ip,
        emoji 
      });
    }
    
    return { count: updated.length, devices: updated };
  }
  
  async bulkGroup(pattern, groupName) {
    // Request devices from core via event system
    const devices = await this.requestFromCore('get-all-devices');
    
    const regex = new RegExp(pattern, 'i');
    const matched = devices.filter(d => 
      regex.test(d.hostname || '') || 
      regex.test(d.notes || '') ||
      regex.test(d.ip)
    );
    
    const updated = [];
    for (const device of matched) {
      // Request core to assign group
      await this.requestFromCore('assign-device-group', { 
        mac: device.mac, 
        groupName 
      });
      
      updated.push({ 
        device: device.notes || device.hostname || device.ip,
        group: groupName 
      });
    }
    
    return { count: updated.length, devices: updated };
  }
}
