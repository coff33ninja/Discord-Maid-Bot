import { SlashCommandSubcommandGroupBuilder } from 'discord.js';

/**
 * Device Health Plugin Commands
 * Auto-loaded by plugin system
 */

export const commandGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('health')
  .setDescription('Device health monitoring')
  .addSubcommand(subcommand =>
    subcommand
      .setName('report')
      .setDescription('View device health report')
      .addStringOption(option =>
        option.setName('device')
          .setDescription('Device to check (leave empty for all)')
          .setAutocomplete(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('summary')
      .setDescription('View health summary for all devices'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('unhealthy')
      .setDescription('List devices with poor health (uptime < 90%)'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('reliable')
      .setDescription('List most reliable devices (uptime > 99%)'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('compare')
      .setDescription('Compare two devices')
      .addStringOption(option =>
        option.setName('device1')
          .setDescription('First device')
          .setRequired(true)
          .setAutocomplete(true))
      .addStringOption(option =>
        option.setName('device2')
          .setDescription('Second device')
          .setRequired(true)
          .setAutocomplete(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('alerts')
      .setDescription('Check for predictive alerts'));

// Parent command to attach to
export const parentCommand = 'automation';

// Command handler
export async function handleCommand(interaction, plugin) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'report':
      return await handleHealthReport(interaction, plugin);
    case 'summary':
      return await handleHealthSummary(interaction, plugin);
    case 'unhealthy':
      return await handleUnhealthy(interaction, plugin);
    case 'reliable':
      return await handleReliable(interaction, plugin);
    case 'compare':
      return await handleCompare(interaction, plugin);
    case 'alerts':
      return await handleAlerts(interaction, plugin);
    default:
      await interaction.reply('Unknown subcommand');
  }
}

// Autocomplete handler
export async function handleAutocomplete(interaction, plugin) {
  const focusedOption = interaction.options.getFocused(true);
  
  try {
    // Import autocomplete helpers
    const { getDeviceAutocomplete } = await import('../../src/utils/autocomplete-helpers.js');
    
    if (focusedOption.name === 'device' || focusedOption.name.startsWith('device')) {
      const choices = getDeviceAutocomplete(focusedOption.value);
      await interaction.respond(choices);
      return;
    }
    
    // Default: no suggestions
    await interaction.respond([]);
    
  } catch (error) {
    console.error('Autocomplete error:', error);
    await interaction.respond([]);
  }
}

// Handler implementations
async function handleHealthReport(interaction, plugin) {
  await interaction.deferReply();
  
  const deviceMac = interaction.options.getString('device');
  
  if (deviceMac) {
    // Single device report
    const health = plugin.getDeviceHealth(deviceMac);
    
    if (!health) {
      await interaction.editReply('❌ No health data found for this device');
      return;
    }
    
    const embed = {
      color: health.uptimePercentage >= 95 ? 0x00FF00 : health.uptimePercentage >= 80 ? 0xFFA500 : 0xFF0000,
      title: `🏥 Health Report: ${health.name}`,
      fields: [
        { name: '📊 Uptime', value: `${health.uptimePercentage}%`, inline: true },
        { name: '✅ Online Checks', value: health.onlineChecks.toString(), inline: true },
        { name: '❌ Offline Checks', value: health.offlineChecks.toString(), inline: true },
        { name: '⏱️ Avg Response', value: `${health.averageResponseTime}ms`, inline: true },
        { name: '📅 Monitoring Since', value: `${health.ageInDays} days`, inline: true },
        { name: '🔌 Offline Incidents', value: health.offlineIncidents.toString(), inline: true },
        { name: '⏰ Last Online', value: new Date(health.lastOnline).toLocaleString(), inline: false },
      ],
      footer: { text: `MAC: ${health.mac}` },
      timestamp: new Date()
    };
    
    if (health.currentOfflineDuration > 0) {
      embed.fields.push({
        name: '⚠️ Currently Offline',
        value: plugin.formatDuration(health.currentOfflineDuration),
        inline: false
      });
    }
    
    if (health.longestOffline > 0) {
      embed.fields.push({
        name: '📉 Longest Offline',
        value: plugin.formatDuration(health.longestOffline),
        inline: true
      });
    }
    
    if (health.avgOfflineDuration > 0) {
      embed.fields.push({
        name: '📊 Avg Offline Duration',
        value: plugin.formatDuration(health.avgOfflineDuration),
        inline: true
      });
    }
    
    await interaction.editReply({ embeds: [embed] });
  } else {
    // All devices summary
    const allHealth = plugin.getAllDeviceHealth();
    
    if (allHealth.length === 0) {
      await interaction.editReply('❌ No health data available. Run a network scan first.');
      return;
    }
    
    const description = allHealth
      .slice(0, 20)
      .map(h => {
        const status = h.uptimePercentage >= 95 ? '🟢' : h.uptimePercentage >= 80 ? '🟡' : '🔴';
        return `${status} **${h.name}** - ${h.uptimePercentage}% uptime`;
      })
      .join('\n');
    
    await interaction.editReply({
      embeds: [{
        color: 0x00AAFF,
        title: '🏥 Device Health Overview',
        description: description + (allHealth.length > 20 ? `\n\n...and ${allHealth.length - 20} more` : ''),
        footer: { text: `Total: ${allHealth.length} devices` }
      }]
    });
  }
}

async function handleHealthSummary(interaction, plugin) {
  await interaction.deferReply();
  
  const summary = plugin.getHealthSummary();
  
  if (summary.totalDevices === 0) {
    await interaction.editReply('❌ No health data available. Run a network scan first.');
    return;
  }
  
  const embed = {
    color: 0x00AAFF,
    title: '📊 Network Health Summary',
    fields: [
      { name: '📱 Total Devices', value: summary.totalDevices.toString(), inline: true },
      { name: '📊 Average Uptime', value: `${summary.averageUptime}%`, inline: true },
      { name: '✅ Healthy Devices', value: `${summary.healthyDevices} (≥90%)`, inline: true },
      { name: '⚠️ Unhealthy Devices', value: `${summary.unhealthyDevices} (<90%)`, inline: true },
    ],
    timestamp: new Date()
  };
  
  if (summary.mostReliable) {
    embed.fields.push({
      name: '🏆 Most Reliable',
      value: `${summary.mostReliable.name} (${summary.mostReliable.uptimePercentage}%)`,
      inline: true
    });
  }
  
  if (summary.leastReliable) {
    embed.fields.push({
      name: '⚠️ Needs Attention',
      value: `${summary.leastReliable.name} (${summary.leastReliable.uptimePercentage}%)`,
      inline: true
    });
  }
  
  await interaction.editReply({ embeds: [embed] });
}

async function handleUnhealthy(interaction, plugin) {
  await interaction.deferReply();
  
  const unhealthy = plugin.getUnhealthyDevices();
  
  if (unhealthy.length === 0) {
    await interaction.editReply('✅ All devices are healthy! (≥90% uptime)');
    return;
  }
  
  const description = unhealthy
    .map(h => `🔴 **${h.name}** - ${h.uptimePercentage}% uptime (${h.offlineIncidents} incidents)`)
    .join('\n');
  
  await interaction.editReply({
    embeds: [{
      color: 0xFF0000,
      title: '⚠️ Unhealthy Devices (<90% uptime)',
      description,
      footer: { text: `${unhealthy.length} device(s) need attention` }
    }]
  });
}

async function handleReliable(interaction, plugin) {
  await interaction.deferReply();
  
  const reliable = plugin.getMostReliableDevices();
  
  if (reliable.length === 0) {
    await interaction.editReply('❌ No devices with >99% uptime found');
    return;
  }
  
  const description = reliable
    .map(h => `🟢 **${h.name}** - ${h.uptimePercentage}% uptime (${h.averageResponseTime}ms avg)`)
    .join('\n');
  
  await interaction.editReply({
    embeds: [{
      color: 0x00FF00,
      title: '🏆 Most Reliable Devices (>99% uptime)',
      description,
      footer: { text: `${reliable.length} rock-solid device(s)` }
    }]
  });
}

async function handleCompare(interaction, plugin) {
  await interaction.deferReply();
  
  const mac1 = interaction.options.getString('device1');
  const mac2 = interaction.options.getString('device2');
  
  const comparison = plugin.compareDevices(mac1, mac2);
  
  if (!comparison) {
    await interaction.editReply('❌ Could not compare devices. Make sure both have health data.');
    return;
  }
  
  const { device1, device2, comparison: comp } = comparison;
  
  await interaction.editReply({
    embeds: [{
      color: 0x00AAFF,
      title: '⚖️ Device Comparison',
      fields: [
        { name: '📱 Device 1', value: device1.name, inline: true },
        { name: '📱 Device 2', value: device2.name, inline: true },
        { name: '\u200B', value: '\u200B', inline: false },
        { name: '📊 Uptime', value: `${device1.uptimePercentage}% vs ${device2.uptimePercentage}%`, inline: true },
        { name: '⏱️ Response Time', value: `${device1.averageResponseTime}ms vs ${device2.averageResponseTime}ms`, inline: true },
        { name: '🔌 Offline Incidents', value: `${device1.offlineIncidents} vs ${device2.offlineIncidents}`, inline: true },
        { name: '🏆 More Reliable', value: comp.moreReliable, inline: false }
      ]
    }]
  });
}

async function handleAlerts(interaction, plugin) {
  await interaction.deferReply();
  
  const alerts = await plugin.checkPredictiveAlerts();
  
  if (alerts.length === 0) {
    await interaction.editReply('✅ No predictive alerts. All devices are behaving normally.');
    return;
  }
  
  const description = alerts
    .map(a => `⚠️ **${a.device}** has been offline for ${a.offlineDuration} minutes (usually ${a.uptimePercentage}% uptime)`)
    .join('\n');
  
  await interaction.editReply({
    embeds: [{
      color: 0xFFA500,
      title: '🔮 Predictive Alerts',
      description,
      footer: { text: `${alerts.length} unusual behavior(s) detected` }
    }]
  });
}
