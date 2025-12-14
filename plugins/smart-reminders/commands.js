import { SlashCommandSubcommandGroupBuilder } from 'discord.js';

/**
 * Smart Reminders Plugin Commands - Simplified with queued loading
 * 10 subcommands → 5 subcommands
 */

// Reminder types registry
const REMINDER_TYPES = {
  time: { name: 'One-time', emoji: '⏰', description: 'Remind at a specific time' },
  recurring: { name: 'Recurring', emoji: '🔄', description: 'Repeat at intervals' },
  presence: { name: 'Presence', emoji: '📡', description: 'When device comes online' },
  automation: { name: 'Automation', emoji: '⚙️', description: 'Trigger actions' }
};

export const commandGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('reminder')
  .setDescription('Smart reminder & automation system')
  // Create a reminder (unified)
  .addSubcommand(subcommand =>
    subcommand
      .setName('create')
      .setDescription('Create a reminder')
      .addStringOption(option =>
        option.setName('type')
          .setDescription('Reminder type')
          .setRequired(true)
          .addChoices(
            { name: '⏰ One-time - Remind at a specific time', value: 'time' },
            { name: '🔄 Recurring - Repeat at intervals', value: 'recurring' },
            { name: '📡 Presence - When device comes online', value: 'presence' },
            { name: '⚙️ Automation - Trigger actions', value: 'automation' }
          ))
      .addStringOption(option =>
        option.setName('message')
          .setDescription('What to remind about')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('when')
          .setDescription('When/interval (e.g., 5m, 2h, 1d, 18:00)')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('name')
          .setDescription('Reminder name'))
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Send to channel (default: DM)'))
      .addStringOption(option =>
        option.setName('device')
          .setDescription('Device for presence reminders')
          .setAutocomplete(true))
      .addStringOption(option =>
        option.setName('action')
          .setDescription('Action for automations')
          .addChoices(
            { name: 'Home Assistant', value: 'homeassistant' },
            { name: 'Wake-on-LAN', value: 'wol' },
            { name: 'Network Scan', value: 'scan' },
            { name: 'Speed Test', value: 'speedtest' }
          ))
      .addBooleanOption(option =>
        option.setName('ai_variation')
          .setDescription('Use AI to vary recurring messages')))
  // Create for someone else
  .addSubcommand(subcommand =>
    subcommand
      .setName('for')
      .setDescription('Create reminder for someone else')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('Who to remind')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('message')
          .setDescription('What to remind them about')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('when')
          .setDescription('When to remind (e.g., 5m, 2h, 18:00)')
          .setRequired(true))
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Send to channel (default: DM)')))
  // List reminders
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List your reminders'))
  // Manage a reminder
  .addSubcommand(subcommand =>
    subcommand
      .setName('manage')
      .setDescription('Manage a reminder')
      .addStringOption(option =>
        option.setName('reminder')
          .setDescription('Reminder to manage')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(option =>
        option.setName('action')
          .setDescription('What to do')
          .setRequired(true)
          .addChoices(
            { name: '🗑️ Delete', value: 'delete' },
            { name: '✅ Enable', value: 'enable' },
            { name: '⏸️ Disable', value: 'disable' },
            { name: '⏰ Snooze 10m', value: 'snooze10' },
            { name: '⏰ Snooze 1h', value: 'snooze60' },
            { name: '⏰ Snooze 1d', value: 'snooze1440' }
          )))
  // Quick snooze
  .addSubcommand(subcommand =>
    subcommand
      .setName('snooze')
      .setDescription('Snooze a reminder')
      .addStringOption(option =>
        option.setName('reminder')
          .setDescription('Reminder to snooze')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(option =>
        option.setName('duration')
          .setDescription('How long to snooze (e.g., 10m, 1h)')
          .setRequired(true)));

export const parentCommand = 'bot';

export async function handleCommand(interaction, plugin) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'create':
      return await handleCreate(interaction, plugin);
    case 'for':
      return await handleFor(interaction, plugin);
    case 'list':
      return await handleList(interaction, plugin);
    case 'manage':
      return await handleManage(interaction, plugin);
    case 'snooze':
      return await handleSnooze(interaction, plugin);
    default:
      await interaction.reply('Unknown subcommand');
  }
}

