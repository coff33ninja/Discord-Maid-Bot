import { Plugin } from '../../src/core/plugin-system.js';

/**
 * Device Automation Triggers Plugin
 * Create automation rules based on device network status
 * Examples:
 * - "When my gaming PC comes online, send me a Discord DM"
 * - "When my phone disconnects, turn off bedroom lights"
 * - "Alert me when unknown devices join the network"
 */
export default class DeviceTriggersPlugin extends Plugin {
  constructor() {
    super('device-triggers', '1.0.0', 'Automation rules based on device network status');
    this.triggers = [];
    this.client = null;
    this.knownDevices = new Set();
  }
  
  async onLoad() {
    console.log('🔔 Device Triggers plugin loaded');
    
    // Load triggers from database
    const { configOps } = await import('../../src/database/db.js');
    const savedTriggers = configOps.get('device_triggers');
    
    if (savedTriggers) {
      try {
        this.triggers = JSON.parse(savedTriggers);
        console.log(`   Loaded ${this.triggers.length} trigger(s)`);
      } catch (e) {
        console.error('   Failed to parse saved triggers:', e);
        this.triggers = [];
      }
    }
    
    // Initialize known devices set
    const { deviceOps } = await import('../../src/database/db.js');
    const devices = deviceOps.getAll();
    devices.forEach(d => this.knownDevices.add(d.mac));
  }
  
  setClient(client) {
    this.client = client;
  }
  
  async saveTriggers() {
    const { configOps } = await import('../../src/database/db.js');
    configOps.set('device_triggers', JSON.stringify(this.triggers));
  }
  
  /**
   * Add a new trigger
   * @param {Object} trigger - Trigger configuration
   * @param {string} trigger.name - Trigger name
   * @param {string} trigger.deviceMac - Device MAC address (or 'any' for unknown devices)
   * @param {string} trigger.event - 'online' | 'offline' | 'unknown'
   * @param {string} trigger.action - 'discord_dm' | 'discord_channel' | 'homeassistant'
   * @param {Object} trigger.actionData - Action-specific data
   */
  async addTrigger(trigger) {
    // Validate trigger
    if (!trigger.name || !trigger.event || !trigger.action) {
      throw new Error('Invalid trigger: name, event, and action are required');
    }
    
    // Generate ID
    trigger.id = Date.now().toString();
    trigger.enabled = true;
    trigger.lastTriggered = null;
    trigger.triggerCount = 0;
    
    this.triggers.push(trigger);
    await this.saveTriggers();
    
    console.log(`✅ Added trigger: ${trigger.name}`);
    return trigger;
  }
  
  async removeTrigger(triggerId) {
    const index = this.triggers.findIndex(t => t.id === triggerId);
    if (index === -1) {
      throw new Error('Trigger not found');
    }
    
    const removed = this.triggers.splice(index, 1)[0];
    await this.saveTriggers();
    
    console.log(`🗑️ Removed trigger: ${removed.name}`);
    return removed;
  }
  
  async toggleTrigger(triggerId, enabled) {
    const trigger = this.triggers.find(t => t.id === triggerId);
    if (!trigger) {
      throw new Error('Trigger not found');
    }
    
    trigger.enabled = enabled;
    await this.saveTriggers();
    
    return trigger;
  }
  
  async listTriggers() {
    return this.triggers;
  }
  
  async onNetworkScan(devices) {
    if (!this.enabled || !this.client) {
      return { processed: false };
    }
    
    const { deviceOps } = await import('../../src/database/db.js');
    const triggeredActions = [];
    
    // Check each device for status changes
    for (const device of devices) {
      const previousDevice = deviceOps.getByMac(device.mac);
      
      // Device came online
      if (device.online && previousDevice && !previousDevice.online) {
        await this.processTriggers(device, 'online', triggeredActions);
      }
      
      // Device went offline
      if (!device.online && previousDevice && previousDevice.online) {
        await this.processTriggers(device, 'offline', triggeredActions);
      }
      
      // Unknown device detected
      if (!this.knownDevices.has(device.mac)) {
        await this.processTriggers(device, 'unknown', triggeredActions);
        this.knownDevices.add(device.mac);
      }
    }
    
    return { 
      processed: true, 
      triggeredCount: triggeredActions.length,
      actions: triggeredActions 
    };
  }
  
  async processTriggers(device, event, triggeredActions) {
    const matchingTriggers = this.triggers.filter(t => 
      t.enabled && 
      t.event === event && 
      (t.deviceMac === device.mac || t.deviceMac === 'any')
    );
    
    for (const trigger of matchingTriggers) {
      try {
        await this.executeAction(trigger, device);
        
        // Update trigger stats
        trigger.lastTriggered = new Date().toISOString();
        trigger.triggerCount++;
        await this.saveTriggers();
        
        triggeredActions.push({
          trigger: trigger.name,
          device: device.notes || device.hostname || device.ip,
          event,
          action: trigger.action
        });
        
        console.log(`🔔 Triggered: ${trigger.name} for ${device.notes || device.hostname || device.ip}`);
      } catch (error) {
        console.error(`Failed to execute trigger ${trigger.name}:`, error);
      }
    }
  }
  
  async executeAction(trigger, device) {
    const deviceName = device.emoji ? `${device.emoji} ${device.notes || device.hostname || device.ip}` : (device.notes || device.hostname || device.ip);
    
    switch (trigger.action) {
      case 'discord_dm':
        if (trigger.actionData?.userId) {
          const user = await this.client.users.fetch(trigger.actionData.userId);
          await user.send({
            embeds: [{
              color: trigger.event === 'online' ? 0x00FF00 : trigger.event === 'offline' ? 0xFF0000 : 0xFFA500,
              title: `🔔 Device ${trigger.event === 'online' ? 'Online' : trigger.event === 'offline' ? 'Offline' : 'Detected'}`,
              description: trigger.actionData.message || `**${deviceName}** is now ${trigger.event}`,
              fields: [
                { name: 'Device', value: deviceName, inline: true },
                { name: 'IP', value: device.ip, inline: true },
                { name: 'Event', value: trigger.event, inline: true }
              ],
              timestamp: new Date()
            }]
          });
        }
        break;
        
      case 'discord_channel':
        if (trigger.actionData?.channelId) {
          const channel = await this.client.channels.fetch(trigger.actionData.channelId);
          await channel.send({
            embeds: [{
              color: trigger.event === 'online' ? 0x00FF00 : trigger.event === 'offline' ? 0xFF0000 : 0xFFA500,
              title: `🔔 Device ${trigger.event === 'online' ? 'Online' : trigger.event === 'offline' ? 'Offline' : 'Detected'}`,
              description: trigger.actionData.message || `**${deviceName}** is now ${trigger.event}`,
              fields: [
                { name: 'Device', value: deviceName, inline: true },
                { name: 'IP', value: device.ip, inline: true },
                { name: 'Event', value: trigger.event, inline: true }
              ],
              timestamp: new Date()
            }]
          });
        }
        break;
        
      case 'homeassistant':
        if (trigger.actionData?.entityId && trigger.actionData?.service) {
          const { callService } = await import('../../src/integrations/homeassistant.js');
          const [domain, service] = trigger.actionData.service.split('.');
          await callService(domain, service, {
            entity_id: trigger.actionData.entityId
          });
        }
        break;
    }
  }
}
