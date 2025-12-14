import { SlashCommandSubcommandGroupBuilder } from 'discord.js';

/**
 * Device Triggers Plugin Commands
 * Auto-loaded by plugin system
 */

export const commandGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('devicetrigger')
  .setDescription('Device automation triggers')
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('Create a new trigger')
      .addStringOption(option =>
        option.setName('name')
          .setDescription('Trigger name')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('device')
          .setDescription('Device to monitor')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(option =>
        option.setName('event')
          .setDescription('When to trigger')
          .setRequired(true)
          .addChoices(
            { name: 'Device comes online', value: 'online' },
            { name: 'Device goes offline', value: 'offline' },
            { name: 'Unknown device detected', value: 'unknown' }
          ))
      .addStringOption(option =>
        option.setName('action')
          .setDescription('What to do')
          .setRequired(true)
          .addChoices(
            { name: 'Send me a DM', value: 'discord_dm' },
            { name: 'Post in channel', value: 'discord_channel' },
            { name: 'Control Home Assistant', value: 'homeassistant' }
          ))
      .addStringOption(option =>
        option.setName('message')
          .setDescription('Custom message'))
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Channel for alerts'))
      .addStringOption(option =>
        option.setName('ha_entity')
          .setDescription('Home Assistant entity')
          .setAutocomplete(true))
      .addStringOption(option =>
        option.setName('ha_service')
          .setDescription('HA service (e.g., light.turn_on)')))
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List all triggers'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Remove a trigger')
      .addStringOption(option =>
        option.setName('trigger')
          .setDescription('Trigger to remove')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('toggle')
      .setDescription('Enable/disable a trigger')
      .addStringOption(option =>
        option.setName('trigger')
          .setDescription('Trigger to toggle')
          .setRequired(true)
          .setAutocomplete(true))
      .addBooleanOption(option =>
        option.setName('enabled')
          .setDescription('Enable or disable')
          .setRequired(true)));

export const parentCommand = 'automation';

export async function handleCommand(interaction, plugin) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'add':
      return await handleAdd(interaction, plugin);
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
  const subcommand = interaction.options.getSubcommand();
  
  if (focusedOption.name === 'device') {
    // Device autocomplete with "any" option
    const { getDeviceAutocomplete } = await import('../../src/utils/autocomplete-helpers.js');
    
    const choices = [{ name: '🌐 Any unknown device', value: 'any' }];
    const deviceChoices = getDeviceAutocomplete(focusedOption.value, null, { limit: 24 });
    
    await interaction.respond([...choices, ...deviceChoices]);
  } else if (focusedOption.name === 'trigger') {
    // Trigger autocomplete for remove/toggle
    const triggers = await plugin.listTriggers();
    const focusedValue = focusedOption.value.toLowerCase();
    
    const filtered = triggers
      .filter(t => !focusedValue || t.name.toLowerCase().includes(focusedValue))
      .slice(0, 25)
      .map(t => ({
        name: `${t.enabled ? '✅' : '⚠️'} ${t.name} (${t.event})`,
        value: t.id.toString()
      }));
    
    await interaction.respond(filtered);
  } else if (focusedOption.name === 'ha_entity') {
    // Home Assistant entity autocomplete
    try {
      const { getEntities } = await import('../../src/integrations/homeassistant.js');
      const entities = await getEntities();
      const focusedValue = focusedOption.value.toLowerCase();
      
      const filtered = entities
        .filter(e => {
          if (!focusedValue) return true;
          return e.entity_id.toLowerCase().includes(focusedValue) ||
                 (e.attributes?.friendly_name || '').toLowerCase().includes(focusedValue);
        })
        .slice(0, 25)
        .map(e => ({
          name: `${e.attributes?.friendly_name || e.entity_id}`,
          value: e.entity_id
        }));
      
      await interaction.respond(filtered);
    } catch (err) {
      await interaction.respond([{ name: 'Home Assistant not available', value: 'error' }]);
    }
  }
}

