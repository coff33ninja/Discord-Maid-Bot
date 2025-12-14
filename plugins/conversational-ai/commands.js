/**
 * Conversational AI Commands
 * 
 * Handles chat interactions with the AI bot.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';
import { chatOps, configOps } from '../../src/database/db.js';

// Get personality functions from personality plugin
// Note: This creates a soft dependency - chat works even if personality plugin is disabled
async function getPersonalityPlugin() {
  try {
    const { getPlugin } = await import('../../src/core/plugin-system.js');
    return getPlugin('personality');
  } catch (e) {
    return null;
  }
}

async function getUserPersonality(userId) {
  const personalityPlugin = await getPersonalityPlugin();
  if (personalityPlugin) {
    return personalityPlugin.getUserPersonality(userId);
  }
  
  // Fallback if personality plugin not available
  const saved = configOps.get(`personality_${userId}`);
  return saved || 'maid';
}

async function getPersonality(key) {
  const personalityPlugin = await getPersonalityPlugin();
  if (personalityPlugin) {
    return personalityPlugin.getPersonality(key);
  }
  
  // Fallback - return basic maid personality
  return {
    name: 'Maid',
    emoji: '🌸',
    description: 'Polite and helpful',
    prompt: 'You are a helpful AI assistant.'
  };
}

// Main chat function
async function chatWithMaid(userMessage, userId, username, networkContext = null) {
  const contextInfo = networkContext ? 
    `\n\nCurrent network devices: ${networkContext.deviceCount} devices online` : '';
  
  const personalityKey = await getUserPersonality(userId);
  const personality = await getPersonality(personalityKey);
  
  const prompt = `${personality.prompt}

User message: "${userMessage}"${contextInfo}

Respond in character. Be concise but maintain your personality!`;

  // Use core handler for Gemini API
  const { getPlugin } = await import('../../src/core/plugin-system.js');
  const conversationalPlugin = getPlugin('conversational-ai');
  const { result } = await conversationalPlugin.requestFromCore('gemini-generate', { prompt });
  const response = result.response.text();
  
  // Save to chat history
  chatOps.add({
    userId,
    username,
    message: userMessage,
    response
  });
  
  return response;
}

// Command definition - standalone command
export const commandGroup = new SlashCommandBuilder()
  .setName('chat')
  .setDescription('💬 Chat with the AI bot')
  .addStringOption(option =>
    option
      .setName('message')
      .setDescription('Your message to the bot')
      .setRequired(true)
  );

// This is a standalone command (not a subcommand)
export const parentCommand = null;

/**
 * Handle chat command execution
 */
export async function handleCommand(interaction, commandName, subcommand) {
  if (commandName !== 'chat') return false;

  await interaction.deferReply();

  try {
    const message = interaction.options.getString('message');
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Request network context from network-management plugin (if available)
    let networkContext = null;
    try {
      const { deviceOps } = await import('../../src/database/db.js');

const logger = createLogger('conversational-ai');
      const devices = deviceOps.getAll();
      networkContext = {
        deviceCount: devices.filter(d => d.online).length
      };
    } catch (error) {
      // Network context not available, continue without it
    }

    const response = await chatWithMaid(message, userId, username, networkContext);

    const personalityKey = await getUserPersonality(userId);
    
    const embed = new EmbedBuilder()
      .setColor('#FFB6C1')
      .setTitle('💬 Chat Response')
      .setDescription(response)
      .setFooter({ text: `Personality: ${personalityKey}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return true;

  } catch (error) {
    logger.error('Chat command error:', error);
    await interaction.editReply({
      content: `❌ Failed to process chat: ${error.message}\n\nI apologize for the inconvenience, Master!`,
      ephemeral: true
    });
    return true;
  }
}

// Export chat function for use by other plugins
export { chatWithMaid };
