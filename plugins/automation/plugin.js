import { Plugin } from '../../src/core/plugin-system.js';
import cron from 'node-cron';
import { taskOps } from '../../src/database/db.js';

/**
 * Automation Plugin
 * 
 * Comprehensive automation system with task scheduling, triggers, and alerts.
 * 
 * Features:
 * - Task scheduler with cron expressions
 * - Device-based triggers
 * - Speed test alerts
 * - Scheduled network scans
 * - Scheduled speed tests
 * - Custom automation rules
 */
export default class AutomationPlugin extends Plugin {
  constructor() {
    super('automation', '1.0.0', 'Task scheduling and automation system');
    this.activeTasks = new Map();
    this.client = null;
  }
  
  async onLoad() {
    console.log('⏰ Automation plugin loaded');
    console.log('   Features: Scheduler, Triggers, Alerts');
  }
  
  async onUnload() {
    console.log('⏰ Stopping all scheduled tasks...');
    // Stop all active tasks
    for (const [taskId, task] of this.activeTasks) {
      task.stop();
    }
    this.activeTasks.clear();
    console.log('⏰ Automation plugin unloaded');
  }
  
  setClient(client) {
    this.client = client;
    this.initScheduler();
  }
  
  // Initialize scheduler with saved tasks
  initScheduler() {
    if (!this.client) {
      console.warn('⚠️  Client not set, cannot initialize scheduler');
      return;
    }
    
    console.log('⏰ Initializing task scheduler...');
    const tasks = taskOps.getEnabled();
    
    for (const task of tasks) {
      this.scheduleTask(task);
    }
    
    console.log(`✅ Scheduled ${tasks.length} tasks`);
  }
  
  // Schedule a single task
  scheduleTask(task) {
    try {
      // Validate cron expression
      if (!cron.validate(task.cron_expression)) {
        console.error(`❌ Invalid cron expression for task ${task.name}: ${task.cron_expression}`);
        return false;
      }

      // Stop existing task if running
      if (this.activeTasks.has(task.id)) {
        this.activeTasks.get(task.id).stop();
      }

      // Create new scheduled task
      const scheduledTask = cron.schedule(task.cron_expression, async () => {
        await this.executeTask(task);
      });

      this.activeTasks.set(task.id, scheduledTask);
      console.log(`✅ Scheduled task: ${task.name} (${task.cron_expression})`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to schedule task ${task.name}:`, error);
      return false;
    }
  }
  
  // Execute a scheduled task
  async executeTask(task) {
    console.log(`⏰ Running scheduled task: ${task.name}`);
    
    try {
      // Update last run time
      taskOps.updateLastRun(task.id);
      
      // Get channel if specified
      const channel = task.channel_id ? await this.client.channels.fetch(task.channel_id) : null;
      
      // Execute command based on type
      switch (task.command) {
        case 'scan':
          await this.executeScanTask(channel);
          break;
          
        case 'speedtest':
          await this.executeSpeedtestTask(channel);
          break;
          
        case 'weather':
          await this.executeWeatherTask(channel);
          break;
          
        default:
          console.warn(`Unknown command: ${task.command}`);
      }
      
      console.log(`✅ Task completed: ${task.name}`);
    } catch (error) {
      console.error(`❌ Task failed: ${task.name}`, error);
    }
  }
  
  // Execute network scan task
  async executeScanTask(channel) {
    try {
      // Import network-management plugin
      const { scanNetwork } = await import('./network-management/commands.js');
      const result = await scanNetwork();
      
      if (channel) {
        await channel.send(`🔍 Scheduled network scan complete: ${result.count} devices found`);
      }
    } catch (error) {
      console.error('Scan task error:', error);
      if (channel) {
        await channel.send(`❌ Scheduled scan failed: ${error.message}`);
      }
    }
  }
  
  // Execute speedtest task
  async executeSpeedtestTask(channel) {
    try {
      // Import speedtest function from integrations plugin
      const { runSpeedtest } = await import('./integrations/speedtest/commands.js');
      const result = await runSpeedtest();
      
      if (channel) {
        await channel.send({
          embeds: [{
            color: 0xFF6B6B,
            title: '🚀 Scheduled Speed Test',
            fields: [
              { name: '⬇️ Download', value: `${result.download} Mbps`, inline: true },
              { name: '⬆️ Upload', value: `${result.upload} Mbps`, inline: true },
              { name: '📡 Ping', value: `${result.ping} ms`, inline: true }
            ],
            timestamp: new Date()
          }]
        });
      }
    } catch (error) {
      console.error('Speedtest task error:', error);
      if (channel) {
        await channel.send(`❌ Scheduled speedtest failed: ${error.message}`);
      }
    }
  }
  
  // Execute weather task
  async executeWeatherTask(channel) {
    try {
      // Import weather function from integrations plugin
      const { getWeather } = await import('./integrations/weather/commands.js');
      const result = await getWeather();
      
      if (channel) {
        await channel.send({
          embeds: [{
            color: 0x87CEEB,
            title: '🌤️ Scheduled Weather Update',
            fields: [
              { name: '🌡️ Temperature', value: `${result.temp}°C`, inline: true },
              { name: '☁️ Conditions', value: result.description, inline: true }
            ],
            timestamp: new Date()
          }]
        });
      }
    } catch (error) {
      console.error('Weather task error:', error);
      if (channel) {
        await channel.send(`❌ Scheduled weather update failed: ${error.message}`);
      }
    }
  }
  
  // Stop a scheduled task
  stopTask(taskId) {
    if (this.activeTasks.has(taskId)) {
      this.activeTasks.get(taskId).stop();
      this.activeTasks.delete(taskId);
      console.log(`✅ Stopped task: ${taskId}`);
      return true;
    }
    return false;
  }
  
  // Get active tasks
  getActiveTasks() {
    return Array.from(this.activeTasks.keys());
  }
}
