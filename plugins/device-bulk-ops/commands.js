import { SlashCommandSubcommandGroupBuilder } from 'discord.js';

/**
 * Device Bulk Operations Plugin Commands
 * Auto-loaded by plugin system
 */

export const commandGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('bulk')
  .setDescription('Bulk operations for device management')
  .addSubcommand(subcommand =>
    subcommand
      .setName('rename')
      .setDescription('Bulk rename devices matching a pattern')
      .addStringOption(option =>
        option.setName('pattern')
          .setDescription('Regex pattern to match devices (e.g., "PC", "phone")')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('prefix')
          .setDescription('Prefix to add to device names'))
      .addStringOption(option =>
        option.setName('suffix')
          .setDescription('Suffix to add to device names')))
  .addSubcommand(subcommand =>
    subcommand
      .setName('emoji')
      .setDescription('Bulk set emoji for devices matching a pattern')
      .addStringOption(option =>
        option.setName('pattern')
          .setDescription('Regex pattern to match devices')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('emoji')
          .setDescription('Emoji to set (e.g., 💻, 📱, 🖥️)')
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('group')
      .setDescription('Bulk assign devices to a group')
      .addStringOption(option =>
        option.setName('pattern')
          .setDescription('Regex pattern to match devices')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('group')
          .setDescription('Group name to assign')
          .setRequired(true)));

export const parentCommand = 'device';

export async function handleCommand(interaction, plugin) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'rename':
      return await handleRename(interaction, plugin);
    case 'emoji':
      return await handleEmoji(interaction, plugin);
    case 'group':
      return await handleGroup(interaction, plugin);
    default:
      await interaction.reply('Unknown subcommand');
  }
}

async function handleRename(interaction, plugin) {
  await interaction.deferReply();
  
  const pattern = interaction.options.getString('pattern');
  const prefix = interaction.options.getString('prefix') || '';
  const suffix = interaction.options.getString('suffix') || '';
  
  try {
    const result = await plugin.bulkRename(pattern, prefix, suffix);
    
    if (result.count === 0) {
      await interaction.editReply({
        embeds: [{
          color: 0xFFA500,
          title: '⚠️ No Devices Matched',
          description: `No devices found matching pattern: \`${pattern}\``,
          timestamp: new Date()
        }]
      });
      return;
    }
    
    const deviceList = result.devices
      .slice(0, 10)
      .map(d => `• ${d.device} → **${d.newName}**`)
      .join('\n');
    
    const moreText = result.count > 10 ? `\n\n...and ${result.count - 10} more` : '';
    
    await interaction.editReply({
      embeds: [{
        color: 0x00FF00,
        title: '✅ Bulk Rename Complete',
        description: `Renamed **${result.count}** device(s)\n\n${deviceList}${moreText}`,
        fields: [
          { name: 'Pattern', value: `\`${pattern}\``, inline: true },
          { name: 'Prefix', value: prefix || '(none)', inline: true },
          { name: 'Suffix', value: suffix || '(none)', inline: true }
        ],
        timestamp: new Date()
      }]
    });
  } catch (error) {
    await interaction.editReply(`❌ Failed to rename devices: ${error.message}`);
  }
}

async function handleEmoji(interaction, plugin) {
  await interaction.deferReply();
  
  const pattern = interaction.options.getString('pattern');
  const emoji = interaction.options.getString('emoji');
  
  try {
    const result = await plugin.bulkEmoji(pattern, emoji);
    
    if (result.count === 0) {
      await interaction.editReply({
        embeds: [{
          color: 0xFFA500,
          title: '⚠️ No Devices Matched',
          description: `No devices found matching pattern: \`${pattern}\``,
          timestamp: new Date()
        }]
      });
      return;
    }
    
    const deviceList = result.devices
      .slice(0, 15)
      .map(d => `${d.emoji} ${d.device}`)
      .join('\n');
    
    const moreText = result.count > 15 ? `\n\n...and ${result.count - 15} more` : '';
    
    await interaction.editReply({
      embeds: [{
        color: 0x00FF00,
        title: '✅ Bulk Emoji Update Complete',
        description: `Updated **${result.count}** device(s) with ${emoji}\n\n${deviceList}${moreText}`,
        fields: [
          { name: 'Pattern', value: `\`${pattern}\``, inline: true },
          { name: 'Emoji', value: emoji, inline: true }
        ],
        timestamp: new Date()
      }]
    });
  } catch (error) {
    await interaction.editReply(`❌ Failed to update emojis: ${error.message}`);
  }
}

async function handleGroup(interaction, plugin) {
  await interaction.deferReply();
  
  const pattern = interaction.options.getString('pattern');
  const group = interaction.options.getString('group');
  
  try {
    const result = await plugin.bulkGroup(pattern, group);
    
    if (result.count === 0) {
      await interaction.editReply({
        embeds: [{
          color: 0xFFA500,
          title: '⚠️ No Devices Matched',
          description: `No devices found matching pattern: \`${pattern}\``,
          timestamp: new Date()
        }]
      });
      return;
    }
    
    const deviceList = result.devices
      .slice(0, 15)
      .map(d => `• ${d.device}`)
      .join('\n');
    
    const moreText = result.count > 15 ? `\n\n...and ${result.count - 15} more` : '';
    
    await interaction.editReply({
      embeds: [{
        color: 0x00FF00,
        title: '✅ Bulk Group Assignment Complete',
        description: `Assigned **${result.count}** device(s) to group **${group}**\n\n${deviceList}${moreText}`,
        fields: [
          { name: 'Pattern', value: `\`${pattern}\``, inline: true },
          { name: 'Group', value: group, inline: true }
        ],
        timestamp: new Date()
      }]
    });
  } catch (error) {
    await interaction.editReply(`❌ Failed to assign groups: ${error.message}`);
  }
}
