import { SlashCommandSubcommandGroupBuilder } from 'discord.js';

/**
 * Network Insights Plugin Commands
 * Auto-loaded by plugin system
 */

export const commandGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('insights')
  .setDescription('AI-powered network insights')
  .addSubcommand(subcommand =>
    subcommand
      .setName('analyze')
      .setDescription('Generate AI insights about your network'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('latest')
      .setDescription('View the latest network insights'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('history')
      .setDescription('View past network insights')
      .addIntegerOption(option =>
        option.setName('limit')
          .setDescription('Number of insights to show')
          .setMinValue(1)
          .setMaxValue(20)));

export const parentCommand = 'network';

export async function handleCommand(interaction, plugin) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'analyze':
      return await handleAnalyze(interaction, plugin);
    case 'latest':
      return await handleLatest(interaction, plugin);
    case 'history':
      return await handleHistory(interaction, plugin);
    default:
      await interaction.reply('Unknown subcommand');
  }
}

async function handleAnalyze(interaction, plugin) {
  await interaction.deferReply();
  
  try {
    const insight = await plugin.generateInsights();
    
    await interaction.editReply({
      embeds: [{
        color: 0x00AAFF,
        title: '🧠 AI Network Insights',
        description: insight.insights,
        fields: [
          { name: '📊 Devices', value: `${insight.stats.onlineDevices}/${insight.stats.totalDevices} online`, inline: true },
          { name: '📈 Avg Speed', value: `${insight.stats.avgDownload} Mbps`, inline: true },
          { name: '📉 Trend', value: insight.stats.speedTrend, inline: true }
        ],
        footer: { text: 'AI-powered analysis using Gemini' },
        timestamp: new Date(insight.timestamp)
      }]
    });
  } catch (error) {
    await interaction.editReply(`❌ Failed to generate insights: ${error.message}`);
  }
}

async function handleLatest(interaction, plugin) {
  await interaction.deferReply();
  
  const insight = await plugin.getLatestInsight();
  
  if (!insight) {
    await interaction.editReply('❌ No insights available yet. Run `/network insights analyze` to generate insights.');
    return;
  }
  
  await interaction.editReply({
    embeds: [{
      color: 0x00AAFF,
      title: '🧠 Latest Network Insights',
      description: insight.insights,
      fields: [
        { name: '📊 Devices', value: `${insight.stats.onlineDevices}/${insight.stats.totalDevices} online`, inline: true },
        { name: '📈 Avg Speed', value: `${insight.stats.avgDownload} Mbps`, inline: true },
        { name: '📉 Trend', value: insight.stats.speedTrend, inline: true },
        { name: '🆕 New Devices', value: insight.stats.newDevices.toString(), inline: true },
        { name: '❓ Unknown', value: insight.stats.unknownDevices.toString(), inline: true },
        { name: '⏱️ Avg Ping', value: `${insight.stats.avgPing} ms`, inline: true }
      ],
      footer: { text: 'AI-powered analysis using Gemini' },
      timestamp: new Date(insight.timestamp)
    }]
  });
}

async function handleHistory(interaction, plugin) {
  await interaction.deferReply();
  
  const limit = interaction.options.getInteger('limit') || 5;
  const history = await plugin.getInsightHistory(limit);
  
  if (history.length === 0) {
    await interaction.editReply('❌ No insights history available. Run `/network insights analyze` to generate insights.');
    return;
  }
  
  const description = history.map((insight, index) => {
    const date = new Date(insight.timestamp).toLocaleDateString();
    const time = new Date(insight.timestamp).toLocaleTimeString();
    const preview = insight.insights.split('\n')[0].substring(0, 100);
    
    return `**${index + 1}. ${date} ${time}**\n${preview}...\n`;
  }).join('\n');
  
  await interaction.editReply({
    embeds: [{
      color: 0x00AAFF,
      title: '📚 Network Insights History',
      description,
      footer: { text: `Showing ${history.length} most recent insight(s)` }
    }]
  });
}
