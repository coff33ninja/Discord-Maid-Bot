import { Plugin } from '../../src/core/plugin-system.js';
import { createLogger } from '../../src/logging/logger.js';
import { deviceOps } from '../../src/database/db.js';

/**
 * Device Management Plugin
 * 
 * Provides device configuration, grouping, and management functionality.
 */
export default class DeviceManagementPlugin extends Plugin {
  constructor() {
    super('device-management', '1.0.0', 'Device configuration and group management');
    this.logger = createLogger('device-management');
  }
  
  async onLoad() {
    this.logger.info('📱 Device Management plugin loaded');
  }
  
  async onUnload() {
    this.logger.info('📱 Device Management plugin unloaded');
  }
  
  // Get all device groups
  getAllGroups() {
    return deviceOps.getAllGroups();
  }
  
  // Get devices in a group
  getDevicesInGroup(groupName) {
    return deviceOps.getByGroup(groupName);
  }
  
  // Assign device to group
  assignToGroup(mac, groupName) {
    const device = deviceOps.getByMac(mac);
    if (!device) throw new Error('Device not found');
    
    deviceOps.upsert({ ...device, group: groupName });
    return device;
  }
  
  // Configure device
  configureDevice(mac, config) {
    const device = deviceOps.getByMac(mac);
    if (!device) throw new Error('Device not found');
    
    const updated = { ...device };
    if (config.name) updated.name = config.name;
    if (config.emoji) updated.emoji = config.emoji;
    if (config.group) updated.group = config.group;
    
    deviceOps.upsert(updated);
    return updated;
  }
}
