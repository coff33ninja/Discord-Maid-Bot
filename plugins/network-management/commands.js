/**
 * Network Management Commands
 * 
 * Handles all network-related commands: scan, devices, WOL, config, groups
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';
import { deviceOps } from '../../src/database/db.js';
import { broadcastUpdate } from '../../src/dashboard/server.js';
import { scanUnifiedNetwork, quickPingCheck, isTailscaleAvailable, getTailscaleStatus } from './scanner.js';
import wol from 'wake_on_lan';

const logger = createLogger('network-management');

// Network device cache (shared with plugin)
let networkDevices = [];
let lastScanTime = null;

// Helper functions
async function quickPing() {
  const result = await quickPingCheck();
  networkDevices = result.all;
  lastScanTime = new Date();
  broadcastUpdate('device-update', { 
    devices: result.all, 
    stats: result.stats,
    timestamp: lastScanTime 
  });
  return { 
    devices: result.all, 
    count: result.stats.total,
    stats: result.stats
  };
}

async function scanNetwork() {
  const subnet = process.env.NETWORK_SUBNET || '192.168.0.0/24';
  const result = await scanUnifiedNetwork(subnet);
  networkDevices = result.all;
  lastScanTime = new Date();
  broadcastUpdate('device-update', { 
    devices: result.all, 
    stats: result.stats,
    timestamp: lastScanTime 
  });
  
  // Emit to other plugins
  try {
    const { emitToPlugins } = await import('../../src/core/plugin-system.js');
    await emitToPlugins('networkScan', result.all);
  } catch (error) {
    // Plugin system not available
  }
  
  return { 
    devices: result.all, 
    count: result.stats.total,
    stats: result.stats
  };
}

async function wakeDevice(mac) {
  return new Promise((resolve, reject) => {
    wol.wake(mac, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

// Standalone plugin - defines its own commands
export const parentCommand = null;

// Commands this plugin handles
export const handlesCommands = ['network'];

/**
 * Command definitions - /network
 */
