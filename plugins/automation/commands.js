/**
 * Automation Commands
 * 
 * Handles task scheduling and automation management.
 */

import { SlashCommandSubcommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';
import { taskOps } from '../../src/database/db.js';
import { checkUserPermission } from '../../src/core/permission-manager.js';
import { PERMISSIONS } from '../../src/auth/auth.js';

// This plugin provides subcommands for /automation command
// Note: /automation already has subcommands from other plugins (health, devicetrigger, speedalert)
// We're adding the 'schedule' subcommand
export const parentCommand = 'automation';

// Single subcommand for schedule management
export const commandGroup = new SlashCommandSubcommandBuilder()
  .setName('schedule')
  .setDescription('Manage scheduled tasks')
  .addStringOption(option =>
    option.setName('action')
      .setDescription('Action to perform')
      .setRequired(true)
      .addChoices(
        { name: 'List tasks', value: 'list' },
        { name: 'Add task', value: 'add' },
        { name: 'Toggle task', value: 'toggle' },
        { name: 'Delete task', value: 'delete' }
      ))
  .addStringOption(option =>
    option.setName('name')
      .setDescription('Task name (for add/toggle/delete)')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('command')
      .setDescription('Command to run (for add)')
      .setRequired(false)
      .addChoices(
        { name: 'Network Scan', value: 'scan' },
        { name: 'Speed Test', value: 'speedtest' },
        { name: 'Weather Update', value: 'weather' }
      ))
  .addStringOption(option =>
    option.setName('cron')
      .setDescription('Cron expression (for add, e.g., "0 */6 * * *" for every 6 hours)')
      .setRequired(false))
  .addChannelOption(option =>
    option.setName('channel')
      .setDescription('Channel for notifications (for add)')
      .setRequired(false));

/**
 * Handle automation schedule command
 */
export async function handleCommand(interaction, commandName, subcommand) {
  if (commandName !== 'automation' || subcommand !== 'schedule') return false;

  try {
    const action = interaction.options.getString('action');
    
    switch (action) {
      case 'list':
        return await handleListTasks(interaction);
      case 'add':
        return await handleAddTask(interaction);
      case 'toggle':
        return await handleToggleTask(interaction);
      case 'delete':
        return await handleDeleteTask(interaction);
      default:
        await interaction.reply({
          content: '❌ Unknown action!',
          ephemeral: true
        });
        return true;
    }
  } catch (error) {
    logger.error('Schedule command error:', error);
    await interaction.reply({
      content: `❌ Failed to manage schedule: ${error.message}`,
      ephemeral: true
    });
    return true;
  }
}

/**
 * List all scheduled tasks
 */
async function handleListTasks(interaction) {
  const tasks = taskOps.getAll();
  
  if (tasks.length === 0) {
    await interaction.reply('⏰ No scheduled tasks yet!');
    return true;
  }
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('⏰ Scheduled Tasks')
    .setDescription(`Total: **${tasks.length}** task(s)`)
    .setTimestamp();
  
  for (const task of tasks.slice(0, 10)) {
    const status = task.enabled ? '🟢 Active' : '🔴 Disabled';
    const lastRun = task.last_run ? new Date(task.last_run).toLocaleString() : 'Never';
    
    embed.addFields({
      name: `${status} ${task.name}`,
      value: `Command: \`${task.command}\`\nSchedule: \`${task.cron_expression}\`\nLast run: ${lastRun}`,
      inline: false
    });
  }
  
  if (tasks.length > 10) {
    embed.setFooter({ text: `Showing 10 of ${tasks.length} tasks` });
  }
  
  await interaction.reply({ embeds: [embed] });
  return true;
}

/**
 * Add a new scheduled task
 */
async function handleAddTask(interaction) {
  // Check admin permission
  const hasPermission = await checkUserPermission(interaction.user.id, PERMISSIONS.ADMIN);
  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You need admin permission to add scheduled tasks!',
      ephemeral: true
    });
    return true;
  }
  
  const name = interaction.options.getString('name');
  const command = interaction.options.getString('command');
  const cron = interaction.options.getString('cron');
  const channel = interaction.options.getChannel('channel');
  
  if (!name || !command || !cron) {
    await interaction.reply({
      content: '❌ Please provide name, command, and cron expression!',
      ephemeral: true
    });
    return true;
  }
  
  // Validate cron expression
  const cronLib = await import('node-cron');
  if (!cronLib.default.validate(cron)) {
    await interaction.reply({
      content: `❌ Invalid cron expression: \`${cron}\`\n\nExample: \`0 */6 * * *\` (every 6 hours)`,
      ephemeral: true
    });
    return true;
  }
  
  // Add task to database
  const taskId = taskOps.add({
    name,
    command,
    cron_expression: cron,
    channel_id: channel?.id || null,
    enabled: true
  });
  
  // Schedule the task
  try {
    const { getPlugin } = await import('../../src/core/plugin-system.js');
    const automationPlugin = getPlugin('automation');
    
    if (automationPlugin) {
      const task = taskOps.get(taskId);
      automationPlugin.scheduleTask(task);
    }
  } catch (error) {
    logger.error('Failed to schedule task:', error);
  }
  
  const embed = new EmbedBuilder()
    .setColor('#90EE90')
    .setTitle('✅ Task Added!')
    .setDescription(`Scheduled task **${name}** has been created`)
    .addFields(
      { name: 'Command', value: command, inline: true },
      { name: 'Schedule', value: `\`${cron}\``, inline: true },
      { name: 'Channel', value: channel ? `<#${channel.id}>` : 'None', inline: true }
    )
    .setFooter({ text: 'Task is now active' })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
  return true;
}