export async function handleAutocomplete(interaction, plugin) {
  const focusedOption = interaction.options.getFocused(true);
  
  if (focusedOption.name === 'device') {
    const { getDeviceAutocomplete } = await import('../../src/utils/autocomplete-helpers.js');
    const choices = getDeviceAutocomplete(focusedOption.value);
    await interaction.respond(choices);
  } else if (focusedOption.name === 'reminder') {
    const reminders = await plugin.listReminders(interaction.user.id);
    const focusedValue = focusedOption.value.toLowerCase();
    
    const filtered = reminders
      .filter(r => !focusedValue || r.name.toLowerCase().includes(focusedValue) || r.message.toLowerCase().includes(focusedValue))
      .slice(0, 25)
      .map(r => ({
        name: `${r.active ? '✅' : '⚠️'} ${r.name || r.message.substring(0, 50)} (${r.type})`,
        value: r.id
      }));
    
    await interaction.respond(filtered);
  }
}

// Helper: Parse time string
function parseTimeString(timeStr) {
  const now = Date.now();
  
  if (timeStr.includes(':')) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const targetTime = new Date();
    targetTime.setHours(hours, minutes, 0, 0);
    if (targetTime.getTime() < now) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    return targetTime.getTime();
  }
  
  const value = parseInt(timeStr);
  const unit = timeStr.slice(-1);
  
  let ms = 0;
  if (unit === 'm') ms = value * 60 * 1000;
  else if (unit === 'h') ms = value * 60 * 60 * 1000;
  else if (unit === 'd') ms = value * 24 * 60 * 60 * 1000;
  
  return now + ms;
}

async function handleCreate(interaction, plugin) {
  await interaction.deferReply();
  
  const type = interaction.options.getString('type');
  const message = interaction.options.getString('message');
  const when = interaction.options.getString('when');
  const name = interaction.options.getString('name') || message.substring(0, 30);
  const channel = interaction.options.getChannel('channel');
  const deviceMac = interaction.options.getString('device');
  const actionType = interaction.options.getString('action');
  const aiVariation = interaction.options.getBoolean('ai_variation') || false;
  
  try {
    let reminderData = {
      name,
      message,
      type,
      target: channel ? 'channel' : 'dm',
      userId: interaction.user.id,
      channelId: channel?.id,
      aiVariation
    };
    
    if (type === 'time') {
      reminderData.triggerTime = parseTimeString(when);
    } else if (type === 'recurring') {
      reminderData.interval = when;
    } else if (type === 'presence') {
      if (!deviceMac) {
        await interaction.editReply('❌ Device is required for presence reminders!');
        return;
      }
      reminderData.deviceMac = deviceMac;
    } else if (type === 'automation') {
      reminderData.triggerTime = parseTimeString(when);
      reminderData.target = 'automation';
      reminderData.actions = [];
      
      if (actionType === 'wol' && deviceMac) {
        reminderData.actions.push({ type: 'wol', mac: deviceMac });
      } else if (actionType === 'scan') {
        reminderData.actions.push({ type: 'scan' });
      } else if (actionType === 'speedtest') {
        reminderData.actions.push({ type: 'speedtest' });
      }
    }
    
    const reminder = await plugin.addReminder(reminderData);
    
    const typeInfo = REMINDER_TYPES[type];
    let whenText = type === 'recurring' ? `Every ${when}` : 
                   type === 'presence' ? 'When device online' :
                   new Date(reminderData.triggerTime).toLocaleString();
    
    await interaction.editReply({
      embeds: [{
        color: 0x00FF00,
        title: `${typeInfo.emoji} ${typeInfo.name} Reminder Created`,
        fields: [
          { name: 'Name', value: name, inline: true },
          { name: 'When', value: whenText, inline: true },
          { name: 'Where', value: channel ? `<#${channel.id}>` : 'DM', inline: true },
          { name: 'Message', value: message.substring(0, 200), inline: false },
          { name: 'ID', value: reminder.id, inline: true }
        ],
        timestamp: new Date()
      }]
    });
  } catch (error) {
    await interaction.editReply(`❌ Failed to create reminder: ${error.message}`);
  }
}

async function handleFor(interaction, plugin) {
  await interaction.deferReply();
  
  const targetUser = interaction.options.getUser('user');
  const message = interaction.options.getString('message');
  const when = interaction.options.getString('when');
  const channel = interaction.options.getChannel('channel');
  const name = `Reminder for ${targetUser.username}`;
  
  try {
    const triggerTime = parseTimeString(when);
    
    const reminder = await plugin.addReminder({
      name,
      message,
      type: 'time',
      target: channel ? 'channel' : 'user',
      userId: interaction.user.id,
      targetUserId: targetUser.id,
      channelId: channel?.id,
      triggerTime
    });
    
    await interaction.editReply({
      embeds: [{
        color: 0x00FF00,
        title: '✅ Reminder Created',
        fields: [
          { name: 'For', value: `<@${targetUser.id}>`, inline: true },
          { name: 'When', value: new Date(triggerTime).toLocaleString(), inline: true },
          { name: 'Where', value: channel ? `<#${channel.id}>` : 'DM', inline: true },
          { name: 'Message', value: message, inline: false }
        ],
        footer: { text: `Created by ${interaction.user.username}` },
        timestamp: new Date()
      }]
    });
  } catch (error) {
    await interaction.editReply(`❌ Failed to create reminder: ${error.message}`);
  }
}

