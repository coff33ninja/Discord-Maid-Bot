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
  // Create for someone else (with optional actions)
  .addSubcommand(subcommand =>
    subcommand
      .setName('for')
      .setDescription('Create reminder for someone else (with optional actions)')
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
          .setDescription('Send to channel (default: DM)'))
      .addStringOption(option =>
        option.setName('action')
          .setDescription('Action to trigger with reminder')
          .addChoices(
            { name: '⚡ Wake-on-LAN - Wake a device', value: 'wol' },
            { name: '🏠 Home Assistant - Control smart home', value: 'homeassistant' },
            { name: '🎮 Start Game - Launch a game server', value: 'game' },
            { name: '📡 Network Scan', value: 'scan' },
            { name: '🚀 Speed Test', value: 'speedtest' }
          ))
      .addStringOption(option =>
        option.setName('device')
          .setDescription('Device for WOL action')
          .setAutocomplete(true))
      .addStringOption(option =>
        option.setName('entity')
          .setDescription('Home Assistant entity (e.g., light.bedroom)')
          .setAutocomplete(true)))
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
  } else if (focusedOption.name === 'entity') {
    // Home Assistant entity autocomplete
    try {
      const { getPlugin } = await import('../../src/core/plugin-system.js');
      const integrationsPlugin = getPlugin('integrations');
      
      if (integrationsPlugin?.homeassistant) {
        const entities = await integrationsPlugin.homeassistant.getEntities();
        const focusedValue = focusedOption.value.toLowerCase();
        
        const filtered = entities
          .filter(e => {
            const name = e.attributes?.friendly_name?.toLowerCase() || '';
            const id = e.entity_id.toLowerCase();
            return !focusedValue || name.includes(focusedValue) || id.includes(focusedValue);
          })
          .slice(0, 25)
          .map(e => ({
            name: `${e.attributes?.friendly_name || e.entity_id} (${e.entity_id.split('.')[0]})`,
            value: e.entity_id
          }));
        
        await interaction.respond(filtered);
        return;
      }
    } catch (error) {
      // HA not available
    }
    await interaction.respond([]);
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

// Helper: Parse time string with improved flexibility
function parseTimeString(timeStr) {
  if (!timeStr) return null;
  
  const now = Date.now();
  const clean = timeStr.toLowerCase().trim();
  
  // Handle relative words
  if (clean === 'tomorrow') {
    const target = new Date();
    target.setDate(target.getDate() + 1);
    target.setHours(9, 0, 0, 0);
    return target.getTime();
  }
  
  if (clean === 'tonight') {
    const target = new Date();
    target.setHours(20, 0, 0, 0);
    if (target.getTime() < now) target.setDate(target.getDate() + 1);
    return target.getTime();
  }
  
  if (clean === 'noon') {
    const target = new Date();
    target.setHours(12, 0, 0, 0);
    if (target.getTime() < now) target.setDate(target.getDate() + 1);
    return target.getTime();
  }
  
  // Handle 24-hour format: "15:00", "9:30"
  if (/^\d{1,2}:\d{2}$/.test(clean)) {
    const [hours, minutes] = clean.split(':').map(Number);
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() < now) target.setDate(target.getDate() + 1);
    return target.getTime();
  }
  
  // Handle 12-hour format: "3pm", "3:30pm", "3 pm"
  const match12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match12) {
    let hours = parseInt(match12[1]);
    const minutes = match12[2] ? parseInt(match12[2]) : 0;
    const period = match12[3];
    
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() < now) target.setDate(target.getDate() + 1);
    return target.getTime();
  }
  
  // Handle duration: "5m", "2h", "1d", "30min", "2 hours"
  const durationMatch = clean.match(/^(\d+)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?|d|days?|w|weeks?)$/);
  if (durationMatch) {
    const value = parseInt(durationMatch[1]);
    const unit = durationMatch[2].charAt(0);
    
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
    return now + (value * multipliers[unit]);
  }
  
  // Fallback: try to parse as number with last char as unit
  const value = parseInt(clean);
  const unit = clean.slice(-1);
  if (!isNaN(value) && ['m', 'h', 'd', 'w'].includes(unit)) {
    const multipliers = { m: 60000, h: 3600000, d: 86400000, w: 604800000 };
    return now + (value * multipliers[unit]);
  }
  
  return null;
}

