import cron from 'node-cron';
import { taskOps } from '../../src/database/db.js';

const activeTasks = new Map();

// Initialize scheduler
export function initScheduler(client, handlers) {
  console.log('⏰ Initializing task scheduler...');
  
  const tasks = taskOps.getEnabled();
  
  for (const task of tasks) {
    scheduleTask(client, task, handlers);
  }
  
  console.log(`✅ Scheduled ${tasks.length} tasks`);
}

// Schedule a single task
export function scheduleTask(client, task, handlers) {
  try {
    // Validate cron expression
    if (!cron.validate(task.cron_expression)) {
      console.error(`❌ Invalid cron expression for task ${task.name}: ${task.cron_expression}`);
      return false;
    }

    // Stop existing task if running
    if (activeTasks.has(task.id)) {
      activeTasks.get(task.id).stop();
    }

    // Create new scheduled task
    const scheduledTask = cron.schedule(task.cron_expression, async () => {
      console.log(`⏰ Running scheduled task: ${task.name}`);
      
      try {
        // Update last run time
        taskOps.updateLastRun(task.id);
        
        // Get channel if specified
        const channel = task.channel_id ? await client.channels.fetch(task.channel_id) : null;
        
        // Execute command
        switch (task.command) {
          case 'scan':
            if (handlers.scan) {
              const result = await handlers.scan();
              if (channel) {
                await channel.send(`🔍 Scheduled network scan complete: ${result.devices.length} devices found`);
              }
            }
            break;
            
          case 'speedtest':
            if (handlers.speedtest) {
              const result = await handlers.speedtest();
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
            }
            break;
            
          case 'weather':
            if (handlers.weather) {
              const result = await handlers.weather();
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
            }
            break;
            
          default:
            console.warn(`Unknown command: ${task.command}`);
        }
        
        console.log(`✅ Task completed: ${task.name}`);
      } catch (error) {
        console.error(`❌ Task failed: ${task.name}`, error);
        if (channel) {
          await channel.send(`❌ Scheduled task "${task.name}" failed: ${error.message}`);
        }
      }
    });

    activeTasks.set(task.id, scheduledTask);
    console.log(`✅ Scheduled task: ${task.name} (${task.cron_expression})`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to schedule task ${task.name}:`, error);
    return false;
  }
}

// Stop a task
export function stopTask(taskId) {
  if (activeTasks.has(taskId)) {
    activeTasks.get(taskId).stop();
    activeTasks.delete(taskId);
    return true;
  }
  return false;
}

// Restart a task
export function restartTask(client, taskId, handlers) {
  stopTask(taskId);
  const task = taskOps.getAll().find(t => t.id === taskId);
  if (task && task.enabled) {
    return scheduleTask(client, task, handlers);
  }
  return false;
}

// Get active tasks
export function getActiveTasks() {
  return Array.from(activeTasks.keys());
}

// Common cron patterns
export const cronPatterns = {
  everyMinute: '* * * * *',
  every5Minutes: '*/5 * * * *',
  every15Minutes: '*/15 * * * *',
  every30Minutes: '*/30 * * * *',
  everyHour: '0 * * * *',
  every6Hours: '0 */6 * * *',
  every12Hours: '0 */12 * * *',
  daily: '0 0 * * *',
  dailyAt9AM: '0 9 * * *',
  weeklyMonday: '0 0 * * 1',
  monthlyFirst: '0 0 1 * *'
};
