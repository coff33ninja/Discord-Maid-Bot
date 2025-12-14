/**
 * Research Commands
 * 
 * Handles AI-powered research and web search functionality.
 */

import { SlashCommandSubcommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';

// These are subcommands under /research
export const parentCommand = 'research';

// We'll handle multiple subcommands via bridge routing
export const commandGroup = null; // Special case - handled in bridge

/**
 * Handle research commands
 */
export async function handleCommand(interaction, commandName, subcommand) {
  if (commandName !== 'research') return false;
  
  switch (subcommand) {
    case 'query':
      return await handleResearchQuery(interaction);
    case 'history':
      return await handleResearchHistory(interaction);
    case 'search':
      return await handleResearchSearch(interaction);
    case 'web':
      return await handleWebSearch(interaction);
    default:
      return false;
  }
}

/**
 * /research query - Perform AI-powered research
 */
async function handleResearchQuery(interaction) {
  await interaction.deferReply();
  
  try {
    const query = interaction.options.getString('query');
    const userId = interaction.user.id;
    
    // Get plugin instance
    const { getPlugin } = await import('../../src/core/plugin-system.js');
    const researchPlugin = getPlugin('research');
    
    if (!researchPlugin) {
      await interaction.editReply('❌ Research plugin not available!');
      return true;
    }
    
    const result = await researchPlugin.webResearch(query, userId);
    
    // Split response if too long
    const maxLength = 4000;
    let response = result.response;
    
    if (response.length > maxLength) {
      response = response.substring(0, maxLength) + '\n\n... (truncated)';
    }
    
    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle(`🔎 Research: ${query}`)
      .setDescription(response)
      .addFields(
        { name: '📄 Saved As', value: result.filename, inline: true },
        { name: '💾 SMB', value: result.savedToSmb ? '✅ Yes' : '❌ No', inline: true }
      )
      .setFooter({ text: 'Use /research history to see past research' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Research query error:', error);
    await interaction.editReply({
      content: `❌ Research failed: ${error.message}`,
      ephemeral: true
    });
    return true;
  }
}

/**
 * /research history - View research history
 */
async function handleResearchHistory(interaction) {
  await interaction.deferReply();
  
  try {
    // Get plugin instance
    const { getPlugin } = await import('../../src/core/plugin-system.js');
    const researchPlugin = getPlugin('research');
    
    if (!researchPlugin) {
      await interaction.editReply('❌ Research plugin not available!');
      return true;
    }
    
    const history = researchPlugin.getHistory(10);
    
    if (history.length === 0) {
      await interaction.editReply('📚 No research history yet! Use `/research query` to start.');
      return true;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle('📚 Research History')
      .setDescription(`Last ${history.length} research(es)`)
      .setTimestamp();
    
    for (const research of history.slice(0, 5)) {
      const date = new Date(research.timestamp).toLocaleString();
      const preview = research.result.substring(0, 100) + '...';
      embed.addFields({
        name: `🔎 ${research.query}`,
        value: `${preview}\n📅 ${date}`,
        inline: false
      });
    }
    
    if (history.length > 5) {
      embed.setFooter({ text: `Showing 5 of ${history.length} researches` });
    }
    
    await interaction.editReply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Research history error:', error);
    await interaction.editReply({
      content: `❌ Failed to get research history: ${error.message}`,
      ephemeral: true
    });
    return true;
  }
}

/**
 * /research search - Search research history
 */
async function handleResearchSearch(interaction) {
  await interaction.deferReply();
  
  try {
    const searchTerm = interaction.options.getString('term');
    
    // Get plugin instance
    const { getPlugin } = await import('../../src/core/plugin-system.js');
    const researchPlugin = getPlugin('research');
    
    if (!researchPlugin) {
      await interaction.editReply('❌ Research plugin not available!');
      return true;
    }
    
    const results = researchPlugin.searchHistory(searchTerm);
    
    if (results.length === 0) {
      await interaction.editReply(`🔍 No research found matching "${searchTerm}"`);
      return true;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle(`🔍 Search Results: "${searchTerm}"`)
      .setDescription(`Found ${results.length} result(s)`)
      .setTimestamp();
    
    for (const research of results.slice(0, 5)) {
      const date = new Date(research.timestamp).toLocaleString();
      const preview = research.result.substring(0, 100) + '...';
      embed.addFields({
        name: `🔎 ${research.query}`,
        value: `${preview}\n📅 ${date}`,
        inline: false
      });
    }
    
    if (results.length > 5) {
      embed.setFooter({ text: `Showing 5 of ${results.length} results` });
    }
    
    await interaction.editReply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Research search error:', error);
    await interaction.editReply({
      content: `❌ Failed to search research: ${error.message}`,
      ephemeral: true
    });
    return true;
  }
}

/**
 * /research web - Web search (placeholder for future DuckDuckGo integration)
 */
async function handleWebSearch(interaction) {
  await interaction.reply({
    content: '🚧 Web search coming soon!\n\nThis will integrate with DuckDuckGo for real-time web searches.',
    ephemeral: true
  });
  return true;
}

// Export research function for use by other plugins
export async function webResearch(query, userId = null) {
  const { getPlugin } = await import('../../src/core/plugin-system.js');

const logger = createLogger('research');
  const researchPlugin = getPlugin('research');
  
  if (!researchPlugin) {
    throw new Error('Research plugin not available');
  }
  
  return await researchPlugin.webResearch(query, userId);
}
