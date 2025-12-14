/**
 * Temporary Bridge File - Command Handlers
 * 
 * This file temporarily holds all command and autocomplete handlers
 * from the old monolithic index.js during Phase 1 refactor.
 * 
 * In later phases, these handlers will be migrated to plugins.
 * This file will be deleted once migration is complete.
 * 
 * DO NOT ADD NEW CODE HERE - This is temporary!
 */

import { EmbedBuilder } from 'discord.js';
import axios from 'axios';
import speedtest from 'speedtest-net';
import wol from 'wake_on_lan';
import { deviceOps, speedTestOps, researchOps, chatOps, taskOps, configOps } from './src/database/db.js';
import { broadcastUpdate } from './src/dashboard/server.js';
import { scheduleTask, stopTask } from './src/scheduler/tasks.js';
import { emitToPlugins } from './src/core/plugin-system.js';
import { scanUnifiedNetwork, quickPingCheck, isTailscaleAvailable, getTailscaleStatus } from './src/network/unified-scanner.js';
import { saveToSMB } from './src/config/smb-config.js';
import { geminiKeys, generateWithRotation } from './src/config/gemini-keys.js';
import { getPersonality, getPersonalityOptions, DEFAULT_PERSONALITY } from './src/config/personalities.js';
import { checkUserPermission } from './src/core/permission-manager.js';
import { PERMISSIONS } from './src/auth/auth.js';

// Network device cache
let networkDevices = [];
let lastScanTime = null;

// Helper functions (will be moved to plugins later)
async function quickPing() {
  const result = await quickPingCheck();
  networkDevices = result.all;
  lastScanTime = new Date();
  broadcastUpdate('device-update', { 
    devices: result.all, 
    stats: result.stats,
    timestamp: lastScanTime 
  });
  return { 
    devices: result.all, 
    count: result.stats.total,
    stats: result.stats
  };
}

async function scanNetwork() {
  const subnet = process.env.NETWORK_SUBNET || '192.168.0.0/24';
  const result = await scanUnifiedNetwork(subnet);
  networkDevices = result.all;
  lastScanTime = new Date();
  broadcastUpdate('device-update', { 
    devices: result.all, 
    stats: result.stats,
    timestamp: lastScanTime 
  });
  await emitToPlugins('networkScan', result.all);
  return { 
    devices: result.all, 
    count: result.stats.total,
    stats: result.stats
  };
}

