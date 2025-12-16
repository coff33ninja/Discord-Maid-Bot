/**
 * Device Management Commands
 * 
 * Handles /device command with config, list, and group subcommands
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';
import { deviceOps } from '../../src/database/db.js';

const logger = createLogger('device-management');

// Standalone plugin - defines its own commands
export const parentCommand = null;

// Commands this plugin handles
export const handlesCommands = ['device'];

/**
 * Command definitions - /device
 */
export const commands = [
  new SlashCommandBuilder()
    .setName('device')
    .setDescription('📱 Device management and configuration')
    .addSubcommandGroup(group =>
      group
        .setName('group')
        .setDescription('Manage device groups')
        .addSubcommand(subcommand =>
          subcommand
            .setName('assign')
            .setDescription('Assign device to a group')
            .addStringOption(option =>
              option.setName('device')
                .setDescription('Device to assign')
                .setRequired(true)
                .setAutocomplete(true))
            .addStringOption(option =>
              option.setName('group')
                .setDescription('Group name')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all groups'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('view')
            .setDescription('View devices in a group')
            .addStringOption(option =>
              option.setName('group')
                .setDescription('Group name')
                .setRequired(true)
                .setAutocomplete(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove device from its group')
            .addStringOption(option =>
              option.setName('device')
                .setDescription('Device to remove')
                .setRequired(true)
                .setAutocomplete(true))))
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('Configure device properties')
        .addStringOption(option =>
          option.setName('device')
            .setDescription('Device to configure')
            .setRequired(true)
            .setAutocomplete(true))
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Friendly name'))
        .addStringOption(option =>
          option.setName('emoji')
            .setDescription('Emoji (e.g., 🎮 💻 📱)'))
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Device type')
            .addChoices(
              { name: '💻 PC/Desktop', value: 'pc' },
              { name: '💻 Laptop', value: 'laptop' },
              { name: '🖥️ Server', value: 'server' },
              { name: '📱 Phone', value: 'phone' },
              { name: '📲 Tablet', value: 'tablet' },
              { name: '📡 Router', value: 'router' },
              { name: '🖨️ Printer', value: 'printer' },
              { name: '📺 TV', value: 'tv' },
              { name: '🎮 Gaming', value: 'gaming' },
              { name: '🔌 IoT/Smart', value: 'iot' }
            ))
        .addStringOption(option =>
          option.setName('os')
            .setDescription('Operating system')
            .addChoices(
              { name: 'Windows', value: 'Windows' },
              { name: 'Linux', value: 'Linux' },
              { name: 'macOS', value: 'macOS' },
              { name: 'Android', value: 'Android' },
              { name: 'iOS', value: 'iOS' },
              { name: 'Ubuntu', value: 'Ubuntu' },
              { name: 'Debian', value: 'Debian' },
              { name: 'FreeBSD', value: 'FreeBSD' }
            ))
        .addStringOption(option =>
          option.setName('group')
            .setDescription('Group name')))
    .addSubcommand(subcommand =>
      subcommand
        .setName('rename')
        .setDescription('Rename a device')
        .addStringOption(option =>
          option.setName('device')
            .setDescription('Device to rename')
            .setRequired(true)
            .setAutocomplete(true))
        .addStringOption(option =>
          option.setName('name')
            .setDescription('New name for the device')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Get detailed info about a device')
        .addStringOption(option =>
          option.setName('device')
            .setDescription('Device to get info about')
            .setRequired(true)
            .setAutocomplete(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('scan')
        .setDescription('Deep scan a device with nmap to detect type/OS')
        .addStringOption(option =>
          option.setName('device')
            .setDescription('Device to scan (leave empty for all)')
            .setAutocomplete(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all known devices')
        .addStringOption(option =>
          option.setName('filter')
            .setDescription('Filter devices')
            .addChoices(
              { name: 'Online Only', value: 'online' },
              { name: 'Offline Only', value: 'offline' },
              { name: 'All Devices', value: 'all' }
            )))
];

/**
 * Handle device management commands
 */
export async function handleCommand(interaction, commandName, subcommand) {
  if (commandName !== 'device') return false;
  
  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  
  // Handle /device group subcommands
  if (subcommandGroup === 'group') {
    switch (subcommand) {
      case 'assign':
        return await handleGroupAssign(interaction);
      case 'list':
        return await handleGroupList(interaction);
      case 'view':
        return await handleGroupView(interaction);
      case 'remove':
        return await handleGroupRemove(interaction);
      default:
        return false;
    }
  }
  
  // Handle /device subcommands (no group)
  switch (subcommand) {
    case 'config':
      return await handleDeviceConfig(interaction);
    case 'list':
      return await handleDeviceList(interaction);
    case 'rename':
      return await handleDeviceRename(interaction);
    case 'info':
      return await handleDeviceInfo(interaction);
    case 'scan':
      return await handleDeviceScan(interaction);
    default:
      return false;
  }
}

/**
 * /device group assign
 */
async function handleGroupAssign(interaction) {
  try {
    const deviceMac = interaction.options.getString('device');
    const groupName = interaction.options.getString('group');
    
    const device = deviceOps.getByMac(deviceMac);
    if (!device) {
      await interaction.reply({ content: '❌ Device not found!', ephemeral: true });
      return true;
    }
    
    deviceOps.upsert({ ...device, group: groupName });
    
    await interaction.reply({
      embeds: [{
        color: 0x90EE90,
        title: '✅ Device Assigned to Group',
        description: `**${device.name || device.ip}** is now in group **${groupName}**`,
        timestamp: new Date().toISOString()
      }]
    });
    return true;
  } catch (error) {
    logger.error('Group assign error:', error);
    await interaction.reply({ content: `❌ Failed: ${error.message}`, ephemeral: true });
    return true;
  }
}

/**
 * /device group list
 */
async function handleGroupList(interaction) {
  try {
    const groups = deviceOps.getAllGroups();
    
    if (!groups || groups.length === 0) {
      await interaction.reply('📁 No device groups found. Use `/device group assign` to create one!');
      return true;
    }
    
    const groupList = groups.map(g => {
      const devices = deviceOps.getByGroup(g);
      return `📁 **${g}** (${devices.length} devices)`;
    }).join('\n');
    
    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle('📁 Device Groups')
      .setDescription(groupList)
      .setFooter({ text: 'Use /device group view <name> to see devices' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Group list error:', error);
    await interaction.reply({ content: `❌ Failed: ${error.message}`, ephemeral: true });
    return true;
  }
}

/**
 * /device group view
 */
async function handleGroupView(interaction) {
  try {
    const groupName = interaction.options.getString('group');
    const devices = deviceOps.getByGroup(groupName);
    
    if (!devices || devices.length === 0) {
      await interaction.reply(`📁 No devices in group **${groupName}**`);
      return true;
    }
    
    const deviceList = devices.map(d => {
      const status = d.online ? '🟢' : '🔴';
      const label = d.name ? `${d.name} (${d.ip})` : d.ip;
      return `${status} ${d.emoji || '📱'} ${label}`;
    }).join('\n');
    
    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle(`📁 Group: ${groupName}`)
      .setDescription(deviceList)
      .addFields(
        { name: 'Total', value: `${devices.length}`, inline: true },
        { name: 'Online', value: `${devices.filter(d => d.online).length}`, inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Group view error:', error);
    await interaction.reply({ content: `❌ Failed: ${error.message}`, ephemeral: true });
    return true;
  }
}

/**
 * /device group remove
 */
async function handleGroupRemove(interaction) {
  try {
    const deviceMac = interaction.options.getString('device');
    
    const device = deviceOps.getByMac(deviceMac);
    if (!device) {
      await interaction.reply({ content: '❌ Device not found!', ephemeral: true });
      return true;
    }
    
    const oldGroup = device.group;
    deviceOps.upsert({ ...device, group: null });
    
    await interaction.reply({
      embeds: [{
        color: 0x90EE90,
        title: '✅ Device Removed from Group',
        description: `**${device.name || device.ip}** removed from group **${oldGroup || 'none'}**`,
        timestamp: new Date().toISOString()
      }]
    });
    return true;
  } catch (error) {
    logger.error('Group remove error:', error);
    await interaction.reply({ content: `❌ Failed: ${error.message}`, ephemeral: true });
    return true;
  }
}

/**
 * /device config
 */
async function handleDeviceConfig(interaction) {
  try {
    const deviceMac = interaction.options.getString('device');
    const newName = interaction.options.getString('name');
    const newEmoji = interaction.options.getString('emoji');
    const newType = interaction.options.getString('type');
    const newOs = interaction.options.getString('os');
    const newGroup = interaction.options.getString('group');
    
    const device = deviceOps.getByMac(deviceMac);
    if (!device) {
      await interaction.reply({ content: '❌ Device not found!', ephemeral: true });
      return true;
    }
    
    const changes = [];
    
    if (newName) {
      deviceOps.updateNotes(device.id, newName);
      changes.push(`Name: **${newName}**`);
    }
    if (newEmoji) {
      deviceOps.updateEmoji(device.id, newEmoji);
      changes.push(`Emoji: ${newEmoji}`);
    }
    if (newType) {
      // Update device_type directly
      const { db } = await import('../../src/database/db.js');
      db.prepare('UPDATE devices SET device_type = ? WHERE id = ?').run(newType, device.id);
      changes.push(`Type: **${newType}**`);
    }
    if (newOs) {
      // Update os directly
      const { db } = await import('../../src/database/db.js');
      db.prepare('UPDATE devices SET os = ? WHERE id = ?').run(newOs, device.id);
      changes.push(`OS: **${newOs}**`);
    }
    if (newGroup) {
      deviceOps.updateGroup(device.id, newGroup);
      changes.push(`Group: **${newGroup}**`);
    }
    
    if (changes.length === 0) {
      await interaction.reply({ content: '⚠️ No changes specified!', ephemeral: true });
      return true;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#90EE90')
      .setTitle('✅ Device Configured')
      .setDescription(`Updated **${device.notes || device.hostname || device.ip}**\n\n${changes.join('\n')}`)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Device config error:', error);
    await interaction.reply({ content: `❌ Failed: ${error.message}`, ephemeral: true });
    return true;
  }
}

/**
 * /device list
 */
async function handleDeviceList(interaction) {
  await interaction.deferReply();
  
  try {
    const filter = interaction.options.getString('filter') || 'all';
    let devices = deviceOps.getAll();
    
    if (filter === 'online') {
      devices = devices.filter(d => d.online);
    } else if (filter === 'offline') {
      devices = devices.filter(d => !d.online);
    }
    
    if (devices.length === 0) {
      await interaction.editReply(`📱 No ${filter === 'all' ? '' : filter + ' '}devices found.`);
      return true;
    }
    
    const deviceList = devices.slice(0, 20).map(d => {
      const status = d.online ? '🟢' : '🔴';
      const emoji = d.emoji || '📱';
      const label = d.notes || d.hostname || d.ip;
      const type = d.device_type ? ` [${d.device_type}]` : '';
      const os = d.os ? ` (${d.os})` : '';
      return `${status} ${emoji} ${label}${type}${os}`;
    }).join('\n');
    
    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle(`📱 Devices (${filter})`)
      .setDescription(deviceList)
      .addFields(
        { name: 'Total', value: `${devices.length}`, inline: true },
        { name: 'Showing', value: `${Math.min(devices.length, 20)}`, inline: true }
      )
      .setFooter({ text: 'Use /device config to customize devices' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Device list error:', error);
    await interaction.editReply({ content: `❌ Failed: ${error.message}` });
    return true;
  }
}

/**
 * Handle autocomplete
 */
export async function handleAutocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);
  
  try {
    if (focusedOption.name === 'device') {
      const devices = deviceOps.getAll();
      const value = focusedOption.value.toLowerCase();
      
      const filtered = devices
        .filter(d => {
          const name = (d.name || d.hostname || d.ip).toLowerCase();
          return name.includes(value) || d.ip.includes(value);
        })
        .slice(0, 25)
        .map(d => ({
          name: `${d.emoji || '📱'} ${d.name || d.hostname || d.ip} (${d.ip})`.substring(0, 100),
          value: d.mac
        }));
      
      await interaction.respond(filtered);
      return;
    }
    
    if (focusedOption.name === 'group') {
      const groups = deviceOps.getAllGroups();
      const value = focusedOption.value.toLowerCase();
      
      const filtered = groups
        .filter(g => g.toLowerCase().includes(value))
        .slice(0, 25)
        .map(g => ({ name: g, value: g }));
      
      await interaction.respond(filtered);
      return;
    }
    
    await interaction.respond([]);
  } catch (error) {
    logger.error('Autocomplete error:', error);
    await interaction.respond([]);
  }
}

/**
 * /device rename
 */
async function handleDeviceRename(interaction) {
  try {
    const deviceMac = interaction.options.getString('device');
    const newName = interaction.options.getString('name');
    
    const device = deviceOps.getByMac(deviceMac);
    if (!device) {
      await interaction.reply({ content: '❌ Device not found!', ephemeral: true });
      return true;
    }
    
    const oldName = device.notes || device.hostname || device.ip;
    deviceOps.updateNotes(device.id, newName);
    
    const embed = new EmbedBuilder()
      .setColor('#90EE90')
      .setTitle('✅ Device Renamed')
      .setDescription(`**${oldName}** → **${newName}**`)
      .addFields(
        { name: 'IP', value: device.ip, inline: true },
        { name: 'MAC', value: device.mac, inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Device rename error:', error);
    await interaction.reply({ content: `❌ Failed: ${error.message}`, ephemeral: true });
    return true;
  }
}

/**
 * /device info
 */
async function handleDeviceInfo(interaction) {
  try {
    const deviceMac = interaction.options.getString('device');
    
    const device = deviceOps.getByMac(deviceMac);
    if (!device) {
      await interaction.reply({ content: '❌ Device not found!', ephemeral: true });
      return true;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle(`${device.emoji || '📱'} ${device.notes || device.hostname || device.ip}`)
      .addFields(
        { name: 'IP Address', value: device.ip, inline: true },
        { name: 'MAC Address', value: device.mac, inline: true },
        { name: 'Status', value: device.online ? '🟢 Online' : '🔴 Offline', inline: true },
        { name: 'Type', value: device.device_type || 'Unknown', inline: true },
        { name: 'OS', value: device.os || 'Unknown', inline: true },
        { name: 'Group', value: device.device_group || 'None', inline: true },
        { name: 'First Seen', value: device.first_seen ? new Date(device.first_seen).toLocaleDateString() : 'Unknown', inline: true },
        { name: 'Last Seen', value: device.last_seen ? new Date(device.last_seen).toLocaleDateString() : 'Unknown', inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Device info error:', error);
    await interaction.reply({ content: `❌ Failed: ${error.message}`, ephemeral: true });
    return true;
  }
}

/**
 * /device scan - Deep scan with nmap
 */
async function handleDeviceScan(interaction) {
  await interaction.deferReply();
  
  try {
    const deviceMac = interaction.options.getString('device');
    const { detectDeviceType, getDeviceEmoji } = await import('../network-management/device-detector.js');
    const { db } = await import('../../src/database/db.js');
    
    let devices = [];
    
    if (deviceMac) {
      // Scan single device
      const device = deviceOps.getByMac(deviceMac);
      if (!device) {
        await interaction.editReply('❌ Device not found!');
        return true;
      }
      devices = [device];
    } else {
      // Scan all online devices
      devices = deviceOps.getAll().filter(d => d.online);
    }
    
    if (devices.length === 0) {
      await interaction.editReply('📱 No devices to scan.');
      return true;
    }
    
    await interaction.editReply(`🔍 Deep scanning ${devices.length} device(s) with nmap... This may take a while.`);
    
    const results = [];
    
    for (const device of devices) {
      try {
        const detection = await detectDeviceType({ ip: device.ip, mac: device.mac, hostname: device.hostname }, true);
        
        if (detection.type !== 'unknown') {
          // Update database
          db.prepare('UPDATE devices SET device_type = ?, os = ? WHERE id = ?')
            .run(detection.type, detection.os || null, device.id);
          
          // Update emoji if not set
          if (!device.emoji) {
            const emoji = getDeviceEmoji(detection.type);
            deviceOps.updateEmoji(device.id, emoji);
          }
          
          results.push({
            name: device.notes || device.hostname || device.ip,
            type: detection.type,
            os: detection.os,
            confidence: detection.confidence,
            method: detection.method
          });
        } else {
          results.push({
            name: device.notes || device.hostname || device.ip,
            type: 'unknown',
            os: null,
            confidence: 0,
            method: 'none'
          });
        }
      } catch (e) {
        logger.warn(`Scan failed for ${device.ip}: ${e.message}`);
        results.push({
          name: device.notes || device.hostname || device.ip,
          type: 'error',
          error: e.message
        });
      }
    }
    
    const detected = results.filter(r => r.type !== 'unknown' && r.type !== 'error');
    const unknown = results.filter(r => r.type === 'unknown');
    const errors = results.filter(r => r.type === 'error');
    
    let description = '';
    
    if (detected.length > 0) {
      description += '**✅ Detected:**\n';
      description += detected.map(r => 
        `• ${r.name}: ${r.type}${r.os ? ` (${r.os})` : ''} [${Math.round(r.confidence * 100)}%]`
      ).join('\n');
      description += '\n\n';
    }
    
    if (unknown.length > 0) {
      description += `**❓ Unknown:** ${unknown.length} device(s)\n\n`;
    }
    
    if (errors.length > 0) {
      description += `**❌ Errors:** ${errors.length} device(s)\n`;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle('🔍 Deep Scan Results')
      .setDescription(description || 'No results')
      .addFields(
        { name: 'Scanned', value: `${devices.length}`, inline: true },
        { name: 'Detected', value: `${detected.length}`, inline: true },
        { name: 'Unknown', value: `${unknown.length}`, inline: true }
      )
      .setFooter({ text: 'Uses nmap for OS detection' })
      .setTimestamp();
    
    await interaction.editReply({ content: null, embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Device scan error:', error);
    await interaction.editReply(`❌ Scan failed: ${error.message}`);
    return true;
  }
}
