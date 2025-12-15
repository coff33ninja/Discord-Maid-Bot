/**
 * AI Commands
 * 
 * Slash commands for AI settings and information.
 * /ai settings - View AI configuration
 * /ai context - Show current context being used
 * /ai personality - Quick personality switch
 * 
 * @module plugins/conversational-ai/commands/ai-commands
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../../src/logging/logger.js';
import { configOps } from '../../../src/database/db.js';

const logger = createLogger('ai-commands');

/**
 * Command definition
 */
export const commandGroup = new SlashCommandBuilder()
  .setName('ai')
  .setDescription('🤖 AI settings and information')
  .addSubcommand(sub => sub
    .setName('settings')
    .setDescription('View AI configuration'))
  .addSubcommand(sub => sub
    .setName('context')
    .setDescription('Show current context for this channel'))
  .addSubcommand(sub => sub
    .setName('personality')
    .setDescription('Quick personality switch')
    .addStringOption(opt => opt
      .setName('style')
      .setDescription('Personality style')
      .setRequired(true)
      .setAutocomplete(true)));

// Standalone command
export const parentCommand = null;

// Commands this plugin handles
export const handlesCommands = ['ai'];

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
 * Get personality plugin
 */
async function getPersonalityPlugin() {
  try {
    const { getPlugin } = await import('../../../src/core/plugin-system.js');
    return getPlugin('personality');
  } catch (e) {
    return null;
  }
}

/**
 * Handle AI command execution
 */
export async function handleCommand(interaction, commandName, subcommand) {
  if (commandName !== 'ai') return false;
  
  switch (subcommand) {
    case 'settings':
      return await handleSettings(interaction);
    case 'context':
      return await handleContext(interaction);
    case 'personality':
      return await handlePersonality(interaction);
    default:
      return false;
  }
}

/**
 * Handle autocomplete for personality
 */
export async function handleAutocomplete(interaction) {
  const focused = interaction.options.getFocused(true);
  
  if (focused.name === 'style') {
    const personalityPlugin = await getPersonalityPlugin();
    
    if (personalityPlugin?.getPersonalities) {
      const personalities = personalityPlugin.getPersonalities();
      const choices = Object.entries(personalities)
        .filter(([key, p]) => 
          key.toLowerCase().includes(focused.value.toLowerCase()) ||
          p.name.toLowerCase().includes(focused.value.toLowerCase())
        )
        .slice(0, 25)
        .map(([key, p]) => ({
          name: `${p.emoji} ${p.name}`,
          value: key
        }));
      
      await interaction.respond(choices);
    } else {
      // Fallback personalities
      const fallback = [
        { name: '🌸 Maid', value: 'maid' },
        { name: '🤖 Assistant', value: 'assistant' },
        { name: '😊 Friendly', value: 'friendly' }
      ].filter(p => p.name.toLowerCase().includes(focused.value.toLowerCase()));
      
      await interaction.respond(fallback);
    }
  }
}

/**
 * Handle /ai settings
 */
