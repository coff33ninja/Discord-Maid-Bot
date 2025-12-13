import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
import axios from 'axios';
import speedtest from 'speedtest-net';
import wol from 'wake_on_lan';
import arp from 'node-arp';
import ping from 'ping';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Import new modules
import { initDatabase, deviceOps, speedTestOps, researchOps, chatOps, taskOps, configOps } from './src/database/db.js';
import { commands, registerCommands } from './src/commands/slash-commands.js';
import { startDashboard, broadcastUpdate } from './src/dashboard/server.js';
import { initScheduler, scheduleTask, stopTask } from './src/scheduler/tasks.js';
import { initializeAuth } from './src/auth/auth.js';
import { initPluginSystem, emitToPlugins } from './src/plugins/plugin-manager.js';
import { initHomeAssistant } from './src/integrations/homeassistant.js';
import { scanUnifiedNetwork, quickPingCheck, assignDeviceName, findDevice, isTailscaleAvailable, getTailscaleStatus } from './src/network/unified-scanner.js';
import { saveToSMB } from './src/config/smb-config.js';
import { geminiKeys, generateWithRotation } from './src/config/gemini-keys.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize database
initDatabase();

// Initialize authentication
await initializeAuth();

// Initialize plugin system
await initPluginSystem();

// Sync environment variables to database (for integrations)
console.log('🔄 Syncing environment configuration...');
configOps.syncFromEnv('HA_URL', 'ha_url', process.env.HA_URL);
configOps.syncFromEnv('HA_TOKEN', 'ha_token', process.env.HA_TOKEN);
configOps.syncFromEnv('SMB_HOST', 'smb_host', process.env.SMB_HOST);
configOps.syncFromEnv('SMB_USERNAME', 'smb_username', process.env.SMB_USERNAME);
configOps.syncFromEnv('SMB_PASSWORD', 'smb_password', process.env.SMB_PASSWORD);
configOps.syncFromEnv('SMB_SHARE', 'smb_share', process.env.SMB_SHARE);

// Initialize Home Assistant (if configured)
initHomeAssistant();

// Initialize services
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Gemini model is now managed by geminiKeys rotation system

// Import personality system
import { getPersonality, getPersonalityOptions, DEFAULT_PERSONALITY } from './src/config/personalities.js';

// Helper: Get user's selected personality
function getUserPersonality(userId) {
  const saved = configOps.get(`personality_${userId}`);
  return saved || DEFAULT_PERSONALITY;
}

// Helper: Set user's personality
function setUserPersonality(userId, personalityKey) {
  configOps.set(`personality_${userId}`, personalityKey);
}

// Network device cache
let networkDevices = [];
let lastScanTime = null;

