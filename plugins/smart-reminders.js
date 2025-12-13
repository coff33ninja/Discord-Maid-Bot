import { Plugin } from '../src/plugins/plugin-manager.js';

/**
 * Smart Reminder System Plugin
 * Context-aware reminders with network presence detection
 * 
 * Features:
 * - Location-based reminders (when device comes online)
 * - Time-based reminders with AI variations
 * - Context storage (remember conversation context)
 * - Recurring reminders
 * - Server status reminders
 */
export default class SmartRemindersPlugin extends Plugin {
  constructor() {
    super('smart-reminders', '1.0.0', 'Context-aware reminder system');
    this.reminders = [];
    this.client = null;
    this.checkInterval = null;
  }
  
  async onLoad() {
    console.log('⏰ Smart Reminders plugin loaded');
    
    // Load reminders from database
    const { configOps } = await import('../src/database/db.js');
    const savedReminders = configOps.get('smart_reminders');
    
    if (savedReminders) {
      try {
        this.reminders = JSON.parse(savedReminders);
        console.log(`   Loaded ${this.reminders.length} reminder(s)`);
      } catch (e) {
        console.error('   Failed to parse reminders:', e);
      }
    }
    
    // Start reminder check loop (every minute)
    this.startReminderCheck();
  }
  
  async onUnload() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    await this.saveReminders();
    console.log('⏰ Smart Reminders plugin unloaded');
  }
  
  setClient(client) {
    this.client = client;
  }
  
  async saveReminders() {
    const { configOps } = await import('../src/database/db.js');
    configOps.set('smart_reminders', JSON.stringify(this.reminders));
  }
  
  startReminderCheck() {
    // Check reminders every minute
    this.checkInterval = setInterval(async () => {
      await this.checkReminders();
    }, 60 * 1000);
  }
  
  async checkReminders() {
    const now = Date.now();
    const triggeredReminders = [];
    
    for (const reminder of this.reminders) {
      if (!reminder.active) continue;
      
      let shouldTrigger = false;
      
      // Check time-based reminders
      if (reminder.type === 'time' && reminder.triggerTime <= now) {
        shouldTrigger = true;
      }
      
      // Check recurring reminders
      if (reminder.type === 'recurring' && this.shouldTriggerRecurring(reminder, now)) {
        shouldTrigger = true;
      }
      
      if (shouldTrigger) {
        await this.triggerReminder(reminder);
        triggeredReminders.push(reminder);
        
        // Handle recurring vs one-time
        if (reminder.type === 'recurring') {
          reminder.lastTriggered = now;
          reminder.triggerCount = (reminder.triggerCount || 0) + 1;
        } else {
          reminder.active = false;
          reminder.completed = true;
          reminder.completedAt = now;
        }
      }
    }
    
    if (triggeredReminders.length > 0) {
      await this.saveReminders();
    }
  }
  
  shouldTriggerRecurring(reminder, now) {
    const { interval, lastTriggered } = reminder;
    
    if (!lastTriggered) return true;
    
    const timeSinceLastTrigger = now - lastTriggered;
    
    // Convert interval to milliseconds
    let intervalMs = 0;
    if (interval.endsWith('m')) {
      intervalMs = parseInt(interval) * 60 * 1000;
    } else if (interval.endsWith('h')) {
      intervalMs = parseInt(interval) * 60 * 60 * 1000;
    } else if (interval.endsWith('d')) {
      intervalMs = parseInt(interval) * 24 * 60 * 60 * 1000;
    }
    
    return timeSinceLastTrigger >= intervalMs;
  }
  
  async triggerReminder(reminder) {
    if (!this.client) return;
    
    try {
      // Check conditions first
      if (reminder.conditions && reminder.conditions.length > 0) {
        const conditionsMet = await this.checkConditions(reminder.conditions);
        if (!conditionsMet) {
          console.log(`⏰ Reminder ${reminder.name} conditions not met, skipping`);
          return;
        }
      }
      
      // Execute automation actions first
      if (reminder.actions && reminder.actions.length > 0) {
        await this.executeActions(reminder.actions, reminder);
      }
      
      // Get message content (with AI variation if enabled)
      let message = reminder.message;
      
      if (reminder.aiVariation && reminder.triggerCount > 0) {
        message = await this.generateVariation(reminder.message);
      }
      
      // Build embed
      const embed = {
        color: 0xFFA500,
        title: '⏰ Reminder',
        description: message,
        fields: [],
        footer: { text: reminder.type === 'recurring' ? `Recurring: ${reminder.interval}` : 'One-time reminder' },
        timestamp: new Date()
      };
      
      if (reminder.context) {
        embed.fields.push({ name: '📝 Context', value: reminder.context });
      }
      
      if (reminder.messageUrl) {
        embed.fields.push({ name: '🔗 Original Message', value: `[Jump to message](${reminder.messageUrl})` });
      }
      
      // Add snooze button if applicable
      const components = [];
      if (reminder.type !== 'recurring' && reminder.snoozeCount < reminder.maxSnoozes) {
        components.push({
          type: 1,
          components: [
            {
              type: 2,
              style: 2,
              label: `Snooze 10m (${reminder.maxSnoozes - reminder.snoozeCount} left)`,
              custom_id: `snooze_${reminder.id}_10`
            },
            {
              type: 2,
              style: 2,
              label: 'Snooze 1h',
              custom_id: `snooze_${reminder.id}_60`
            }
          ]
        });
      }
      
      // Determine who to notify
      let targetUser = reminder.targetUserId || reminder.userId;
      let mentionText = `<@${targetUser}>`;
      
      if (reminder.targetRoleId) {
        mentionText = `<@&${reminder.targetRoleId}>`;
      }
      
      // Send notification
      if (reminder.target === 'dm' || reminder.target === 'user') {
        const user = await this.client.users.fetch(targetUser);
        await user.send({
          embeds: [embed],
          components
        });
      } else if (reminder.target === 'channel') {
        const channel = await this.client.channels.fetch(reminder.channelId);
        await channel.send({
          content: mentionText,
          embeds: [embed],
          components
        });
      } else if (reminder.target === 'role') {
        const channel = await this.client.channels.fetch(reminder.channelId);
        await channel.send({
          content: mentionText,
          embeds: [embed],
          components
        });
      } else if (reminder.target === 'automation') {
        // Automation-only, send confirmation to creator
        const user = await this.client.users.fetch(reminder.userId);
        await user.send({
          embeds: [{
            color: 0x00FF00,
            title: '✅ Automation Executed',
            description: message,
            fields: [
              { name: '🤖 Actions', value: `${reminder.actions.length} action(s) executed`, inline: true },
              { name: '⏰ Type', value: reminder.type, inline: true }
            ],
            timestamp: new Date()
          }]
        });
      }
      
      console.log(`⏰ Triggered reminder: ${reminder.name}`);
    } catch (error) {
      console.error(`Failed to trigger reminder ${reminder.name}:`, error);
    }
  }
  
  async checkConditions(conditions) {
    for (const condition of conditions) {
      try {
        switch (condition.type) {
          case 'user_online':
            // Check if user's device is online
            const { deviceOps } = await import('../src/database/db.js');
            const device = deviceOps.getByMac(condition.deviceMac);
            if (!device || !device.online) return false;
            break;
            
          case 'speed_above':
            // Check if speed is above threshold
            const { speedTestOps } = await import('../src/database/db.js');
            const recentTests = speedTestOps.getRecent(1);
            if (recentTests.length === 0) return false;
            if (parseFloat(recentTests[0].download) < condition.threshold) return false;
            break;
            
          case 'time_range':
            // Check if current time is within range
            const now = new Date();
            const currentHour = now.getHours();
            if (currentHour < condition.startHour || currentHour > condition.endHour) return false;
            break;
            
          case 'weekday':
            // Check if it's a weekday
            const day = new Date().getDay();
            if (day === 0 || day === 6) return false; // Sunday or Saturday
            break;
        }
      } catch (error) {
        console.error(`Failed to check condition ${condition.type}:`, error);
        return false;
      }
    }
    
    return true;
  }
  
  async executeActions(actions, reminder) {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'homeassistant':
            await this.executeHomeAssistantAction(action);
            break;
          case 'wol':
            await this.executeWakeOnLan(action);
            break;
          case 'scan':
            await this.executeNetworkScan();
            break;
          case 'speedtest':
            await this.executeSpeedTest();
            break;
          default:
            console.warn(`Unknown action type: ${action.type}`);
        }
        
        console.log(`✅ Executed action: ${action.type}`);
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
  }
  
  async executeHomeAssistantAction(action) {
    const { callService } = await import('../src/integrations/homeassistant.js');
    const [domain, service] = action.service.split('.');
    
    await callService(domain, service, {
      entity_id: action.entityId,
      ...action.data
    });
  }
  
  async executeWakeOnLan(action) {
    const wol = (await import('wake_on_lan')).default;
    
    return new Promise((resolve, reject) => {
      wol.wake(action.mac, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
  
  async executeNetworkScan() {
    const { scanUnifiedNetwork } = await import('../src/network/unified-scanner.js');
    const subnet = process.env.NETWORK_SUBNET || '192.168.0.0/24';
    await scanUnifiedNetwork(subnet);
  }
  
  async executeSpeedTest() {
    const speedtest = (await import('speedtest-net')).default;
    await speedtest({ acceptLicense: true, acceptGdpr: true });
  }
  
  async generateVariation(originalMessage) {
    try {
      const { generateWithRotation } = await import('../src/config/gemini-keys.js');
      
      const prompt = `Generate a friendly variation of this reminder message. Keep the same meaning but use different words. Be concise and natural.

Original: "${originalMessage}"

Variation:`;
      
      const { result } = await generateWithRotation(prompt);
      const response = result.response;
      
      if (response && typeof response.text === 'function') {
        return response.text().trim();
      }
    } catch (error) {
      console.error('Failed to generate reminder variation:', error);
    }
    
    return originalMessage;
  }
  
  async addReminder(reminderData) {
    const reminder = {
      id: Date.now().toString(),
      name: reminderData.name,
      message: reminderData.message,
      type: reminderData.type, // 'time', 'presence', 'recurring', 'conditional'
      target: reminderData.target, // 'dm', 'channel', 'automation', 'user', 'role'
      userId: reminderData.userId, // Creator
      targetUserId: reminderData.targetUserId, // Who to remind (if different from creator)
      targetRoleId: reminderData.targetRoleId, // Role to remind
      channelId: reminderData.channelId,
      triggerTime: reminderData.triggerTime,
      deviceMac: reminderData.deviceMac,
      interval: reminderData.interval,
      context: reminderData.context,
      messageUrl: reminderData.messageUrl, // Link to original message
      aiVariation: reminderData.aiVariation || false,
      // Automation actions
      actions: reminderData.actions || [], // Array of actions to execute
      // Conditions
      conditions: reminderData.conditions || [], // Array of conditions to check
      // Snooze
      snoozeCount: 0,
      maxSnoozes: reminderData.maxSnoozes || 3,
      // Status
      active: true,
      completed: false,
      createdAt: Date.now(),
      lastTriggered: null,
      triggerCount: 0
    };
    
    this.reminders.push(reminder);
    await this.saveReminders();
    
    console.log(`✅ Added reminder: ${reminder.name}`);
    return reminder;
  }
  
  async snoozeReminder(reminderId, duration) {
    const reminder = this.reminders.find(r => r.id === reminderId);
    if (!reminder) {
      throw new Error('Reminder not found');
    }
    
    if (reminder.snoozeCount >= reminder.maxSnoozes) {
      throw new Error(`Maximum snoozes (${reminder.maxSnoozes}) reached`);
    }
    
    // Add snooze duration to trigger time
    reminder.triggerTime = Date.now() + duration;
    reminder.snoozeCount++;
    reminder.active = true;
    
    await this.saveReminders();
    return reminder;
  }
  
  async removeReminder(reminderId) {
    const index = this.reminders.findIndex(r => r.id === reminderId);
    if (index === -1) {
      throw new Error('Reminder not found');
    }
    
    const removed = this.reminders.splice(index, 1)[0];
    await this.saveReminders();
    
    console.log(`🗑️ Removed reminder: ${removed.name}`);
    return removed;
  }
  
  async toggleReminder(reminderId, active) {
    const reminder = this.reminders.find(r => r.id === reminderId);
    if (!reminder) {
      throw new Error('Reminder not found');
    }
    
    reminder.active = active;
    await this.saveReminders();
    
    return reminder;
  }
  
  async listReminders(userId = null) {
    if (userId) {
      return this.reminders.filter(r => r.userId === userId);
    }
    return this.reminders;
  }
  
  async getReminder(reminderId) {
    return this.reminders.find(r => r.id === reminderId);
  }
  
  // Event handler: Network scan completed
  async onNetworkScan(devices) {
    // Check for presence-based reminders
    const presenceReminders = this.reminders.filter(r => 
      r.active && r.type === 'presence'
    );
    
    for (const reminder of presenceReminders) {
      const device = devices.find(d => d.mac === reminder.deviceMac);
      
      if (device && device.online) {
        // Device came online - trigger reminder
        await this.triggerReminder(reminder);
        reminder.active = false;
        reminder.completed = true;
        reminder.completedAt = Date.now();
      }
    }
    
    if (presenceReminders.length > 0) {
      await this.saveReminders();
    }
    
    return { processed: true };
  }
  
  // Format time for display
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }
  
  // Parse relative time (e.g., "5m", "2h", "1d")
  parseRelativeTime(timeStr) {
    const now = Date.now();
    const value = parseInt(timeStr);
    const unit = timeStr.slice(-1);
    
    let ms = 0;
    if (unit === 'm') ms = value * 60 * 1000;
    else if (unit === 'h') ms = value * 60 * 60 * 1000;
    else if (unit === 'd') ms = value * 24 * 60 * 60 * 1000;
    
    return now + ms;
  }
}
