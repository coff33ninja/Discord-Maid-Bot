/**
 * Home Assistant Commands
 * 
 * Handles Home Assistant device control commands.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('homeassistant-commands');

// Standalone plugin - defines its own commands
export const parentCommand = null;
export const handlesCommands = ['homeassistant'];

/**
 * Command definitions - /homeassistant
 */
export const commands = [
  new SlashCommandBuilder()
    .setName('homeassistant')
    .setDescription('🏠 Control Home Assistant devices')
    .addSubcommand(sub => sub.setName('lights').setDescription('List all lights'))
    .addSubcommand(sub => sub.setName('light').setDescription('Control a light')
      .addStringOption(opt => opt.setName('entity').setDescription('Entity ID').setRequired(true).setAutocomplete(true))
      .addBooleanOption(opt => opt.setName('state').setDescription('Turn on or off').setRequired(true))
      .addIntegerOption(opt => opt.setName('brightness').setDescription('Brightness (0-255)').setMinValue(0).setMaxValue(255)))
    .addSubcommand(sub => sub.setName('switches').setDescription('List all switches'))
    .addSubcommand(sub => sub.setName('switch').setDescription('Control a switch')
      .addStringOption(opt => opt.setName('entity').setDescription('Entity ID').setRequired(true).setAutocomplete(true))
      .addBooleanOption(opt => opt.setName('state').setDescription('Turn on or off').setRequired(true)))
    .addSubcommand(sub => sub.setName('sensors').setDescription('List all sensors'))
    .addSubcommand(sub => sub.setName('sensor').setDescription('Read a sensor')
      .addStringOption(opt => opt.setName('entity').setDescription('Entity ID').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('esp').setDescription('List ESP devices'))
    .addSubcommand(sub => sub.setName('diagnose').setDescription('Run Home Assistant diagnostics'))
    .addSubcommand(sub => sub.setName('scenes').setDescription('List all scenes'))
    .addSubcommand(sub => sub.setName('scene').setDescription('Activate a scene')
      .addStringOption(opt => opt.setName('entity').setDescription('Scene entity ID').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('automations').setDescription('List all automations'))
    .addSubcommand(sub => sub.setName('automation').setDescription('Trigger an automation')
      .addStringOption(opt => opt.setName('entity').setDescription('Automation entity ID').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('scripts').setDescription('List all scripts'))
    .addSubcommand(sub => sub.setName('script').setDescription('Run a script')
      .addStringOption(opt => opt.setName('entity').setDescription('Script entity ID').setRequired(true).setAutocomplete(true)))
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
      case 'lights':
        return await handleLightsList(interaction, ha);
      case 'light':
        return await handleLightControl(interaction, ha);
      case 'switches':
        return await handleSwitchesList(interaction, ha);
      case 'switch':
        return await handleSwitchControl(interaction, ha);
      case 'sensors':
        return await handleSensorsList(interaction, ha);
      case 'sensor':
        return await handleSensorRead(interaction, ha);
      case 'esp':
        return await handleESPDevices(interaction, ha);
      case 'diagnose':
        return await handleDiagnose(interaction, ha);
      case 'scenes':
        return await handleScenesList(interaction, ha);
      case 'scene':
        return await handleSceneActivate(interaction, ha);
      case 'automations':
        return await handleAutomationsList(interaction, ha);
      case 'automation':
        return await handleAutomationTrigger(interaction, ha);
      case 'scripts':
        return await handleScriptsList(interaction, ha);
      case 'script':
        return await handleScriptRun(interaction, ha);
      default:
        await interaction.reply({
          content: `❌ Unknown subcommand: ${subcommand}`,
          ephemeral: true
        });
        return true;
    }
  } catch (error) {
    logger.error('Home Assistant command error:', error);
    await interaction.reply({
      content: `❌ Error: ${error.message}`,
      ephemeral: true
    });
    return true;
  }
}

// List all lights
async function handleLightsList(interaction, ha) {
  await interaction.deferReply();
  
  const lights = await ha.getAllLights();
  
  if (lights.length === 0) {
    await interaction.editReply('💡 No lights found in Home Assistant.');
    return true;
  }
  
  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('💡 Home Assistant Lights')
    .setDescription(`Found ${lights.length} light(s)`)
    .setTimestamp();
  
  const onLights = lights.filter(l => l.state === 'on');
  const offLights = lights.filter(l => l.state === 'off');
  
  if (onLights.length > 0) {
    embed.addFields({
      name: `🟢 On (${onLights.length})`,
      value: onLights.slice(0, 10).map(l => l.attributes?.friendly_name || l.entity_id).join('\n') || 'None',
      inline: true
    });
  }
  
  if (offLights.length > 0) {
    embed.addFields({
      name: `⚫ Off (${offLights.length})`,
      value: offLights.slice(0, 10).map(l => l.attributes?.friendly_name || l.entity_id).join('\n') || 'None',
      inline: true
    });
  }
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}

// Control a light
async function handleLightControl(interaction, ha) {
  await interaction.deferReply();
  
  const entityId = interaction.options.getString('entity');
  const state = interaction.options.getBoolean('state');
  const brightness = interaction.options.getInteger('brightness');
  
  await ha.controlLight(entityId, state, brightness);
  
  const embed = new EmbedBuilder()
    .setColor(state ? '#FFD700' : '#333333')
    .setTitle(`💡 Light ${state ? 'On' : 'Off'}`)
    .setDescription(`**${entityId}** turned ${state ? 'on' : 'off'}${brightness ? ` at ${Math.round(brightness/255*100)}% brightness` : ''}`)
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}

// List all switches
async function handleSwitchesList(interaction, ha) {
  await interaction.deferReply();
  
  const switches = await ha.getAllSwitches();
  
  if (switches.length === 0) {
    await interaction.editReply('🔌 No switches found in Home Assistant.');
    return true;
  }
  
  const embed = new EmbedBuilder()
    .setColor('#4CAF50')
    .setTitle('🔌 Home Assistant Switches')
    .setDescription(`Found ${switches.length} switch(es)`)
    .setTimestamp();
  
  const onSwitches = switches.filter(s => s.state === 'on');
  const offSwitches = switches.filter(s => s.state === 'off');
  
  if (onSwitches.length > 0) {
    embed.addFields({
      name: `🟢 On (${onSwitches.length})`,
      value: onSwitches.slice(0, 10).map(s => s.attributes?.friendly_name || s.entity_id).join('\n') || 'None',
      inline: true
    });
  }
  
  if (offSwitches.length > 0) {
    embed.addFields({
      name: `⚫ Off (${offSwitches.length})`,
      value: offSwitches.slice(0, 10).map(s => s.attributes?.friendly_name || s.entity_id).join('\n') || 'None',
      inline: true
    });
  }
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}

// Control a switch
async function handleSwitchControl(interaction, ha) {
  await interaction.deferReply();
  
  const entityId = interaction.options.getString('entity');
  const state = interaction.options.getBoolean('state');
  
  await ha.controlSwitch(entityId, state);
  
  const embed = new EmbedBuilder()
    .setColor(state ? '#4CAF50' : '#333333')
    .setTitle(`🔌 Switch ${state ? 'On' : 'Off'}`)
    .setDescription(`**${entityId}** turned ${state ? 'on' : 'off'}`)
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}

// List all sensors
async function handleSensorsList(interaction, ha) {
  await interaction.deferReply();
  
  const sensors = await ha.getAllSensors();
  
  if (sensors.length === 0) {
    await interaction.editReply('📊 No sensors found in Home Assistant.');
    return true;
  }
  
  const embed = new EmbedBuilder()
    .setColor('#2196F3')
    .setTitle('📊 Home Assistant Sensors')
    .setDescription(`Found ${sensors.length} sensor(s)\n\nShowing first 15:`)
    .setTimestamp();
  
  for (const sensor of sensors.slice(0, 15)) {
    const name = sensor.attributes?.friendly_name || sensor.entity_id;
    const value = sensor.state;
    const unit = sensor.attributes?.unit_of_measurement || '';
    embed.addFields({
      name: name.substring(0, 256),
      value: `${value} ${unit}`.substring(0, 1024),
      inline: true
    });
  }
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}


// Read a sensor
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

// List ESP devices
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
      embed.addFields({
        name: 'Instructions',
        value: result.instructions.join('\n'),
        inline: false
      });
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
    embed.addFields({
      name: `${status} ${device.name}`,
      value: `${device.entities.length} entities`,
      inline: true
    });
  }
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}

