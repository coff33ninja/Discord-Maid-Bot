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
      // Get message content (with AI variation if enabled)
      let message = reminder.message;
      
      if (reminder.aiVariation && reminder.triggerCount > 0) {
        message = await this.generateVariation(reminder.message);
      }
      
      // Send reminder
      if (reminder.target === 'dm') {
        const user = await this.client.users.fetch(reminder.userId);
        await user.send({
          embeds: [{
            color: 0xFFA500,
            title: '⏰ Reminder',
            description: message,
            fields: reminder.context ? [
              { name: '📝 Context', value: reminder.context }
            ] : [],
            footer: { text: reminder.type === 'recurring' ? `Recurring: ${reminder.interval}` : 'One-time reminder' },
            timestamp: new Date()
          }]
        });
      } else if (reminder.target === 'channel') {
        const channel = await this.client.channels.fetch(reminder.channelId);
        await channel.send({
          content: `<@${reminder.userId}>`,
          embeds: [{
            color: 0xFFA500,
            title: '⏰ Reminder',
            description: message,
            fields: reminder.context ? [
              { name: '📝 Context', value: reminder.context }
            ] : [],
            footer: { text: reminder.type === 'recurring' ? `Recurring: ${reminder.interval}` : 'One-time reminder' },
            timestamp: new Date()
          }]
        });
      }
      
      console.log(`⏰ Triggered reminder: ${reminder.name}`);
    } catch (error) {
      console.error(`Failed to trigger reminder ${reminder.name}:`, error);
    }
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
      type: reminderData.type, // 'time', 'presence', 'recurring'
      target: reminderData.target, // 'dm', 'channel'
      userId: reminderData.userId,
      channelId: reminderData.channelId,
      triggerTime: reminderData.triggerTime,
      deviceMac: reminderData.deviceMac,
      interval: reminderData.interval,
      context: reminderData.context,
      aiVariation: reminderData.aiVariation || false,
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