export const commands = [
  new SlashCommandBuilder()
    .setName('network')
    .setDescription('🌐 Network operations and monitoring')
    .addSubcommand(subcommand =>
      subcommand
        .setName('scan')
        .setDescription('Scan network for devices'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('devices')
        .setDescription('List all known devices')
        .addStringOption(option =>
          option.setName('filter')
            .setDescription('Filter devices')
            .addChoices(
              { name: 'Online Only', value: 'online' },
              { name: 'Offline Only', value: 'offline' },
              { name: 'All Devices', value: 'all' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('wol')
        .setDescription('Wake device with Wake-on-LAN')
        .addStringOption(option =>
          option.setName('device')
            .setDescription('Device to wake')
            .setRequired(true)
            .setAutocomplete(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('speedtest')
        .setDescription('Run internet speed test'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('speedhistory')
        .setDescription('View speed test history')
        .addIntegerOption(option =>
          option.setName('days')
            .setDescription('Number of days to show')
            .setMinValue(1)
            .setMaxValue(30)))
];

/**
 * Handle network management commands
 */
export async function handleCommand(interaction, commandName, subcommand) {
  if (commandName !== 'network') return false;
  
  switch (subcommand) {
    case 'scan':
      return await handleScanCommand(interaction);
    case 'devices':
      return await handleDevicesCommand(interaction);
    case 'wol':
      return await handleWolCommand(interaction);
    case 'speedtest':
      return await handleSpeedtestCommand(interaction);
    case 'speedhistory':
      return await handleSpeedhistoryCommand(interaction);
    default:
      return false;
  }
}

/**
 * /network scan - Scan the network for devices
 */
async function handleScanCommand(interaction) {
  await interaction.deferReply();
  
  try {
    const result = await scanNetwork();
    
    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle('🌐 Network Scan Complete')
      .setDescription(`Found **${result.count}** device(s)`)
      .addFields(
        { name: '🟢 Online', value: `${result.stats.online}`, inline: true },
        { name: '🔴 Offline', value: `${result.stats.offline}`, inline: true },
        { name: '📡 Tailscale', value: `${result.stats.tailscale || 0}`, inline: true }
      )
      .setFooter({ text: 'Use /network devices to see details' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Scan command error:', error);
    await interaction.editReply({
      content: `❌ Failed to scan network: ${error.message}`,
      ephemeral: true
    });
    return true;
  }
}

/**
 * /network devices - List all discovered devices
 */
async function handleDevicesCommand(interaction) {
  await interaction.deferReply();
  
  try {
    // Quick ping to refresh status
    await quickPing();
    
    const devices = deviceOps.getAll();
    
    if (devices.length === 0) {
      await interaction.editReply('📡 No devices found. Run `/network scan` first!');
      return true;
    }
    
    const onlineDevices = devices.filter(d => d.online);
    const offlineDevices = devices.filter(d => !d.online);
    
    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle('📡 Network Devices')
      .setDescription(`Total: **${devices.length}** devices`)
      .addFields(
        { 
          name: `🟢 Online (${onlineDevices.length})`, 
          value: onlineDevices.length > 0 
            ? onlineDevices.slice(0, 10).map(d => `${d.emoji || '📱'} ${d.name || d.ip}`).join('\n')
            : 'None',
          inline: false 
        },
        { 
          name: `🔴 Offline (${offlineDevices.length})`, 
          value: offlineDevices.length > 0 
            ? offlineDevices.slice(0, 5).map(d => `${d.emoji || '📱'} ${d.name || d.ip}`).join('\n')
            : 'None',
          inline: false 
        }
      )
      .setFooter({ text: lastScanTime ? `Last scan: ${lastScanTime.toLocaleString()}` : 'No recent scan' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Devices command error:', error);
    await interaction.editReply({
      content: `❌ Failed to list devices: ${error.message}`,
      ephemeral: true
    });
    return true;
  }
}

/**
 * /network wol - Wake a device using Wake-on-LAN
 */
async function handleWolCommand(interaction) {
  await interaction.deferReply();
  
  try {
    const deviceName = interaction.options.getString('device');
    
    // Find device by name
    const devices = deviceOps.getAll();
    const device = devices.find(d => 
      d.name?.toLowerCase() === deviceName.toLowerCase() ||
      d.ip === deviceName ||
      d.mac === deviceName
    );
    
    if (!device) {
      await interaction.editReply(`❌ Device "${deviceName}" not found!`);
      return true;
    }
    
    if (!device.mac) {
      await interaction.editReply(`❌ Device "${device.name || device.ip}" has no MAC address!`);
      return true;
    }
    
    // Send WOL packet
    await wakeDevice(device.mac);
    
    const embed = new EmbedBuilder()
      .setColor('#90EE90')
      .setTitle('⚡ Wake-on-LAN Sent!')
      .setDescription(`Magic packet sent to **${device.name || device.ip}**`)
      .addFields(
        { name: 'MAC Address', value: device.mac, inline: true },
        { name: 'IP Address', value: device.ip, inline: true }
      )
      .setFooter({ text: 'Device should wake up in a few seconds' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('WOL command error:', error);
    await interaction.editReply({
      content: `❌ Failed to wake device: ${error.message}`,
      ephemeral: true
    });
    return true;
  }
}

/**
 * /network speedtest - Run internet speed test
 */
async function handleSpeedtestCommand(interaction) {
  await interaction.deferReply();
  
  try {
    // Delegate to integrations/speedtest plugin if available
    const { getPlugin } = await import('../../src/core/plugin-system.js');
    const integrationsPlugin = getPlugin('integrations');
    
    if (integrationsPlugin && integrationsPlugin.speedtest) {
      const result = await integrationsPlugin.speedtest.runSpeedTest();
      
      const embed = new EmbedBuilder()
        .setColor('#667eea')
        .setTitle('🚀 Speed Test Results')
        .addFields(
          { name: '⬇️ Download', value: `${result.download.toFixed(2)} Mbps`, inline: true },
          { name: '⬆️ Upload', value: `${result.upload.toFixed(2)} Mbps`, inline: true },
          { name: '📶 Ping', value: `${result.ping.toFixed(0)} ms`, inline: true }
        )
        .setFooter({ text: `Server: ${result.server || 'Auto'}` })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return true;
    }
    
    await interaction.editReply('❌ Speed test plugin not available!');
    return true;
  } catch (error) {
    logger.error('Speedtest command error:', error);
    await interaction.editReply({
      content: `❌ Speed test failed: ${error.message}`,
      ephemeral: true
    });
    return true;
  }
}

/**
 * /network speedhistory - View speed test history
 */
async function handleSpeedhistoryCommand(interaction) {
  await interaction.deferReply();
  
  try {
    const days = interaction.options.getInteger('days') || 7;
    const { speedTestOps } = await import('../../src/database/db.js');
    
    const history = speedTestOps.getRecent(days * 4); // ~4 tests per day
    
    if (!history || history.length === 0) {
      await interaction.editReply('📊 No speed test history found. Run `/network speedtest` first!');
      return true;
    }
    
    const avgDownload = history.reduce((sum, t) => sum + t.download, 0) / history.length;
    const avgUpload = history.reduce((sum, t) => sum + t.upload, 0) / history.length;
    const avgPing = history.reduce((sum, t) => sum + t.ping, 0) / history.length;
    
    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle(`📊 Speed Test History (${days} days)`)
      .setDescription(`${history.length} test(s) recorded`)
      .addFields(
        { name: '⬇️ Avg Download', value: `${avgDownload.toFixed(2)} Mbps`, inline: true },
        { name: '⬆️ Avg Upload', value: `${avgUpload.toFixed(2)} Mbps`, inline: true },
        { name: '📶 Avg Ping', value: `${avgPing.toFixed(0)} ms`, inline: true }
      )
      .setFooter({ text: 'View detailed graphs on the dashboard' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Speedhistory command error:', error);
    await interaction.editReply({
      content: `❌ Failed to get speed history: ${error.message}`,
      ephemeral: true
    });
    return true;
  }
}

/**
 * Handle autocomplete for network management commands
 */
export async function handleAutocomplete(interaction, plugin) {
  const focusedOption = interaction.options.getFocused(true);
  const { commandName } = interaction;
  const subcommand = interaction.options.getSubcommand(false);
  
  try {
    // Import autocomplete helpers
    const { getDeviceAutocomplete, getGroupAutocomplete } = await import('../../src/utils/autocomplete-helpers.js');
    
    // Device autocomplete (for WOL and other commands)
    if (focusedOption.name === 'device' || focusedOption.name.startsWith('device')) {
      const choices = getDeviceAutocomplete(focusedOption.value);
      await interaction.respond(choices);
      return;
    }
    
    // Group autocomplete
    if (focusedOption.name === 'group') {
      const choices = getGroupAutocomplete(focusedOption.value);
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

// Export helper functions for use by other plugins
export { quickPing, scanNetwork, wakeDevice, networkDevices };
