/**
 * Home Assistant Commands - Queued Loading System
 * 
 * Uses autocomplete to select entity type and entity, then performs action.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('homeassistant-commands');

// Standalone plugin - defines its own commands
export const parentCommand = null;
export const handlesCommands = ['homeassistant'];

// Entity types registry
const ENTITY_TYPES = {
  light: { name: 'Lights', emoji: '💡', domain: 'light' },
  switch: { name: 'Switches', emoji: '🔌', domain: 'switch' },
  sensor: { name: 'Sensors', emoji: '📊', domain: 'sensor' },
  scene: { name: 'Scenes', emoji: '🎬', domain: 'scene' },
  automation: { name: 'Automations', emoji: '⚙️', domain: 'automation' },
  script: { name: 'Scripts', emoji: '📜', domain: 'script' },
  climate: { name: 'Climate', emoji: '🌡️', domain: 'climate' },
  cover: { name: 'Covers', emoji: '🪟', domain: 'cover' },
  fan: { name: 'Fans', emoji: '🌀', domain: 'fan' },
  media_player: { name: 'Media Players', emoji: '📺', domain: 'media_player' }
};

/**
 * Command definitions - Simplified with queued loading
 */
export const commands = [
  new SlashCommandBuilder()
    .setName('homeassistant')
    .setDescription('🏠 Control Home Assistant devices')
    // Control an entity
    .addSubcommand(sub => sub
      .setName('control')
      .setDescription('Control a Home Assistant entity')
      .addStringOption(opt => opt
        .setName('type')
        .setDescription('Entity type')
        .setRequired(true)
        .addChoices(
          { name: '💡 Lights', value: 'light' },
          { name: '🔌 Switches', value: 'switch' },
          { name: '🎬 Scenes', value: 'scene' },
          { name: '⚙️ Automations', value: 'automation' },
          { name: '📜 Scripts', value: 'script' },
          { name: '🌡️ Climate', value: 'climate' },
          { name: '🪟 Covers', value: 'cover' },
          { name: '🌀 Fans', value: 'fan' }
        ))
      .addStringOption(opt => opt
        .setName('entity')
        .setDescription('Entity to control')
        .setRequired(true)
        .setAutocomplete(true))
      .addStringOption(opt => opt
        .setName('action')
        .setDescription('Action to perform')
        .addChoices(
          { name: '✅ Turn On', value: 'on' },
          { name: '❌ Turn Off', value: 'off' },
          { name: '🔄 Toggle', value: 'toggle' },
          { name: '▶️ Trigger/Activate', value: 'trigger' }
        ))
      .addIntegerOption(opt => opt
        .setName('brightness')
        .setDescription('Brightness for lights (0-255)')
        .setMinValue(0)
        .setMaxValue(255)))
    // List entities
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List Home Assistant entities')
      .addStringOption(opt => opt
        .setName('type')
        .setDescription('Entity type to list')
        .setRequired(true)
        .addChoices(
          { name: '💡 Lights', value: 'light' },
          { name: '🔌 Switches', value: 'switch' },
          { name: '📊 Sensors', value: 'sensor' },
          { name: '🎬 Scenes', value: 'scene' },
          { name: '⚙️ Automations', value: 'automation' },
          { name: '📜 Scripts', value: 'script' },
          { name: '🌡️ Climate', value: 'climate' },
          { name: '📺 Media Players', value: 'media_player' }
        )))
    // Read a sensor
    .addSubcommand(sub => sub
      .setName('sensor')
      .setDescription('Read a sensor value')
      .addStringOption(opt => opt
        .setName('entity')
        .setDescription('Sensor to read')
        .setRequired(true)
        .setAutocomplete(true)))
    // Diagnostics
    .addSubcommand(sub => sub
      .setName('diagnose')
      .setDescription('Run Home Assistant diagnostics'))
    // ESP devices
    .addSubcommand(sub => sub
      .setName('esp')
      .setDescription('List ESP/ESPHome devices'))
];

/**
 * Handle homeassistant commands
 */
export async function handleCommand(interaction, commandName, subcommand) {
  if (commandName !== 'homeassistant') return false;

  // Get the Home Assistant plugin
  const { getPlugin } = await import('../../../src/core/plugin-system.js');
  const integrationsPlugin = getPlugin('integrations');
  
  if (!integrationsPlugin || !integrationsPlugin.homeassistant) {
    await interaction.reply({
      content: '❌ Home Assistant plugin not available!',
      ephemeral: true
    });
    return true;
  }
  
  const ha = integrationsPlugin.homeassistant;
  
  if (!ha.isConnected()) {
    await interaction.reply({
      content: '❌ Home Assistant not configured!\n\nSet `HA_URL` and `HA_TOKEN` in your `.env` file.',
      ephemeral: true
    });
    return true;
  }

  try {
    switch (subcommand) {
      case 'control':
        return await handleControl(interaction, ha);
      case 'list':
        return await handleList(interaction, ha);
      case 'sensor':
        return await handleSensorRead(interaction, ha);
      case 'diagnose':
        return await handleDiagnose(interaction, ha);
      case 'esp':
        return await handleESPDevices(interaction, ha);
      default:
        await interaction.reply({ content: `❌ Unknown subcommand: ${subcommand}`, ephemeral: true });
        return true;
    }
  } catch (error) {
    logger.error('Home Assistant command error:', error);
    const reply = { content: `❌ Error: ${error.message}`, ephemeral: true };
    if (interaction.deferred) {
      await interaction.editReply(reply);
    } else {
      await interaction.reply(reply);
    }
    return true;
  }
}