async function handleSettings(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const plugin = await getPlugin();
    if (!plugin) {
      await interaction.editReply('❌ Conversational AI plugin not available.');
      return true;
    }
    
    const config = plugin.getConfig();
    
    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle('⚙️ AI Settings')
      .addFields(
        { name: '📝 Memory Settings', value: '━━━━━━━━━━━━━━━', inline: false },
        { name: 'Max Tokens', value: `${config.shortTermMaxTokens || 4000}`, inline: true },
        { name: 'Max Messages', value: `${config.shortTermMaxMessages || 50}`, inline: true },
        { name: 'Semantic Memory', value: config.semanticMemoryEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: '🎯 Interaction Settings', value: '━━━━━━━━━━━━━━━', inline: false },
        { name: 'Prefix Commands', value: config.prefixCommandsEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Passive Triggers', value: config.passiveTriggersEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Mention Required', value: config.mentionRequired ? '✅ Yes' : '❌ No', inline: true },
        { name: '📊 Context Settings', value: '━━━━━━━━━━━━━━━', inline: false },
        { name: 'Max Context Tokens', value: `${config.maxContextTokens || 6000}`, inline: true },
        { name: 'Semantic Search Limit', value: `${config.semanticSearchLimit || 5}`, inline: true }
      )
      .setFooter({ text: 'Settings are configured via environment variables' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    return true;
    
  } catch (error) {
    logger.error('AI settings error:', error);
    await interaction.editReply(`❌ Error getting settings: ${error.message}`);
    return true;
  }
}

/**
 * Handle /ai context
 */
async function handleContext(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const plugin = await getPlugin();
    if (!plugin) {
      await interaction.editReply('❌ Conversational AI plugin not available.');
      return true;
    }
    
    const channelId = interaction.channelId;
    const userId = interaction.user.id;
    const memory = plugin.getShortTermMemory();
    const semanticMemory = plugin.getSemanticMemory?.();
    
    // Get short-term context
    const shortTermContext = memory?.getContext(channelId, 2000) || [];
    const shortTermTokens = memory?.getTotalTokens(channelId) || 0;
    
    // Get user personality
    const personalityPlugin = await getPersonalityPlugin();
    const personalityKey = personalityPlugin?.getUserPersonality?.(userId) || 'maid';
    const personality = personalityPlugin?.getPersonality?.(personalityKey) || { name: 'Maid', emoji: '🌸' };
    
    // Build context summary
    const contextParts = [];
    
    if (shortTermContext.length > 0) {
      contextParts.push(`**Short-Term Memory:** ${shortTermContext.length} messages (${shortTermTokens} tokens)`);
      const recentMessages = shortTermContext.slice(-3).map(m => {
        const role = m.isBot ? '🤖' : '👤';
        const content = m.content.length > 50 ? m.content.slice(0, 50) + '...' : m.content;
        return `${role} ${content}`;
      });
      contextParts.push(recentMessages.join('\n'));
    } else {
      contextParts.push('**Short-Term Memory:** Empty');
    }
    
    contextParts.push('');
    contextParts.push(`**Personality:** ${personality.emoji} ${personality.name}`);
    
    if (semanticMemory?.isEnabled()) {
      const semanticCount = semanticMemory.getCount?.() || 0;
      contextParts.push(`**Semantic Memory:** ${semanticCount} stored memories`);
    } else {
      contextParts.push('**Semantic Memory:** Disabled');
    }
    
    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('🧠 Current AI Context')
      .setDescription(contextParts.join('\n'))
      .addFields(
        { name: 'Channel', value: `<#${channelId}>`, inline: true },
        { name: 'User', value: `<@${userId}>`, inline: true }
      )
      .setFooter({ text: 'This context is used when generating AI responses' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    return true;
    
  } catch (error) {
    logger.error('AI context error:', error);
    await interaction.editReply(`❌ Error getting context: ${error.message}`);
    return true;
  }
}

/**
 * Handle /ai personality
 */
async function handlePersonality(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const style = interaction.options.getString('style');
    const userId = interaction.user.id;
    
    const personalityPlugin = await getPersonalityPlugin();
    
    if (personalityPlugin?.setUserPersonality) {
      // Use personality plugin
      const success = personalityPlugin.setUserPersonality(userId, style);
      
      if (!success) {
        await interaction.editReply(`❌ Unknown personality: "${style}"`);
        return true;
      }
      
      const personality = personalityPlugin.getPersonality(style);
      
      const embed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('✨ Personality Changed')
        .setDescription(`Your AI personality is now **${personality.emoji} ${personality.name}**`)
        .addFields(
          { name: 'Description', value: personality.description || 'No description', inline: false }
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    } else {
      // Fallback - save to config
      configOps.set(`personality_${userId}`, style);
      
      const embed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('✨ Personality Changed')
        .setDescription(`Your AI personality is now **${style}**`)
        .setFooter({ text: 'Personality plugin not available - using basic mode' })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
    
    return true;
    
  } catch (error) {
    logger.error('AI personality error:', error);
    await interaction.editReply(`❌ Error changing personality: ${error.message}`);
    return true;
  }
}

export default { commandGroup, handleCommand, handleAutocomplete, handlesCommands, parentCommand };
