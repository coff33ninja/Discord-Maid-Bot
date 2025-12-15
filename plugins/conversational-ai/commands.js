/**
 * Conversational AI Commands
 * 
 * Handles chat interactions with the AI bot using full context integration.
 * Exports: /chat, /memory, /ai commands
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';
import { chatOps, configOps } from '../../src/database/db.js';
import { ResponseHandler } from './handlers/response-handler.js';
import * as memoryCommands from './commands/memory-commands.js';
import * as aiCommands from './commands/ai-commands.js';

const logger = createLogger('conversational-ai');

// Response handler instance (initialized lazily)
let responseHandler = null;

/**
 * Initialize response handler with plugin components
 * @param {Object} plugin - ConversationalAI plugin instance
 */
export function initializeHandler(plugin) {
  if (!plugin) return;
  
  const shortTermMemory = plugin.getShortTermMemory();
  if (!shortTermMemory) {
    logger.warn('Short-term memory not available, using basic chat');
    return;
  }
  
  responseHandler = new ResponseHandler({
    shortTermMemory,
    semanticMemory: plugin.getSemanticMemory?.() || null,
    generateFn: async (prompt) => {
      const { result } = await plugin.requestFromCore('gemini-generate', { prompt });
      return result.response.text();
    },
    config: plugin.getConfig()
  });
  
  logger.info('Response handler initialized with context integration');
}

/**
 * Get or create response handler
 * @returns {ResponseHandler|null}
 */
async function getResponseHandler() {
  if (responseHandler) return responseHandler;
  
  // Try to initialize from plugin
  try {
    const { getPlugin } = await import('../../src/core/plugin-system.js');
    const plugin = getPlugin('conversational-ai');
    if (plugin) {
      initializeHandler(plugin);
    }
  } catch (e) {
    logger.debug('Could not initialize response handler:', e.message);
  }
  
  return responseHandler;
}

// Get personality functions from personality plugin (fallback)
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
  
  const saved = configOps.get(`personality_${userId}`);
  return saved || 'maid';
}

async function getPersonality(key) {
  const personalityPlugin = await getPersonalityPlugin();
  if (personalityPlugin) {
    return personalityPlugin.getPersonality(key);
  }
  
  return {
    name: 'Maid',
    emoji: '🌸',
    description: 'Polite and helpful',
    prompt: 'You are a helpful AI assistant.'
  };
}

/**
 * Chat with AI using full context (new method)
 */
async function chatWithContext(userMessage, userId, username, channelId, networkContext = null) {
  const handler = await getResponseHandler();
  
  if (handler) {
    // Use new context-aware handler
    const result = await handler.generateResponse({
      channelId,
      userId,
      username,
      content: userMessage,
      networkContext
    });
    
    // Save to chat history (for backwards compatibility)
    chatOps.add({
      userId,
      username,
      message: userMessage,
      response: result.response
    });
    
    return {
      response: result.response,
      personalityKey: result.personalityKey,
      stats: result.stats
    };
  }
  
  // Fallback to basic chat
  return await chatWithMaidBasic(userMessage, userId, username, networkContext);
}

/**
 * Basic chat function (fallback when handler not available)
 */
async function chatWithMaidBasic(userMessage, userId, username, networkContext = null) {
  const contextInfo = networkContext ? 
    `\n\nCurrent network devices: ${networkContext.deviceCount} devices online` : '';
  
  const personalityKey = await getUserPersonality(userId);
  const personality = await getPersonality(personalityKey);
  
  const prompt = `${personality.prompt}

User message: "${userMessage}"${contextInfo}

Respond in character. Be concise but maintain your personality!`;

  const { getPlugin } = await import('../../src/core/plugin-system.js');
  const conversationalPlugin = getPlugin('conversational-ai');
  const { result } = await conversationalPlugin.requestFromCore('gemini-generate', { prompt });
  const response = result.response.text();
  
  chatOps.add({
    userId,
    username,
    message: userMessage,
    response
  });
  
  return {
    response,
    personalityKey,
    stats: null
  };
}

// Legacy function for backwards compatibility
async function chatWithMaid(userMessage, userId, username, networkContext = null) {
  const result = await chatWithMaidBasic(userMessage, userId, username, networkContext);
  return result.response;
}

// Chat command definition
const chatCommand = new SlashCommandBuilder()
  .setName('chat')
  .setDescription('💬 Chat with the AI bot')
  .addStringOption(option =>
    option
      .setName('message')
      .setDescription('Your message to the bot')
      .setRequired(true)
  );

// Export all commands
export const commands = [
  chatCommand,
  memoryCommands.commandGroup,
  aiCommands.commandGroup
];

// For backwards compatibility
export const commandGroup = chatCommand;

// This is a standalone command (not a subcommand)
export const parentCommand = null;

// Commands this plugin handles (for routing)
export const handlesCommands = ['chat', 'memory', 'ai'];

/**
 * Handle command execution
 */
export async function handleCommand(interaction, commandName, subcommand) {
  switch (commandName) {
    case 'chat':
      return await handleChatMessage(interaction);
    case 'memory':
      return await memoryCommands.handleCommand(interaction, commandName, subcommand);
    case 'ai':
      return await aiCommands.handleCommand(interaction, commandName, subcommand);
    default:
      return false;
  }
}

/**
 * Handle autocomplete
 */
export async function handleAutocomplete(interaction) {
  const commandName = interaction.commandName;
  
  if (commandName === 'ai') {
    return await aiCommands.handleAutocomplete(interaction);
  }
}

/**
 * Process chat message with context integration
 */
export async function handleChatMessage(interaction) {
  await interaction.deferReply();

  try {
    const message = interaction.options.getString('message');
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const channelId = interaction.channelId;

    // Get network context if available
    let networkContext = null;
    try {
      const { deviceOps } = await import('../../src/database/db.js');
      const devices = deviceOps.getAll();
      networkContext = {
        deviceCount: devices.filter(d => d.online).length
      };
    } catch (error) {
      // Network context not available
    }

    // Use context-aware chat
    const result = await chatWithContext(message, userId, username, channelId, networkContext);

    const embed = new EmbedBuilder()
      .setColor('#FFB6C1')
      .setTitle('💬 Chat Response')
      .setDescription(result.response)
      .setFooter({ 
        text: result.stats 
          ? `Personality: ${result.personalityKey} | Context: ${result.stats.shortTermMessages} msgs`
          : `Personality: ${result.personalityKey}`
      })
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

// Export functions for use by other plugins
export { chatWithMaid, chatWithContext, initializeHandler };
