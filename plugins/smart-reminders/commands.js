import { SlashCommandSubcommandGroupBuilder } from 'discord.js';

/**
 * Smart Reminders Plugin Commands
 * Auto-loaded by plugin system
 */

export const commandGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('reminder')
  .setDescription('Smart reminder system')
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('Create a reminder')
      .addStringOption(option =>
        option.setName('message')
          .setDescription('What to remind you about')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('when')
          .setDescription('When to remind (e.g., 5m, 2h, 1d)')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('name')
          .setDescription('Reminder name'))
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Send reminder to channel (default: DM)'))
      .addStringOption(option =>
        option.setName('context')
          .setDescription('Additional context to remember'))
      .addBooleanOption(option =>
        option.setName('ai_variation')
          .setDescription('Use AI to vary recurring messages')))
  .addSubcommand(subcommand =>
    subcommand
      .setName('recurring')
      .setDescription('Create a recurring reminder')
      .addStringOption(option =>
        option.setName('message')
          .setDescription('What to remind you about')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('interval')
          .setDescription('How often (e.g., 1h, 6h, 1d)')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('name')
          .setDescription('Reminder name'))
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Send reminder to channel (default: DM)'))
      .addBooleanOption(option =>
        option.setName('ai_variation')
          .setDescription('Use AI to vary messages')))
  .addSubcommand(subcommand =>
    subcommand
      .setName('presence')
      .setDescription('Remind when device comes online')
      .addStringOption(option =>
        option.setName('message')
          .setDescription('What to remind you about')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('device')
          .setDescription('Device to monitor')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(option =>
        option.setName('name')
          .setDescription('Reminder name'))
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Send reminder to channel (default: DM)')))
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List your reminders'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Remove a reminder')
      .addStringOption(option =>
        option.setName('reminder')
          .setDescription('Reminder to remove')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('toggle')
      .setDescription('Enable/disable a reminder')
      .addStringOption(option =>
        option.setName('reminder')
          .setDescription('Reminder to toggle')
          .setRequired(true)
          .setAutocomplete(true))
      .addBooleanOption(option =>
        option.setName('active')
          .setDescription('Enable or disable')
          .setRequired(true)));

export const parentCommand = 'bot';

export async function handleCommand(interaction, plugin) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'add':
      return await handleAdd(interaction, plugin);
    case 'recurring':
      return await handleRecurring(interaction, plugin);
    case 'presence':
      return await handlePresence(interaction, plugin);
    case 'list':
      return await handleList(interaction, plugin);
    case 'remove':
      return await handleRemove(interaction, plugin);
    case 'toggle':
      return await handleToggle(interaction, plugin);
    default:
      await interaction.reply('Unknown subcommand');
  }
}