async function handleList(interaction, plugin) {
  await interaction.deferReply();
  
  const reminders = await plugin.listReminders(interaction.user.id);
  
  if (reminders.length === 0) {
    await interaction.editReply('📋 No reminders found. Use `/bot reminder create` to make one.');
    return;
  }
  
  const active = reminders.filter(r => r.active);
  
  const description = active.map(r => {
    const typeInfo = REMINDER_TYPES[r.type] || { emoji: '📌' };
    let when = '';
    
    if (r.type === 'time') when = `at ${new Date(r.triggerTime).toLocaleString()}`;
    else if (r.type === 'recurring') when = `every ${r.interval}`;
    else if (r.type === 'presence') when = 'when device online';
    else if (r.type === 'automation') when = `at ${new Date(r.triggerTime).toLocaleString()}`;
    
    return `${typeInfo.emoji} **${r.name}**\n   ${r.message.substring(0, 50)}\n   ${when} | ID: \`${r.id}\``;
  }).join('\n\n');
  
  await interaction.editReply({
    embeds: [{
      color: 0x00AAFF,
      title: '⏰ Your Reminders',
      description: description || 'No active reminders',
      footer: { text: `${active.length} active reminder(s)` }
    }]
  });
}

async function handleManage(interaction, plugin) {
  await interaction.deferReply();
  
  const reminderId = interaction.options.getString('reminder');
  const action = interaction.options.getString('action');
  
  try {
    if (action === 'delete') {
      const removed = await plugin.removeReminder(reminderId);
      await interaction.editReply({
        embeds: [{
          color: 0xFF0000,
          title: '🗑️ Reminder Deleted',
          description: `Removed: **${removed.name}**`
        }]
      });
    } else if (action === 'enable' || action === 'disable') {
      const reminder = await plugin.toggleReminder(reminderId, action === 'enable');
      await interaction.editReply({
        embeds: [{
          color: action === 'enable' ? 0x00FF00 : 0xFFA500,
          title: action === 'enable' ? '✅ Reminder Enabled' : '⏸️ Reminder Disabled',
          description: `**${reminder.name}** is now ${action === 'enable' ? 'enabled' : 'disabled'}`
        }]
      });
    } else if (action.startsWith('snooze')) {
      const minutes = parseInt(action.replace('snooze', ''));
      const ms = minutes * 60 * 1000;
      const reminder = await plugin.snoozeReminder(reminderId, ms);
      await interaction.editReply({
        embeds: [{
          color: 0xFFA500,
          title: '⏰ Reminder Snoozed',
          description: `**${reminder.name}** snoozed until ${new Date(reminder.triggerTime).toLocaleString()}`
        }]
      });
    }
  } catch (error) {
    await interaction.editReply(`❌ Failed: ${error.message}`);
  }
}

async function handleSnooze(interaction, plugin) {
  await interaction.deferReply();
  
  const reminderId = interaction.options.getString('reminder');
  const durationStr = interaction.options.getString('duration');
  
  try {
    const value = parseInt(durationStr);
    const unit = durationStr.slice(-1);
    
    let ms = 0;
    if (unit === 'm') ms = value * 60 * 1000;
    else if (unit === 'h') ms = value * 60 * 60 * 1000;
    else if (unit === 'd') ms = value * 24 * 60 * 60 * 1000;
    
    const reminder = await plugin.snoozeReminder(reminderId, ms);
    
    await interaction.editReply({
      embeds: [{
        color: 0xFFA500,
        title: '⏰ Reminder Snoozed',
        description: `**${reminder.name}** snoozed until ${new Date(reminder.triggerTime).toLocaleString()}`,
        fields: [
          { name: 'Snoozes Left', value: `${reminder.maxSnoozes - reminder.snoozeCount}`, inline: true }
        ]
      }]
    });
  } catch (error) {
    await interaction.editReply(`❌ Failed to snooze: ${error.message}`);
  }
}