// Helper: Quick ping check (only pings registered devices)
async function quickPing() {
  const result = await quickPingCheck();
  
  networkDevices = result.all;
  lastScanTime = new Date();
  
  // Broadcast update to dashboard
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

// Helper: Full network scan (discovers new devices)
async function scanNetwork() {
  const subnet = process.env.NETWORK_SUBNET || '192.168.0.0/24';
  const result = await scanUnifiedNetwork(subnet);
  
  networkDevices = result.all;
  lastScanTime = new Date();
  
  // Broadcast update to dashboard
  broadcastUpdate('device-update', { 
    devices: result.all, 
    stats: result.stats,
    timestamp: lastScanTime 
  });
  
  // Emit to plugins
  await emitToPlugins('networkScan', result.all);
  
  return { 
    devices: result.all, 
    count: result.stats.total,
    stats: result.stats
  };
}

// Helper: Wake on LAN
async function wakeDevice(mac) {
  return new Promise((resolve, reject) => {
    wol.wake(mac, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

// Helper: Run speedtest
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
  
  // Save to database
  speedTestOps.add(testResult);
  
  // Broadcast update to dashboard
  broadcastUpdate('speedtest-complete', testResult);
  
  // Emit to plugins
  await emitToPlugins('speedTest', testResult);
  
  return testResult;
}

// Helper: Web research with Gemini
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
    
    // The issue is likely here. If the model blocks the prompt, `text()` might not exist.
    if (response && typeof response.text === 'function' && response.candidates && response.candidates.length > 0) {
      responseText = response.text();
      successful = true;
      console.log(`✅ Research completed using key: ${keyUsed}`);
    } else {
      // Log the reason if available
      const finishReason = response?.promptFeedback?.blockReason || 'unknown reason';
      responseText = `Research blocked or failed. Reason: ${finishReason}`;
      console.warn(`Research for query "${query}" failed. Reason: ${finishReason}`, response);
    }
  } catch (error) {
    console.error(`Error during web research for query "${query}":`, error);
    responseText = `An internal error occurred during research. Details: ${error.message}`;
  }

  // Always save a log, whether successful or not
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

  // This should now never fail due to undefined `responseText`
  try {
    researchOps.add({
      query,
      result: responseText,
      filename,
      savedToSmb: smbSaveResult.savedToSMB,
      userId
    });
  } catch (dbError) {
      // If this still fails, there's a deeper problem. Log it.
      console.error('CRITICAL: Failed to save research log to database even after sanitizing.', dbError);
      console.error('Data was:', { query, responseText, filename, savedToSmb: smbSaveResult.savedToSMB, userId });
      // Re-throw to notify the user something went very wrong with logging
      throw dbError;
  }
  
  // If the research itself failed, we should throw an error to the command handler
  // so the user gets a "Research Failed" message.
  if (!successful) {
      throw new Error(responseText);
  }

  return { response: responseText, filename, savedToSmb: smbSaveResult.savedToSMB };
}

// Note: saveToSMB is now imported from src/config/smb-config.js

// Helper: Get weather
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

// Helper: Chat with selected personality
async function chatWithMaid(userMessage, userId, username) {
  const contextInfo = networkDevices.length > 0 ? 
    `\n\nCurrent network devices: ${networkDevices.length} devices online` : '';
  
  // Get user's selected personality
  const personalityKey = getUserPersonality(userId);
  const personality = getPersonality(personalityKey);
  
  const prompt = `${personality.prompt}

User message: "${userMessage}"${contextInfo}

Respond in character. Be concise but maintain your personality!`;

  const { result } = await generateWithRotation(prompt);
  const response = result.response.text();
  
  // Save to database
  chatOps.add({
    userId,
    username,
    message: userMessage,
    response
  });
  
  return response;
}

// Discord bot event handlers
client.once('ready', async () => {
  console.log('='.repeat(60));
  console.log('🌸 Maid Bot is ready to serve! 🌸');
  console.log('='.repeat(60));
  console.log(`Logged in as: ${client.user.tag}`);
  console.log(`Serving ${client.guilds.cache.size} server(s)`);
  console.log('');
  
  // Register slash commands
  await registerCommands(client);
  
  // Start web dashboard
  const dashboardPort = process.env.DASHBOARD_PORT || 3000;
  startDashboard(dashboardPort);
  
  // Initialize scheduler
  const handlers = {
    scan: scanNetwork,
    speedtest: runSpeedtest,
    weather: getWeather
  };
  initScheduler(client, handlers);
  
  // Pass Discord client to plugins
  const { getLoadedPlugins } = await import('./src/plugins/plugin-manager.js');
  const plugins = getLoadedPlugins();
  plugins.forEach(plugin => {
    if (typeof plugin.setClient === 'function') {
      plugin.setClient(client);
    }
  });
  
  // Check Tailscale availability
  const tailscaleAvailable = await isTailscaleAvailable();
  if (tailscaleAvailable) {
    console.log('✅ Tailscale detected and available');
  } else {
    console.log('⚠️  Tailscale not detected (optional)');
  }
  
  console.log('='.repeat(60));
  
  // Set bot status
  client.user.setPresence({
    activities: [{ name: 'at your service ✨ | /help', type: 0 }],
    status: 'online',
  });
  
  // Initial quick ping check (fast startup)
  console.log('🔄 Running quick ping check on startup...');
  await quickPing();
  
  // Schedule periodic full scan every 5 minutes
  setInterval(async () => {
    console.log('⏰ Running scheduled full network scan...');
    await scanNetwork();
  }, 5 * 60 * 1000); // 5 minutes
});

// Helper: Check if user has permission (based on Discord roles or stored permissions)
async function checkUserPermission(userId, permission) {
  // For now, we'll use a simple role-based system
  // You can extend this to check against database or Discord roles
  
  // Get user from database
  const { configOps } = await import('./src/database/db.js');
  const userJson = configOps.get(`discord_user_${userId}`);
  
  if (!userJson) {
    // Default: new users are viewers (read-only)
    return false; // No permissions by default
  }
  
  const user = JSON.parse(userJson);
  
  // Check if user is deleted
  if (user.deleted) {
    return false;
  }
  
  const { hasPermission } = await import('./src/auth/auth.js');
  
  return hasPermission(user.role, permission);
}

// Helper: Set user role
async function setUserRole(userId, username, role) {
  const { configOps } = await import('./src/database/db.js');
  configOps.set(`discord_user_${userId}`, JSON.stringify({
    userId,
    username,
    role,
    updated: new Date().toISOString()
  }));
}

// Handle autocomplete for slash commands
client.on('interactionCreate', async (interaction) => {
  if (interaction.isAutocomplete()) {
    const { commandName } = interaction;
    const focusedValue = interaction.options.getFocused().toLowerCase();
    
    try {
      // WOL command - device autocomplete with improved sorting
      if (commandName === 'wol') {
        const devices = deviceOps.getAll();
        
        // Score-based filtering and sorting
        const scored = devices.map(d => {
          const hostname = (d.hostname || '').toLowerCase();
          const ip = d.ip.toLowerCase();
          const mac = d.mac.toLowerCase();
          const notes = (d.notes || '').toLowerCase();
          
          let score = 0;
          if (!focusedValue) {
            // No input - prioritize online devices and those with hostnames
            score = (d.online ? 100 : 0) + (d.hostname ? 50 : 0);
          } else {
            // Exact match gets highest score
            if (hostname === focusedValue) score = 1000;
            else if (hostname.startsWith(focusedValue)) score = 500;
            else if (hostname.includes(focusedValue)) score = 200;
            else if (ip.startsWith(focusedValue)) score = 150;
            else if (ip.includes(focusedValue)) score = 100;
            else if (mac.includes(focusedValue)) score = 80;
            else if (notes.includes(focusedValue)) score = 50;
            else return null; // No match
            
            // Bonus for online devices
            if (d.online) score += 25;
          }
          return { device: d, score };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, 25);
        
        await interaction.respond(
          scored.map(({ device: d }) => {
            // Enhanced display with more info
            const status = d.online ? '🟢' : '🔴';
            const name = d.hostname || 'Unknown';
            const lastSeen = d.last_seen ? new Date(d.last_seen).toLocaleDateString() : '';
            const notePreview = d.notes ? ` 📝` : '';
            
            return {
              name: `${status} ${name} | ${d.ip} | ${d.mac.substring(0, 8)}...${notePreview}`,
              value: d.mac
            };
          })
        );
      }
      
      // NAMEDEVICE, DEVICEEMOJI, DEVICECONFIG, DEVICEGROUP command - device autocomplete
      else if (commandName === 'namedevice' || commandName === 'deviceemoji' || commandName === 'deviceconfig' ||
               (commandName === 'devicegroup' && (focusedOption.name === 'device' || focusedOption.name.startsWith('device')))) {
        const devices = deviceOps.getAll();
        
        // If no devices found, prompt user to scan
        if (devices.length === 0) {
          await interaction.respond([
            { name: '⚠️ No devices found - Run /scan first', value: 'no_devices' }
          ]);
          return;
        }
        
        // Score-based filtering and sorting
        const scored = devices.map(d => {
          const hostname = (d.hostname || '').toLowerCase();
          const ip = d.ip.toLowerCase();
          const mac = d.mac.toLowerCase();
          const notes = (d.notes || '').toLowerCase();
          
          let score = 0;
          if (!focusedValue) {
            // No input - show all devices, prioritize devices with names, then online devices
            score = (d.notes ? 200 : 0) + (d.online ? 100 : 0) + (d.hostname ? 50 : 0);
            return { device: d, score };
          } else {
            // Exact match gets highest score
            if (notes === focusedValue) score = 1000;
            else if (notes.startsWith(focusedValue)) score = 800;
            else if (hostname === focusedValue) score = 600;
            else if (hostname.startsWith(focusedValue)) score = 500;
            else if (notes.includes(focusedValue)) score = 400;
            else if (hostname.includes(focusedValue)) score = 200;
            else if (ip.startsWith(focusedValue)) score = 150;
            else if (ip.includes(focusedValue)) score = 100;
            else if (mac.includes(focusedValue)) score = 80;
            else return null; // No match
            
            // Bonus for online devices
            if (d.online) score += 25;
            return { device: d, score };
          }
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, 25);
        
        // If no matches after filtering, show message
        if (scored.length === 0) {
          await interaction.respond([
            { name: `❌ No devices match "${focusedValue}"`, value: 'no_match' }
          ]);
          return;
        }
        
        await interaction.respond(
          scored.map(({ device: d }) => {
            // Enhanced display with emoji and more info
            const status = d.online ? '🟢' : '🔴';
            const emoji = d.emoji || '';
            const displayName = d.notes ? `${d.notes} (${d.hostname || d.ip})` : (d.hostname || d.ip);
            
            return {
              name: `${status} ${emoji} ${displayName} | ${d.ip}`.substring(0, 100),
              value: d.mac
            };
          })
        );
      }
      
      // DEVICEGROUP view - group autocomplete
      else if (commandName === 'devicegroup' && focusedOption.name === 'group') {
        const groups = deviceOps.getAllGroups();
        
        const filtered = groups
          .filter(g => !focusedValue || g.device_group.toLowerCase().includes(focusedValue.toLowerCase()))
          .slice(0, 25);
        
        await interaction.respond(
          filtered.map(g => ({
            name: `📁 ${g.device_group}`,
            value: g.device_group
          }))
        );
      }
      
      // DEVICETRIGGER autocomplete
      else if (commandName === 'devicetrigger') {
        if (focusedOption.name === 'device') {
          // Device autocomplete with "any" option
          const devices = deviceOps.getAll();
          
          const choices = [{ name: '🌐 Any unknown device', value: 'any' }];
          
          const filtered = devices
            .filter(d => {
              if (!focusedValue) return true;
              const searchStr = focusedValue.toLowerCase();
              return (d.notes || '').toLowerCase().includes(searchStr) ||
                     (d.hostname || '').toLowerCase().includes(searchStr) ||
                     d.ip.includes(searchStr);
            })
            .slice(0, 24)
            .map(d => {
              const status = d.online ? '🟢' : '🔴';
              const emoji = d.emoji || '';
              const name = d.notes || d.hostname || d.ip;
              return {
                name: `${status} ${emoji} ${name}`.substring(0, 100),
                value: d.mac
              };
            });
          
          await interaction.respond([...choices, ...filtered]);
          
        } else if (focusedOption.name === 'trigger') {
          // Trigger autocomplete for remove/toggle
          const { getPlugin } = await import('./src/plugins/plugin-manager.js');
          const plugin = getPlugin('device-triggers');
          
          if (!plugin) {
            await interaction.respond([{ name: 'Plugin not loaded', value: 'error' }]);
            return;
          }
          
          const triggers = await plugin.listTriggers();
          
          const filtered = triggers
            .filter(t => !focusedValue || t.name.toLowerCase().includes(focusedValue.toLowerCase()))
            .slice(0, 25)
            .map(t => ({
              name: `${t.enabled ? '✅' : '⚠️'} ${t.name} (${t.event})`,
              value: t.id
            }));
          
          await interaction.respond(filtered);
          
        } else if (focusedOption.name === 'ha_entity') {
          // Home Assistant entity autocomplete
          try {
            const { getEntities } = await import('./src/integrations/homeassistant.js');
            const entities = await getEntities();
            
            const filtered = entities
              .filter(e => {
                if (!focusedValue) return true;
                return e.entity_id.toLowerCase().includes(focusedValue.toLowerCase()) ||
                       (e.attributes?.friendly_name || '').toLowerCase().includes(focusedValue.toLowerCase());
              })
              .slice(0, 25)
              .map(e => ({
                name: `${e.attributes?.friendly_name || e.entity_id}`,
                value: e.entity_id
              }));
            
            await interaction.respond(filtered);
          } catch (err) {
            await interaction.respond([{ name: 'Home Assistant not available', value: 'error' }]);
          }
        }
      }
      
      // Home Assistant entity autocomplete
      else if (commandName === 'homeassistant') {
        const subcommand = interaction.options.getSubcommand();
        const { getAllLights, getAllSwitches, getAllSensors, getAllScenes, getAllAutomations, getAllScripts } = await import('./src/integrations/homeassistant.js');
        
        let entities = [];
        let entityType = '';
        
        try {
          if (subcommand === 'light') {
            entities = await getAllLights();
            entityType = 'light';
          } else if (subcommand === 'switch') {
            entities = await getAllSwitches();
            entityType = 'switch';
          } else if (subcommand === 'sensor') {
            entities = await getAllSensors();
            entityType = 'sensor';
          } else if (subcommand === 'scene') {
            entities = await getAllScenes();
            entityType = 'scene';
          } else if (subcommand === 'automation') {
            entities = await getAllAutomations();
            entityType = 'automation';
          } else if (subcommand === 'script') {
            entities = await getAllScripts();
            entityType = 'script';
          }
        } catch (err) {
          // HA not configured or unavailable
          await interaction.respond([{ name: '⚠️ Home Assistant not available', value: 'error' }]);
          return;
        }
        
        // Filter and sort entities
        const filtered = entities
          .map(e => {
            const entityId = e.entity_id.toLowerCase();
            const friendlyName = (e.attributes?.friendly_name || '').toLowerCase();
            const state = e.state;
            
            let score = 0;
            if (!focusedValue) {
              score = 100; // Show all when no input
            } else {
              if (friendlyName.startsWith(focusedValue)) score = 500;
              else if (friendlyName.includes(focusedValue)) score = 300;
              else if (entityId.includes(focusedValue)) score = 200;
              else return null;
            }
            
            return { entity: e, score };
          })
          .filter(Boolean)
          .sort((a, b) => b.score - a.score)
          .slice(0, 25);
        
        await interaction.respond(
          filtered.map(({ entity: e }) => {
            const friendlyName = e.attributes?.friendly_name || e.entity_id;
            const state = e.state;
            
            // State indicators
            let stateIcon = '';
            if (entityType === 'light' || entityType === 'switch') {
              stateIcon = state === 'on' ? '💡' : '⚫';
            } else if (entityType === 'sensor') {
              const unit = e.attributes?.unit_of_measurement || '';
              stateIcon = `${state}${unit}`;
            } else if (entityType === 'scene') {
              stateIcon = '🎬';
            } else if (entityType === 'automation') {
              stateIcon = state === 'on' ? '▶️' : '⏸️';
            } else if (entityType === 'script') {
              stateIcon = '📜';
            }
            
            return {
              name: `${stateIcon} ${friendlyName} (${e.entity_id})`.substring(0, 100),
              value: e.entity_id
            };
          })
        );
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
      await interaction.respond([]);
    }
    return;
  }
  
  if (!interaction.isChatInputCommand()) return;
  
  try {
    const { commandName } = interaction;
    const userId = interaction.user.id;
    const username = interaction.user.username;
    
    // SCAN COMMAND
    if (commandName === 'scan') {
      // Check permission
      const { PERMISSIONS } = await import('./src/auth/auth.js');
      const hasPermission = await checkUserPermission(userId, PERMISSIONS.SCAN_NETWORK);
      
      if (!hasPermission) {
        await interaction.reply({ 
          content: '❌ You do not have permission to scan the network. Contact an administrator.', 
          ephemeral: true 
        });
        return;
      }
      
      await interaction.deferReply();
      
      const result = await scanNetwork();
      const stats = result.stats;
      
      const embed = new EmbedBuilder()
        .setColor('#98FB98')
        .setTitle('📡 Unified Network Scan Results')
        .setDescription(
          `**Total: ${stats.total} devices** (${stats.online} online)\n` +
          `├─ 🏠 Local Network: ${stats.local} devices\n` +
          `└─ 🌐 Tailscale: ${stats.tailscale} devices`
        )
        .setTimestamp();
      
      // Group devices by network
      const localDevices = result.devices.filter(d => d.network === 'local' || d.network === 'both');
      const tailscaleDevices = result.devices.filter(d => d.network === 'tailscale');
      
      // Show local network devices
      if (localDevices.length > 0) {
        const localList = localDevices.slice(0, 10).map((device, index) => {
          const emoji = device.emoji || '';
          const name = device.name ? `**${device.name}**` : device.hostname || device.ip;
          const group = device.device_group ? ` 📁${device.device_group}` : '';
          const networkBadge = device.network === 'both' ? '🌐' : '';
          return `  ${index + 1}. ${emoji} ${name}${group} ${networkBadge}\n     \`${device.ip}\` | \`${device.mac.substring(0, 17)}\` | ${device.latency}ms`;
        }).join('\n');
        
        embed.addFields({
          name: '🏠 Local Network',
          value: localList + (localDevices.length > 10 ? `\n  ... and ${localDevices.length - 10} more` : ''),
          inline: false
        });
      }
      
      // Show Tailscale devices (slightly indented)
      if (tailscaleDevices.length > 0) {
        const tailscaleList = tailscaleDevices.slice(0, 10).map((device, index) => {
          const emoji = device.emoji || '';
          const name = device.name ? `**${device.name}**` : device.hostname;
          const group = device.device_group ? ` 📁${device.device_group}` : '';
          const status = device.online ? '🟢' : '🔴';
          const latency = device.latency ? `${device.latency}ms` : 'offline';
          return `    ${index + 1}. ${emoji} ${name}${group} ${status}\n       \`${device.ip}\` | ${device.os} | ${latency}`;
        }).join('\n');
        
        embed.addFields({
          name: '  🌐 Tailscale Network',
          value: tailscaleList + (tailscaleDevices.length > 10 ? `\n    ... and ${tailscaleDevices.length - 10} more` : ''),
          inline: false
        });
      }
      
      embed.addFields({
        name: '💡 Tip',
        value: 'Use `/deviceemoji` and `/devicegroup` to organize devices!\nView all devices on the dashboard.',
        inline: false
      });
      
      await interaction.editReply({ embeds: [embed] });
    }
    
    // DEVICES COMMAND
    else if (commandName === 'devices') {
      const filter = interaction.options.getString('filter') || 'online';
      let devices;
      
      if (filter === 'online') {
        devices = deviceOps.getOnline();
      } else if (filter === 'offline') {
        devices = deviceOps.getAll().filter(d => !d.online);
      } else {
        devices = deviceOps.getAll();
      }
      
      const embed = new EmbedBuilder()
        .setColor('#87CEEB')
        .setTitle(`💾 ${filter.charAt(0).toUpperCase() + filter.slice(1)} Devices`)
        .setDescription(`${devices.length} devices found\n\n💡 Use \`/deviceemoji\` and \`/devicegroup\` to organize devices`)
        .setTimestamp();
      
      // Get all devices for proper numbering
      const allDevices = deviceOps.getAll();
      
      devices.slice(0, 25).forEach((device) => {
        // Find the actual index in the full list
        const deviceNumber = allDevices.findIndex(d => d.mac === device.mac) + 1;
        const emoji = device.emoji || '';
        const displayName = device.notes || device.hostname || device.ip;
        const group = device.device_group ? ` 📁${device.device_group}` : '';
        
        embed.addFields({
          name: `${deviceNumber}. ${emoji} ${displayName}${group}`,
          value: `IP: \`${device.ip}\` | MAC: \`${device.mac}\` ${device.online ? '🟢 Online' : '🔴 Offline'}`,
          inline: false
        });
      });
      
      if (devices.length > 25) {
        embed.setFooter({ text: `Showing first 25 of ${devices.length} devices. View all on dashboard!` });
      }
      
      await interaction.reply({ embeds: [embed] });
    }
    
    // NAMEDEVICE COMMAND
    else if (commandName === 'namedevice') {
      const deviceIdentifier = interaction.options.getString('device');
      const friendlyName = interaction.options.getString('name');
      
      await interaction.deferReply();
      
      try {
        const result = assignDeviceName(deviceIdentifier, friendlyName);
        
        if (!result.success) {
          await interaction.editReply(`❌ Failed to assign name: ${result.error}`);
          return;
        }
        
        const device = result.device;
        
        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('🏷️ Device Name Assigned')
          .setDescription(`Successfully named device **${friendlyName}**`)
          .addFields(
            { name: 'Device Name', value: friendlyName, inline: true },
            { name: 'Hostname', value: device.hostname || 'Unknown', inline: true },
            { name: 'IP Address', value: device.ip, inline: true },
            { name: 'MAC Address', value: device.mac, inline: true },
            { name: 'Status', value: device.online ? '🟢 Online' : '🔴 Offline', inline: true }
          )
          .setFooter({ text: 'This name will appear in all device lists!' })
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        
        // Broadcast update to dashboard
        broadcastUpdate('device-named', { device: result.device, name: friendlyName });
      } catch (error) {
        await interaction.editReply(`❌ Error: ${error.message}`);
      }
    }
    
    // DEVICECONFIG COMMAND (Unified device configuration)
    else if (commandName === 'deviceconfig') {
      const deviceIdentifier = interaction.options.getString('device');
      const name = interaction.options.getString('name');
      const emoji = interaction.options.getString('emoji');
      const group = interaction.options.getString('group');
      
      await interaction.deferReply();
      
      try {
        // Find device
        let device = deviceOps.getByMac(deviceIdentifier);
        if (!device) {
          device = deviceOps.getAll().find(d => 
            d.ip === deviceIdentifier || 
            d.hostname === deviceIdentifier || 
            d.notes === deviceIdentifier
          );
        }
        
        if (!device) {
          await interaction.editReply('❌ Device not found. Use `/scan` to discover devices first.');
          return;
        }
        
        // Check if at least one property is provided
        if (!name && !emoji && !group) {
          await interaction.editReply('❌ Please provide at least one property to configure (name, emoji, or group).');
          return;
        }
        
        // Update properties
        const updates = [];
        if (name) {
          deviceOps.updateNotes(device.id, name);
          updates.push(`Name: **${name}**`);
        }
        if (emoji) {
          deviceOps.updateEmoji(device.id, emoji);
          updates.push(`Emoji: ${emoji}`);
        }
        if (group) {
          deviceOps.updateGroup(device.id, group);
          updates.push(`Group: **${group}**`);
        }
        
        // Get updated device
        const updatedDevice = deviceOps.getById(device.id);
        const displayName = updatedDevice.notes || updatedDevice.hostname || updatedDevice.ip;
        const displayEmoji = updatedDevice.emoji || '';
        
        const embed = new EmbedBuilder()
          .setColor('#4CAF50')
          .setTitle('⚙️ Device Configuration Updated')
          .setDescription(`Successfully configured **${displayEmoji} ${displayName}**`)
          .addFields(
            { name: 'Device', value: `${displayEmoji} ${displayName}`, inline: true },
            { name: 'IP Address', value: updatedDevice.ip, inline: true },
            { name: 'Status', value: updatedDevice.online ? '🟢 Online' : '🔴 Offline', inline: true }
          )
          .setTimestamp();
        
        if (updates.length > 0) {
          embed.addFields({
            name: '✅ Updated Properties',
            value: updates.join('\n'),
            inline: false
          });
        }
        
        await interaction.editReply({ embeds: [embed] });
        broadcastUpdate('device-updated', { device: updatedDevice });
      } catch (error) {
        await interaction.editReply(`❌ Error: ${error.message}`);
      }
    }
    
    // DEVICEEMOJI COMMAND
    else if (commandName === 'deviceemoji') {
      const deviceIdentifier = interaction.options.getString('device');
      const emoji = interaction.options.getString('emoji');
      
      await interaction.deferReply();
      
      try {
        // Find device
        let device = deviceOps.getByMac(deviceIdentifier);
        if (!device) {
          device = deviceOps.getAll().find(d => 
            d.ip === deviceIdentifier || 
            d.hostname === deviceIdentifier || 
            d.notes === deviceIdentifier
          );
        }
        
        if (!device) {
          await interaction.editReply('❌ Device not found. Use `/scan` to discover devices first.');
          return;
        }
        
        // Update emoji
        deviceOps.updateEmoji(device.id, emoji);
        
        const displayName = device.notes || device.hostname || device.ip;
        
        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('😀 Device Emoji Updated')
          .setDescription(`Successfully added emoji to **${displayName}**`)
          .addFields(
            { name: 'Device', value: `${emoji} ${displayName}`, inline: true },
            { name: 'IP Address', value: device.ip, inline: true },
            { name: 'Status', value: device.online ? '🟢 Online' : '🔴 Offline', inline: true }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        broadcastUpdate('device-updated', { device: { ...device, emoji } });
      } catch (error) {
        await interaction.editReply(`❌ Error: ${error.message}`);
      }
    }
    
    // DEVICEGROUP COMMAND
    else if (commandName === 'devicegroup') {
      const subcommand = interaction.options.getSubcommand();
      
      await interaction.deferReply();
      
      try {
        if (subcommand === 'assign') {
          const deviceIdentifier = interaction.options.getString('device');
          const groupName = interaction.options.getString('group');
          
          // Find device
          let device = deviceOps.getByMac(deviceIdentifier);
          if (!device) {
            device = deviceOps.getAll().find(d => 
              d.ip === deviceIdentifier || 
              d.hostname === deviceIdentifier || 
              d.notes === deviceIdentifier
            );
          }
          
          if (!device) {
            await interaction.editReply('❌ Device not found. Use `/scan` to discover devices first.');
            return;
          }
          
          // Update group
          deviceOps.updateGroup(device.id, groupName);
          
          const displayName = device.notes || device.hostname || device.ip;
          const emoji = device.emoji || '';
          
          const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('📁 Device Added to Group')
            .setDescription(`**${emoji} ${displayName}** is now in group **${groupName}**`)
            .addFields(
              { name: 'Device', value: `${emoji} ${displayName}`, inline: true },
              { name: 'Group', value: groupName, inline: true },
              { name: 'Status', value: device.online ? '🟢 Online' : '🔴 Offline', inline: true }
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
          broadcastUpdate('device-updated', { device: { ...device, device_group: groupName } });
          
        } else if (subcommand === 'list') {
          const groups = deviceOps.getAllGroups();
          
          if (groups.length === 0) {
            await interaction.editReply('📁 No device groups created yet. Use `/devicegroup assign` to create groups.');
            return;
          }
          
          const groupList = groups.map(g => {
            const devices = deviceOps.getByGroup(g.device_group);
            const onlineCount = devices.filter(d => d.online).length;
            return `📁 **${g.device_group}** - ${devices.length} devices (${onlineCount} online)`;
          }).join('\n');
          
          const embed = new EmbedBuilder()
            .setColor('#2196F3')
            .setTitle('📁 Device Groups')
            .setDescription(groupList)
            .setFooter({ text: 'Use /devicegroup view to see devices in a group' })
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
          
        } else if (subcommand === 'view') {
          const groupName = interaction.options.getString('group');
          const devices = deviceOps.getByGroup(groupName);
          
          if (devices.length === 0) {
            await interaction.editReply(`📁 No devices found in group **${groupName}**`);
            return;
          }
          
          const deviceList = devices.map(d => {
            const status = d.online ? '🟢' : '🔴';
            const emoji = d.emoji || '';
            const name = d.notes || d.hostname || d.ip;
            return `${status} ${emoji} **${name}** - ${d.ip}`;
          }).join('\n');
          
          const onlineCount = devices.filter(d => d.online).length;
          
          const embed = new EmbedBuilder()
            .setColor('#2196F3')
            .setTitle(`📁 Group: ${groupName}`)
            .setDescription(deviceList)
            .setFooter({ text: `${devices.length} devices total, ${onlineCount} online` })
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
          
        } else if (subcommand === 'addmultiple') {
          const groupName = interaction.options.getString('group');
          const deviceIdentifiers = [
            interaction.options.getString('device1'),
            interaction.options.getString('device2'),
            interaction.options.getString('device3'),
            interaction.options.getString('device4'),
            interaction.options.getString('device5')
          ].filter(Boolean); // Remove null/undefined values
          
          const addedDevices = [];
          const failedDevices = [];
          
          for (const deviceIdentifier of deviceIdentifiers) {
            // Find device
            let device = deviceOps.getByMac(deviceIdentifier);
            if (!device) {
              device = deviceOps.getAll().find(d => 
                d.ip === deviceIdentifier || 
                d.hostname === deviceIdentifier || 
                d.notes === deviceIdentifier
              );
            }
            
            if (device) {
              deviceOps.updateGroup(device.id, groupName);
              const displayName = device.notes || device.hostname || device.ip;
              const emoji = device.emoji || '';
              addedDevices.push(`${emoji} ${displayName}`);
              broadcastUpdate('device-updated', { device: { ...device, device_group: groupName } });
            } else {
              failedDevices.push(deviceIdentifier);
            }
          }
          
          const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('📁 Multiple Devices Added to Group')
            .setDescription(`Added **${addedDevices.length}** device(s) to group **${groupName}**`)
            .setTimestamp();
          
          if (addedDevices.length > 0) {
            embed.addFields({
              name: '✅ Added Devices',
              value: addedDevices.join('\n'),
              inline: false
            });
          }
          
          if (failedDevices.length > 0) {
            embed.addFields({
              name: '❌ Failed',
              value: failedDevices.join('\n'),
              inline: false
            });
          }
          
          await interaction.editReply({ embeds: [embed] });
          
        } else if (subcommand === 'assignpattern') {
          const groupName = interaction.options.getString('group');
          const pattern = interaction.options.getString('pattern').toLowerCase();
          
          const allDevices = deviceOps.getAll();
          const matchingDevices = allDevices.filter(d => {
            const hostname = (d.hostname || '').toLowerCase();
            const notes = (d.notes || '').toLowerCase();
            return hostname.includes(pattern) || notes.includes(pattern);
          });
          
          if (matchingDevices.length === 0) {
            await interaction.editReply(`❌ No devices found matching pattern: **${pattern}**`);
            return;
          }
          
          const addedDevices = [];
          for (const device of matchingDevices) {
            deviceOps.updateGroup(device.id, groupName);
            const displayName = device.notes || device.hostname || device.ip;
            const emoji = device.emoji || '';
            addedDevices.push(`${emoji} ${displayName}`);
            broadcastUpdate('device-updated', { device: { ...device, device_group: groupName } });
          }
          
          const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('📁 Pattern-Based Group Assignment')
            .setDescription(`Added **${addedDevices.length}** device(s) matching pattern **"${pattern}"** to group **${groupName}**`)
            .addFields({
              name: '✅ Added Devices',
              value: addedDevices.slice(0, 20).join('\n') + (addedDevices.length > 20 ? `\n... and ${addedDevices.length - 20} more` : ''),
              inline: false
            })
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
          
        } else if (subcommand === 'assignall') {
          const groupName = interaction.options.getString('group');
          const filter = interaction.options.getString('filter');
          
          let devices = deviceOps.getAll();
          
          // Apply filter
          if (filter === 'online') {
            devices = devices.filter(d => d.online);
          } else if (filter === 'offline') {
            devices = devices.filter(d => !d.online);
          } else if (filter === 'local') {
            devices = devices.filter(d => !d.mac.startsWith('ts:'));
          } else if (filter === 'tailscale') {
            devices = devices.filter(d => d.mac.startsWith('ts:'));
          }
          // 'all' = no filter
          
          if (devices.length === 0) {
            await interaction.editReply(`❌ No devices found matching filter: **${filter}**`);
            return;
          }
          
          const addedDevices = [];
          for (const device of devices) {
            deviceOps.updateGroup(device.id, groupName);
            const displayName = device.notes || device.hostname || device.ip;
            const emoji = device.emoji || '';
            addedDevices.push(`${emoji} ${displayName}`);
            broadcastUpdate('device-updated', { device: { ...device, device_group: groupName } });
          }
          
          const filterName = filter === 'online' ? 'Online' : 
                             filter === 'offline' ? 'Offline' : 
                             filter === 'local' ? 'Local Network' : 
                             filter === 'tailscale' ? 'Tailscale' : 'All';
          
          const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('📁 Bulk Group Assignment')
            .setDescription(`Added **${addedDevices.length}** ${filterName} device(s) to group **${groupName}**`)
            .addFields({
              name: '✅ Added Devices',
              value: addedDevices.slice(0, 20).join('\n') + (addedDevices.length > 20 ? `\n... and ${addedDevices.length - 20} more` : ''),
              inline: false
            })
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
          
        } else if (subcommand === 'remove') {
          const deviceIdentifier = interaction.options.getString('device');
          
          // Find device
          let device = deviceOps.getByMac(deviceIdentifier);
          if (!device) {
            device = deviceOps.getAll().find(d => 
              d.ip === deviceIdentifier || 
              d.hostname === deviceIdentifier || 
              d.notes === deviceIdentifier
            );
          }
          
          if (!device) {
            await interaction.editReply('❌ Device not found.');
            return;
          }
          
          const oldGroup = device.device_group;
          if (!oldGroup) {
            await interaction.editReply('❌ Device is not in any group.');
            return;
          }
          
          // Remove from group (set to null)
          deviceOps.updateGroup(device.id, null);
          
          const displayName = device.notes || device.hostname || device.ip;
          const emoji = device.emoji || '';
          
          await interaction.editReply(`✅ Removed **${emoji} ${displayName}** from group **${oldGroup}**`);
          broadcastUpdate('device-updated', { device: { ...device, device_group: null } })
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
        }
      } catch (error) {
        await interaction.editReply(`❌ Error: ${error.message}`);
      }
    }
    
    // SPEEDALERT COMMAND
    else if (commandName === 'speedalert') {
      const subcommand = interaction.options.getSubcommand();
      
      await interaction.deferReply();
      
      try {
        const { getPlugin, enablePlugin, disablePlugin } = await import('./src/plugins/plugin-manager.js');
        const plugin = getPlugin('speed-alerts');
        
        if (!plugin) {
          await interaction.editReply('❌ Speed Alerts plugin not loaded. Check if the plugin file exists in the plugins folder.');
          return;
        }
        
        if (subcommand === 'config') {
          const threshold = interaction.options.getNumber('threshold');
          const channel = interaction.options.getChannel('channel');
          
          await plugin.setThreshold(threshold);
          await plugin.setAlertChannel(channel.id);
          
          const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('⚡ Speed Alert Configured')
            .setDescription('Speed alerts will be sent when internet speed drops below threshold')
            .addFields(
              { name: 'Threshold', value: `${threshold} Mbps`, inline: true },
              { name: 'Alert Channel', value: `<#${channel.id}>`, inline: true },
              { name: 'Status', value: plugin.enabled ? '✅ Enabled' : '⚠️ Disabled', inline: true }
            )
            .setFooter({ text: 'Use /speedalert enable to activate alerts' })
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
          
        } else if (subcommand === 'status') {
          const settings = await plugin.getSettings();
          
          const embed = new EmbedBuilder()
            .setColor(settings.enabled ? '#4CAF50' : '#FFA500')
            .setTitle('⚡ Speed Alert Status')
            .addFields(
              { name: 'Status', value: settings.enabled ? '✅ Enabled' : '⚠️ Disabled', inline: true },
              { name: 'Threshold', value: `${settings.threshold} Mbps`, inline: true },
              { name: 'Alert Channel', value: settings.alertChannel ? `<#${settings.alertChannel}>` : 'Not configured', inline: true }
            )
            .setFooter({ text: 'Use /speedalert config to change settings' })
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
          
        } else if (subcommand === 'enable') {
          await enablePlugin('speed-alerts');
          await interaction.editReply('✅ Speed alerts enabled! You will be notified when internet speed drops below threshold.');
          
        } else if (subcommand === 'disable') {
          await disablePlugin('speed-alerts');
          await interaction.editReply('⚠️ Speed alerts disabled. No notifications will be sent.');
        }
      } catch (error) {
        await interaction.editReply(`❌ Error: ${error.message}`);
      }
    }
    
    // DEVICETRIGGER COMMAND
    else if (commandName === 'devicetrigger') {
      const subcommand = interaction.options.getSubcommand();
      
      await interaction.deferReply();
      
      try {
        const { getPlugin, enablePlugin, disablePlugin } = await import('./src/plugins/plugin-manager.js');
        const plugin = getPlugin('device-triggers');
        
        if (!plugin) {
          await interaction.editReply('❌ Device Triggers plugin not loaded. Check if the plugin file exists in the plugins folder.');
          return;
        }
        
        if (subcommand === 'add') {
          const name = interaction.options.getString('name');
          const deviceIdentifier = interaction.options.getString('device');
          const event = interaction.options.getString('event');
          const action = interaction.options.getString('action');
          const message = interaction.options.getString('message');
          const channel = interaction.options.getChannel('channel');
          const haEntity = interaction.options.getString('ha_entity');
          const haService = interaction.options.getString('ha_service');
          
          // Find device MAC
          let deviceMac = 'any';
          if (deviceIdentifier !== 'any') {
            let device = deviceOps.getByMac(deviceIdentifier);
            if (!device) {
              device = deviceOps.getAll().find(d => 
                d.ip === deviceIdentifier || 
                d.hostname === deviceIdentifier || 
                d.notes === deviceIdentifier
              );
            }
            
            if (!device) {
              await interaction.editReply('❌ Device not found. Use "any" to trigger on unknown devices.');
              return;
            }
            deviceMac = device.mac;
          }
          
          // Build action data
          const actionData = {};
          if (action === 'discord_dm') {
            actionData.userId = userId;
            actionData.message = message;
          } else if (action === 'discord_channel') {
            if (!channel) {
              await interaction.editReply('❌ Channel is required for discord_channel action.');
              return;
            }
            actionData.channelId = channel.id;
            actionData.message = message;
          } else if (action === 'homeassistant') {
            if (!haEntity || !haService) {
              await interaction.editReply('❌ Home Assistant entity and service are required for homeassistant action.');
              return;
            }
            actionData.entityId = haEntity;
            actionData.service = haService;
          }
          
          const trigger = await plugin.addTrigger({
            name,
            deviceMac,
            event,
            action,
            actionData
          });
          
          const deviceName = deviceMac === 'any' ? 'Any unknown device' : (deviceOps.getByMac(deviceMac)?.notes || deviceOps.getByMac(deviceMac)?.hostname || deviceMac);
          
          const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('🔔 Device Trigger Created')
            .setDescription(`Trigger **${name}** has been created and is now active`)
            .addFields(
              { name: 'Device', value: deviceName, inline: true },
              { name: 'Event', value: event, inline: true },
              { name: 'Action', value: action.replace('_', ' '), inline: true }
            )
            .setFooter({ text: `Trigger ID: ${trigger.id}` })
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
          
        } else if (subcommand === 'list') {
          const triggers = await plugin.listTriggers();
          
          if (triggers.length === 0) {
            await interaction.editReply('📋 No device triggers configured yet. Use `/devicetrigger add` to create one.');
            return;
          }
          
          const embed = new EmbedBuilder()
            .setColor('#2196F3')
            .setTitle('🔔 Device Triggers')
            .setDescription(`${triggers.length} trigger(s) configured`)
            .setTimestamp();
          
          triggers.forEach(t => {
            const status = t.enabled ? '✅' : '⚠️';
            const deviceName = t.deviceMac === 'any' ? 'Any unknown device' : (deviceOps.getByMac(t.deviceMac)?.notes || deviceOps.getByMac(t.deviceMac)?.hostname || t.deviceMac);
            
            embed.addFields({
              name: `${status} ${t.name}`,
              value: `Device: ${deviceName}\nEvent: ${t.event}\nAction: ${t.action}\nTriggered: ${t.triggerCount} times\nID: \`${t.id}\``,
              inline: false
            });
          });
          
          await interaction.editReply({ embeds: [embed] });
          
        } else if (subcommand === 'remove') {
          const triggerId = interaction.options.getString('trigger');
          const removed = await plugin.removeTrigger(triggerId);
          
          await interaction.editReply(`🗑️ Removed trigger: **${removed.name}**`);
          
        } else if (subcommand === 'toggle') {
          const triggerId = interaction.options.getString('trigger');
          const enabled = interaction.options.getBoolean('enabled');
          
          const trigger = await plugin.toggleTrigger(triggerId, enabled);
          
          await interaction.editReply(`${enabled ? '✅' : '⚠️'} Trigger **${trigger.name}** is now ${enabled ? 'enabled' : 'disabled'}`);
        }
      } catch (error) {
        await interaction.editReply(`❌ Error: ${error.message}`);
      }
    }
    
    // WOL COMMAND
    else if (commandName === 'wol') {
      // Check permission (bot permission system)
      const { PERMISSIONS } = await import('./src/auth/auth.js');
      const hasPermission = await checkUserPermission(userId, PERMISSIONS.WAKE_DEVICE);
      
      // Also check Discord server permissions
      const member = interaction.member;
      const hasDiscordPerms = member.permissions.has('Administrator') || 
                              member.permissions.has('ManageGuild') ||
                              hasPermission;
      
      if (!hasDiscordPerms) {
        await interaction.reply({ 
          content: '❌ You do not have permission to use Wake-on-LAN. Contact an administrator or server manager.', 
          ephemeral: true 
        });
        return;
      }
      
      const devices = deviceOps.getAll();
      
      // Check if we have any devices
      if (devices.length === 0) {
        await interaction.reply({
          content: '⚠️ No devices found in database. Run `/scan` first to discover devices on your network.',
          ephemeral: true
        });
        return;
      }
      
      const deviceMac = interaction.options.getString('device');
      
      // If no device selected, show the device list
      if (!deviceMac) {
        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⚡ Wake-on-LAN - Select a Device')
          .setDescription('Use `/wol` and start typing to select a device from the list.\n\n**Available devices:**')
          .setTimestamp();
        
        devices.slice(0, 20).forEach((device, index) => {
          const status = device.online ? '🟢' : '🔴';
          embed.addFields({
            name: `${index + 1}. ${device.hostname || device.ip}`,
            value: `${status} IP: \`${device.ip}\` | MAC: \`${device.mac}\``,
            inline: false
          });
        });
        
        if (devices.length > 20) {
          embed.setFooter({ text: `Showing 20 of ${devices.length} devices` });
        }
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      
      // Find device by MAC address
      const device = devices.find(d => d.mac === deviceMac);
      
      if (!device) {
        await interaction.reply({ 
          content: `⚠️ Device not found. Use \`/wol\` without parameters to see available devices.`, 
          ephemeral: true 
        });
        return;
      }
      
      await interaction.deferReply();
      
      try {
        await wakeDevice(device.mac);
        
        // Update device status in database
        deviceOps.upsert({
          ip: device.ip,
          mac: device.mac,
          hostname: device.hostname
        });
        
        const embed = new EmbedBuilder()
          .setColor('#90EE90')
          .setTitle('✨ Wake-on-LAN Sent!')
          .setDescription(`Magic packet sent to **${device.hostname || device.ip}**`)
          .addFields(
            { name: 'IP Address', value: device.ip, inline: true },
            { name: 'MAC Address', value: device.mac, inline: true },
            { name: 'Requested By', value: `${username} (${userId})`, inline: false }
          )
          .setFooter({ text: 'The device should wake up shortly~' })
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        
        // Emit to plugins
        await emitToPlugins('wolSent', { device, userId, username });
        
        // Broadcast to dashboard
        broadcastUpdate('wol-sent', { device, userId, username, timestamp: new Date() });
      } catch (error) {
        await interaction.editReply(`❌ Failed to wake device: ${error.message}`);
      }
    }
    
    // SPEEDTEST COMMAND
    else if (commandName === 'speedtest') {
      // Check permission
      const { PERMISSIONS } = await import('./src/auth/auth.js');
      const hasPermission = await checkUserPermission(userId, PERMISSIONS.RUN_SPEEDTEST);
      
      if (!hasPermission) {
        await interaction.reply({ 
          content: '❌ You do not have permission to run speed tests. Contact an administrator.', 
          ephemeral: true 
        });
        return;
      }
      
      await interaction.deferReply();
      
      try {
        const results = await runSpeedtest(interaction.user.id);
        
        const embed = new EmbedBuilder()
          .setColor('#FF6B6B')
          .setTitle('🚀 Internet Speed Test Results')
          .addFields(
            { name: '⬇️ Download', value: `**${results.download} Mbps**`, inline: true },
            { name: '⬆️ Upload', value: `**${results.upload} Mbps**`, inline: true },
            { name: '📡 Ping', value: `**${results.ping} ms**`, inline: true },
            { name: '🌐 Server', value: results.server, inline: true },
            { name: '🏢 ISP', value: results.isp, inline: true }
          )
          .setFooter({ text: 'Speed test complete! ✨' })
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        await interaction.editReply(`❌ Speedtest failed: ${error.message}`);
      }
    }
    
    // SPEEDHISTORY COMMAND
    else if (commandName === 'speedhistory') {
      const days = interaction.options.getInteger('days') || 7;
      const history = speedTestOps.getHistory(days);
      
      if (history.length === 0) {
        await interaction.reply('📊 No speed test history available yet!');
        return;
      }
      
      const stats = speedTestOps.getStats();
      
      const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle(`📊 Speed Test History (${days} days)`)
        .setDescription(`Total tests: ${stats.total_tests}`)
        .addFields(
          { name: '⬇️ Avg Download', value: `${stats.avg_download.toFixed(2)} Mbps`, inline: true },
          { name: '⬆️ Avg Upload', value: `${stats.avg_upload.toFixed(2)} Mbps`, inline: true },
          { name: '📡 Avg Ping', value: `${stats.avg_ping.toFixed(2)} ms`, inline: true }
        )
        .setFooter({ text: 'View detailed graphs on the dashboard!' })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    }
    
    // RESEARCH COMMAND
    else if (commandName === 'research') {
      // Check permission
      const { PERMISSIONS } = await import('./src/auth/auth.js');
      const hasPermission = await checkUserPermission(userId, PERMISSIONS.RUN_RESEARCH);
      
      if (!hasPermission) {
        await interaction.reply({ 
          content: '❌ You do not have permission to run research queries. Contact an administrator.', 
          ephemeral: true 
        });
        return;
      }
      
      const query = interaction.options.getString('query');
      await interaction.deferReply();
      
      try {
        const result = await webResearch(query, interaction.user.id);
        
        // Smart chunking - split by sections (###, ##, or paragraphs) while respecting Discord limits
        const MAX_CHUNK = 1900; // Leave room for formatting
        const MAX_MESSAGES = 8; // Max follow-up messages
        
        const smartChunk = (text) => {
          const chunks = [];
          let remaining = text;
          
          while (remaining.length > 0) {
            if (remaining.length <= MAX_CHUNK) {
              chunks.push(remaining);
              break;
            }
            
            // Try to split at section headers first
            let splitIndex = -1;
            const sectionMatch = remaining.substring(0, MAX_CHUNK).match(/\n(?=###?\s)/g);
            if (sectionMatch) {
              splitIndex = remaining.substring(0, MAX_CHUNK).lastIndexOf('\n#');
            }
            
            // Fall back to paragraph breaks
            if (splitIndex <= 0) {
              splitIndex = remaining.substring(0, MAX_CHUNK).lastIndexOf('\n\n');
            }
            
            // Fall back to line breaks
            if (splitIndex <= 0) {
              splitIndex = remaining.substring(0, MAX_CHUNK).lastIndexOf('\n');
            }
            
            // Last resort: hard cut
            if (splitIndex <= 0) {
              splitIndex = MAX_CHUNK;
            }
            
            chunks.push(remaining.substring(0, splitIndex).trim());
            remaining = remaining.substring(splitIndex).trim();
          }
          
          return chunks;
        };
        
        const chunks = smartChunk(result.response);
        const totalParts = Math.min(chunks.length, MAX_MESSAGES + 1);
        
        // First message as embed
        const embed = new EmbedBuilder()
          .setColor('#9370DB')
          .setTitle(`📚 Research: ${query}`)
          .setDescription(chunks[0].substring(0, 4000)) // Embed description limit
          .setFooter({ text: `Part 1/${totalParts} | ${result.savedToSmb ? `SMB: ${result.filename}` : 'Saved locally'}` })
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        
        // Follow-up messages for remaining chunks
        for (let i = 1; i < totalParts; i++) {
          const partEmbed = new EmbedBuilder()
            .setColor('#9370DB')
            .setDescription(chunks[i].substring(0, 4000))
            .setFooter({ text: `Part ${i + 1}/${totalParts}` });
          
          await interaction.followUp({ embeds: [partEmbed] });
        }
        
        // Notify if truncated
        if (chunks.length > MAX_MESSAGES + 1) {
          await interaction.followUp({
            content: `📝 Research was truncated. Full response saved to: \`${result.filename}\``,
            ephemeral: true
          });
        }
      } catch (error) {
        await interaction.editReply(`❌ Research failed: ${error.message}`);
      }
    }
    
    // RESEARCHHISTORY COMMAND
    else if (commandName === 'researchhistory') {
      const limit = interaction.options.getInteger('limit') || 10;
      const research = researchOps.getRecent(limit);
      
      if (research.length === 0) {
        await interaction.reply('📚 No research history available yet!');
        return;
      }
      
      const embed = new EmbedBuilder()
        .setColor('#9370DB')
        .setTitle('📚 Research History')
        .setDescription(`Showing ${research.length} most recent research queries`)
        .setTimestamp();
      
      research.forEach((item, index) => {
        const date = new Date(item.timestamp).toLocaleDateString();
        embed.addFields({
          name: `${index + 1}. ${item.query}`,
          value: `${date} ${item.saved_to_smb ? '💾' : '📄'}`,
          inline: false
        });
      });
      
      await interaction.reply({ embeds: [embed] });
    }
    
    // RESEARCHSEARCH COMMAND - Full-text search
    else if (commandName === 'researchsearch') {
      const searchQuery = interaction.options.getString('query');
      const viewId = interaction.options.getInteger('id');
      
      // If ID provided, show full result
      if (viewId) {
        const result = researchOps.getById(viewId);
        if (!result) {
          await interaction.reply({ content: '❌ Research not found with that ID.', ephemeral: true });
          return;
        }
        
        const embed = new EmbedBuilder()
          .setColor('#9370DB')
          .setTitle(`📚 Research #${viewId}: ${result.query}`)
          .setDescription(result.result.substring(0, 4000))
          .setFooter({ text: `${new Date(result.timestamp).toLocaleString()} | ${result.saved_to_smb ? 'Saved to SMB' : 'Local'}` })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
        // If result is longer, send follow-ups
        if (result.result.length > 4000) {
          const remaining = result.result.substring(4000);
          const chunks = remaining.match(/[\s\S]{1,4000}/g) || [];
          for (const chunk of chunks.slice(0, 3)) {
            await interaction.followUp({ embeds: [new EmbedBuilder().setColor('#9370DB').setDescription(chunk)] });
          }
        }
        return;
      }
      
      // Full-text search
      await interaction.deferReply();
      
      const results = researchOps.fullTextSearch(searchQuery);
      
      if (results.length === 0) {
        await interaction.editReply(`🔍 No results found for "${searchQuery}"`);
        return;
      }
      
      const embed = new EmbedBuilder()
        .setColor('#9370DB')
        .setTitle(`🔍 Search Results: "${searchQuery}"`)
        .setDescription(`Found ${results.length} matching research entries\n\nUse \`/researchsearch query:${searchQuery} id:<number>\` to view full result`)
        .setTimestamp();
      
      results.slice(0, 10).forEach((item) => {
        const date = new Date(item.timestamp).toLocaleDateString();
        // Clean up HTML marks from snippets for Discord
        const snippet = (item.result_snippet || item.result.substring(0, 100))
          .replace(/<mark>/g, '**')
          .replace(/<\/mark>/g, '**')
          .substring(0, 200);
        
        embed.addFields({
          name: `#${item.id} - ${item.query.substring(0, 50)}`,
          value: `${snippet}...\n📅 ${date}`,
          inline: false
        });
      });
      
      await interaction.editReply({ embeds: [embed] });
    }
    
    // WEBSEARCH COMMAND - DuckDuckGo search
    else if (commandName === 'websearch') {
      const searchQuery = interaction.options.getString('query');
      const numResults = interaction.options.getInteger('results') || 5;
      
      await interaction.deferReply();
      
      try {
        // Use DuckDuckGo HTML search (no API key needed)
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        // Parse results using cheerio
        const cheerio = await import('cheerio');
        const $ = cheerio.load(response.data);
        
        const results = [];
        $('.result').each((i, el) => {
          if (i >= numResults) return false;
          
          const title = $(el).find('.result__title a').text().trim();
          const url = $(el).find('.result__url').text().trim();
          const snippet = $(el).find('.result__snippet').text().trim();
          
          if (title && url) {
            results.push({ title, url: url.startsWith('http') ? url : `https://${url}`, snippet });
          }
        });
        
        if (results.length === 0) {
          await interaction.editReply(`🔍 No web results found for "${searchQuery}"`);
          return;
        }
        
        const embed = new EmbedBuilder()
          .setColor('#DE5833')
          .setTitle(`🌐 Web Search: "${searchQuery}"`)
          .setDescription(`Found ${results.length} results via DuckDuckGo`)
          .setTimestamp();
        
        results.forEach((result, i) => {
          embed.addFields({
            name: `${i + 1}. ${result.title.substring(0, 100)}`,
            value: `${result.snippet.substring(0, 200) || 'No description'}...\n🔗 [${result.url.substring(0, 50)}](${result.url})`,
            inline: false
          });
        });
        
        embed.setFooter({ text: 'Powered by DuckDuckGo 🦆' });
        
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error('Web search error:', error);
        await interaction.editReply(`❌ Web search failed: ${error.message}`);
      }
    }
    
    // WEATHER COMMAND
    else if (commandName === 'weather') {
      const city = interaction.options.getString('city') || 'Cape Town';
      await interaction.deferReply();
      
      try {
        const weather = await getWeather(city);
        
        const embed = new EmbedBuilder()
          .setColor('#87CEEB')
          .setTitle(`🌤️ Weather in ${city}`)
          .setThumbnail(`https://openweathermap.org/img/wn/${weather.icon}@2x.png`)
          .addFields(
            { name: '🌡️ Temperature', value: `${weather.temp}°C`, inline: true },
            { name: '🤔 Feels Like', value: `${weather.feels_like}°C`, inline: true },
            { name: '💧 Humidity', value: `${weather.humidity}%`, inline: true },
            { name: '💨 Wind Speed', value: `${weather.wind} m/s`, inline: true },
            { name: '☁️ Conditions', value: weather.description, inline: true }
          )
          .setFooter({ text: 'Stay comfortable, Master! ✨' })
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        await interaction.editReply(`❌ Weather check failed: ${error.message}`);
      }
    }
    
    // CHAT COMMAND
    else if (commandName === 'chat') {
      const message = interaction.options.getString('message');
      await interaction.deferReply();
      
      try {
        const response = await chatWithMaid(message, interaction.user.id, interaction.user.username);
        
        const chunks = response.match(/[\s\S]{1,2000}/g) || [response];
        
        await interaction.editReply(chunks[0]);
        
        for (let i = 1; i < chunks.length; i++) {
          await interaction.followUp(chunks[i]);
        }
      } catch (error) {
        await interaction.editReply(`❌ Oh dear! I encountered an error: ${error.message}`);
      }
    }
    
    // PERSONALITY COMMAND
    else if (commandName === 'personality') {
      const selectedType = interaction.options.getString('type');
      
      if (!selectedType) {
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
          .setFooter({ text: 'Use /personality type:<name> to change' })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      } else {
        // Set new personality
        const personality = getPersonality(selectedType);
        setUserPersonality(userId, selectedType);
        
        const embed = new EmbedBuilder()
          .setColor('#90EE90')
          .setTitle(`${personality.emoji} Personality Changed!`)
          .setDescription(`Your bot personality is now: **${personality.name}**\n\n*${personality.description}*`)
          .setFooter({ text: 'Try /chat to see the new personality in action!' })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      }
    }
    
    // SCHEDULE COMMAND
    else if (commandName === 'schedule') {
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'list') {
        const tasks = taskOps.getAll();
        
        if (tasks.length === 0) {
          await interaction.reply('⏰ No scheduled tasks yet!');
          return;
        }
        
        const embed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⏰ Scheduled Tasks')
          .setDescription(`${tasks.length} tasks configured`)
          .setTimestamp();
        
        tasks.forEach(task => {
          embed.addFields({
            name: `${task.enabled ? '✅' : '❌'} ${task.name}`,
            value: `Schedule: \`${task.cron_expression}\`\nCommand: ${task.command}\nLast run: ${task.last_run ? new Date(task.last_run).toLocaleString() : 'Never'}`,
            inline: false
          });
        });
        
        await interaction.reply({ embeds: [embed] });
      }
      else if (subcommand === 'add') {
        const name = interaction.options.getString('name');
        const cronExpression = interaction.options.getString('schedule');
        const command = interaction.options.getString('command');
        
        try {
          taskOps.add({
            name,
            cronExpression,
            command,
            enabled: true,
            channelId: interaction.channelId
          });
          
          // Schedule the task
          const handlers = {
            scan: scanNetwork,
            speedtest: runSpeedtest,
            weather: getWeather
          };
          const task = taskOps.getAll().find(t => t.name === name);
          scheduleTask(client, task, handlers);
          
          await interaction.reply(`✅ Task "${name}" scheduled successfully!`);
        } catch (error) {
          await interaction.reply(`❌ Failed to add task: ${error.message}`);
        }
      }
      else if (subcommand === 'toggle') {
        const id = interaction.options.getInteger('id');
        taskOps.toggle(id);
        await interaction.reply(`✅ Task toggled!`);
      }
      else if (subcommand === 'delete') {
        const id = interaction.options.getInteger('id');
        stopTask(id);
        taskOps.delete(id);
        await interaction.reply(`✅ Task deleted!`);
      }
    }
    
    // STATS COMMAND
    else if (commandName === 'stats') {
      const devices = deviceOps.getAll();
      const onlineDevices = devices.filter(d => d.online);
      const speedStats = speedTestOps.getStats();
      const tasks = taskOps.getAll();
      
      const embed = new EmbedBuilder()
        .setColor('#667eea')
        .setTitle('📊 Bot Statistics')
        .addFields(
          { name: '📡 Total Devices', value: `${devices.length}`, inline: true },
          { name: '🟢 Online', value: `${onlineDevices.length}`, inline: true },
          { name: '🔴 Offline', value: `${devices.length - onlineDevices.length}`, inline: true },
          { name: '🚀 Speed Tests', value: `${speedStats.total_tests || 0}`, inline: true },
          { name: '⏰ Scheduled Tasks', value: `${tasks.length}`, inline: true },
          { name: '💬 Chat Messages', value: `${chatOps.getRecent(1000).length}`, inline: true }
        )
        .setFooter({ text: 'View detailed stats on the dashboard!' })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    }
    
    // DASHBOARD COMMAND
    else if (commandName === 'dashboard') {
      const embed = new EmbedBuilder()
        .setColor('#667eea')
        .setTitle('🌐 Web Dashboard')
        .setDescription('Access the web dashboard for detailed statistics and management!')
        .addFields(
          { name: '🔗 URL', value: 'http://localhost:3000', inline: false },
          { name: '📊 Features', value: '• Real-time device monitoring\n• Speed test history graphs\n• Scheduled task management\n• Research archive', inline: false }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    }
    

    
    // HOME ASSISTANT COMMAND
    else if (commandName === 'homeassistant') {
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'lights') {
        await interaction.deferReply();
        
        try {
          const { getAllLights } = await import('./src/integrations/homeassistant.js');
          const lights = await getAllLights();
          
          if (lights.length === 0) {
            await interaction.editReply('⚠️ No lights found. Make sure Home Assistant is configured!');
            return;
          }
          
          const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('💡 Home Assistant Lights')
            .setDescription(`Found **${lights.length} lights**`)
            .setTimestamp();
          
          lights.slice(0, 20).forEach(light => {
            const state = light.state === 'on' ? '🟢 On' : '⚪ Off';
            const brightness = light.attributes?.brightness ? ` (${Math.round(light.attributes.brightness / 255 * 100)}%)` : '';
            embed.addFields({
              name: light.attributes?.friendly_name || light.entity_id,
              value: `\`${light.entity_id}\`\n${state}${brightness}`,
              inline: true
            });
          });
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          await interaction.editReply(`❌ Home Assistant error: ${error.message}`);
        }
      }
      else if (subcommand === 'light') {
        const entity = interaction.options.getString('entity');
        const state = interaction.options.getBoolean('state');
        const brightness = interaction.options.getInteger('brightness');
        
        await interaction.deferReply();
        
        try {
          const { controlLight } = await import('./src/integrations/homeassistant.js');
          await controlLight(entity, state, brightness);
          
          const embed = new EmbedBuilder()
            .setColor('#90EE90')
            .setTitle('💡 Light Controlled')
            .setDescription(`Successfully ${state ? 'turned on' : 'turned off'} **${entity}**`)
            .setTimestamp();
          
          if (brightness !== null && state) {
            embed.addFields({ name: 'Brightness', value: `${Math.round(brightness / 255 * 100)}%` });
          }
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          await interaction.editReply(`❌ Failed to control light: ${error.message}`);
        }
      }
      else if (subcommand === 'switches') {
        await interaction.deferReply();
        
        try {
          const { getAllSwitches } = await import('./src/integrations/homeassistant.js');
          const switches = await getAllSwitches();
          
          if (switches.length === 0) {
            await interaction.editReply('⚠️ No switches found.');
            return;
          }
          
          const embed = new EmbedBuilder()
            .setColor('#87CEEB')
            .setTitle('🔌 Home Assistant Switches')
            .setDescription(`Found **${switches.length} switches**`)
            .setTimestamp();
          
          switches.slice(0, 20).forEach(sw => {
            const state = sw.state === 'on' ? '🟢 On' : '⚪ Off';
            embed.addFields({
              name: sw.attributes?.friendly_name || sw.entity_id,
              value: `\`${sw.entity_id}\`\n${state}`,
              inline: true
            });
          });
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          await interaction.editReply(`❌ Home Assistant error: ${error.message}`);
        }
      }
      else if (subcommand === 'switch') {
        const entity = interaction.options.getString('entity');
        const state = interaction.options.getBoolean('state');
        
        await interaction.deferReply();
        
        try {
          const { controlSwitch } = await import('./src/integrations/homeassistant.js');
          await controlSwitch(entity, state);
          
          const embed = new EmbedBuilder()
            .setColor('#90EE90')
            .setTitle('🔌 Switch Controlled')
            .setDescription(`Successfully ${state ? 'turned on' : 'turned off'} **${entity}**`)
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          await interaction.editReply(`❌ Failed to control switch: ${error.message}`);
        }
      }
      else if (subcommand === 'sensors') {
        await interaction.deferReply();
        
        try {
          const { getAllSensors } = await import('./src/integrations/homeassistant.js');
          const sensors = await getAllSensors();
          
          if (sensors.length === 0) {
            await interaction.editReply('⚠️ No sensors found.');
            return;
          }
          
          const embed = new EmbedBuilder()
            .setColor('#9370DB')
            .setTitle('📊 Home Assistant Sensors')
            .setDescription(`Found **${sensors.length} sensors**`)
            .setTimestamp();
          
          sensors.slice(0, 20).forEach(sensor => {
            const unit = sensor.attributes?.unit_of_measurement || '';
            embed.addFields({
              name: sensor.attributes?.friendly_name || sensor.entity_id,
              value: `\`${sensor.entity_id}\`\n${sensor.state} ${unit}`,
              inline: true
            });
          });
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          await interaction.editReply(`❌ Home Assistant error: ${error.message}`);
        }
      }
      else if (subcommand === 'sensor') {
        const entity = interaction.options.getString('entity');
        
        await interaction.deferReply();
        
        try {
          const { getSensorData } = await import('./src/integrations/homeassistant.js');
          const data = await getSensorData(entity);
          
          const embed = new EmbedBuilder()
            .setColor('#9370DB')
            .setTitle('📊 Sensor Reading')
            .addFields(
              { name: 'Sensor', value: data.friendly_name || entity },
              { name: 'Value', value: `${data.value} ${data.unit || ''}` },
              { name: 'Last Updated', value: new Date(data.last_updated).toLocaleString() }
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          await interaction.editReply(`❌ Failed to read sensor: ${error.message}`);
        }
      }
      else if (subcommand === 'esp') {
        await interaction.deferReply();
        
        try {
          const { getESPDevices } = await import('./src/integrations/homeassistant.js');
          const result = await getESPDevices();
          
          // Check if result has warning (no integration or no devices)
          if (result.warning) {
            const embed = new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('⚠️ ESP Device Detection')
              .setDescription(`**${result.warning}**`)
              .setTimestamp();
            
            if (result.instructions) {
              embed.addFields({
                name: '📝 Instructions',
                value: result.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n'),
                inline: false
              });
            }
            
            embed.setFooter({ text: 'Use /homeassistant diagnose for detailed analysis' });
            
            await interaction.editReply({ embeds: [embed] });
            return;
          }
          
          const devices = result.devices || [];
          
          if (devices.length === 0) {
            await interaction.editReply('⚠️ No ESP devices found. Use `/homeassistant diagnose` for troubleshooting.');
            return;
          }
          
          const embed = new EmbedBuilder()
            .setColor('#FF6347')
            .setTitle('🔧 ESP Devices')
            .setDescription(`Found **${devices.length} ESP devices**`)
            .setTimestamp();
          
          devices.forEach(device => {
            const entityList = device.entities.slice(0, 5).map(e => `• ${e.name}: ${e.state}`).join('\n');
            const more = device.entities.length > 5 ? `\n...and ${device.entities.length - 5} more` : '';
            embed.addFields({
              name: device.name,
              value: entityList + more,
              inline: false
            });
          });
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          await interaction.editReply(`❌ Failed to get ESP devices: ${error.message}\n\nUse \`/homeassistant diagnose\` for troubleshooting.`);
        }
      }
      else if (subcommand === 'diagnose') {
        await interaction.deferReply();
        
        try {
          const { checkConnection, getEntities } = await import('./src/integrations/homeassistant.js');
          const axios = (await import('axios')).default;
          
          const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('🔬 Home Assistant Diagnostics')
            .setTimestamp();
          
          // Test connection
          const connected = await checkConnection();
          embed.addFields({
            name: '📡 Connection',
            value: connected ? '✅ Connected' : '❌ Not connected',
            inline: true
          });
          
          if (!connected) {
            embed.setDescription('❌ Cannot connect to Home Assistant. Check your configuration.');
            await interaction.editReply({ embeds: [embed] });
            return;
          }
          
          // Get config
          const haUrl = process.env.HA_URL || configOps.get('ha_url');
          const haToken = process.env.HA_TOKEN || configOps.get('ha_token');
          const haClient = axios.create({
            baseURL: haUrl,
            headers: { 'Authorization': `Bearer ${haToken}`, 'Content-Type': 'application/json' }
          });
          
          const config = await haClient.get('/api/config');
          const components = config.data.components;
          
          embed.addFields({
            name: '🏠 Home Assistant',
            value: `Version: ${config.data.version}\nComponents: ${components.length}`,
            inline: true
          });
          
          // Check integrations
          const integrations = {
            'ESPHome': components.includes('esphome'),
            'MQTT': components.includes('mqtt'),
            'Tasmota': components.includes('tasmota')
          };
          
          const intStatus = Object.entries(integrations)
            .map(([name, installed]) => `${installed ? '✅' : '❌'} ${name}`)
            .join('\n');
          
          embed.addFields({
            name: '🔌 IoT Integrations',
            value: intStatus,
            inline: true
          });
          
          // Get entities
          const entities = await getEntities();
          const lights = entities.filter(e => e.entity_id.startsWith('light.')).length;
          const switches = entities.filter(e => e.entity_id.startsWith('switch.')).length;
          const sensors = entities.filter(e => e.entity_id.startsWith('sensor.')).length;
          
          embed.addFields({
            name: '📊 Entities',
            value: `Total: ${entities.length}\n💡 Lights: ${lights}\n🔌 Switches: ${switches}\n📈 Sensors: ${sensors}`,
            inline: false
          });
          
          // Recommendations
          let recommendations = [];
          if (!integrations.ESPHome) {
            recommendations.push('Install ESPHome integration for ESP devices');
          }
          if (!integrations.MQTT) {
            recommendations.push('Consider installing MQTT for more device options');
          }
          if (lights === 0 && switches === 0) {
            recommendations.push('No controllable devices found - add smart devices');
          }
          
          if (recommendations.length > 0) {
            embed.addFields({
              name: '💡 Recommendations',
              value: recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n'),
              inline: false
            });
          }
          
          embed.setFooter({ text: 'Run test-homeassistant.js on server for detailed analysis' });
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          await interaction.editReply(`❌ Diagnostic failed: ${error.message}`);
        }
      }
      else if (subcommand === 'scenes') {
        await interaction.deferReply();
        
        try {
          const { getAllScenes } = await import('./src/integrations/homeassistant.js');
          const scenes = await getAllScenes();
          
          if (scenes.length === 0) {
            await interaction.editReply('⚠️ No scenes found.');
            return;
          }
          
          const embed = new EmbedBuilder()
            .setColor('#9370DB')
            .setTitle('🎬 Home Assistant Scenes')
            .setDescription(`Found **${scenes.length} scenes**`)
            .setTimestamp();
          
          scenes.slice(0, 20).forEach(scene => {
            embed.addFields({
              name: scene.attributes?.friendly_name || scene.entity_id,
              value: `\`${scene.entity_id}\``,
              inline: true
            });
          });
          
          if (scenes.length > 20) {
            embed.setFooter({ text: `Showing 20 of ${scenes.length} scenes` });
          }
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          await interaction.editReply(`❌ Failed to get scenes: ${error.message}`);
        }
      }
      else if (subcommand === 'scene') {
        // Check permission
        const { PERMISSIONS } = await import('./src/auth/auth.js');
        const hasPermission = await checkUserPermission(userId, PERMISSIONS.ACTIVATE_SCENE);
        
        if (!hasPermission) {
          await interaction.reply({ 
            content: '❌ You do not have permission to activate scenes. Admin only.', 
            ephemeral: true 
          });
          return;
        }
        
        const entity = interaction.options.getString('entity');
        await interaction.deferReply();
        
        try {
          const { activateScene } = await import('./src/integrations/homeassistant.js');
          await activateScene(entity);
          
          const embed = new EmbedBuilder()
            .setColor('#9370DB')
            .setTitle('🎬 Scene Activated')
            .setDescription(`Successfully activated **${entity}**`)
            .addFields({ name: 'Activated by', value: `${username} (${userId})` })
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          await interaction.editReply(`❌ Failed to activate scene: ${error.message}`);
        }
      }
      else if (subcommand === 'automations') {
        await interaction.deferReply();
        
        try {
          const { getAllAutomations } = await import('./src/integrations/homeassistant.js');
          const automations = await getAllAutomations();
          
          if (automations.length === 0) {
            await interaction.editReply('⚠️ No automations found.');
            return;
          }
          
          const embed = new EmbedBuilder()
            .setColor('#FF6347')
            .setTitle('⚙️ Home Assistant Automations')
            .setDescription(`Found **${automations.length} automations**`)
            .setTimestamp();
          
          automations.slice(0, 20).forEach(auto => {
            const state = auto.state === 'on' ? '🟢 Enabled' : '⚪ Disabled';
            embed.addFields({
              name: auto.attributes?.friendly_name || auto.entity_id,
              value: `\`${auto.entity_id}\`\n${state}`,
              inline: true
            });
          });
          
          if (automations.length > 20) {
            embed.setFooter({ text: `Showing 20 of ${automations.length} automations` });
          }
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          await interaction.editReply(`❌ Failed to get automations: ${error.message}`);
        }
      }
      else if (subcommand === 'automation') {
        // Check permission
        const { PERMISSIONS } = await import('./src/auth/auth.js');
        const hasPermission = await checkUserPermission(userId, PERMISSIONS.TRIGGER_AUTOMATION);
        
        if (!hasPermission) {
          await interaction.reply({ 
            content: '❌ You do not have permission to trigger automations. Admin only.', 
            ephemeral: true 
          });
          return;
        }
        
        const entity = interaction.options.getString('entity');
        await interaction.deferReply();
        
        try {
          const { triggerAutomation } = await import('./src/integrations/homeassistant.js');
          await triggerAutomation(entity);
          
          const embed = new EmbedBuilder()
            .setColor('#FF6347')
            .setTitle('⚙️ Automation Triggered')
            .setDescription(`Successfully triggered **${entity}**`)
            .addFields({ name: 'Triggered by', value: `${username} (${userId})` })
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          await interaction.editReply(`❌ Failed to trigger automation: ${error.message}`);
        }
      }
      else if (subcommand === 'scripts') {
        await interaction.deferReply();
        
        try {
          const { getAllScripts } = await import('./src/integrations/homeassistant.js');
          const scripts = await getAllScripts();
          
          if (scripts.length === 0) {
            await interaction.editReply('⚠️ No scripts found.');
            return;
          }
          
          const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📜 Home Assistant Scripts')
            .setDescription(`Found **${scripts.length} scripts**`)
            .setTimestamp();
          
          scripts.slice(0, 20).forEach(script => {
            embed.addFields({
              name: script.attributes?.friendly_name || script.entity_id,
              value: `\`${script.entity_id}\``,
              inline: true
            });
          });
          
          if (scripts.length > 20) {
            embed.setFooter({ text: `Showing 20 of ${scripts.length} scripts` });
          }
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          await interaction.editReply(`❌ Failed to get scripts: ${error.message}`);
        }
      }
      else if (subcommand === 'script') {
        // Check permission
        const { PERMISSIONS } = await import('./src/auth/auth.js');
        const hasPermission = await checkUserPermission(userId, PERMISSIONS.RUN_SCRIPT);
        
        if (!hasPermission) {
          await interaction.reply({ 
            content: '❌ You do not have permission to run scripts. Admin only.', 
            ephemeral: true 
          });
          return;
        }
        
        const entity = interaction.options.getString('entity');
        await interaction.deferReply();
        
        try {
          const { runScript } = await import('./src/integrations/homeassistant.js');
          await runScript(entity);
          
          const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📜 Script Executed')
            .setDescription(`Successfully ran **${entity}**`)
            .addFields({ name: 'Executed by', value: `${username} (${userId})` })
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          await interaction.editReply(`❌ Failed to run script: ${error.message}`);
        }
      }
    }
    
    // PLUGIN COMMAND
    else if (commandName === 'plugin') {
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'list') {
        const { getLoadedPlugins } = await import('./src/plugins/plugin-manager.js');
        const plugins = getLoadedPlugins();
        
        if (plugins.length === 0) {
          await interaction.reply('⚠️ No plugins loaded.');
          return;
        }
        
        const embed = new EmbedBuilder()
          .setColor('#9370DB')
          .setTitle('🔌 Loaded Plugins')
          .setDescription(`${plugins.length} plugins loaded`)
          .setTimestamp();
        
        plugins.forEach(plugin => {
          const status = plugin.enabled ? '✅ Enabled' : '❌ Disabled';
          embed.addFields({
            name: `${plugin.name} v${plugin.version}`,
            value: `${plugin.description}\n${status}`,
            inline: false
          });
        });
        
        await interaction.reply({ embeds: [embed] });
      }
      else if (subcommand === 'enable') {
        const name = interaction.options.getString('name');
        
        try {
          const { enablePlugin } = await import('./src/plugins/plugin-manager.js');
          const result = await enablePlugin(name);
          
          if (result) {
            await interaction.reply(`✅ Plugin **${name}** enabled!`);
          } else {
            await interaction.reply(`❌ Plugin **${name}** not found.`);
          }
        } catch (error) {
          await interaction.reply(`❌ Failed to enable plugin: ${error.message}`);
        }
      }
      else if (subcommand === 'disable') {
        const name = interaction.options.getString('name');
        
        try {
          const { disablePlugin } = await import('./src/plugins/plugin-manager.js');
          const result = await disablePlugin(name);
          
          if (result) {
            await interaction.reply(`⏸️ Plugin **${name}** disabled!`);
          } else {
            await interaction.reply(`❌ Plugin **${name}** not found.`);
          }
        } catch (error) {
          await interaction.reply(`❌ Failed to disable plugin: ${error.message}`);
        }
      }
      else if (subcommand === 'reload') {
        const name = interaction.options.getString('name');
        
        await interaction.deferReply();
        
        try {
          const { reloadPlugin } = await import('./src/plugins/plugin-manager.js');
          const result = await reloadPlugin(name);
          
          if (result) {
            await interaction.editReply(`🔄 Plugin **${name}** reloaded!`);
          } else {
            await interaction.editReply(`❌ Plugin **${name}** not found.`);
          }
        } catch (error) {
          await interaction.editReply(`❌ Failed to reload plugin: ${error.message}`);
        }
      }
    }
    
    // TRIVIA COMMAND
    else if (commandName === 'trivia') {
      const subcommand = interaction.options.getSubcommand();
      const { 
        startAITrivia, 
        startResearchTrivia, 
        startSpeedTrivia, 
        stopTrivia, 
        getTriviaStats, 
        getTriviaSettings,
        saveTriviaSettings,
        getLeaderboard,
        TRIVIA_CATEGORIES,
        DIFFICULTY_LEVELS
      } = await import('./src/games/trivia.js');
      
      if (subcommand === 'play') {
        const category = interaction.options.getString('category') || 'general';
        const difficulty = interaction.options.getString('difficulty') || 'medium';
        const questions = interaction.options.getInteger('questions') || 5;
        
        await startAITrivia(interaction, category, difficulty, questions);
      }
      else if (subcommand === 'research') {
        const topic = interaction.options.getString('topic');
        const readingTime = interaction.options.getInteger('reading_time') || 60;
        const questions = interaction.options.getInteger('questions') || 5;
        
        await startResearchTrivia(interaction, topic, readingTime, questions);
      }
      else if (subcommand === 'speed') {
        const questions = interaction.options.getInteger('questions') || 10;
        
        await startSpeedTrivia(interaction, questions);
      }
      else if (subcommand === 'stop') {
        const stopped = stopTrivia(interaction.channelId);
        
        if (stopped) {
          await interaction.reply('🛑 Trivia game stopped!');
        } else {
          await interaction.reply({ content: 'No active trivia game in this channel.', ephemeral: true });
        }
      }
      else if (subcommand === 'stats') {
        const stats = getTriviaStats(userId);
        const accuracy = stats.questionsAnswered > 0 
          ? Math.round((stats.correctAnswers / stats.questionsAnswered) * 100) 
          : 0;
        
        const embed = new EmbedBuilder()
          .setColor('#667eea')
          .setTitle(`📊 Trivia Stats for ${username}`)
          .addFields(
            { name: '🎮 Games Played', value: `${stats.gamesPlayed}`, inline: true },
            { name: '❓ Questions Answered', value: `${stats.questionsAnswered}`, inline: true },
            { name: '✅ Correct Answers', value: `${stats.correctAnswers}`, inline: true },
            { name: '🎯 Accuracy', value: `${accuracy}%`, inline: true },
            { name: '🔥 Current Streak', value: `${stats.streak}`, inline: true },
            { name: '⭐ Best Streak', value: `${stats.bestStreak}`, inline: true },
            { name: '🏆 Total Points', value: `${stats.totalPoints}`, inline: true }
          )
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      }
      else if (subcommand === 'leaderboard') {
        const leaders = getLeaderboard(10);
        
        if (leaders.length === 0) {
          await interaction.reply('📊 No trivia stats yet! Be the first to play!');
          return;
        }
        
        const medals = ['🥇', '🥈', '🥉'];
        let leaderboardText = '';
        
        for (let i = 0; i < leaders.length; i++) {
          const player = leaders[i];
          const medal = medals[i] || `${i + 1}.`;
          const accuracy = player.questionsAnswered > 0 
            ? Math.round((player.correctAnswers / player.questionsAnswered) * 100) 
            : 0;
          leaderboardText += `${medal} <@${player.odId}> - **${player.totalPoints}** pts (${accuracy}% accuracy)\n`;
        }
        
        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('🏆 Trivia Leaderboard')
          .setDescription(leaderboardText)
          .setFooter({ text: 'Play /trivia to climb the ranks!' })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      }
      else if (subcommand === 'settings') {
        const questionTime = interaction.options.getInteger('question_time');
        const readingTime = interaction.options.getInteger('reading_time');
        
        const settings = getTriviaSettings(userId);
        
        if (questionTime) settings.questionTime = questionTime;
        if (readingTime) settings.readingTime = readingTime;
        
        if (questionTime || readingTime) {
          saveTriviaSettings(userId, settings);
          
          await interaction.reply({
            content: `✅ Settings updated!\n• Question time: ${settings.questionTime}s\n• Reading time: ${settings.readingTime}s`,
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: `⚙️ **Your Trivia Settings:**\n• Question time: ${settings.questionTime}s\n• Reading time: ${settings.readingTime}s\n\nUse options to change settings.`,
            ephemeral: true
          });
        }
      }
    }
    
    // HANGMAN COMMAND
    else if (commandName === 'hangman') {
      const category = interaction.options.getString('category') || 'random';
      const { startHangman } = await import('./src/games/hangman.js');
      await startHangman(interaction, category);
    }
    
    // NUMBER GUESS COMMAND
    else if (commandName === 'numguess') {
      const max = interaction.options.getInteger('max') || 100;
      const attempts = interaction.options.getInteger('attempts') || 10;
      const { startNumberGuess } = await import('./src/games/numguess.js');
      await startNumberGuess(interaction, max, attempts);
    }
    
    // ROCK PAPER SCISSORS COMMAND
    else if (commandName === 'rps') {
      const subcommand = interaction.options.getSubcommand();
      const { challengeRPS, quickRPS } = await import('./src/games/rps.js');
      
      if (subcommand === 'challenge') {
        const opponent = interaction.options.getUser('opponent');
        const bestOf = interaction.options.getInteger('best_of') || 3;
        await challengeRPS(interaction, opponent, bestOf);
      } else if (subcommand === 'quick') {
        await quickRPS(interaction);
      }
    }
    
    // TIC TAC TOE COMMAND
    else if (commandName === 'tictactoe') {
      const subcommand = interaction.options.getSubcommand();
      const { challengeTTT, playTTTvsAI } = await import('./src/games/tictactoe.js');
      
      if (subcommand === 'challenge') {
        const opponent = interaction.options.getUser('opponent');
        await challengeTTT(interaction, opponent);
      } else if (subcommand === 'ai') {
        await playTTTvsAI(interaction);
      }
    }
    
    // 20 QUESTIONS COMMAND
    else if (commandName === '20questions') {
      const category = interaction.options.getString('category') || 'anything';
      const { start20Questions } = await import('./src/games/twenty-questions.js');
      await start20Questions(interaction, category);
    }
    
    // RIDDLE COMMAND
    else if (commandName === 'riddle') {
      const difficulty = interaction.options.getString('difficulty') || 'medium';
      const rounds = interaction.options.getInteger('rounds') || 5;
      const { startRiddles } = await import('./src/games/riddles.js');
      await startRiddles(interaction, difficulty, rounds);
    }
    
    // WORD CHAIN COMMAND
    else if (commandName === 'wordchain') {
      const { startWordChain } = await import('./src/games/wordchain.js');
      await startWordChain(interaction, {
        start: interaction.options.getString('start'),
        theme: interaction.options.getString('theme') || 'any',
        difficulty: interaction.options.getString('difficulty') || 'normal',
        definitions: interaction.options.getBoolean('definitions') || false,
        trust_mode: interaction.options.getBoolean('trust_mode') || false
      });
    }
    
    // EMOJI DECODE COMMAND
    else if (commandName === 'emojidecode') {
      const category = interaction.options.getString('category') || 'random';
      const rounds = interaction.options.getInteger('rounds') || 5;
      const { startEmojiDecode } = await import('./src/games/emojidecode.js');
      await startEmojiDecode(interaction, category, rounds);
    }
    
    // WOULD YOU RATHER COMMAND
    else if (commandName === 'wouldyourather') {
      const optionA = interaction.options.getString('option_a');
      const optionB = interaction.options.getString('option_b');
      
      // If custom options provided, use custom mode
      if (optionA && optionB) {
        const { customWouldYouRather } = await import('./src/games/wouldyourather.js');
        await customWouldYouRather(interaction, optionA, optionB);
      } else if (optionA || optionB) {
        await interaction.reply({ content: '❌ Please provide both option_a and option_b for a custom scenario!', ephemeral: true });
      } else {
        const rounds = interaction.options.getInteger('rounds') || 5;
        const theme = interaction.options.getString('theme') || 'random';
        const { startWouldYouRather } = await import('./src/games/wouldyourather.js');
        await startWouldYouRather(interaction, rounds, theme);
      }
    }
    
    // CAPTION CONTEST COMMAND
    else if (commandName === 'caption') {
      const rounds = interaction.options.getInteger('rounds') || 3;
      const { startCaptionContest } = await import('./src/games/caption.js');
      await startCaptionContest(interaction, rounds);
    }
    
    // ACRONYM COMMAND
    else if (commandName === 'acronym') {
      const rounds = interaction.options.getInteger('rounds') || 5;
      const letters = interaction.options.getInteger('letters') || 3;
      const { startAcronymGame } = await import('./src/games/acronym.js');
      await startAcronymGame(interaction, rounds, letters);
    }
    
    // STORY BUILDER COMMAND
    else if (commandName === 'story') {
      const theme = interaction.options.getString('theme') || 'adventure';
      const turns = interaction.options.getInteger('turns') || 10;
      const { startStoryBuilder } = await import('./src/games/storybuilder.js');
      await startStoryBuilder(interaction, theme, turns);
    }
    
    // CONNECT FOUR COMMAND
    else if (commandName === 'connect4') {
      const subcommand = interaction.options.getSubcommand();
      const { challengeConnect4, playConnect4AI } = await import('./src/games/connectfour.js');
      
      if (subcommand === 'challenge') {
        const opponent = interaction.options.getUser('opponent');
        await challengeConnect4(interaction, opponent);
      } else if (subcommand === 'ai') {
        await playConnect4AI(interaction);
      }
    }
    
    // MATH BLITZ COMMAND
    else if (commandName === 'mathblitz') {
      const difficulty = interaction.options.getString('difficulty') || 'medium';
      const problems = interaction.options.getInteger('problems') || 10;
      const { startMathBlitz } = await import('./src/games/mathblitz.js');
      await startMathBlitz(interaction, difficulty, problems);
    }
    
    // REACTION RACE COMMAND
    else if (commandName === 'reaction') {
      const rounds = interaction.options.getInteger('rounds') || 5;
      const { startReactionRace } = await import('./src/games/reaction.js');
      await startReactionRace(interaction, rounds);
    }
    
    // MAFIA COMMAND
    else if (commandName === 'mafia') {
      const minPlayers = interaction.options.getInteger('min_players') || 4;
      const { startMafia } = await import('./src/games/mafia.js');
      await startMafia(interaction, minPlayers);
    }
    
    // GAME UTILITIES COMMAND
    else if (commandName === 'game') {
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'stop') {
        const { clearActiveGame, getActiveGame } = await import('./src/games/game-manager.js');
        const { stopHangman } = await import('./src/games/hangman.js');
        const { stopNumberGuess } = await import('./src/games/numguess.js');
        const { stopTTT } = await import('./src/games/tictactoe.js');
        const { stopTrivia } = await import('./src/games/trivia.js');
        const { stop20Questions } = await import('./src/games/twenty-questions.js');
        const { stopRiddles } = await import('./src/games/riddles.js');
        const { stopWordChain } = await import('./src/games/wordchain.js');
        const { stopEmojiDecode } = await import('./src/games/emojidecode.js');
        const { stopWouldYouRather } = await import('./src/games/wouldyourather.js');
        const { stopCaptionContest } = await import('./src/games/caption.js');
        const { stopAcronymGame } = await import('./src/games/acronym.js');
        const { stopStoryBuilder } = await import('./src/games/storybuilder.js');
        const { stopConnect4 } = await import('./src/games/connectfour.js');
        const { stopMathBlitz } = await import('./src/games/mathblitz.js');
        const { stopReactionRace } = await import('./src/games/reaction.js');
        const { stopMafia } = await import('./src/games/mafia.js');
        
        const game = getActiveGame(interaction.channelId);
        let stopped = false;
        let gameName = 'game';
        
        if (game) {
          gameName = game.type;
          clearActiveGame(interaction.channelId);
          stopped = true;
        }
        
        // Also try specific game stops
        if (stopHangman(interaction.channelId)) { stopped = true; gameName = 'Hangman'; }
        if (stopNumberGuess(interaction.channelId)) { stopped = true; gameName = 'Number Guess'; }
        if (stop20Questions(interaction.channelId)) { stopped = true; gameName = '20 Questions'; }
        if (stopRiddles(interaction.channelId)) { stopped = true; gameName = 'Riddles'; }
        if (stopWordChain(interaction.channelId)) { stopped = true; gameName = 'Word Chain'; }
        if (stopEmojiDecode(interaction.channelId)) { stopped = true; gameName = 'Emoji Decode'; }
        if (stopTTT(interaction.channelId)) { stopped = true; gameName = 'Tic Tac Toe'; }
        if (stopTrivia(interaction.channelId)) { stopped = true; gameName = 'Trivia'; }
        if (stopWouldYouRather(interaction.channelId)) { stopped = true; gameName = 'Would You Rather'; }
        if (stopCaptionContest(interaction.channelId)) { stopped = true; gameName = 'Caption Contest'; }
        if (stopAcronymGame(interaction.channelId)) { stopped = true; gameName = 'Acronym'; }
        if (stopStoryBuilder(interaction.channelId)) { stopped = true; gameName = 'Story Builder'; }
        if (stopConnect4(interaction.channelId)) { stopped = true; gameName = 'Connect Four'; }
        if (stopMathBlitz(interaction.channelId)) { stopped = true; gameName = 'Math Blitz'; }
        if (stopReactionRace(interaction.channelId)) { stopped = true; gameName = 'Reaction Race'; }
        if (stopMafia(interaction.channelId)) { stopped = true; gameName = 'Mafia'; }
        
        if (stopped) {
          await interaction.reply(`🛑 ${gameName} game stopped!`);
        } else {
          await interaction.reply({ content: 'No active game in this channel.', ephemeral: true });
        }
      }
      else if (subcommand === 'stats') {
        const { getAllUserStats } = await import('./src/games/game-manager.js');
        const stats = getAllUserStats(userId);
        
        if (Object.keys(stats).length === 0) {
          await interaction.reply({ content: '📊 No game stats yet! Play some games to see your stats.', ephemeral: true });
          return;
        }
        
        const embed = new EmbedBuilder()
          .setColor('#667eea')
          .setTitle(`🎮 Game Stats for ${username}`)
          .setTimestamp();
        
        for (const [gameType, data] of Object.entries(stats)) {
          const winRate = data.gamesPlayed > 0 ? Math.round((data.gamesWon / data.gamesPlayed) * 100) : 0;
          embed.addFields({
            name: `${gameType.charAt(0).toUpperCase() + gameType.slice(1)}`,
            value: `Played: ${data.gamesPlayed} | Won: ${data.gamesWon} (${winRate}%) | Points: ${data.totalPoints}`,
            inline: false
          });
        }
        
        await interaction.reply({ embeds: [embed] });
      }
      else if (subcommand === 'leaderboard') {
        const { getGlobalLeaderboard } = await import('./src/games/game-manager.js');
        const leaders = getGlobalLeaderboard(10);
        
        if (leaders.length === 0) {
          await interaction.reply('🏆 No game stats yet! Be the first to play!');
          return;
        }
        
        const medals = ['🥇', '🥈', '🥉'];
        let leaderboardText = '';
        
        for (let i = 0; i < leaders.length; i++) {
          const player = leaders[i];
          const medal = medals[i] || `${i + 1}.`;
          const winRate = player.gamesPlayed > 0 ? Math.round((player.gamesWon / player.gamesPlayed) * 100) : 0;
          leaderboardText += `${medal} <@${player.odId}> - **${player.totalPoints}** pts (${winRate}% win rate)\n`;
        }
        
        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('🏆 Games Leaderboard')
          .setDescription(leaderboardText)
          .setFooter({ text: 'Play games to climb the ranks!' })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      }
    }
    
    // PERMISSIONS COMMAND
    else if (commandName === 'permissions') {
      const subcommand = interaction.options.getSubcommand();
      
      // Only admins can manage permissions
      const { PERMISSIONS, ROLES } = await import('./src/auth/auth.js');
      const isAdmin = await checkUserPermission(userId, PERMISSIONS.MANAGE_USERS);
      
      if (!isAdmin) {
        await interaction.reply({ 
          content: '❌ Only administrators can manage permissions.', 
          ephemeral: true 
        });
        return;
      }
      
      if (subcommand === 'set') {
        const targetUser = interaction.options.getUser('user');
        const role = interaction.options.getString('role');
        
        await setUserRole(targetUser.id, targetUser.username, role);
        
        const embed = new EmbedBuilder()
          .setColor('#90EE90')
          .setTitle('✅ Permissions Updated')
          .setDescription(`**${targetUser.username}** has been assigned the **${role}** role`)
          .addFields(
            { name: 'User ID', value: targetUser.id },
            { name: 'New Role', value: role.charAt(0).toUpperCase() + role.slice(1) }
          )
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      }
      else if (subcommand === 'check') {
        const targetUser = interaction.options.getUser('user');
        const { configOps } = await import('./src/database/db.js');
        const userJson = configOps.get(`discord_user_${targetUser.id}`);
        
        let role = 'viewer'; // default
        if (userJson) {
          const userData = JSON.parse(userJson);
          role = userData.role;
        }
        
        const embed = new EmbedBuilder()
          .setColor('#87CEEB')
          .setTitle('👥 User Permissions')
          .addFields(
            { name: 'User', value: targetUser.username },
            { name: 'User ID', value: targetUser.id },
            { name: 'Role', value: role.charAt(0).toUpperCase() + role.slice(1) }
          )
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      }
      else if (subcommand === 'list') {
        const { configOps } = await import('./src/database/db.js');
        const allConfig = configOps.getAll();
        const discordUsers = [];
        
        for (const config of allConfig) {
          if (config.key.startsWith('discord_user_')) {
            const userData = JSON.parse(config.value);
            discordUsers.push(userData);
          }
        }
        
        const embed = new EmbedBuilder()
          .setColor('#9370DB')
          .setTitle('👥 Discord User Roles')
          .setDescription(`${discordUsers.length} users configured`)
          .setTimestamp();
        
        if (discordUsers.length === 0) {
          embed.addFields({ name: 'No Users', value: 'No Discord users have been assigned roles yet.' });
        } else {
          discordUsers.forEach(user => {
            embed.addFields({
              name: user.username,
              value: `Role: ${user.role}\nUser ID: ${user.userId}`,
              inline: true
            });
          });
        }
        
        await interaction.reply({ embeds: [embed] });
      }
    }
    
    // HELP COMMAND
    else if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setColor('#FFB6C1')
        .setTitle('🌸 Maid Bot Commands 🌸')
        .setDescription('At your service, Master! Here\'s what I can do:')
        .addFields(
          { name: '🔍 /scan', value: 'Scan network for devices (requires permission)', inline: false },
          { name: '📋 /devices', value: 'List all known devices with numbers for WOL', inline: false },
          { name: '⚡ /wol', value: 'Wake a device with Wake-on-LAN (Admin/Manager only)', inline: false },
          { name: '🚀 /speedtest', value: 'Test your internet speed (requires permission)', inline: false },
          { name: '📊 /speedhistory', value: 'View speed test history', inline: false },
          { name: '🔎 /research', value: 'Research a topic and save results (requires permission)', inline: false },
          { name: '📚 /researchhistory', value: 'View past research', inline: false },
          { name: '🔍 /researchsearch', value: 'Full-text search through past research', inline: false },
          { name: '🌐 /websearch', value: 'Search the web via DuckDuckGo', inline: false },
          { name: '🌤️ /weather', value: 'Get weather information', inline: false },
          { name: '💬 /chat', value: 'Chat with me!', inline: false },
          { name: '⏰ /schedule', value: 'Manage scheduled tasks', inline: false },
          { name: '📊 /stats', value: 'View bot statistics', inline: false },
          { name: '🌐 /dashboard', value: 'Get web dashboard URL', inline: false },
          { name: '🌐 /tailscale', value: 'Tailscale network management', inline: false },
          { name: '🏠 /homeassistant', value: 'Control Home Assistant devices', inline: false },
          { name: '🔌 /plugin', value: 'Manage plugins', inline: false },
          { name: '👥 /permissions', value: 'Manage user permissions (Admin only)', inline: false }
        )
        .addFields({
          name: '🔐 Permission System',
          value: 'Some commands require specific permissions. Server Administrators and Managers have elevated access. Use `/permissions check @user` to view permissions.',
          inline: false
        })
        .setFooter({ text: 'Always happy to serve! ✨' })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
    }
    
  } catch (error) {
    console.error('Command error:', error);
    const errorMessage = `❌ An error occurred: ${error.message}\n\nI apologize for the inconvenience, Master!`;
    
    if (interaction.deferred) {
      await interaction.editReply(errorMessage);
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

// Keep legacy text commands for backward compatibility
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;
  
  await message.reply('✨ I now use slash commands! Type `/help` to see all available commands~');
});

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

// Login
client.login(process.env.DISCORD_BOT_TOKEN).catch((error) => {
  console.error('Failed to login:', error);
  process.exit(1);
});

console.log('🌸 Starting Maid Bot...');
