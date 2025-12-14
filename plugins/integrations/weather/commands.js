/**
 * Weather Commands
 * 
 * Handles weather information requests.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('weather');

// This is a standalone command
export const parentCommand = null;

export const commands = [
  new SlashCommandBuilder()
    .setName('weather')
    .setDescription('🌤️ Get current weather information')
    .addStringOption(option =>
      option
        .setName('city')
        .setDescription('City name (default: Cape Town)')
        .setRequired(false))
];

/**
 * Handle weather command
 */
export async function handleCommand(interaction, commandName, subcommand) {
  if (commandName !== 'weather') return false;

  await interaction.deferReply();

  try {
    const city = interaction.options.getString('city') || 'Cape Town';
    
    // Get plugin instance through integrations parent
    const { getPlugin } = await import('../../../src/core/plugin-system.js');
    const integrationsPlugin = getPlugin('integrations');
    
    if (!integrationsPlugin || !integrationsPlugin.weather) {
      await interaction.editReply('❌ Weather plugin not available!');
      return true;
    }
    
    const weather = await integrationsPlugin.weather.getWeather(city);
    
    const embed = new EmbedBuilder()
      .setColor('#87CEEB')
      .setTitle(`🌤️ Weather in ${weather.city}, ${weather.country}`)
      .setDescription(`**${weather.description.charAt(0).toUpperCase() + weather.description.slice(1)}**`)
      .addFields(
        { name: '🌡️ Temperature', value: `${weather.temp}°C`, inline: true },
        { name: '🤔 Feels Like', value: `${weather.feels_like}°C`, inline: true },
        { name: '💧 Humidity', value: `${weather.humidity}%`, inline: true },
        { name: '💨 Wind Speed', value: `${weather.wind} m/s`, inline: true }
      )
      .setThumbnail(`https://openweathermap.org/img/wn/${weather.icon}@2x.png`)
      .setFooter({ text: 'Powered by OpenWeatherMap' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Weather command error:', error);
    
    let errorMessage = `❌ Failed to get weather: ${error.message}`;
    
    if (error.response?.status === 404) {
      errorMessage = `❌ City not found! Please check the spelling and try again.`;
    } else if (error.message.includes('API key')) {
      errorMessage = `❌ Weather service not configured. Please contact the bot administrator.`;
    }
    
    await interaction.editReply({
      content: errorMessage,
      ephemeral: true
    });
    return true;
  }
}

// Export weather function for use by other plugins (e.g., automation)
export async function getWeather(city = 'Cape Town') {
  const { getPlugin } = await import('../../../src/core/plugin-system.js');
  const integrationsPlugin = getPlugin('integrations');
  
  if (!integrationsPlugin || !integrationsPlugin.weather) {
    throw new Error('Weather plugin not available');
  }
  
  return await integrationsPlugin.weather.getWeather(city);
}
