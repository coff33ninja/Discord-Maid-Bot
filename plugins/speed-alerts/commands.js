import { SlashCommandSubcommandGroupBuilder } from 'discord.js';

/**
 * Speed Alerts Plugin Commands
 * Auto-loaded by plugin system
 */

export const commandGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('speedalert')
  .setDescription('Speed alert notifications')
  .addSubcommand(subcommand =>
    subcommand
      .setName('config')
      .setDescription('Configure speed alerts')
      .addNumberOption(option =>
        option.setName('threshold')
          .setDescription('Alert when speed drops below (Mbps)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(1000))
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Channel to send alerts')
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('status')
      .setDescription('View current settings'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('enable')
      .setDescription('Enable speed alerts'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('disable')
      .setDescription('Disable speed alerts'));

export const parentCommand = 'automation';

export async function handleCommand(interaction, plugin) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'config':
      return await handleConfig(interaction, plugin);
    case 'status':
      return await handleStatus(interaction, plugin);
    case 'enable':
      return await handleEnable(interaction, plugin);
    case 'disable':
      return await handleDisable(interaction, plugin);
    default:
      await interaction.reply('Unknown subcommand');
  }
}

async function handleConfig(interaction, plugin) {
  const threshold = interaction.options.getNumber('threshold');
  const channel = interaction.options.getChannel('channel');
  
  await plugin.setThreshold(threshold);
  await plugin.setAlertChannel(channel.id);
  
  await interaction.reply({
    embeds: [{
      color: 0x00FF00,
      title: '✅ Speed Alerts Configured',
      fields: [
        { name: 'Threshold', value: `${threshold} Mbps`, inline: true },
        { name: 'Alert Channel', value: `<#${channel.id}>`, inline: true },
        { name: 'Status', value: plugin.enabled ? '✅ Enabled' : '⚠️ Disabled', inline: true }
      ],
      footer: { text: 'Use /automation speedalert enable to activate alerts' },
      timestamp: new Date()
    }]
  });
}

async function handleStatus(interaction, plugin) {
  const settings = await plugin.getSettings();
  
  await interaction.reply({
    embeds: [{
      color: settings.enabled ? 0x00FF00 : 0xFFA500,
      title: '📊 Speed Alert Settings',
      fields: [
        { name: 'Threshold', value: `${settings.threshold} Mbps`, inline: true },
        { name: 'Status', value: settings.enabled ? '✅ Enabled' : '⚠️ Disabled', inline: true },
        { name: 'Alert Channel', value: settings.alertChannel ? `<#${settings.alertChannel}>` : 'Not configured', inline: true }
      ],
      footer: { text: 'Use /automation speedalert config to change settings' },
      timestamp: new Date()
    }]
  });
}

async function handleEnable(interaction, plugin) {
  const { enablePlugin } = await import('../../src/plugins/plugin-manager.js');
  await enablePlugin('speed-alerts');
  
  await interaction.reply({
    embeds: [{
      color: 0x00FF00,
      title: '✅ Speed Alerts Enabled',
      description: 'You will now receive alerts when internet speed drops below the threshold.',
      timestamp: new Date()
    }]
  });
}

async function handleDisable(interaction, plugin) {
  const { disablePlugin } = await import('../../src/plugins/plugin-manager.js');
  await disablePlugin('speed-alerts');
  
  await interaction.reply({
    embeds: [{
      color: 0xFFA500,
      title: '⚠️ Speed Alerts Disabled',
      description: 'Speed alerts have been disabled.',
      timestamp: new Date()
    }]
  });
}
