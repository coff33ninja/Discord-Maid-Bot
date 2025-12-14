/**
 * Conversational AI Commands
 * 
 * Handles chat interactions with the AI bot.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { chatOps } from '../../src/database/db.js';
import { generateWithRotation } from '../../src/config/gemini-keys.js';
import { getPersonality } from '../../src/config/personalities.js';

// Import personality helper from personality plugin
// Note: This creates a soft dependency - chat works even if personality plugin is disabled
let getUserPersonality;
try {
  const personalityPlugin = await import('../personality/commands.js');
  getUserPersonality = personalityPlugin.getUserPersonality;
} catch (error) {
  // Fallback if personality plugin not available
  const { configOps } = await import('../../src/database/db.js');
  const { DEFAULT_PERSONALITY } = await import('../../src/config/personalities.js');
  getUserPersonality = (userId) => {
    const saved = configOps.get(`personality_${userId}`);
    return saved || DEFAULT_PERSONALITY;
  };
}

// Main chat function
async function chatWithMaid(userMessage, userId, username, networkContext = null) {
  const contextInfo = networkContext ? 
    `\n\nCurrent network devices: ${networkContext.deviceCount} devices online` : '';
  
  const personalityKey = getUserPersonality(userId);
  const personality = getPersonality(personalityKey);
  
  const prompt = `${personality.prompt}

User message: "${userMessage}"${contextInfo}

Respond in character. Be concise but maintain your personality!`;

  const { result } = await generateWithRotation(prompt);
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

// Command definitions
export const commands = [
  new SlashCommandBuilder()
    .setName('chat')
    .setDescription('💬 Chat with the AI bot')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Your message to the bot')
        .setRequired(true)
    )
];

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

    // Request network context from core (if available)
    let networkContext = null;
    try {
      const { networkDevices } = await import('../../index-handlers.js');
      networkContext = {
        deviceCount: networkDevices.length
      };
    } catch (error) {
      // Network context not available, continue without it
    }

    const response = await chatWithMaid(message, userId, username, networkContext);

    const embed = new EmbedBuilder()
      .setColor('#FFB6C1')
      .setTitle('💬 Chat Response')
      .setDescription(response)
      .setFooter({ text: `Personality: ${getUserPersonality(userId)}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return true;

  } catch (error) {
    console.error('Chat command error:', error);
    await interaction.editReply({
      content: `❌ Failed to process chat: ${error.message}\n\nI apologize for the inconvenience, Master!`,
      ephemeral: true
    });
    return true;
  }
}

// Export chat function for use by other plugins
export { chatWithMaid };
