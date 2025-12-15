/**
 * Research Commands
 * 
 * Handles AI-powered research and web search functionality.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';

const logger = createLogger('research');

// Standalone plugin - defines its own commands
export const parentCommand = null;

// Commands this plugin handles (for routing)
export const handlesCommands = ['research'];

/**
 * Command definitions - /research
 */
export const commands = [
  new SlashCommandBuilder()
    .setName('research')
    .setDescription('🔎 Research and search tools')
    .addSubcommand(subcommand =>
      subcommand
        .setName('query')
        .setDescription('Research a topic with AI')
        .addStringOption(option =>
          option.setName('query')
            .setDescription('What to research')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('history')
        .setDescription('View past research')
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Number of results')
            .setMinValue(5)
            .setMaxValue(50)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('search')
        .setDescription('Search through past research')
        .addStringOption(option =>
          option.setName('query')
            .setDescription('Search terms')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('web')
        .setDescription('Search the web (DuckDuckGo)')
        .addStringOption(option =>
          option.setName('query')
            .setDescription('What to search for')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('results')
            .setDescription('Number of results (1-10)')
            .setMinValue(1)
            .setMaxValue(10)))
];

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
    const searchTerm = interaction.options.getString('query');
    
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
 * /research web - Web search using DuckDuckGo
 */
async function handleWebSearch(interaction) {
  await interaction.deferReply();
  
  try {
    const query = interaction.options.getString('query');
    const maxResults = interaction.options.getInteger('results') || 5;
    
    const { searchWeb, formatSearchResults } = await import('./web-search.js');
    
    const response = await searchWeb(query, maxResults);
    
    if (response.error || response.results.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle(`🔎 Search: ${query}`)
        .setDescription(response.error 
          ? `Search failed: ${response.error}` 
          : 'No instant results found')
        .addFields({
          name: 'Try searching directly',
          value: `[DuckDuckGo](${response.searchUrl})`
        })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      return true;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#667eea')
      .setTitle(`🔎 Search: ${query}`)
      .setDescription(`Found ${response.totalResults} result(s)`)
      .setTimestamp();
    
    for (const result of response.results.slice(0, 5)) {
      const snippet = result.snippet.length > 200 
        ? result.snippet.substring(0, 200) + '...' 
        : result.snippet;
      
      embed.addFields({
        name: result.title,
        value: `${snippet}\n[Link](${result.url})`,
        inline: false
      });
    }
    
    embed.addFields({
      name: 'More Results',
      value: `[Search on DuckDuckGo](${response.searchUrl})`
    });
    
    await interaction.editReply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Web search error:', error);
    await interaction.editReply({
      content: `❌ Web search failed: ${error.message}`,
      ephemeral: true
    });
    return true;
  }
}

// Export research function for use by other plugins
export async function webResearch(query, userId = null) {
  const { getPlugin } = await import('../../src/core/plugin-system.js');
  const researchPlugin = getPlugin('research');
  
  if (!researchPlugin) {
    throw new Error('Research plugin not available');
  }
  
  return await researchPlugin.webResearch(query, userId);
}