// Run diagnostics
async function handleDiagnose(interaction, ha) {
  await interaction.deferReply();
  
  const connected = await ha.checkConnection();
  
  const embed = new EmbedBuilder()
    .setColor(connected ? '#4CAF50' : '#F44336')
    .setTitle('🏠 Home Assistant Diagnostics')
    .addFields(
      { name: 'Connection', value: connected ? '✅ Connected' : '❌ Disconnected', inline: true }
    )
    .setTimestamp();
  
  if (connected) {
    try {
      const lights = await ha.getAllLights();
      const switches = await ha.getAllSwitches();
      const sensors = await ha.getAllSensors();
      
      embed.addFields(
        { name: 'Lights', value: `${lights.length}`, inline: true },
        { name: 'Switches', value: `${switches.length}`, inline: true },
        { name: 'Sensors', value: `${sensors.length}`, inline: true }
      );
    } catch (error) {
      embed.addFields({
        name: 'Error',
        value: error.message,
        inline: false
      });
    }
  }
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}

// List scenes
async function handleScenesList(interaction, ha) {
  await interaction.deferReply();
  
  const scenes = await ha.getAllScenes();
  
  if (scenes.length === 0) {
    await interaction.editReply('🎬 No scenes found in Home Assistant.');
    return true;
  }
  
  const embed = new EmbedBuilder()
    .setColor('#9C27B0')
    .setTitle('🎬 Home Assistant Scenes')
    .setDescription(`Found ${scenes.length} scene(s)`)
    .setTimestamp();
  
  for (const scene of scenes.slice(0, 15)) {
    embed.addFields({
      name: scene.attributes?.friendly_name || scene.entity_id,
      value: scene.entity_id,
      inline: true
    });
  }
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}

