/**
 * Network Management Commands
 * 
 * Handles all network-related commands: scan, devices, WOL, config, groups
 */

import { SlashCommandSubcommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';
import { deviceOps } from '../../src/database/db.js';
import { broadcastUpdate } from '../../src/dashboard/server.js';
import { scanUnifiedNetwork, quickPingCheck, isTailscaleAvailable, getTailscaleStatus } from './scanner.js';
import wol from 'wake_on_lan';

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

const logger = createLogger('network-management');
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

// This plugin provides subcommands for /network and /device commands
// Commands are already defined in slash-commands.js, this plugin only provides handlers
export const parentCommand = null; // Special: multiple parents
export const commandGroup = null; // Handler-only plugin (commands defined in slash-commands.js)

// List of parent commands this plugin handles
export const handlesCommands = ['network', 'device'];

/**
 * Handle network management commands
 */
export async function handleCommand(interaction, commandName, subcommand) {
  const userId = interaction.user.id;
  
  // Handle /network commands
  if (commandName === 'network') {
    if (subcommand === 'scan') {
      return await handleScanCommand(interaction);
    } else if (subcommand === 'devices') {
      return await handleDevicesCommand(interaction);
    } else if (subcommand === 'wol') {
      return await handleWolCommand(interaction);
    }
  }
  
  // Handle /device commands
  if (commandName === 'device') {
    if (subcommand === 'config') {
      return await handleDeviceConfigCommand(interaction);
    } else if (subcommand === 'list') {
      return await handleDeviceListCommand(interaction);
    } else if (subcommand === 'group') {
      return await handleDeviceGroupCommand(interaction);
    }
  }
  
  return false;
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
 * /device config - Configure device settings
 */
async function handleDeviceConfigCommand(interaction) {
  await interaction.reply({
    content: '🚧 Device configuration coming soon!\n\nThis command will allow you to set device names, emojis, and other properties.',
    ephemeral: true
  });
  return true;
}

/**
 * /device list - List devices (alias for /network devices)
 */
async function handleDeviceListCommand(interaction) {
  return await handleDevicesCommand(interaction);
}

/**
 * /device group - Manage device groups
 */
async function handleDeviceGroupCommand(interaction) {
  await interaction.reply({
    content: '🚧 Device groups coming soon!\n\nThis command will allow you to organize devices into groups.',
    ephemeral: true
  });
  return true;
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