async function handleAdd(interaction, plugin) {
  await interaction.deferReply();
  
  const name = interaction.options.getString('name');
  const deviceMac = interaction.options.getString('device');
  const event = interaction.options.getString('event');
  const action = interaction.options.getString('action');
  const message = interaction.options.getString('message');
  const channel = interaction.options.getChannel('channel');
  const haEntity = interaction.options.getString('ha_entity');
  const haService = interaction.options.getString('ha_service');
  
  // Build action data
  const actionData = {};
  
  if (action === 'discord_dm') {
    actionData.userId = interaction.user.id;
    actionData.message = message;
  } else if (action === 'discord_channel') {
    if (!channel) {
      await interaction.editReply('❌ Channel is required for channel alerts');
      return;
    }
    actionData.channelId = channel.id;
    actionData.message = message;
  } else if (action === 'homeassistant') {
    if (!haEntity || !haService) {
      await interaction.editReply('❌ Home Assistant entity and service are required');
      return;
    }
    actionData.entityId = haEntity;
    actionData.service = haService;
  }
  
  try {
    const trigger = await plugin.addTrigger({
      name,
      deviceMac,
      event,
      action,
      actionData
    });
    
    // Get device name for display
    let deviceName = 'Any unknown device';
    if (deviceMac !== 'any') {
      const { deviceOps } = await import('../../src/database/db.js');
      const device = deviceOps.getByMac(deviceMac);
      if (device) {
        deviceName = device.emoji ? `${device.emoji} ${device.notes || device.hostname || device.ip}` : (device.notes || device.hostname || device.ip);
      }
    }
    
    await interaction.editReply({
      embeds: [{
        color: 0x00FF00,
        title: '✅ Trigger Created',
        fields: [
          { name: 'Name', value: name, inline: false },
          { name: 'Device', value: deviceName, inline: true },
          { name: 'Event', value: event, inline: true },
          { name: 'Action', value: action.replace('_', ' '), inline: true },
          { name: 'ID', value: trigger.id, inline: true }
        ],
        footer: { text: 'Trigger is now active' },
        timestamp: new Date()
      }]
    });
  } catch (error) {
    await interaction.editReply(`❌ Failed to create trigger: ${error.message}`);
  }
}

async function handleList(interaction, plugin) {
  await interaction.deferReply();
  
  const triggers = await plugin.listTriggers();
  
  if (triggers.length === 0) {
    await interaction.editReply('📋 No device triggers configured yet. Use `/automation devicetrigger add` to create one.');
    return;
  }
  
  const { deviceOps } = await import('../../src/database/db.js');
  
  const description = triggers.map(t => {
    const status = t.enabled ? '✅' : '⚠️';
    let deviceName = 'Any unknown device';
    
    if (t.deviceMac !== 'any') {
      const device = deviceOps.getByMac(t.deviceMac);
      if (device) {
        deviceName = device.emoji ? `${device.emoji} ${device.notes || device.hostname || device.ip}` : (device.notes || device.hostname || device.ip);
      }
    }
    
    const lastTriggered = t.lastTriggered ? new Date(t.lastTriggered).toLocaleString() : 'Never';
    
    return `${status} **${t.name}**\n` +
           `   Device: ${deviceName}\n` +
           `   Event: ${t.event} → Action: ${t.action.replace('_', ' ')}\n` +
           `   Triggered: ${t.triggerCount} times (Last: ${lastTriggered})\n` +
           `   ID: \`${t.id}\``;
  }).join('\n\n');
  
  await interaction.editReply({
    embeds: [{
      color: 0x00AAFF,
      title: '🔔 Device Triggers',
      description,
      footer: { text: `${triggers.length} trigger(s) configured` }
    }]
  });
}

async function handleRemove(interaction, plugin) {
  await interaction.deferReply();
  
  const triggerId = interaction.options.getString('trigger');
  
  try {
    const removed = await plugin.removeTrigger(triggerId);
    
    await interaction.editReply({
      embeds: [{
        color: 0xFF0000,
        title: '🗑️ Trigger Removed',
        description: `Removed trigger: **${removed.name}**`,
        timestamp: new Date()
      }]
    });
  } catch (error) {
    await interaction.editReply(`❌ Failed to remove trigger: ${error.message}`);
  }
}

async function handleToggle(interaction, plugin) {
  await interaction.deferReply();
  
  const triggerId = interaction.options.getString('trigger');
  const enabled = interaction.options.getBoolean('enabled');
  
  try {
    const trigger = await plugin.toggleTrigger(triggerId, enabled);
    
    await interaction.editReply({
      embeds: [{
        color: enabled ? 0x00FF00 : 0xFFA500,
        title: enabled ? '✅ Trigger Enabled' : '⚠️ Trigger Disabled',
        description: `**${trigger.name}** is now ${enabled ? 'enabled' : 'disabled'}`,
        timestamp: new Date()
      }]
    });
  } catch (error) {
    await interaction.editReply(`❌ Failed to toggle trigger: ${error.message}`);
  }
}
