/**
 * Power Management Commands
 * 
 * Complete device power control commands
 */

import { SlashCommandSubcommandGroupBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';
import { deviceOps } from '../../src/database/db.js';
import { broadcastUpdate } from '../../src/dashboard/server.js';

// Parent command for subcommands
export const parentCommand = 'device';

// Command group
export const commandGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('power')
  .setDescription('Device power management')
  .addSubcommand(subcommand =>
    subcommand
      .setName('wake')
      .setDescription('Wake a device using Wake-on-LAN')
      .addStringOption(option =>
        option.setName('device')
          .setDescription('Device name, IP, or MAC address')
          .setRequired(true)
          .setAutocomplete(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('shutdown')
      .setDescription('Shutdown a device remotely')
      .addStringOption(option =>
        option.setName('device')
          .setDescription('Device name, IP, or MAC address')
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addIntegerOption(option =>
        option.setName('delay')
          .setDescription('Delay in seconds before shutdown (default: 5)')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('restart')
      .setDescription('Restart a device remotely')
      .addStringOption(option =>
        option.setName('device')
          .setDescription('Device name, IP, or MAC address')
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addIntegerOption(option =>
        option.setName('delay')
          .setDescription('Delay in seconds before restart (default: 5)')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('status')
      .setDescription('Check power status of devices')
      .addStringOption(option =>
        option.setName('device')
          .setDescription('Device name, IP, or MAC address (optional - shows all if not specified)')
          .setRequired(false)
          .setAutocomplete(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('configure')
      .setDescription('Configure device for remote shutdown')
      .addStringOption(option =>
        option.setName('device')
          .setDescription('Device name, IP, or MAC address')
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addStringOption(option =>
        option.setName('api_key')
          .setDescription('API key for shutdown server')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option.setName('port')
          .setDescription('Port for shutdown server (default: 5000)')
          .setRequired(false)
      )
  );

/**
 * Handle autocomplete
 */
export async function handleAutocomplete(interaction, plugin) {
  const focusedOption = interaction.options.getFocused(true);
  
  try {
    // Import autocomplete helpers
    const { getDeviceAutocomplete } = await import('../../src/utils/autocomplete-helpers.js');
    
    if (focusedOption.name === 'device') {
      const choices = getDeviceAutocomplete(focusedOption.value);
      await interaction.respond(choices);
      return;
    }
    
    // Default: no suggestions
    await interaction.respond([]);
    
  } catch (error) {
    logger.error('Autocomplete error:', error);
    await interaction.respond([]);
  }
}

/**
 * Handle commands
 */
export async function handleCommand(interaction, plugin) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'wake':
      return await handleWake(interaction, plugin);
    case 'shutdown':
      return await handleShutdown(interaction, plugin);
    case 'restart':
      return await handleRestart(interaction, plugin);
    case 'status':
      return await handleStatus(interaction, plugin);
    case 'configure':
      return await handleConfigure(interaction, plugin);
    default:
      await interaction.reply({ content: '❌ Unknown subcommand', ephemeral: true });
  }
}

/**
 * Wake device
 */
async function handleWake(interaction, plugin) {
  await interaction.deferReply();
  
  const deviceMac = interaction.options.getString('device');
  const device = deviceOps.getByMac(deviceMac);
  
  if (!device) {
    return await interaction.editReply('❌ Device not found');
  }
  
  try {
    await plugin.wakeDevice(device.mac);
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('⚡ Wake-on-LAN Sent')
      .setDescription(`Magic packet sent to **${device.hostname || device.ip}**`)
      .addFields(
        { name: 'Device', value: `${device.emoji || '💻'} ${device.hostname || 'Unknown'}`, inline: true },
        { name: 'IP', value: device.ip, inline: true },
        { name: 'MAC', value: device.mac, inline: true }
      )
      .setFooter({ text: 'Device should wake up in a few seconds' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    
    // Broadcast to dashboard
    broadcastUpdate('power-action', {
      action: 'wake',
      device: device.mac,
      timestamp: new Date()
    });
    
  } catch (error) {
    logger.error('Wake error:', error);
    await interaction.editReply(`❌ Failed to wake device: ${error.message}`);
  }
}

/**
 * Shutdown device
 */
async function handleShutdown(interaction, plugin) {
  await interaction.deferReply();
  
  const deviceMac = interaction.options.getString('device');
  const delay = interaction.options.getInteger('delay') || 5;
  const device = deviceOps.getByMac(deviceMac);
  
  if (!device) {
    return await interaction.editReply('❌ Device not found');
  }
  
  if (!device.shutdown_api_key || !device.shutdown_port) {
    return await interaction.editReply('❌ Device not configured for remote shutdown. Use `/power control configure` to set up.');
  }
  
  try {
    await plugin.powerControlDevice(device.mac, 'shutdown');
    
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🔴 Shutdown Initiated')
      .setDescription(`Shutdown command sent to **${device.hostname || device.ip}**`)
      .addFields(
        { name: 'Device', value: `${device.emoji || '💻'} ${device.hostname || 'Unknown'}`, inline: true },
        { name: 'IP', value: device.ip, inline: true },
        { name: 'Delay', value: `${delay} seconds`, inline: true }
      )
      .setFooter({ text: 'Device will shutdown after countdown' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    
    // Broadcast to dashboard
    broadcastUpdate('power-action', {
      action: 'shutdown',
      device: device.mac,
      delay,
      timestamp: new Date()
    });
    
  } catch (error) {
    logger.error('Shutdown error:', error);
    await interaction.editReply(`❌ Failed to shutdown device: ${error.message}`);
  }
}

/**
 * Restart device
 */
async function handleRestart(interaction, plugin) {
  await interaction.deferReply();
  
  const deviceMac = interaction.options.getString('device');
  const delay = interaction.options.getInteger('delay') || 5;
  const device = deviceOps.getByMac(deviceMac);
  
  if (!device) {
    return await interaction.editReply('❌ Device not found');
  }
  
  if (!device.shutdown_api_key || !device.shutdown_port) {
    return await interaction.editReply('❌ Device not configured for remote shutdown. Use `/power control configure` to set up.');
  }
  
  try {
    await plugin.powerControlDevice(device.mac, 'restart');
    
    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('🔄 Restart Initiated')
      .setDescription(`Restart command sent to **${device.hostname || device.ip}**`)
      .addFields(
        { name: 'Device', value: `${device.emoji || '💻'} ${device.hostname || 'Unknown'}`, inline: true },
        { name: 'IP', value: device.ip, inline: true },
        { name: 'Delay', value: `${delay} seconds`, inline: true }
      )
      .setFooter({ text: 'Device will restart after countdown' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    
    // Broadcast to dashboard
    broadcastUpdate('power-action', {
      action: 'restart',
      device: device.mac,
      delay,
      timestamp: new Date()
    });
    
  } catch (error) {
    logger.error('Restart error:', error);
    await interaction.editReply(`❌ Failed to restart device: ${error.message}`);
  }
}

/**
 * Check power status
 */
async function handleStatus(interaction, plugin) {
  await interaction.deferReply();
  
  const deviceMac = interaction.options.getString('device');
  
  if (deviceMac) {
    // Single device status
    const device = deviceOps.getByMac(deviceMac);
    if (!device) {
      return await interaction.editReply('❌ Device not found');
    }
    
    const powerState = plugin.getPowerState(device.mac);
    
    const embed = new EmbedBuilder()
      .setColor(device.online ? 0x00FF00 : 0xFF0000)
      .setTitle(`⚡ Power Status: ${device.hostname || device.ip}`)
      .addFields(
        { name: 'Device', value: `${device.emoji || '💻'} ${device.hostname || 'Unknown'}`, inline: true },
        { name: 'Status', value: device.online ? '🟢 Online' : '🔴 Offline', inline: true },
        { name: 'IP', value: device.ip, inline: true },
        { name: 'MAC', value: device.mac, inline: true },
        { name: 'Last Seen', value: new Date(device.last_seen).toLocaleString(), inline: true },
        { name: 'Group', value: device.device_group || 'None', inline: true }
      )
      .setTimestamp();
    
    if (device.shutdown_api_key) {
      embed.addFields({ name: 'Remote Control', value: '✅ Configured', inline: true });
    } else {
      embed.addFields({ name: 'Remote Control', value: '❌ Not configured', inline: true });
    }
    
    await interaction.editReply({ embeds: [embed] });
    
  } else {
    // All devices status
    const devices = deviceOps.getAll();
    const online = devices.filter(d => d.online).length;
    const offline = devices.length - online;
    const configured = devices.filter(d => d.shutdown_api_key).length;
    
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('⚡ Power Status Overview')
      .setDescription(`Total devices: **${devices.length}**`)
      .addFields(
        { name: '🟢 Online', value: online.toString(), inline: true },
        { name: '🔴 Offline', value: offline.toString(), inline: true },
        { name: '⚙️ Remote Control', value: `${configured} configured`, inline: true }
      )
      .setTimestamp();
    
    // Group by status
    const onlineDevices = devices.filter(d => d.online).slice(0, 10);
    const offlineDevices = devices.filter(d => !d.online).slice(0, 10);
    
    if (onlineDevices.length > 0) {
      embed.addFields({
        name: 'Online Devices',
        value: onlineDevices.map(d => `${d.emoji || '💻'} ${d.hostname || d.ip}`).join('\n')
      });
    }
    
    if (offlineDevices.length > 0) {
      embed.addFields({
        name: 'Offline Devices',
        value: offlineDevices.map(d => `${d.emoji || '💻'} ${d.hostname || d.ip}`).join('\n')
      });
    }
    
    await interaction.editReply({ embeds: [embed] });
  }
}

/**
 * Configure device for remote shutdown
 */
async function handleConfigure(interaction, plugin) {
  await interaction.deferReply({ ephemeral: true });
  
  const deviceMac = interaction.options.getString('device');
  const apiKey = interaction.options.getString('api_key');
  const port = interaction.options.getInteger('port') || 5000;
  
  const device = deviceOps.getByMac(deviceMac);
  
  if (!device) {
    return await interaction.editReply('❌ Device not found');
  }
  
  try {
    // Update device with shutdown configuration
    const { default: db } = await import('../../src/database/db.js');

const logger = createLogger('power-management');
    const stmt = db.prepare(`
      UPDATE devices 
      SET shutdown_api_key = ?, shutdown_port = ? 
      WHERE mac = ?
    `);
    stmt.run(apiKey, port, deviceMac);
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Device Configured')
      .setDescription(`Remote shutdown configured for **${device.hostname || device.ip}**`)
      .addFields(
        { name: 'Device', value: `${device.emoji || '💻'} ${device.hostname || 'Unknown'}`, inline: true },
        { name: 'Port', value: port.toString(), inline: true },
        { name: 'API Key', value: '***configured***', inline: true }
      )
      .setFooter({ text: 'You can now use /power control shutdown and /power control restart' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    logger.error('Configure error:', error);
    await interaction.editReply(`❌ Failed to configure device: ${error.message}`);
  }
}
