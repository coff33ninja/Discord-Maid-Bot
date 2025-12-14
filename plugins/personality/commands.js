/**
 * Personality Commands
 * 
 * Handles personality selection and management.
 */

import { SlashCommandSubcommandBuilder, EmbedBuilder } from 'discord.js';
import { configOps } from '../../src/database/db.js';
import { getPersonality, getPersonalityOptions, DEFAULT_PERSONALITY } from '../../src/config/personalities.js';

// Helper functions
function getUserPersonality(userId) {
  const saved = configOps.get(`personality_${userId}`);
  return saved || DEFAULT_PERSONALITY;
}

function setUserPersonality(userId, personalityKey) {
  configOps.set(`personality_${userId}`, personalityKey);
}

// This is a subcommand under /bot
export const parentCommand = 'bot';

// Command group info - single subcommand, not a group
export const commandGroup = new SlashCommandSubcommandBuilder()
  .setName('personality')
  .setDescription('Change bot personality')
  .addStringOption(option =>
    option.setName('style')
      .setDescription('Personality style')
      .addChoices(
        { name: '🌸 Maid', value: 'maid' },
        { name: '💢 Tsundere', value: 'tsundere' },
        { name: '❄️ Kuudere', value: 'kuudere' },
        { name: '🥺 Dandere', value: 'dandere' },
        { name: '🖤 Yandere', value: 'yandere' },
        { name: '⭐ Genki', value: 'genki' },
        { name: '💋 Onee-san', value: 'oneesan' },
        { name: '🔮 Chuunibyou', value: 'chuunibyou' },
        { name: '🎩 Butler', value: 'butler' },
        { name: '🐱 Catgirl', value: 'catgirl' }
      ));

/**
 * Handle personality command execution
 */
export async function handleCommand(interaction, commandName, subcommand) {
  if (commandName !== 'bot' || subcommand !== 'personality') return false;

  try {
    const userId = interaction.user.id;
    const selectedStyle = interaction.options.getString('style');
    
    if (!selectedStyle) {
      // Show current personality and all options
      const currentKey = getUserPersonality(userId);
      const current = getPersonality(currentKey);
      const options = getPersonalityOptions();
      
      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('🎭 Bot Personality Settings')
        .setDescription(`**Current:** ${current.emoji} ${current.name}\n\n*${current.description}*`)
        .addFields({
          name: '📋 Available Personalities',
          value: options.map(p => `${p.emoji} **${p.name}** - ${p.description}`).join('\n'),
          inline: false
        })
        .setFooter({ text: 'Use /bot personality style:<name> to change' })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      return true;
    }
    
    // Set new personality
    const personality = getPersonality(selectedStyle);
    setUserPersonality(userId, selectedStyle);
    
    const embed = new EmbedBuilder()
      .setColor('#90EE90')
      .setTitle(`${personality.emoji} Personality Changed!`)
      .setDescription(`Your bot personality is now: **${personality.name}**\n\n*${personality.description}*`)
      .setFooter({ text: 'Try /chat to see the new personality in action!' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    return true;

  } catch (error) {
    console.error('Personality command error:', error);
    await interaction.reply({
      content: `❌ Failed to change personality: ${error.message}`,
      ephemeral: true
    });
    return true;
  }
}

// Export helper functions for use by other plugins
export { getUserPersonality, setUserPersonality };