/**
 * Toggle a task on/off
 */
async function handleToggleTask(interaction) {
  // Check admin permission
  const hasPermission = await checkUserPermission(interaction.user.id, PERMISSIONS.ADMIN);
  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You need admin permission to toggle scheduled tasks!',
      ephemeral: true
    });
    return true;
  }
  
  const name = interaction.options.getString('name');
  
  if (!name) {
    await interaction.reply({
      content: '❌ Please provide the task name!',
      ephemeral: true
    });
    return true;
  }
  
  const tasks = taskOps.getAll();
  const task = tasks.find(t => t.name.toLowerCase() === name.toLowerCase());
  
  if (!task) {
    await interaction.reply({
      content: `❌ Task "${name}" not found!`,
      ephemeral: true
    });
    return true;
  }
  
  // Toggle task
  const newState = !task.enabled;
  taskOps.toggle(task.id);
  
  // Update scheduler
  try {
    const { getPlugin } = await import('../../src/core/plugin-system.js');
    const automationPlugin = getPlugin('automation');
    
    if (automationPlugin) {
      if (newState) {
        const updatedTask = taskOps.get(task.id);
        automationPlugin.scheduleTask(updatedTask);
      } else {
        automationPlugin.stopTask(task.id);
      }
    }
  } catch (error) {
    logger.error('Failed to update task:', error);
  }
  
  const status = newState ? '🟢 Enabled' : '🔴 Disabled';
  
  await interaction.reply({
    content: `${status} Task **${task.name}** has been ${newState ? 'enabled' : 'disabled'}!`,
    ephemeral: false
  });
  return true;
}

/**
 * Delete a scheduled task
 */
async function handleDeleteTask(interaction) {
  // Check admin permission
  const hasPermission = await checkUserPermission(interaction.user.id, PERMISSIONS.ADMIN);
  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You need admin permission to delete scheduled tasks!',
      ephemeral: true
    });
    return true;
  }
  
  const name = interaction.options.getString('name');
  
  if (!name) {
    await interaction.reply({
      content: '❌ Please provide the task name!',
      ephemeral: true
    });
    return true;
  }
  
  const tasks = taskOps.getAll();
  const task = tasks.find(t => t.name.toLowerCase() === name.toLowerCase());
  
  if (!task) {
    await interaction.reply({
      content: `❌ Task "${name}" not found!`,
      ephemeral: true
    });
    return true;
  }
  
  // Stop task if running
  try {
    const { getPlugin } = await import('../../src/core/plugin-system.js');

const logger = createLogger('automation');
    const automationPlugin = getPlugin('automation');
    
    if (automationPlugin) {
      automationPlugin.stopTask(task.id);
    }
  } catch (error) {
    logger.error('Failed to stop task:', error);
  }
  
  // Delete from database
  taskOps.delete(task.id);
  
  await interaction.reply({
    content: `✅ Task **${task.name}** has been deleted!`,
    ephemeral: false
  });
  return true;
}