// Helper: Parse interval string for recurring reminders
function parseIntervalString(intervalStr) {
  if (!intervalStr) return null;
  
  const clean = intervalStr.toLowerCase().trim();
  
  // Handle word intervals
  const wordIntervals = {
    'hourly': '1h',
    'daily': '1d',
    'weekly': '1w',
    'every hour': '1h',
    'every day': '1d',
    'every week': '1w',
    'morning': '1d',
    'night': '1d',
    'evening': '1d'
  };
  
  if (wordIntervals[clean]) return wordIntervals[clean];
  
  // Handle "every X" format
  const everyMatch = clean.match(/^every\s+(\d+)\s*(m|min|minutes?|h|hr|hours?|d|days?|w|weeks?)$/);
  if (everyMatch) {
    const value = everyMatch[1];
    const unit = everyMatch[2].charAt(0);
    return `${value}${unit}`;
  }
  
  // Handle direct format: "1h", "30m", "1d"
  if (/^\d+[mhdw]$/.test(clean)) return clean;
  
  return intervalStr; // Return as-is if can't parse
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
      const triggerTime = parseTimeString(when);
      if (!triggerTime) {
        await interaction.editReply({
          content: `❌ Couldn't parse time "${when}". Try formats like:\n` +
            `• \`5m\` or \`30min\` - in 5 minutes / 30 minutes\n` +
            `• \`2h\` or \`2 hours\` - in 2 hours\n` +
            `• \`1d\` - in 1 day\n` +
            `• \`3pm\` or \`15:00\` - at 3 PM\n` +
            `• \`tomorrow\` or \`tonight\``,
          ephemeral: true
        });
        return;
      }
      reminderData.triggerTime = triggerTime;
    } else if (type === 'recurring') {
      reminderData.interval = parseIntervalString(when);
    } else if (type === 'presence') {
      if (!deviceMac) {
        await interaction.editReply('❌ Device is required for presence reminders!');
        return;
      }
      reminderData.deviceMac = deviceMac;
    } else if (type === 'automation') {
      const triggerTime = parseTimeString(when);
      if (!triggerTime) {
        await interaction.editReply({
          content: `❌ Couldn't parse time "${when}". Try formats like \`5m\`, \`2h\`, \`3pm\`, \`15:00\``,
          ephemeral: true
        });
        return;
      }
      reminderData.triggerTime = triggerTime;
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
  const actionType = interaction.options.getString('action');
  const deviceMac = interaction.options.getString('device');
  const entityId = interaction.options.getString('entity');
  const name = `Reminder for ${targetUser.username}`;
  
  try {
    const triggerTime = parseTimeString(when);
    
    if (!triggerTime) {
      await interaction.editReply({
        content: `❌ Couldn't parse time "${when}". Try formats like:\n` +
          `• \`5m\`, \`30min\`, \`2h\`, \`1d\`\n` +
          `• \`3pm\`, \`15:00\`\n` +
          `• \`tomorrow\`, \`tonight\``,
        ephemeral: true
      });
      return;
    }
    
    // Build actions array if action type specified
    const actions = [];
    if (actionType) {
      switch (actionType) {
        case 'wol':
          if (deviceMac) {
            actions.push({ type: 'wol', mac: deviceMac });
          } else {
            await interaction.editReply({
              content: '❌ Please specify a device for Wake-on-LAN action',
              ephemeral: true
            });
            return;
          }
          break;
        case 'homeassistant':
          if (entityId) {
            actions.push({ 
              type: 'homeassistant', 
              service: 'homeassistant.toggle',
              entityId: entityId 
            });
          } else {
            await interaction.editReply({
              content: '❌ Please specify an entity for Home Assistant action',
              ephemeral: true
            });
            return;
          }
          break;
        case 'game':
          actions.push({ type: 'game', action: 'start' });
          break;
        case 'scan':
          actions.push({ type: 'scan' });
          break;
        case 'speedtest':
          actions.push({ type: 'speedtest' });
          break;
      }
    }
    
    const hasActions = actions.length > 0;
    
    const reminder = await plugin.addReminder({
      name,
      message,
      type: hasActions ? 'automation' : 'time',
      target: hasActions ? 'automation' : (channel ? 'channel' : 'user'),
      userId: interaction.user.id,
      targetUserId: targetUser.id,
      channelId: channel?.id,
      triggerTime,
      actions: hasActions ? actions : undefined
    });
    
    // Build response fields
    const fields = [
      { name: 'For', value: `<@${targetUser.id}>`, inline: true },
      { name: 'When', value: new Date(triggerTime).toLocaleString(), inline: true },
      { name: 'Where', value: channel ? `<#${channel.id}>` : 'DM', inline: true },
      { name: 'Message', value: message, inline: false }
    ];
    
    if (hasActions) {
      const actionNames = actions.map(a => {
        if (a.type === 'wol') return `⚡ Wake device`;
        if (a.type === 'homeassistant') return `🏠 ${entityId}`;
        if (a.type === 'game') return `🎮 Start game`;
        if (a.type === 'scan') return `📡 Network scan`;
        if (a.type === 'speedtest') return `🚀 Speed test`;
        return a.type;
      });
      fields.push({ name: 'Actions', value: actionNames.join(', '), inline: false });
    }
    
    await interaction.editReply({
      embeds: [{
        color: hasActions ? 0x9B59B6 : 0x00FF00,
        title: hasActions ? '⚙️ Reminder + Action Created' : '✅ Reminder Created',
        fields,
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
    // Use improved time parsing
    const now = Date.now();
    const triggerTime = parseTimeString(durationStr);
    
    if (!triggerTime) {
      await interaction.editReply({
        content: `❌ Couldn't parse duration "${durationStr}". Try formats like \`10m\`, \`1h\`, \`1d\``,
        ephemeral: true
      });
      return;
    }
    
    const ms = triggerTime - now;
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
