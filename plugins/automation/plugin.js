import { Plugin } from '../../src/core/plugin-system.js';
import { createLogger } from '../../src/logging/logger.js';
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
    super('automation', '1.0.0', 'Task scheduling and automation system', {
      optionalDependencies: ['integrations/speedtest', 'integrations/weather'],
      category: 'automation',
      author: 'Discord Maid Bot',
      keywords: ['scheduler', 'cron', 'tasks', 'automation']
    });
    this.logger = createLogger('automation');
    this.activeTasks = new Map();
    this.client = null;
  }
  
  async onLoad() {
    this.logger.info('⏰ Automation plugin loaded');
    this.logger.info('   Features: Scheduler, Triggers, Alerts');
  }
  
  async onUnload() {
    this.logger.info('⏰ Stopping all scheduled tasks...');
    // Stop all active tasks
    for (const [taskId, task] of this.activeTasks) {
      task.stop();
    }
    this.activeTasks.clear();
    this.logger.info('⏰ Automation plugin unloaded');
  }
  
  setClient(client) {
    this.client = client;
    this.initScheduler();
  }
  
  // Initialize scheduler with saved tasks
  initScheduler() {
    if (!this.client) {
      this.logger.warn('⚠️  Client not set, cannot initialize scheduler');
      return;
    }
    
    this.logger.info('⏰ Initializing task scheduler...');
    const tasks = taskOps.getEnabled();
    
    for (const task of tasks) {
      this.scheduleTask(task);
    }
    
    this.logger.info(`✅ Scheduled ${tasks.length} tasks`);
  }
  
  // Schedule a single task
  scheduleTask(task) {
    try {
      // Validate cron expression
      if (!cron.validate(task.cron_expression)) {
        this.logger.error(`❌ Invalid cron expression for task ${task.name}: ${task.cron_expression}`);
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
      this.logger.info(`✅ Scheduled task: ${task.name} (${task.cron_expression})`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to schedule task ${task.name}:`, error);
      return false;
    }
  }
  
  // Execute a scheduled task
  async executeTask(task) {
    this.logger.info(`⏰ Running scheduled task: ${task.name}`);
    
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
          this.logger.warn(`Unknown command: ${task.command}`);
      }
      
      this.logger.info(`✅ Task completed: ${task.name}`);
    } catch (error) {
      this.logger.error(`❌ Task failed: ${task.name}`, error);
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
      this.logger.error('Scan task error:', error);
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
      this.logger.error('Speedtest task error:', error);
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
      this.logger.error('Weather task error:', error);
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
      this.logger.info(`✅ Stopped task: ${taskId}`);
      return true;
    }
    return false;
  }
  
  // Get active tasks
  getActiveTasks() {
    return Array.from(this.activeTasks.keys());
  }
}
