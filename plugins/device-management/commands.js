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
          option.setName('group')
            .setDescription('Group name')))
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
    const newGroup = interaction.options.getString('group');
    
    const device = deviceOps.getByMac(deviceMac);
    if (!device) {
      await interaction.reply({ content: '❌ Device not found!', ephemeral: true });
      return true;
    }
    
    const updated = { ...device };
    const changes = [];
    
    if (newName) {
      updated.name = newName;
      changes.push(`Name: **${newName}**`);
    }
    if (newEmoji) {
      updated.emoji = newEmoji;
      changes.push(`Emoji: ${newEmoji}`);
    }
    if (newGroup) {
      updated.group = newGroup;
      changes.push(`Group: **${newGroup}**`);
    }
    
    if (changes.length === 0) {
      await interaction.reply({ content: '⚠️ No changes specified!', ephemeral: true });
      return true;
    }
    
    deviceOps.upsert(updated);
    
    const embed = new EmbedBuilder()
      .setColor('#90EE90')
      .setTitle('✅ Device Configured')
      .setDescription(`Updated **${device.name || device.ip}**\n\n${changes.join('\n')}`)
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
      const label = d.name ? `${d.name} (${d.ip})` : (d.hostname || d.ip);
      const group = d.group ? ` [${d.group}]` : '';
      return `${status} ${emoji} ${label}${group}`;
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