/**
 * Control an entity
 */
async function handleControl(interaction, ha) {
  await interaction.deferReply();
  
  const type = interaction.options.getString('type');
  const entityId = interaction.options.getString('entity');
  const action = interaction.options.getString('action') || 'toggle';
  const brightness = interaction.options.getInteger('brightness');
  
  const typeInfo = ENTITY_TYPES[type];
  let result = '';
  
  switch (type) {
    case 'light':
      if (action === 'on' || action === 'toggle') {
        await ha.controlLight(entityId, action !== 'off', brightness);
        result = `turned ${action === 'toggle' ? 'toggled' : 'on'}${brightness ? ` at ${Math.round(brightness/255*100)}%` : ''}`;
      } else {
        await ha.controlLight(entityId, false);
        result = 'turned off';
      }
      break;
    case 'switch':
    case 'fan':
      if (action === 'on') {
        await ha.controlSwitch(entityId, true);
        result = 'turned on';
      } else if (action === 'off') {
        await ha.controlSwitch(entityId, false);
        result = 'turned off';
      } else {
        await ha.callService(type, 'toggle', { entity_id: entityId });
        result = 'toggled';
      }
      break;
    case 'scene':
      await ha.activateScene(entityId);
      result = 'activated';
      break;
    case 'automation':
      await ha.triggerAutomation(entityId);
      result = 'triggered';
      break;
    case 'script':
      await ha.runScript(entityId);
      result = 'executed';
      break;
    case 'cover':
      if (action === 'on') {
        await ha.callService('cover', 'open_cover', { entity_id: entityId });
        result = 'opened';
      } else if (action === 'off') {
        await ha.callService('cover', 'close_cover', { entity_id: entityId });
        result = 'closed';
      } else {
        await ha.callService('cover', 'toggle', { entity_id: entityId });
        result = 'toggled';
      }
      break;
    case 'climate':
      await ha.callService('climate', action === 'off' ? 'turn_off' : 'turn_on', { entity_id: entityId });
      result = action === 'off' ? 'turned off' : 'turned on';
      break;
    default:
      result = 'action performed';
  }
  
  const embed = new EmbedBuilder()
    .setColor('#4CAF50')
    .setTitle(`${typeInfo.emoji} ${typeInfo.name}`)
    .setDescription(`**${entityId}** ${result}`)
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}

/**
 * List entities of a type
 */
async function handleList(interaction, ha) {
  await interaction.deferReply();
  
  const type = interaction.options.getString('type');
  const typeInfo = ENTITY_TYPES[type];
  
  let entities = [];
  switch (type) {
    case 'light': entities = await ha.getAllLights(); break;
    case 'switch': entities = await ha.getAllSwitches(); break;
    case 'sensor': entities = await ha.getAllSensors(); break;
    case 'scene': entities = await ha.getAllScenes(); break;
    case 'automation': entities = await ha.getAllAutomations(); break;
    case 'script': entities = await ha.getAllScripts(); break;
    default:
      // Generic fetch for other types
      const allStates = await ha.getStates();
      entities = allStates.filter(e => e.entity_id.startsWith(`${type}.`));
  }
  
  if (entities.length === 0) {
    await interaction.editReply(`${typeInfo.emoji} No ${typeInfo.name.toLowerCase()} found.`);
    return true;
  }
  
  const embed = new EmbedBuilder()
    .setColor('#2196F3')
    .setTitle(`${typeInfo.emoji} ${typeInfo.name}`)
    .setDescription(`Found ${entities.length} ${typeInfo.name.toLowerCase()}`)
    .setTimestamp();
  
  // Group by state for toggleable entities
  if (['light', 'switch', 'automation', 'fan'].includes(type)) {
    const on = entities.filter(e => e.state === 'on');
    const off = entities.filter(e => e.state === 'off');
    
    if (on.length > 0) {
      embed.addFields({
        name: `🟢 On (${on.length})`,
        value: on.slice(0, 10).map(e => e.attributes?.friendly_name || e.entity_id).join('\n') || 'None',
        inline: true
      });
    }
    if (off.length > 0) {
      embed.addFields({
        name: `⚫ Off (${off.length})`,
        value: off.slice(0, 10).map(e => e.attributes?.friendly_name || e.entity_id).join('\n') || 'None',
        inline: true
      });
    }
  } else {
    // Just list them
    const list = entities.slice(0, 15).map(e => {
      const name = e.attributes?.friendly_name || e.entity_id;
      const state = e.state !== 'unknown' ? ` (${e.state}${e.attributes?.unit_of_measurement || ''})` : '';
      return `• ${name}${state}`;
    }).join('\n');
    
    embed.addFields({ name: 'Entities', value: list || 'None', inline: false });
  }
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}

