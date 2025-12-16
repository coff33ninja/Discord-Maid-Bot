import { Plugin } from '../../src/core/plugin-system.js';
import { createLogger } from '../../src/logging/logger.js';
import { deviceOps, db } from '../../src/database/db.js';

/**
 * Device Management Plugin
 * 
 * Provides device configuration, grouping, and management functionality.
 * 
 * Features:
 * - Device naming and emoji assignment
 * - Device type and OS tracking
 * - Device grouping
 * - Deep scanning with nmap
 */
export default class DeviceManagementPlugin extends Plugin {
  constructor() {
    super('device-management', '1.0.0', 'Device configuration and group management');
    this.logger = createLogger('device-management');
  }
  
  async onLoad() {
    this.logger.info('📱 Device Management plugin loaded');
    this.logger.info('   Features: Rename, Type, OS, Groups, Deep Scan');
  }
  
  async onUnload() {
    this.logger.info('📱 Device Management plugin unloaded');
  }
  
  // Get all devices
  getAllDevices() {
    return deviceOps.getAll();
  }
  
  // Get device by identifier (IP, MAC, or name)
  getDevice(identifier) {
    const devices = deviceOps.getAll();
    return devices.find(d => 
      d.ip === identifier ||
      d.mac?.toLowerCase() === identifier.toLowerCase() ||
      d.notes?.toLowerCase() === identifier.toLowerCase() ||
      d.hostname?.toLowerCase() === identifier.toLowerCase()
    );
  }
  
  // Get device by MAC
  getDeviceByMac(mac) {
    return deviceOps.getByMac(mac);
  }
  
  // Get device by ID
  getDeviceById(id) {
    return deviceOps.getById(id);
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
  assignToGroup(deviceId, groupName) {
    const device = typeof deviceId === 'number' ? deviceOps.getById(deviceId) : this.getDevice(deviceId);
    if (!device) throw new Error('Device not found');
    
    deviceOps.updateGroup(device.id, groupName);
    this.logger.info(`Device ${device.ip} assigned to group: ${groupName}`);
    return device;
  }
  
  // Rename device
  renameDevice(deviceId, newName) {
    const device = typeof deviceId === 'number' ? deviceOps.getById(deviceId) : this.getDevice(deviceId);
    if (!device) throw new Error('Device not found');
    
    const oldName = device.notes || device.hostname || device.ip;
    deviceOps.updateNotes(device.id, newName);
    this.logger.info(`Device renamed: ${oldName} → ${newName}`);
    return { device, oldName, newName };
  }
  
  // Set device emoji
  setDeviceEmoji(deviceId, emoji) {
    const device = typeof deviceId === 'number' ? deviceOps.getById(deviceId) : this.getDevice(deviceId);
    if (!device) throw new Error('Device not found');
    
    deviceOps.updateEmoji(device.id, emoji);
    this.logger.info(`Device ${device.ip} emoji set to: ${emoji}`);
    return device;
  }
  
  // Set device type
  setDeviceType(deviceId, type) {
    const device = typeof deviceId === 'number' ? deviceOps.getById(deviceId) : this.getDevice(deviceId);
    if (!device) throw new Error('Device not found');
    
    const validTypes = ['pc', 'laptop', 'server', 'phone', 'tablet', 'router', 'printer', 'tv', 'gaming', 'iot', 'unknown'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid type. Valid types: ${validTypes.join(', ')}`);
    }
    
    db.prepare('UPDATE devices SET device_type = ? WHERE id = ?').run(type, device.id);
    this.logger.info(`Device ${device.ip} type set to: ${type}`);
    return device;
  }
  
  // Set device OS
  setDeviceOS(deviceId, os) {
    const device = typeof deviceId === 'number' ? deviceOps.getById(deviceId) : this.getDevice(deviceId);
    if (!device) throw new Error('Device not found');
    
    db.prepare('UPDATE devices SET os = ? WHERE id = ?').run(os, device.id);
    this.logger.info(`Device ${device.ip} OS set to: ${os}`);
    return device;
  }
  
  // Configure device (multiple properties at once)
  configureDevice(deviceId, config) {
    const device = typeof deviceId === 'number' ? deviceOps.getById(deviceId) : this.getDevice(deviceId);
    if (!device) throw new Error('Device not found');
    
    const changes = [];
    
    if (config.name) {
      deviceOps.updateNotes(device.id, config.name);
      changes.push(`name: ${config.name}`);
    }
    if (config.emoji) {
      deviceOps.updateEmoji(device.id, config.emoji);
      changes.push(`emoji: ${config.emoji}`);
    }
    if (config.type) {
      db.prepare('UPDATE devices SET device_type = ? WHERE id = ?').run(config.type, device.id);
      changes.push(`type: ${config.type}`);
    }
    if (config.os) {
      db.prepare('UPDATE devices SET os = ? WHERE id = ?').run(config.os, device.id);
      changes.push(`os: ${config.os}`);
    }
    if (config.group) {
      deviceOps.updateGroup(device.id, config.group);
      changes.push(`group: ${config.group}`);
    }
    
    this.logger.info(`Device ${device.ip} configured: ${changes.join(', ')}`);
    return { device, changes };
  }
  
  // Deep scan device with nmap
  async deepScanDevice(deviceId) {
    const device = typeof deviceId === 'number' ? deviceOps.getById(deviceId) : this.getDevice(deviceId);
    if (!device) throw new Error('Device not found');
    
    const { detectDeviceType, getDeviceEmoji } = await import('../network-management/device-detector.js');
    
    const detection = await detectDeviceType({ ip: device.ip, mac: device.mac, hostname: device.hostname }, true);
    
    if (detection.type !== 'unknown') {
      db.prepare('UPDATE devices SET device_type = ?, os = ? WHERE id = ?')
        .run(detection.type, detection.os || null, device.id);
      
      if (!device.emoji) {
        const emoji = getDeviceEmoji(detection.type);
        deviceOps.updateEmoji(device.id, emoji);
      }
      
      this.logger.info(`Device ${device.ip} scanned: ${detection.type} (${detection.os || 'unknown OS'})`);
    }
    
    return {
      device,
      type: detection.type,
      os: detection.os,
      confidence: detection.confidence,
      method: detection.method
    };
  }
  
  // Deep scan all online devices
  async deepScanAll() {
    const devices = deviceOps.getAll().filter(d => d.online);
    const results = [];
    
    for (const device of devices) {
      try {
        const result = await this.deepScanDevice(device.id);
        results.push(result);
      } catch (error) {
        this.logger.warn(`Scan failed for ${device.ip}: ${error.message}`);
        results.push({ device, error: error.message });
      }
    }
    
    return results;
  }
  
  // Get device info
  getDeviceInfo(deviceId) {
    const device = typeof deviceId === 'number' ? deviceOps.getById(deviceId) : this.getDevice(deviceId);
    if (!device) throw new Error('Device not found');
    
    return {
      id: device.id,
      name: device.notes || device.hostname || device.ip,
      ip: device.ip,
      mac: device.mac,
      hostname: device.hostname,
      type: device.device_type || 'unknown',
      os: device.os || 'unknown',
      emoji: device.emoji,
      group: device.device_group,
      online: device.online,
      firstSeen: device.first_seen,
      lastSeen: device.last_seen
    };
  }
}
