/**
 * Speed Test Commands
 * 
 * Handles speed test execution and history viewing.
 */

import { SlashCommandSubcommandBuilder, EmbedBuilder } from 'discord.js';

// These are subcommands under /network
export const parentCommand = 'network';

// We need to inject two subcommands: speedtest and speedhistory
// Since we can only export one commandGroup, we'll handle this specially
// For now, we'll create a subcommand group
export const commandGroup = null; // Special case - handled in bridge

/**
 * Handle speed test commands
 */
export async function handleCommand(interaction, commandName, subcommand) {
  if (commandName !== 'network') return false;
  
  if (subcommand === 'speedtest') {
    return await handleSpeedTestCommand(interaction);
  } else if (subcommand === 'speedhistory') {
    return await handleSpeedHistoryCommand(interaction);
  }
  
  return false;
}

/**
 * /network speedtest - Run internet speed test
 */
async function handleSpeedTestCommand(interaction) {
  await interaction.deferReply();
  
  try {
    // Get plugin instance
    const { getPlugin } = await import('../../../src/core/plugin-system.js');
    const speedTestPlugin = getPlugin('integrations/speedtest');
    
    if (!speedTestPlugin) {
      await interaction.editReply('❌ Speed test plugin not available!');
      return true;
    }
    
    const userId = interaction.user.id;
    const result = await speedTestPlugin.runSpeedtest(userId);
    
    const embed = new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('🚀 Speed Test Results')
      .addFields(
        { name: '⬇️ Download', value: `${result.download} Mbps`, inline: true },
        { name: '⬆️ Upload', value: `${result.upload} Mbps`, inline: true },
        { name: '📡 Ping', value: `${result.ping} ms`, inline: true },
        { name: '🌐 Server', value: result.server, inline: true },
        { name: '🏢 ISP', value: result.isp, inline: true }
      )
      .setFooter({ text: 'Use /network speedhistory to see past results' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error('Speed test command error:', error);
    await interaction.editReply({
      content: `❌ Failed to run speed test: ${error.message}`,
      ephemeral: true
    });
    return true;
  }
}

/**
 * /network speedhistory - View speed test history
 */
async function handleSpeedHistoryCommand(interaction) {
  await interaction.deferReply();
  
  try {
    // Get plugin instance
    const { getPlugin } = await import('../../../src/core/plugin-system.js');
    const speedTestPlugin = getPlugin('integrations/speedtest');
    
    if (!speedTestPlugin) {
      await interaction.editReply('❌ Speed test plugin not available!');
      return true;
    }
    
    const history = speedTestPlugin.getHistory(10);
    
    if (history.length === 0) {
      await interaction.editReply('📊 No speed test history yet! Run `/network speedtest` first.');
      return true;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle('📊 Speed Test History')
      .setDescription(`Last ${history.length} test(s)`)
      .setTimestamp();
    
    for (const test of history.slice(0, 5)) {
      const date = new Date(test.timestamp).toLocaleString();
      embed.addFields({
        name: `📅 ${date}`,
        value: `⬇️ ${test.download} Mbps | ⬆️ ${test.upload} Mbps | 📡 ${test.ping} ms`,
        inline: false
      });
    }
    
    if (history.length > 5) {
      embed.setFooter({ text: `Showing 5 of ${history.length} tests` });
    }
    
    await interaction.editReply({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error('Speed history command error:', error);
    await interaction.editReply({
      content: `❌ Failed to get speed test history: ${error.message}`,
      ephemeral: true
    });
    return true;
  }
}

// Export speed test function for use by other plugins (e.g., automation)
export async function runSpeedtest(userId = null) {
  const { getPlugin } = await import('../../../src/core/plugin-system.js');
  const speedTestPlugin = getPlugin('integrations/speedtest');
  
  if (!speedTestPlugin) {
    throw new Error('Speed test plugin not available');
  }
  
  return await speedTestPlugin.runSpeedtest(userId);
}