/**
 * Read a sensor
 */
async function handleSensorRead(interaction, ha) {
  await interaction.deferReply();
  
  const entityId = interaction.options.getString('entity');
  const data = await ha.getSensorData(entityId);
  
  const embed = new EmbedBuilder()
    .setColor('#2196F3')
    .setTitle(`📊 ${data.friendly_name || entityId}`)
    .addFields(
      { name: 'Value', value: `${data.value} ${data.unit || ''}`, inline: true },
      { name: 'Last Updated', value: new Date(data.last_updated).toLocaleString(), inline: true }
    )
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}

/**
 * Run diagnostics
 */
async function handleDiagnose(interaction, ha) {
  await interaction.deferReply();
  
  const connected = await ha.checkConnection();
  
  const embed = new EmbedBuilder()
    .setColor(connected ? '#4CAF50' : '#F44336')
    .setTitle('🏠 Home Assistant Diagnostics')
    .addFields({ name: 'Connection', value: connected ? '✅ Connected' : '❌ Disconnected', inline: true })
    .setTimestamp();
  
  if (connected) {
    try {
      const lights = await ha.getAllLights();
      const switches = await ha.getAllSwitches();
      const sensors = await ha.getAllSensors();
      const scenes = await ha.getAllScenes();
      const automations = await ha.getAllAutomations();
      
      embed.addFields(
        { name: '💡 Lights', value: `${lights.length}`, inline: true },
        { name: '🔌 Switches', value: `${switches.length}`, inline: true },
        { name: '📊 Sensors', value: `${sensors.length}`, inline: true },
        { name: '🎬 Scenes', value: `${scenes.length}`, inline: true },
        { name: '⚙️ Automations', value: `${automations.length}`, inline: true }
      );
    } catch (error) {
      embed.addFields({ name: 'Error', value: error.message, inline: false });
    }
  }
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}

/**
 * List ESP devices
 */
async function handleESPDevices(interaction, ha) {
  await interaction.deferReply();
  
  const result = await ha.getESPDevices();
  
  if (result.warning) {
    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('⚠️ ESP Devices')
      .setDescription(result.warning)
      .setTimestamp();
    
    if (result.instructions) {
      embed.addFields({ name: 'Instructions', value: result.instructions.join('\n'), inline: false });
    }
    
    await interaction.editReply({ embeds: [embed] });
    return true;
  }
  
  const embed = new EmbedBuilder()
    .setColor('#4CAF50')
    .setTitle('🔧 ESP Devices')
    .setDescription(`Found ${result.count} ESP device(s)`)
    .setTimestamp();
  
  for (const device of result.devices.slice(0, 10)) {
    const status = device.online ? '🟢' : '🔴';
    embed.addFields({ name: `${status} ${device.name}`, value: `${device.entities.length} entities`, inline: true });
  }
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}

/**
 * Handle autocomplete for Home Assistant entities
 */
export async function handleAutocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  const subcommand = interaction.options.getSubcommand();
  
  try {
    const { getPlugin } = await import('../../../src/core/plugin-system.js');
    const integrationsPlugin = getPlugin('integrations');
    
    if (!integrationsPlugin?.homeassistant?.isConnected()) {
      await interaction.respond([]);
      return;
    }
    
    const ha = integrationsPlugin.homeassistant;
    let entities = [];
    
    // Get entity type from options
    const type = interaction.options.getString('type');
    
    if (subcommand === 'sensor' || (subcommand === 'control' && focusedOption.name === 'entity')) {
      // Get entities based on type
      switch (type || 'sensor') {
        case 'light': entities = await ha.getAllLights(); break;
        case 'switch': entities = await ha.getAllSwitches(); break;
        case 'sensor': entities = await ha.getAllSensors(); break;
        case 'scene': entities = await ha.getAllScenes(); break;
        case 'automation': entities = await ha.getAllAutomations(); break;
        case 'script': entities = await ha.getAllScripts(); break;
        default:
          const allStates = await ha.getStates();
          entities = allStates.filter(e => e.entity_id.startsWith(`${type}.`));
      }
    }
    
    const focusedValue = focusedOption.value.toLowerCase();
    
    const filtered = entities
      .filter(e => {
        const name = (e.attributes?.friendly_name || e.entity_id).toLowerCase();
        return name.includes(focusedValue) || e.entity_id.toLowerCase().includes(focusedValue);
      })
      .slice(0, 25)
      .map(e => ({
        name: `${e.attributes?.friendly_name || e.entity_id} (${e.state})`.substring(0, 100),
        value: e.entity_id
      }));
    
    await interaction.respond(filtered);
  } catch (error) {
    logger.error('Autocomplete error:', error);
    await interaction.respond([]);
  }
}