// Activate a scene
async function handleSceneActivate(interaction, ha) {
  await interaction.deferReply();
  
  const entityId = interaction.options.getString('entity');
  await ha.activateScene(entityId);
  
  const embed = new EmbedBuilder()
    .setColor('#9C27B0')
    .setTitle('🎬 Scene Activated')
    .setDescription(`**${entityId}** has been activated`)
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}

// List automations
async function handleAutomationsList(interaction, ha) {
  await interaction.deferReply();
  
  const automations = await ha.getAllAutomations();
  
  if (automations.length === 0) {
    await interaction.editReply('⚙️ No automations found in Home Assistant.');
    return true;
  }
  
  const embed = new EmbedBuilder()
    .setColor('#FF5722')
    .setTitle('⚙️ Home Assistant Automations')
    .setDescription(`Found ${automations.length} automation(s)`)
    .setTimestamp();
  
  const onAutomations = automations.filter(a => a.state === 'on');
  const offAutomations = automations.filter(a => a.state === 'off');
  
  if (onAutomations.length > 0) {
    embed.addFields({
      name: `🟢 Enabled (${onAutomations.length})`,
      value: onAutomations.slice(0, 10).map(a => a.attributes?.friendly_name || a.entity_id).join('\n'),
      inline: true
    });
  }
  
  if (offAutomations.length > 0) {
    embed.addFields({
      name: `⚫ Disabled (${offAutomations.length})`,
      value: offAutomations.slice(0, 10).map(a => a.attributes?.friendly_name || a.entity_id).join('\n'),
      inline: true
    });
  }
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}

// Trigger an automation
async function handleAutomationTrigger(interaction, ha) {
  await interaction.deferReply();
  
  const entityId = interaction.options.getString('entity');
  await ha.triggerAutomation(entityId);
  
  const embed = new EmbedBuilder()
    .setColor('#FF5722')
    .setTitle('⚙️ Automation Triggered')
    .setDescription(`**${entityId}** has been triggered`)
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}

// List scripts
async function handleScriptsList(interaction, ha) {
  await interaction.deferReply();
  
  const scripts = await ha.getAllScripts();
  
  if (scripts.length === 0) {
    await interaction.editReply('📜 No scripts found in Home Assistant.');
    return true;
  }
  
  const embed = new EmbedBuilder()
    .setColor('#607D8B')
    .setTitle('📜 Home Assistant Scripts')
    .setDescription(`Found ${scripts.length} script(s)`)
    .setTimestamp();
  
  for (const script of scripts.slice(0, 15)) {
    embed.addFields({
      name: script.attributes?.friendly_name || script.entity_id,
      value: script.entity_id,
      inline: true
    });
  }
  
  await interaction.editReply({ embeds: [embed] });
  return true;
}

// Run a script
async function handleScriptRun(interaction, ha) {
  await interaction.deferReply();
  
  const entityId = interaction.options.getString('entity');
  await ha.runScript(entityId);
  
  const embed = new EmbedBuilder()
    .setColor('#607D8B')
    .setTitle('📜 Script Executed')
    .setDescription(`**${entityId}** has been executed`)
    .setTimestamp();
  
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
    
    if (!integrationsPlugin || !integrationsPlugin.homeassistant || !integrationsPlugin.homeassistant.isConnected()) {
      await interaction.respond([]);
      return;
    }
    
    const ha = integrationsPlugin.homeassistant;
    let entities = [];
    
    // Get entities based on subcommand
    if (subcommand === 'light') {
      entities = await ha.getAllLights();
    } else if (subcommand === 'switch') {
      entities = await ha.getAllSwitches();
    } else if (subcommand === 'sensor') {
      entities = await ha.getAllSensors();
    } else if (subcommand === 'scene') {
      entities = await ha.getAllScenes();
    } else if (subcommand === 'automation') {
      entities = await ha.getAllAutomations();
    } else if (subcommand === 'script') {
      entities = await ha.getAllScripts();
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