export async function handleAutocomplete(interaction, plugin) {
  const focusedOption = interaction.options.getFocused(true);
  
  if (focusedOption.name === 'device') {
    // Device autocomplete
    const { deviceOps } = await import('../../src/database/db.js');
    const devices = deviceOps.getAll();
    const focusedValue = focusedOption.value.toLowerCase();
    
    const filtered = devices
      .filter(d => {
        if (!focusedValue) return true;
        return (d.notes || '').toLowerCase().includes(focusedValue) ||
               (d.hostname || '').toLowerCase().includes(focusedValue) ||
               d.ip.includes(focusedValue);
      })
      .slice(0, 25)
      .map(d => {
        const status = d.online ? '🟢' : '🔴';
        const emoji = d.emoji || '';
        const name = d.notes || d.hostname || d.ip;
        return {
          name: `${status} ${emoji} ${name}`.substring(0, 100),
          value: d.mac
        };
      });
    
    await interaction.respond(filtered);
  } else if (focusedOption.name === 'reminder') {
    // Reminder autocomplete
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

async function handleAdd(interaction, plugin) {
  await interaction.deferReply();
  
  const message = interaction.options.getString('message');
  const when = interaction.options.getString('when');
  const name = interaction.options.getString('name') || message.substring(0, 30);
  const channel = interaction.options.getChannel('channel');
  const context = interaction.options.getString('context');
  const aiVariation = interaction.options.getBoolean('ai_variation') || false;
  
  try {
    const triggerTime = plugin.parseRelativeTime(when);
    
    const reminder = await plugin.addReminder({
      name,
      message,
      type: 'time',
      target: channel ? 'channel' : 'dm',
      userId: interaction.user.id,
      channelId: channel?.id,
      triggerTime,
      context,
      aiVariation
    });
    
    const triggerDate = new Date(triggerTime);
    
    await interaction.editReply({
      embeds: [{
        color: 0x00FF00,
        title: '✅ Reminder Created',
        fields: [
          { name: 'Name', value: name, inline: false },
          { name: 'Message', value: message, inline: false },
          { name: 'When', value: triggerDate.toLocaleString(), inline: true },
          { name: 'Where', value: channel ? `<#${channel.id}>` : 'DM', inline: true },
          { name: 'ID', value: reminder.id, inline: true }
        ],
        footer: { text: 'You will be reminded at the specified time' },
        timestamp: new Date()
      }]
    });
  } catch (error) {
    await interaction.editReply(`❌ Failed to create reminder: ${error.message}`);
  }
}

async function handleRecurring(interaction, plugin) {
  await interaction.deferReply();
  
  const message = interaction.options.getString('message');
  const interval = interaction.options.getString('interval');
  const name = interaction.options.getString('name') || message.substring(0, 30);
  const channel = interaction.options.getChannel('channel');
  const aiVariation = interaction.options.getBoolean('ai_variation') || false;
  
  try {
    const reminder = await plugin.addReminder({
      name,
      message,
      type: 'recurring',
      target: channel ? 'channel' : 'dm',
      userId: interaction.user.id,
      channelId: channel?.id,
      interval,
      aiVariation
    });
    
    await interaction.editReply({
      embeds: [{
        color: 0x00FF00,
        title: '✅ Recurring Reminder Created',
        fields: [
          { name: 'Name', value: name, inline: false },
          { name: 'Message', value: message, inline: false },
          { name: 'Interval', value: interval, inline: true },
          { name: 'Where', value: channel ? `<#${channel.id}>` : 'DM', inline: true },
          { name: 'AI Variation', value: aiVariation ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'ID', value: reminder.id, inline: true }
        ],
        footer: { text: 'Reminder will repeat at the specified interval' },
        timestamp: new Date()
      }]
    });
  } catch (error) {
    await interaction.editReply(`❌ Failed to create reminder: ${error.message}`);
  }
}

async function handlePresence(interaction, plugin) {
  await interaction.deferReply();
  
  const message = interaction.options.getString('message');
  const deviceMac = interaction.options.getString('device');
  const name = interaction.options.getString('name') || message.substring(0, 30);
  const channel = interaction.options.getChannel('channel');
  
  try {
    const { deviceOps } = await import('../../src/database/db.js');
    const device = deviceOps.getByMac(deviceMac);
    
    if (!device) {
      await interaction.editReply('❌ Device not found');
      return;
    }
    
    const reminder = await plugin.addReminder({
      name,
      message,
      type: 'presence',
      target: channel ? 'channel' : 'dm',
      userId: interaction.user.id,
      channelId: channel?.id,
      deviceMac
    });
    
    const deviceName = device.emoji ? `${device.emoji} ${device.notes || device.hostname || device.ip}` : (device.notes || device.hostname || device.ip);
    
    await interaction.editReply({
      embeds: [{
        color: 0x00FF00,
        title: '✅ Presence Reminder Created',
        fields: [
          { name: 'Name', value: name, inline: false },
          { name: 'Message', value: message, inline: false },
          { name: 'Device', value: deviceName, inline: true },
          { name: 'Where', value: channel ? `<#${channel.id}>` : 'DM', inline: true },
          { name: 'ID', value: reminder.id, inline: true }
        ],
        footer: { text: 'You will be reminded when the device comes online' },
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
    await interaction.editReply('📋 No reminders found. Use `/bot reminder add` to create one.');
    return;
  }
  
  const active = reminders.filter(r => r.active);
  const completed = reminders.filter(r => r.completed);
  
  const description = active.map(r => {
    const status = r.active ? '✅' : '⚠️';
    let when = '';
    
    if (r.type === 'time') {
      when = `at ${new Date(r.triggerTime).toLocaleString()}`;
    } else if (r.type === 'recurring') {
      when = `every ${r.interval}`;
    } else if (r.type === 'presence') {
      when = 'when device comes online';
    }
    
    return `${status} **${r.name}**\n   ${r.message}\n   ${when}\n   ID: \`${r.id}\``;
  }).join('\n\n');
  
  await interaction.editReply({
    embeds: [{
      color: 0x00AAFF,
      title: '⏰ Your Reminders',
      description: description || 'No active reminders',
      footer: { text: `${active.length} active, ${completed.length} completed` }
    }]
  });
}

async function handleRemove(interaction, plugin) {
  await interaction.deferReply();
  
  const reminderId = interaction.options.getString('reminder');
  
  try {
    const removed = await plugin.removeReminder(reminderId);
    
    await interaction.editReply({
      embeds: [{
        color: 0xFF0000,
        title: '🗑️ Reminder Removed',
        description: `Removed reminder: **${removed.name}**`,
        timestamp: new Date()
      }]
    });
  } catch (error) {
    await interaction.editReply(`❌ Failed to remove reminder: ${error.message}`);
  }
}

async function handleToggle(interaction, plugin) {
  await interaction.deferReply();
  
  const reminderId = interaction.options.getString('reminder');
  const active = interaction.options.getBoolean('active');
  
  try {
    const reminder = await plugin.toggleReminder(reminderId, active);
    
    await interaction.editReply({
      embeds: [{
        color: active ? 0x00FF00 : 0xFFA500,
        title: active ? '✅ Reminder Enabled' : '⚠️ Reminder Disabled',
        description: `**${reminder.name}** is now ${active ? 'enabled' : 'disabled'}`,
        timestamp: new Date()
      }]
    });
  } catch (error) {
    await interaction.editReply(`❌ Failed to toggle reminder: ${error.message}`);
  }
}