async function wakeDevice(mac) {
  return new Promise((resolve, reject) => {
    wol.wake(mac, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function runSpeedtest(userId = null) {
  console.log('🚀 Running speedtest...');
  const result = await speedtest({ acceptLicense: true, acceptGdpr: true });
  const testResult = {
    download: (result.download.bandwidth * 8 / 1000000).toFixed(2),
    upload: (result.upload.bandwidth * 8 / 1000000).toFixed(2),
    ping: result.ping.latency.toFixed(2),
    server: result.server.name,
    isp: result.isp,
    userId
  };
  speedTestOps.add(testResult);
  broadcastUpdate('speedtest-complete', testResult);
  await emitToPlugins('speedTest', testResult);
  return testResult;
}

async function webResearch(query, userId = null) {
  console.log('🔎 Researching:', query);
  const prompt = `Research this topic and provide a comprehensive summary: ${query}
  
  Include:
  - Key findings
  - Important facts
  - Relevant data
  - Sources if possible
  
  Format as a clear, organized response.`;

  let responseText = '';
  let successful = false;

  try {
    const { result, keyUsed } = await generateWithRotation(prompt);
    const response = result.response;
    
    if (response && typeof response.text === 'function' && response.candidates && response.candidates.length > 0) {
      responseText = response.text();
      successful = true;
      console.log(`✅ Research completed using key: ${keyUsed}`);
    } else {
      const finishReason = response?.promptFeedback?.blockReason || 'unknown reason';
      responseText = `Research blocked or failed. Reason: ${finishReason}`;
      console.warn(`Research for query "${query}" failed. Reason: ${finishReason}`, response);
    }
  } catch (error) {
    console.error(`Error during web research for query "${query}":`, error);
    responseText = `An internal error occurred during research. Details: ${error.message}`;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `research_${query.replace(/\s+/g, '_').substring(0, 30)}_${timestamp}.txt`;
  const content = `Research Query: ${query}\n\nDate: ${new Date().toISOString()}\n\nResult:\n${responseText}`;
  
  let smbSaveResult = { savedToSMB: false, error: null };
  try {
    smbSaveResult = await saveToSMB(filename, content);
  } catch(smbError) {
    console.error('SMB save error during research logging:', smbError);
    smbSaveResult.error = smbError.message;
  }

  try {
    researchOps.add({
      query,
      result: responseText,
      filename,
      savedToSmb: smbSaveResult.savedToSMB,
      userId
    });
  } catch (dbError) {
    console.error('CRITICAL: Failed to save research log to database even after sanitizing.', dbError);
    throw dbError;
  }
  
  if (!successful) {
    throw new Error(responseText);
  }

  return { response: responseText, filename, savedToSmb: smbSaveResult.savedToSMB };
}

async function getWeather(city = 'Cape Town') {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;
  const response = await axios.get(url);
  return {
    temp: response.data.main.temp,
    feels_like: response.data.main.feels_like,
    description: response.data.weather[0].description,
    humidity: response.data.main.humidity,
    wind: response.data.wind.speed,
    icon: response.data.weather[0].icon
  };
}

function getUserPersonality(userId) {
  const saved = configOps.get(`personality_${userId}`);
  return saved || DEFAULT_PERSONALITY;
}

function setUserPersonality(userId, personalityKey) {
  configOps.set(`personality_${userId}`, personalityKey);
}

async function chatWithMaid(userMessage, userId, username) {
  const contextInfo = networkDevices.length > 0 ? 
    `\n\nCurrent network devices: ${networkDevices.length} devices online` : '';
  
  const personalityKey = getUserPersonality(userId);
  const personality = getPersonality(personalityKey);
  
  const prompt = `${personality.prompt}

User message: "${userMessage}"${contextInfo}

Respond in character. Be concise but maintain your personality!`;

  const { result } = await generateWithRotation(prompt);
  const response = result.response.text();
  
  chatOps.add({
    userId,
    username,
    message: userMessage,
    response
  });
  
  return response;
}

/**
 * Handle autocomplete interactions
 * This is a simplified version - full implementation in index-old.js
 */
export async function handleAutocompleteInteraction(interaction) {
  try {
    // For now, return empty array
    // Full autocomplete logic will be migrated to plugins
    await interaction.respond([]);
  } catch (error) {
    console.error('Autocomplete error:', error);
    await interaction.respond([]);
  }
}

/**
 * Handle command interactions
 * This is a simplified version that handles basic commands
 * Full implementation will be migrated to plugins in later phases
 */
export async function handleCommandInteraction(interaction) {
  try {
    const { commandName } = interaction;
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // HELP COMMAND (temporary - will move to core-commands plugin)
    if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setColor('#FFB6C1')
        .setTitle('🌸 Maid Bot Commands 🌸')
        .setDescription('🚧 Bot is being refactored to plugin-first architecture!\n\nMost commands are temporarily unavailable during Phase 1.\n\nCheck back soon!')
        .addFields(
          { name: '✅ Available', value: '/help - This command', inline: false },
          { name: '🚧 Coming Soon', value: 'All other commands will be restored in Phase 2-10', inline: false }
        )
        .setFooter({ text: 'Phase 1: Foundation - 40% Complete' })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // STATS COMMAND (temporary - will move to core-commands plugin)
    if (commandName === 'stats') {
      const devices = deviceOps.getAll();
      const onlineDevices = devices.filter(d => d.online);
      
      const embed = new EmbedBuilder()
        .setColor('#667eea')
        .setTitle('📊 Bot Statistics')
        .addFields(
          { name: '📡 Total Devices', value: `${devices.length}`, inline: true },
          { name: '🟢 Online', value: `${onlineDevices.length}`, inline: true },
          { name: '🔴 Offline', value: `${devices.length - onlineDevices.length}`, inline: true },
          { name: '🚧 Status', value: 'Phase 1 Refactor (40% Complete)', inline: false }
        )
        .setFooter({ text: 'More stats coming in Phase 2!' })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      return;
    }

    // All other commands - show refactor message
    await interaction.reply({
      content: `🚧 **Bot Refactor in Progress**\n\nThe \`/${commandName}\` command is temporarily unavailable during Phase 1 refactor.\n\n**Status:** Foundation (40% complete)\n**ETA:** Commands will be restored in Phase 2-10\n\nAvailable commands: \`/help\`, \`/stats\``,
      ephemeral: true
    });

  } catch (error) {
    console.error('Command error:', error);
    const errorMessage = `❌ An error occurred: ${error.message}\n\nI apologize for the inconvenience, Master!`;
    
    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}

// Export helper functions for use by core
export {
  quickPing,
  scanNetwork,
  wakeDevice,
  runSpeedtest,
  webResearch,
  getWeather,
  getUserPersonality,
  setUserPersonality,
  chatWithMaid,
  networkDevices
};
