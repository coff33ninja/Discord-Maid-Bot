/**
 * Memory Commands
 * 
 * Slash commands for managing AI memory.
 * /memory view - View current short-term memory for channel
 * /memory clear - Clear short-term memory for channel
 * /memory search <query> - Search semantic memory
 * 
 * @module plugins/conversational-ai/commands/memory-commands
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('memory-commands');

/**
 * Command definition
 */
export const commandGroup = new SlashCommandBuilder()
  .setName('memory')
  .setDescription('🧠 Manage AI memory')
  .addSubcommand(sub => sub
    .setName('view')
    .setDescription('View short-term memory for this channel'))
  .addSubcommand(sub => sub
    .setName('clear')
    .setDescription('Clear short-term memory for this channel'))
  .addSubcommand(sub => sub
    .setName('search')
    .setDescription('Search semantic memory')
    .addStringOption(opt => opt
      .setName('query')
      .setDescription('Search query')
      .setRequired(true)))
  .addSubcommand(sub => sub
    .setName('stats')
    .setDescription('View memory statistics'));

// Standalone command
export const parentCommand = null;

// Commands this plugin handles
export const handlesCommands = ['memory'];

/**
 * Get plugin instance
 */
async function getPlugin() {
  try {
    const { getPlugin } = await import('../../../src/core/plugin-system.js');
    return getPlugin('conversational-ai');
  } catch (e) {
    return null;
  }
}

/**
 * Handle memory command execution
 */
export async function handleCommand(interaction, commandName, subcommand) {
  if (commandName !== 'memory') return false;
  
  switch (subcommand) {
    case 'view':
      return await handleView(interaction);
    case 'clear':
      return await handleClear(interaction);
    case 'search':
      return await handleSearch(interaction);
    case 'stats':
      return await handleStats(interaction);
    default:
      return false;
  }
}

/**
 * Handle /memory view
 */
async function handleView(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const plugin = await getPlugin();
    if (!plugin) {
      await interaction.editReply('❌ Conversational AI plugin not available.');
      return true;
    }
    
    const channelId = interaction.channelId;
    const memory = plugin.getShortTermMemory();
    
    if (!memory) {
      await interaction.editReply('❌ Memory system not initialized.');
      return true;
    }
    
    const context = memory.getContext(channelId, 10000);
    
    if (context.length === 0) {
      await interaction.editReply('📭 No messages in memory for this channel.');
      return true;
    }
    
    // Format messages
    const messages = context.map((msg, i) => {
      const role = msg.isBot ? '🤖' : '👤';
      const name = msg.username || (msg.isBot ? 'Bot' : 'User');
      const time = new Date(msg.timestamp).toLocaleTimeString();
      const content = msg.content.length > 100 
        ? msg.content.slice(0, 100) + '...' 
        : msg.content;
      return `${role} **${name}** (${time})\n${content}`;
    });
    
    const totalTokens = memory.getTotalTokens(channelId);
    
    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('🧠 Short-Term Memory')
      .setDescription(messages.join('\n\n').slice(0, 4000))
      .addFields(
        { name: 'Messages', value: `${context.length}`, inline: true },
        { name: 'Tokens', value: `${totalTokens}`, inline: true },
        { name: 'Channel', value: `<#${channelId}>`, inline: true }
      )
      .setFooter({ text: 'Memory is cleared on bot restart' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    return true;
    
  } catch (error) {
    logger.error('Memory view error:', error);
    await interaction.editReply(`❌ Error viewing memory: ${error.message}`);
    return true;
  }
}

/**
 * Handle /memory clear
 */
async function handleClear(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const plugin = await getPlugin();
    if (!plugin) {
      await interaction.editReply('❌ Conversational AI plugin not available.');
      return true;
    }
    
    const channelId = interaction.channelId;
    const memory = plugin.getShortTermMemory();
    
    if (!memory) {
      await interaction.editReply('❌ Memory system not initialized.');
      return true;
    }
    
    const countBefore = memory.getMessageCount(channelId);
    memory.clear(channelId);
    
    const embed = new EmbedBuilder()
      .setColor('#2ECC71')
      .setTitle('🧹 Memory Cleared')
      .setDescription(`Cleared ${countBefore} messages from short-term memory.`)
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    return true;
    
  } catch (error) {
    logger.error('Memory clear error:', error);
    await interaction.editReply(`❌ Error clearing memory: ${error.message}`);
    return true;
  }
}

/**
 * Handle /memory search
 */
async function handleSearch(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const plugin = await getPlugin();
    if (!plugin) {
      await interaction.editReply('❌ Conversational AI plugin not available.');
      return true;
    }
    
    const query = interaction.options.getString('query');
    const channelId = interaction.channelId;
    const semanticMemory = plugin.getSemanticMemory?.();
    
    if (!semanticMemory || !semanticMemory.isEnabled()) {
      await interaction.editReply('❌ Semantic memory is not enabled.');
      return true;
    }
    
    const results = semanticMemory.search(query, channelId, 5);
    
    if (results.length === 0) {
      await interaction.editReply(`📭 No memories found matching "${query}".`);
      return true;
    }
    
    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle(`🔍 Memory Search: "${query}"`)
      .setDescription(results.map((mem, i) => {
        const date = new Date(mem.endTimestamp).toLocaleDateString();
        return `**${i + 1}.** [${date}] ${mem.summary}`;
      }).join('\n\n'))
      .setFooter({ text: `Found ${results.length} memories` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    return true;
    
  } catch (error) {
    logger.error('Memory search error:', error);
    await interaction.editReply(`❌ Error searching memory: ${error.message}`);
    return true;
  }
}

/**
 * Handle /memory stats
 */
async function handleStats(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const plugin = await getPlugin();
    if (!plugin) {
      await interaction.editReply('❌ Conversational AI plugin not available.');
      return true;
    }
    
    const memory = plugin.getShortTermMemory();
    const semanticMemory = plugin.getSemanticMemory?.();
    
    const shortTermStats = memory?.getStats() || { channelCount: 0, totalMessages: 0, totalTokens: 0 };
    const semanticEnabled = semanticMemory?.isEnabled() || false;
    const semanticCount = semanticMemory?.getCount?.() || 0;
    
    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('📊 Memory Statistics')
      .addFields(
        { name: '📝 Short-Term Memory', value: '━━━━━━━━━━━━━━━', inline: false },
        { name: 'Active Channels', value: `${shortTermStats.channelCount}`, inline: true },
        { name: 'Total Messages', value: `${shortTermStats.totalMessages}`, inline: true },
        { name: 'Total Tokens', value: `${shortTermStats.totalTokens}`, inline: true },
        { name: '🧠 Semantic Memory', value: '━━━━━━━━━━━━━━━', inline: false },
        { name: 'Status', value: semanticEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Stored Memories', value: `${semanticCount}`, inline: true }
      )
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    return true;
    
  } catch (error) {
    logger.error('Memory stats error:', error);
    await interaction.editReply(`❌ Error getting stats: ${error.message}`);
    return true;
  }
}

export default { commandGroup, handleCommand, handlesCommands, parentCommand };
