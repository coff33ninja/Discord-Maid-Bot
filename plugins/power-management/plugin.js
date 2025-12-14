import { Plugin } from '../../src/core/plugin-system.js';
import { createLogger } from '../../src/logging/logger.js';

/**
 * Power Management Plugin
 * 
 * Complete device power control integrating WOL and remote shutdown.
 * Complements the network management plugin's Wake-on-LAN functionality
 * with remote shutdown/restart capabilities.
 * 
 * Features:
 * - Wake devices (Wake-on-LAN)
 * - Shutdown/restart devices (HTTP API)
 * - Bulk power operations (groups, patterns)
 * - Scheduled power management
 * - Power state monitoring
 * - Web UI dashboard integration
 * 
 * @version 1.0.0.0-beta
 * @author Discord Maid Bot Team
 */
export default class PowerManagementPlugin extends Plugin {
  constructor() {
    super('power-management', '1.0.0.0-beta', 'Complete device power control (WOL + Shutdown)');
    this.logger = createLogger('power-management');
    
    // Register schema extensions for device shutdown configuration
    this.registerSchemaExtension('devices', [
      { name: 'shutdown_api_key', type: 'TEXT', defaultValue: null },
      { name: 'shutdown_port', type: 'INTEGER', defaultValue: 5000 }
    ]);
    
    this.powerStates = new Map(); // Track power states
    this.scheduledTasks = new Map(); // Track scheduled power tasks
  }
  
  async onLoad() {
    this.logger.info('⚡ Power Management plugin loaded');
    this.logger.info('   Features: Wake, Shutdown, Restart, Bulk Ops, Scheduling');
    
    // Listen for network scan updates to track power states
    // This will be called by network management plugin
  }
  
  async onUnload() {
    // Cancel all scheduled tasks
    for (const [id, task] of this.scheduledTasks) {
      clearTimeout(task.timeout);
    }
    this.scheduledTasks.clear();
    
    this.logger.info('⚡ Power Management plugin unloaded');
  }
  
  /**
   * Update power states based on network scan
   * Called by network management plugin after scan
   */
  async onNetworkScan(devices) {
    for (const device of devices) {
      const previousState = this.powerStates.get(device.mac);
      const currentState = device.online ? 'online' : 'offline';
      
      this.powerStates.set(device.mac, {
        state: currentState,
        lastSeen: device.last_seen,
        ip: device.ip,
        hostname: device.hostname,
        previousState: previousState?.state
      });
      
      // Emit power state change event if state changed
      if (previousState && previousState.state !== currentState) {
        // Could trigger automations here
        this.logger.info(`⚡ Power state changed: ${device.hostname || device.ip} ${previousState.state} → ${currentState}`);
      }
    }
  }
  
  /**
   * Get power state for a device
   */
  getPowerState(mac) {
    return this.powerStates.get(mac) || { state: 'unknown' };
  }
  
  /**
   * Get all power states
   */
  getAllPowerStates() {
    return Array.from(this.powerStates.entries()).map(([mac, state]) => ({
      mac,
      ...state
    }));
  }
  
  /**
   * Schedule a power task
   */
  schedulePowerTask(taskId, action, deviceMac, delay) {
    // Cancel existing task if any
    if (this.scheduledTasks.has(taskId)) {
      clearTimeout(this.scheduledTasks.get(taskId).timeout);
    }
    
    const timeout = setTimeout(async () => {
      try {
        if (action === 'wake') {
          await this.wakeDevice(deviceMac);
        } else if (action === 'shutdown' || action === 'restart') {
          await this.powerControlDevice(deviceMac, action);
        }
        this.scheduledTasks.delete(taskId);
      } catch (error) {
        this.logger.error(`Scheduled power task ${taskId} failed:`, error);
      }
    }, delay);
    
    this.scheduledTasks.set(taskId, {
      action,
      deviceMac,
      scheduledAt: new Date(),
      executeAt: new Date(Date.now() + delay),
      timeout
    });
    
    return taskId;
  }
  
  /**
   * Cancel a scheduled power task
   */
  cancelPowerTask(taskId) {
    const task = this.scheduledTasks.get(taskId);
    if (task) {
      clearTimeout(task.timeout);
      this.scheduledTasks.delete(taskId);
      return true;
    }
    return false;
  }
  
  /**
   * Get all scheduled power tasks
   */
  getScheduledTasks() {
    return Array.from(this.scheduledTasks.entries()).map(([id, task]) => ({
      id,
      action: task.action,
      deviceMac: task.deviceMac,
      scheduledAt: task.scheduledAt,
      executeAt: task.executeAt
    }));
  }
  
  /**
   * Wake device using Wake-on-LAN
   */
  async wakeDevice(mac) {
    const wol = await import('wake_on_lan');
    return new Promise((resolve, reject) => {
      wol.default.wake(mac, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
  
  /**
   * Power control device (shutdown/restart)
   */
  async powerControlDevice(mac, action) {
    const { deviceOps } = await import('../../src/database/db.js');
    const device = deviceOps.getByMac(mac);
    
    if (!device) {
      throw new Error('Device not found');
    }
    
    if (!device.shutdown_api_key || !device.shutdown_port) {
      throw new Error('Device not configured for remote shutdown');
    }
    
    const fetch = (await import('node-fetch')).default;
    const endpoint = action === 'shutdown' ? '/shutdown' : '/restart';
    
    const response = await fetch(`http://${device.ip}:${device.shutdown_port}${endpoint}`, {
      method: 'POST',
      headers: {
        'X-API-Key': device.shutdown_api_key,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
}
