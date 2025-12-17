/**
 * Action Executor
 * 
 * Allows the AI to execute bot commands/actions on behalf of users.
 * Instead of just suggesting commands, the AI can actually perform them.
 * 
 * @module plugins/conversational-ai/actions/action-executor
 */

import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('action-executor');

/**
 * Extract device identifier from a query (IP, MAC, or name)
 * @param {string} query - User's message
 * @returns {string|null} Device identifier or null
 */
function extractDeviceIdentifier(query) {
  // Match IP address
  const ipMatch = query.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
  if (ipMatch) return ipMatch[1];
  
  // Match MAC address (various formats)
  const macMatch = query.match(/\b([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/);
  if (macMatch) return macMatch[0];
  
  // Try to extract device name after keywords
  const namePatterns = [
    /wake\s+(?:up\s+)?(?:device\s+)?["']?([a-zA-Z0-9_-]+)["']?/i,
    /turn\s+on\s+["']?([a-zA-Z0-9_-]+)["']?/i,
    /power\s+on\s+["']?([a-zA-Z0-9_-]+)["']?/i,
    /start\s+["']?([a-zA-Z0-9_-]+)["']?/i,
    /boot\s+(?:up\s+)?["']?([a-zA-Z0-9_-]+)["']?/i
  ];
  
  for (const pattern of namePatterns) {
    const match = query.match(pattern);
    if (match && match[1] && !['the', 'my', 'a', 'device', 'pc', 'computer'].includes(match[1].toLowerCase())) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Parse automation actions from a message
 * Detects actions like "wake PC", "scan network", "run speedtest", "turn on lights"
 * @param {string} message - Message to parse
 * @returns {Object[]} Array of action objects
 */
function parseAutomationActions(message) {
  if (!message) return [];
  
  const actions = [];
  const lowerMsg = message.toLowerCase();
  
  // Wake-on-LAN patterns
  const wolPatterns = [
    /wake\s+(?:up\s+)?(?:my\s+)?(?:device\s+)?["']?([a-zA-Z0-9_\-]+)["']?/i,
    /boot\s+(?:up\s+)?(?:my\s+)?["']?([a-zA-Z0-9_\-]+)["']?/i,
    /turn\s+on\s+(?:my\s+)?(?:pc|computer|server)\s*["']?([a-zA-Z0-9_\-]*)["']?/i,
    /start\s+(?:my\s+)?(?:pc|computer|server)\s*["']?([a-zA-Z0-9_\-]*)["']?/i
  ];
  
  for (const pattern of wolPatterns) {
    const match = message.match(pattern);
    if (match) {
      const device = match[1]?.trim();
      if (device && !['the', 'my', 'a', 'and', 'then'].includes(device.toLowerCase())) {
        actions.push({ type: 'wol', device });
      } else if (lowerMsg.includes('pc') || lowerMsg.includes('computer')) {
        actions.push({ type: 'wol', device: 'pc' });
      }
      break;
    }
  }
  
  // Network scan
  if (lowerMsg.includes('scan') && (lowerMsg.includes('network') || lowerMsg.includes('devices'))) {
    actions.push({ type: 'scan' });
  }
  
  // Speed test
  if (lowerMsg.includes('speed') && (lowerMsg.includes('test') || lowerMsg.includes('check'))) {
    actions.push({ type: 'speedtest' });
  }
  
  // Home Assistant actions
  const haPatterns = [
    /turn\s+(on|off)\s+(?:the\s+)?(.+?)(?:\s+(?:and|then)|$)/i,
    /switch\s+(on|off)\s+(?:the\s+)?(.+?)(?:\s+(?:and|then)|$)/i,
    /activate\s+(?:scene\s+)?(.+?)(?:\s+(?:and|then)|$)/i
  ];
  
  for (const pattern of haPatterns) {
    const match = message.match(pattern);
    if (match) {
      if (pattern.source.includes('activate')) {
        actions.push({ type: 'homeassistant', action: 'scene', scene: match[1] });
      } else {
        actions.push({ type: 'homeassistant', action: match[1], device: match[2] });
      }
      break;
    }
  }
  
  return actions;
}

/**
 * Action definitions with their execution logic
 * Each action has:
 * - keywords: triggers for detection
 * - plugin: required plugin
 * - execute: async function that performs the action
 * - formatResult: function to format the result for display
 */
const ACTIONS = {
  // Network actions
  'network-scan': {
    keywords: ['scan', 'network scan', 'find devices', 'what devices', 'which devices', 'devices online', 'online devices', 'show network', 'show devices', 'network devices'],
    plugin: 'network-management',
    description: 'Scan the network for devices',
    async execute(context) {
      const { scanNetwork, quickPing } = await import('../../network-management/commands.js');
      // Use quickPing for faster results, full scan if explicitly requested
      const isFullScan = context.query?.includes('full') || context.query?.includes('scan');
      const result = isFullScan ? await scanNetwork() : await quickPing();
      return result;
    },
    formatResult(result) {
      const devices = result.devices || [];
      
      // Separate by network type
      const localDevices = devices.filter(d => d.network !== 'tailscale' && !d.mac?.startsWith('ts:'));
      const tailscaleDevices = devices.filter(d => d.network === 'tailscale' || d.mac?.startsWith('ts:'));
      
      const localOnline = localDevices.filter(d => d.online);
      const localOffline = localDevices.filter(d => !d.online);
      const tsOnline = tailscaleDevices.filter(d => d.online);
      const tsOffline = tailscaleDevices.filter(d => !d.online);
      
      // Helper to format device with emoji, name, type, OS
      const formatDevice = (d) => {
        const emoji = d.emoji || (d.device_type ? getTypeEmoji(d.device_type) : '📱');
        const name = d.name || d.notes || d.hostname || d.ip;
        const ip = d.name ? ` (${d.ip})` : '';
        const type = d.device_type ? ` [${d.device_type}]` : '';
        const os = d.os && d.os !== 'unknown' ? ` (${d.os})` : '';
        const latency = d.latency ? ` ${d.latency}ms` : '';
        return `${emoji} ${name}${ip}${type}${os}${latency}`;
      };
      
      // Helper for type emoji
      const getTypeEmoji = (type) => {
        const emojis = { pc: '💻', laptop: '💻', server: '🖥️', phone: '📱', tablet: '📲', router: '📡', printer: '🖨️', tv: '📺', gaming: '🎮', iot: '🔌' };
        return emojis[type] || '📱';
      };
      
      let response = `**📊 Network Scan Results**\n`;
      response += `Found **${devices.length}** devices total\n\n`;
      
      // Local Network Section
      if (localDevices.length > 0) {
        response += `**🏠 Local Network** (${localOnline.length}/${localDevices.length} online)\n`;
        response += `┌─────────────────────────────\n`;
        
        if (localOnline.length > 0) {
          response += `│ 🟢 **Online:**\n`;
          localOnline.slice(0, 8).forEach(d => {
            response += `│  ${formatDevice(d)}\n`;
          });
          if (localOnline.length > 8) response += `│  ...and ${localOnline.length - 8} more\n`;
        }
        
        if (localOffline.length > 0) {
          response += `│ 🔴 **Offline:** ${localOffline.length} device(s)\n`;
        }
        response += `└─────────────────────────────\n\n`;
      }
      
      // Tailscale VPN Section
      if (tailscaleDevices.length > 0) {
        response += `**🌐 Tailscale VPN** (${tsOnline.length}/${tailscaleDevices.length} online)\n`;
        response += `┌─────────────────────────────\n`;
        
        if (tsOnline.length > 0) {
          response += `│ 🟢 **Online:**\n`;
          tsOnline.slice(0, 8).forEach(d => {
            response += `│  ${formatDevice(d)}\n`;
          });
          if (tsOnline.length > 8) response += `│  ...and ${tsOnline.length - 8} more\n`;
        }
        
        if (tsOffline.length > 0) {
          response += `│ 🔴 **Offline:** ${tsOffline.length} device(s)\n`;
        }
        response += `└─────────────────────────────\n`;
      }
      
      // Summary stats
      const totalOnline = localOnline.length + tsOnline.length;
      const totalOffline = localOffline.length + tsOffline.length;
      response += `\n📈 **Summary:** ${totalOnline} online, ${totalOffline} offline`;
      
      return response;
    }
  },

  'network-devices': {
    keywords: ['list devices', 'show devices', 'device list', 'all devices'],
    plugin: 'network-management',
    description: 'List all known network devices',
    async execute() {
      const { deviceOps } = await import('../../../src/database/db.js');
      const devices = deviceOps.getAll();
      return { devices, count: devices.length };
    },
    formatResult(result) {
      if (!result.devices || result.devices.length === 0) {
        return 'No devices found in the database. Try running a network scan first!';
      }
      
      const online = result.devices.filter(d => d.online);
      const offline = result.devices.filter(d => !d.online);
      
      // Helper to format device: "Name (IP)" if named, otherwise just IP
      const formatDevice = (d) => {
        const emoji = d.emoji || '📱';
        const label = d.name ? `${d.name} (${d.ip})` : d.ip;
        return `• ${emoji} ${label}`;
      };
      
      let response = `Found **${result.count}** devices total.\n\n`;
      response += `**🟢 Online:** ${online.length} | **🔴 Offline:** ${offline.length}\n\n`;
      
      if (online.length > 0) {
        response += online.slice(0, 8).map(formatDevice).join('\n');
        if (online.length > 8) response += `\n...and ${online.length - 8} more`;
      }
      
      if (offline.length > 0) {
        response += `\n\n**Offline:**\n`;
        response += offline.slice(0, 5).map(formatDevice).join('\n');
        if (offline.length > 5) response += `\n...and ${offline.length - 5} more`;
      }
      
      return response;
    }
  },

  // Wake-on-LAN
  'wake-device': {
    keywords: ['wake', 'wol', 'turn on', 'power on', 'boot', 'start up', 'wake up'],
    plugin: 'network-management',
    description: 'Wake a device using Wake-on-LAN',
    permission: 'wake_device', // Uses PERMISSIONS.WAKE_DEVICE
    needsTarget: true,
    async execute(context) {
      const { wakeDevice } = await import('../../network-management/commands.js');
      const { deviceOps } = await import('../../../src/database/db.js');
      const query = context.query || '';
      
      // Get all devices with MAC addresses
      const devices = deviceOps.getAll().filter(d => d.mac);
      const availableDevices = devices.map(d => ({
        name: d.name || d.ip,
        ip: d.ip,
        mac: d.mac,
        type: d.type || 'unknown',
        online: d.online
      }));
      
      // First try exact match with extractDeviceIdentifier
      let deviceId = extractDeviceIdentifier(query);
      let device = null;
      
      if (deviceId) {
        device = devices.find(d => 
          d.ip === deviceId ||
          d.mac?.toLowerCase() === deviceId.toLowerCase() ||
          d.name?.toLowerCase() === deviceId.toLowerCase()
        );
      }
      
      // If no exact match, use AI to fuzzy match device name
      if (!device && query.length > 5) {
        try {
          const { getPlugin } = await import('../../../src/core/plugin-system.js');
          const aiPlugin = getPlugin('conversational-ai');
          
          if (aiPlugin && availableDevices.length > 0) {
            const prompt = `You are parsing a Wake-on-LAN command. Match the device the user wants to wake.

USER MESSAGE: "${query}"

AVAILABLE DEVICES:
${availableDevices.map(d => `- "${d.name}" (IP: ${d.ip}, Type: ${d.type}, ${d.online ? 'Online' : 'Offline'})`).join('\n')}

Return ONLY a JSON object:
{
  "deviceName": "exact device name from the list that best matches",
  "confidence": "high", "medium", or "low",
  "reasoning": "brief explanation"
}

MATCHING RULES:
- "wake my pc" or "wake the computer" → find device with type "pc" or "computer" or name containing "pc"
- "wake gaming" or "gaming pc" → find device with "gaming" in name
- "wake server" → find device with "server" in name or type
- "turn on kusanagi" → find device named "kusanagi" (case insensitive)
- Prefer offline devices (they need waking)
- If multiple matches, prefer the one that's offline
- If no good match, set confidence to "low"

Return ONLY the JSON, no other text.`;

            const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
              prompt,
              options: { maxOutputTokens: 150, temperature: 0.1 }
            });
            
            const responseText = result?.response?.text?.() || '';
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.deviceName && parsed.confidence !== 'low') {
                // Find the device by the AI-matched name
                device = devices.find(d => 
                  (d.name || d.ip).toLowerCase() === parsed.deviceName.toLowerCase()
                );
                if (device) {
                  logger.info(`AI matched wake device: "${parsed.deviceName}", confidence=${parsed.confidence}`);
                }
              } else if (parsed.confidence === 'low') {
                // Return for clarification
                return {
                  needsSelection: true,
                  devices: availableDevices.filter(d => !d.online).slice(0, 10),
                  message: `I'm not sure which device you mean. ${parsed.reasoning || 'Please specify the device name.'}`,
                  aiUncertain: true
                };
              }
            }
          }
        } catch (error) {
          logger.warn('AI parsing failed for wake device, using fallback:', error.message);
        }
      }
      
      if (!device && !deviceId) {
        // List available devices that can be woken
        const offlineDevices = availableDevices.filter(d => !d.online);
        return { 
          needsSelection: true, 
          devices: offlineDevices.slice(0, 10),
          message: 'Which device would you like to wake?'
        };
      }
      
      if (!device) {
        return { 
          error: `Device "${deviceId}" not found`, 
          notFound: true,
          availableDevices: availableDevices.slice(0, 10)
        };
      }
      
      if (!device.mac) {
        return { error: `Device "${device.name || device.ip}" has no MAC address`, noMac: true };
      }
      
      // Send WOL packet
      await wakeDevice(device.mac);
      
      return {
        success: true,
        device: {
          name: device.name || device.ip,
          ip: device.ip,
          mac: device.mac
        },
        aiParsed: true
      };
    },
    formatResult(result) {
      if (result.needsSelection) {
        let response = `${result.message}\n\n**Available devices:**\n`;
        if (result.devices.length === 0) {
          response += '_No offline devices with MAC addresses found._';
        } else {
          response += result.devices.map(d => `• ${d.name} (${d.ip})`).join('\n');
        }
        response += '\n\nTry: "Wake up [device name]" or "Turn on my PC"';
        return response;
      }
      
      if (result.notFound) {
        let response = `❌ ${result.error}`;
        if (result.availableDevices?.length > 0) {
          response += `\n\n**Available devices:**\n${result.availableDevices.map(d => `• ${d.name}`).join('\n')}`;
        }
        return response;
      }
      
      if (result.noMac) {
        return `❌ ${result.error}\n\nWake-on-LAN requires a MAC address.`;
      }
      
      if (result.error) {
        return `❌ Failed to wake device: ${result.error}`;
      }
      
      return `⚡ **Wake-on-LAN packet sent!**\n\n` +
        `📱 **Device:** ${result.device.name}\n` +
        `🌐 **IP:** ${result.device.ip}\n` +
        `🔗 **MAC:** ${result.device.mac}\n\n` +
        `_The device should wake up in a few seconds..._`;
    }
  },

  // Speed test
  'speedtest': {
    keywords: ['speed test', 'speedtest', 'internet speed', 'bandwidth', 'how fast', 'connection speed'],
    plugin: 'integrations',
    description: 'Run an internet speed test',
    permission: 'run_speedtest', // Uses PERMISSIONS.RUN_SPEEDTEST
    async execute() {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const integrationsPlugin = getPlugin('integrations');
      
      // Note: method is runSpeedtest (lowercase 't')
      if (!integrationsPlugin?.speedtest?.runSpeedtest) {
        throw new Error('Speed test not available');
      }
      
      return await integrationsPlugin.speedtest.runSpeedtest();
    },
    formatResult(result) {
      // Values come as strings from speedtest plugin, handle both string and number
      const download = result.download != null ? (typeof result.download === 'number' ? result.download.toFixed(2) : result.download) : 'N/A';
      const upload = result.upload != null ? (typeof result.upload === 'number' ? result.upload.toFixed(2) : result.upload) : 'N/A';
      const ping = result.ping != null ? (typeof result.ping === 'number' ? result.ping.toFixed(0) : Math.round(parseFloat(result.ping))) : 'N/A';
      
      return `**🚀 Speed Test Results:**\n\n` +
        `⬇️ **Download:** ${download} Mbps\n` +
        `⬆️ **Upload:** ${upload} Mbps\n` +
        `📶 **Ping:** ${ping} ms\n` +
        (result.server ? `\n_Server: ${result.server}_` : '');
    }
  },

  // Weather
  'weather': {
    keywords: ['weather', 'temperature', 'forecast', 'how hot', 'how cold', 'raining'],
    plugin: 'integrations',
    description: 'Get current weather information',
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const integrationsPlugin = getPlugin('integrations');
      
      if (!integrationsPlugin?.weather?.getWeather) {
        throw new Error('Weather not available');
      }
      
      return await integrationsPlugin.weather.getWeather(context.location);
    },
    formatResult(result) {
      if (!result) return 'Could not fetch weather data.';
      
      return `**🌤️ Weather:**\n\n` +
        `🌡️ **Temperature:** ${result.temperature || 'N/A'}°C\n` +
        `💧 **Humidity:** ${result.humidity || 'N/A'}%\n` +
        `🌬️ **Wind:** ${result.wind || 'N/A'}\n` +
        `📍 **Location:** ${result.location || 'Default'}`;
    }
  },

  // Bot stats
  'bot-stats': {
    keywords: ['bot stats', 'statistics', 'uptime', 'how long running', 'bot status'],
    plugin: 'core',
    description: 'Get bot statistics',
    async execute(context) {
      const client = context.client;
      if (!client) throw new Error('Client not available');
      
      const uptime = client.uptime || 0;
      const hours = Math.floor(uptime / 3600000);
      const minutes = Math.floor((uptime % 3600000) / 60000);
      
      return {
        uptime: `${hours}h ${minutes}m`,
        servers: client.guilds?.cache?.size || 0,
        users: client.users?.cache?.size || 0,
        ping: client.ws?.ping || 0
      };
    },
    formatResult(result) {
      return `**📊 Bot Statistics:**\n\n` +
        `⏱️ **Uptime:** ${result.uptime}\n` +
        `🏠 **Servers:** ${result.servers}\n` +
        `👥 **Users:** ${result.users}\n` +
        `📶 **Ping:** ${result.ping}ms`;
    }
  },

  // Help
  'help': {
    keywords: ['help', 'what can you do', 'commands', 'how to use'],
    plugin: 'core',
    description: 'Show available commands',
    async execute(context) {
      const query = context.query?.toLowerCase() || '';
      // Check if user wants full/detailed/all commands
      const wantsFull = query.includes('full') || query.includes('all') || query.includes('detail') || query.includes('everything') || query.includes('complete');
      return { showHelp: true, full: wantsFull };
    },
    formatResult(result) {
      if (result.full) {
        // Full detailed help
        return `**📚 Full Command List**\n\n` +
          `**🌐 Network & Devices:**\n` +
          `• "What devices are online?" - Quick network scan\n` +
          `• "Scan the network" - Full network discovery\n` +
          `• "Wake up [device]" - Wake-on-LAN\n` +
          `• "Rename [IP] as [name]" - Name a device\n` +
          `• "Set [device] type to server" - Set device type\n` +
          `• "Device info [IP]" - Get device details\n` +
          `• "Ping [device]" - Test connectivity\n` +
          `• "Scan ports on [device]" - Port scan\n\n` +
          `**🔌 Services:**\n` +
          `• "List services" - Show all named services\n` +
          `• "Name port 9000 as Portainer" - Name a service\n` +
          `• "Add port 3000 to [device]" - Add custom port\n` +
          `• "Check port 8080 on [device]" - Check if running\n` +
          `• "Check all services on [device]" - Status check\n` +
          `• "Delete port 8080 from [device]" - Remove service\n\n` +
          `**🚀 Speed & Internet:**\n` +
          `• "Run a speed test" - Test bandwidth\n` +
          `• "How fast is my internet?" - Speed check\n\n` +
          `**🎮 Games:**\n` +
          `• "Play trivia" - Start trivia game\n` +
          `• "Play hangman" - Word guessing\n` +
          `• "Play riddles" - Riddle challenge\n` +
          `• "What games can we play?" - List games\n\n` +
          `**🔍 Research:**\n` +
          `• "Research [topic]" - Look up info\n` +
          `• "Tell me about [topic]" - Get information\n\n` +
          `**🏠 Smart Home:**\n` +
          `• "Turn on [device]" - Control lights/switches\n` +
          `• "Set [device] to 50%" - Adjust brightness\n\n` +
          `**🖥️ Server Admin:**\n` +
          `• "Server status" - Check CPU/memory\n` +
          `• "Show logs" - View bot logs\n` +
          `• "Restart bot" - Restart service\n` +
          `• "Deploy" - Pull & restart\n\n` +
          `**⏰ Reminders:**\n` +
          `• "Remind me to [task] in [time]"\n` +
          `• "List my reminders"\n\n` +
          `**🎵 Music Player:**\n` +
          `• "Play music" - Start 24/7 music\n` +
          `• "Skip" / "Next song" - Skip track\n` +
          `• "Pause" / "Resume" - Control playback\n` +
          `• "Play rock" / "Play christmas" - Change playlist\n` +
          `• "What song is this?" - Now playing\n` +
          `• "Volume 50" / "Louder" - Adjust volume\n\n` +
          `**🚧 Coming Soon:**\n` +
          `• 📊 Dashboard buttons in Discord\n` +
          `• 📈 Network traffic monitoring\n` +
          `• 🔔 Service down alerts\n` +
          `• 📱 Mobile push notifications\n` +
          `• 📅 Calendar integration\n` +
          `• 🤖 Custom automations/workflows\n\n` +
          `_Have a feature request? Let me know!_`;
      }
      
      // Quick summary help
      return `Here's what I can do:\n\n` +
        `**🌐 Network:** Scan devices, check what's online, wake devices\n` +
        `**🔌 Services:** Add ports, check if running, name services\n` +
        `**🎵 Music:** 24/7 playback, skip, pause, playlists\n` +
        `**🚀 Speed Test:** Check your internet speed\n` +
        `**🎮 Games:** Play trivia, hangman, and more\n` +
        `**🔍 Research:** Look up topics\n` +
        `**🏠 Smart Home:** Control Home Assistant devices\n` +
        `**🖥️ Server Admin:** Check status, view logs, restart, deploy\n\n` +
        `Just ask me naturally! For example:\n` +
        `• "What devices are online?"\n` +
        `• "Run a speed test"\n` +
        `• "Let's play trivia"\n\n` +
        `💡 **Want the full list?** Say "show me all commands" or "full help"`;
    }
  },

  // ============ MUSIC PLAYER ============
  'music-play': {
    keywords: ['play music', 'start music', 'play some music', 'put on music', 'music on'],
    plugin: 'music-player',
    description: 'Start playing music in a voice channel',
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const musicPlugin = getPlugin('music-player');
      
      if (!musicPlugin?.music) {
        return { error: 'Music player not available' };
      }
      
      // Need voice channel from member
      const member = context.member;
      if (!member?.voice?.channel) {
        return { needsVoiceChannel: true };
      }
      
      try {
        await musicPlugin.music.start(member.voice.channel, context.channel);
        const status = musicPlugin.music.getStatus();
        return { success: true, status };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsVoiceChannel) {
        return `🎵 Join a voice channel first, then ask me to play music!`;
      }
      if (result.error) return `❌ ${result.error}`;
      
      return `🎵 **Music started!**\n\n` +
        `📁 Playlist: ${result.status?.currentFolder || 'Default'}\n` +
        `📋 Queue: ${result.status?.queueLength || 0} tracks\n\n` +
        `_Use the control buttons or ask me to skip, pause, or change playlist!_`;
    }
  },

  'music-stop': {
    keywords: ['stop music', 'stop playing', 'music off', 'turn off music', 'disconnect music'],
    plugin: 'music-player',
    description: 'Stop playing music',
    async execute() {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const musicPlugin = getPlugin('music-player');
      
      if (!musicPlugin?.music) {
        return { error: 'Music player not available' };
      }
      
      musicPlugin.music.stop();
      return { success: true };
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      return `⏹️ Music stopped`;
    }
  },

  'music-skip': {
    keywords: ['skip', 'next song', 'skip song', 'next track', 'skip track'],
    plugin: 'music-player',
    description: 'Skip to next track',
    async execute() {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const musicPlugin = getPlugin('music-player');
      
      if (!musicPlugin?.music) {
        return { error: 'Music player not available' };
      }
      
      await musicPlugin.music.skip();
      
      // Wait a moment for track to change
      await new Promise(r => setTimeout(r, 500));
      const status = musicPlugin.music.getStatus();
      return { success: true, track: status.currentTrack };
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      
      const track = result.track;
      if (track) {
        return `⏭️ **Skipped!** Now playing:\n**${track.title}** by *${track.artist}*`;
      }
      return `⏭️ Skipped to next track`;
    }
  },

  'music-pause': {
    keywords: ['pause music', 'pause', 'resume music', 'resume', 'unpause'],
    plugin: 'music-player',
    description: 'Pause or resume music',
    async execute() {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const musicPlugin = getPlugin('music-player');
      
      if (!musicPlugin?.music) {
        return { error: 'Music player not available' };
      }
      
      const playing = musicPlugin.music.pause();
      return { success: true, playing };
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      return result.playing ? `▶️ Resumed` : `⏸️ Paused`;
    }
  },

  'music-volume': {
    keywords: ['volume', 'louder', 'quieter', 'turn up', 'turn down', 'set volume'],
    plugin: 'music-player',
    description: 'Adjust music volume',
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const musicPlugin = getPlugin('music-player');
      
      if (!musicPlugin?.music) {
        return { error: 'Music player not available' };
      }
      
      const query = context.query?.toLowerCase() || '';
      const status = musicPlugin.music.getStatus();
      let newVolume = status.volume / 100;
      
      // Parse volume from query
      const volumeMatch = query.match(/(\d+)\s*%?/);
      if (volumeMatch) {
        newVolume = parseInt(volumeMatch[1]) / 100;
      } else if (query.includes('louder') || query.includes('up')) {
        newVolume = Math.min(1, (status.volume + 20) / 100);
      } else if (query.includes('quieter') || query.includes('down') || query.includes('lower')) {
        newVolume = Math.max(0, (status.volume - 20) / 100);
      }
      
      const finalVolume = musicPlugin.music.setVolume(newVolume);
      return { success: true, volume: Math.round(finalVolume * 100) };
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      return `🔊 Volume: **${result.volume}%**`;
    }
  },

  'music-playlist': {
    keywords: ['playlist', 'change playlist', 'switch playlist', 'play rock', 'play country', 'play christmas'],
    plugin: 'music-player',
    description: 'Change music playlist',
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const musicPlugin = getPlugin('music-player');
      
      if (!musicPlugin?.music) {
        return { error: 'Music player not available' };
      }
      
      const query = context.query?.toLowerCase() || '';
      const folders = musicPlugin.music.getFolders();
      
      // Try to match playlist from query
      const playlistMap = {
        'rock': '7cloudsRock',
        'country': '7clouds Country',
        'dance': '7clouds Dance',
        'drum': '7clouds Drum & Bass',
        'dnb': '7clouds Drum & Bass',
        'dubstep': '7clouds Dubstep',
        'trap': '7clouds Trap',
        'acoustic': '7cloudsAcoustic',
        'christmas': '7cloudsChristmasMusic',
        'xmas': '7cloudsChristmasMusic',
        'indie': '7cloudsIndieOfficial',
        'kpop': '7cloudsKPop',
        'k-pop': '7cloudsKPop',
        'tiktok': '7cloudsTikTok',
        'ncs': '7clouds',
        'default': '7clouds'
      };
      
      let targetPlaylist = null;
      for (const [keyword, playlist] of Object.entries(playlistMap)) {
        if (query.includes(keyword)) {
          targetPlaylist = playlist;
          break;
        }
      }
      
      if (!targetPlaylist) {
        return { showPlaylists: true, folders };
      }
      
      const success = await musicPlugin.music.changeFolder(targetPlaylist);
      const status = musicPlugin.music.getStatus();
      
      return { success, playlist: targetPlaylist, queueLength: status.queueLength };
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      
      if (result.showPlaylists) {
        return `📁 **Available Playlists:**\n\n` +
          `• NCS/7clouds (default)\n` +
          `• Rock\n` +
          `• Country\n` +
          `• Dance\n` +
          `• Drum & Bass\n` +
          `• Dubstep\n` +
          `• Trap\n` +
          `• Acoustic\n` +
          `• Christmas\n` +
          `• Indie\n` +
          `• K-Pop\n` +
          `• TikTok Hits\n\n` +
          `Say "play rock" or "switch to christmas playlist"`;
      }
      
      return `📁 **Playlist changed!**\n\n` +
        `Now playing: **${result.playlist}**\n` +
        `📋 ${result.queueLength} tracks loaded`;
    }
  },

  'music-nowplaying': {
    keywords: ['what song', 'whats playing', 'now playing', 'current song', 'what is this song'],
    plugin: 'music-player',
    description: 'Show current track info',
    async execute() {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const musicPlugin = getPlugin('music-player');
      
      if (!musicPlugin?.music) {
        return { error: 'Music player not available' };
      }
      
      const status = musicPlugin.music.getStatus();
      return { status };
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      
      const status = result.status;
      if (!status.isPlaying) {
        return `🔇 Not playing anything right now.\n\nSay "play music" to start!`;
      }
      
      const track = status.currentTrack;
      return `🎵 **Now Playing:**\n\n` +
        `**${track?.title || 'Unknown'}**\n` +
        `*by ${track?.artist || 'Unknown'}*\n` +
        (track?.genre ? `🎸 ${track.genre}\n` : '') +
        `\n📁 ${status.currentFolder}\n` +
        `🔊 ${status.volume}% | 📋 ${status.queueLength} in queue`;
    }
  },

  'music-setup': {
    keywords: ['setup music', 'setup music channel', 'create music channel', 'music 24/7', 'setup 24/7 music'],
    plugin: 'music-player',
    description: 'Setup 24/7 music in this server with dedicated channels',
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const musicPlugin = getPlugin('music-player');
      
      if (!musicPlugin?.music) {
        return { error: 'Music player not available' };
      }
      
      // Get the guild from context
      const guild = context.message?.guild;
      if (!guild) {
        return { error: 'This command must be used in a server' };
      }
      
      try {
        const result = await musicPlugin.music.setupInGuild(guild);
        return { success: true, ...result };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      
      return `🎵 **Music Setup Complete!**\n\n` +
        `✅ Voice Channel: **${result.voiceChannel}**\n` +
        `✅ Control Channel: **${result.textChannel}**\n` +
        `✅ Status: **${result.status}**\n\n` +
        `The bot will now auto-start music in this server when it restarts!\n` +
        `Use the buttons in the control channel to manage playback.`;
    }
  },

  // Not implemented / Coming soon features (music removed since implemented)
  'not-implemented': {
    keywords: ['calendar', 'schedule meeting', 'send notification', 'push notification', 'monitor traffic', 'bandwidth monitor', 'create automation', 'workflow', 'alert when down'],
    plugin: 'core',
    description: 'Planned features not yet implemented',
    async execute(context) {
      const query = context.query?.toLowerCase() || '';
      
      // Detect which feature they're asking about
      const features = {
        calendar: {
          keywords: ['calendar', 'schedule', 'meeting', 'appointment', 'event'],
          name: '📅 Calendar Integration',
          description: 'Sync with Google/Outlook calendar, schedule events, meeting reminders'
        },
        notifications: {
          keywords: ['notification', 'push', 'alert me', 'notify me', 'mobile alert'],
          name: '📱 Push Notifications',
          description: 'Send alerts to your phone when important events happen'
        },
        traffic: {
          keywords: ['traffic', 'bandwidth', 'network usage', 'data usage', 'monitor network'],
          name: '📈 Network Traffic Monitoring',
          description: 'Monitor bandwidth usage, track data consumption per device'
        },
        serviceAlerts: {
          keywords: ['service down', 'alert when', 'notify when offline', 'down alert', 'uptime'],
          name: '🔔 Service Down Alerts',
          description: 'Get notified when a service or device goes offline'
        },
        automations: {
          keywords: ['automation', 'workflow', 'trigger', 'when then', 'auto ', 'automatically'],
          name: '🤖 Custom Automations',
          description: 'Create if-this-then-that style automations and workflows'
        }
      };
      
      let matchedFeature = null;
      for (const [key, feature] of Object.entries(features)) {
        if (feature.keywords.some(kw => query.includes(kw))) {
          matchedFeature = feature;
          break;
        }
      }
      
      return { 
        feature: matchedFeature,
        query: query
      };
    },
    formatResult(result) {
      if (result.feature) {
        return `**${result.feature.name}**\n\n` +
          `🚧 This feature is **coming soon!**\n\n` +
          `_${result.feature.description}_\n\n` +
          `Want to see this prioritized? Let the developer know! 💬`;
      }
      
      return `🚧 **Feature Not Yet Available**\n\n` +
        `I don't have that capability yet, but it might be on the roadmap!\n\n` +
        `**Coming Soon:**\n` +
        `• 📅 Calendar integration\n` +
        `• 📱 Push notifications\n` +
        `• 📈 Traffic monitoring\n` +
        `• 🔔 Service alerts\n` +
        `• 🤖 Custom automations\n\n` +
        `_Have a feature request? Let me know!_`;
    }
  },

  // Server Admin
  'server-admin-help': {
    keywords: ['do with the server', 'server admin', 'server commands', 'admin commands', 'server management', 'manage server'],
    plugin: 'server-admin',
    description: 'Show server admin capabilities',
    async execute() {
      return { showServerHelp: true };
    },
    formatResult() {
      return `**🖥️ Server Admin Commands:**\n\n` +
        `**Server Management:**\n` +
        `• \`/admin server status\` - Check server status (CPU, memory, disk)\n` +
        `• \`/admin server logs\` - View recent bot logs\n` +
        `• \`/admin server restart\` - Restart the bot service\n` +
        `• \`/admin server deploy\` - Deploy latest code from git\n` +
        `• \`/admin server disk\` - Check disk space\n\n` +
        `**Discord Moderation:**\n` +
        `• \`/admin discord kick\` - Kick a member\n` +
        `• \`/admin discord ban\` - Ban a member\n` +
        `• \`/admin discord timeout\` - Timeout a member\n` +
        `• \`/admin discord giverole\` - Give a role to a member\n` +
        `• \`/admin discord lock\` - Lock a channel\n\n` +
        `**SSH/Remote:**\n` +
        `• \`/admin ssh add\` - Add SSH credentials\n` +
        `• \`/admin ssh list\` - List configured servers\n` +
        `• \`/admin ssh exec\` - Execute command on remote server\n\n` +
        `Or just ask naturally: "Is the bot running?", "Show me the logs"`;
    }
  },

  'server-status': {
    keywords: ['server status', 'bot status', 'is the bot running', 'check server', 'system status', 'uptime'],
    plugin: 'server-admin',
    description: 'Check server/bot status',
    permission: 'admin',
    async execute(context) {
      try {
        const { execSync } = await import('child_process');
        const os = await import('os');
        
        // Get system info
        const uptime = os.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
        
        const cpus = os.cpus();
        const loadAvg = os.loadavg()[0].toFixed(2);
        
        return {
          success: true,
          uptime: `${hours}h ${minutes}m`,
          memory: {
            used: (usedMem / 1024 / 1024 / 1024).toFixed(2),
            total: (totalMem / 1024 / 1024 / 1024).toFixed(2),
            percent: memPercent
          },
          cpu: {
            cores: cpus.length,
            load: loadAvg
          },
          platform: os.platform(),
          hostname: os.hostname()
        };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.error) {
        return `❌ Failed to get server status: ${result.error}`;
      }
      
      return `**🖥️ Server Status**\n\n` +
        `⏱️ **Uptime:** ${result.uptime}\n` +
        `💾 **Memory:** ${result.memory.used}GB / ${result.memory.total}GB (${result.memory.percent}%)\n` +
        `🔧 **CPU:** ${result.cpu.cores} cores, load: ${result.cpu.load}\n` +
        `🖥️ **Host:** ${result.hostname} (${result.platform})`;
    }
  },

  'server-logs': {
    keywords: ['server logs', 'bot logs', 'show logs', 'view logs', 'read logs', 'recent logs'],
    plugin: 'server-admin',
    description: 'View recent bot logs',
    permission: 'admin',
    async execute(context) {
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        // Try to get logs from journalctl (Linux) or from log file
        let logs = '';
        try {
          const { stdout } = await execAsync('journalctl -u discord-maid-bot -n 20 --no-pager 2>/dev/null || tail -n 20 /var/log/discord-bot.log 2>/dev/null || echo "No logs available"');
          logs = stdout;
        } catch (e) {
          logs = 'Could not retrieve logs. Use `/admin server logs` for full access.';
        }
        
        return { success: true, logs: logs.substring(0, 1500) };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.error) {
        return `❌ Failed to get logs: ${result.error}`;
      }
      
      return `**📜 Recent Logs**\n\n\`\`\`\n${result.logs}\n\`\`\`\n\n_Use \`/admin server logs\` for more options_`;
    }
  },

  'server-restart': {
    keywords: ['restart bot', 'restart server', 'reboot bot', 'restart service'],
    plugin: 'server-admin',
    description: 'Restart the bot service',
    permission: 'admin',
    async execute(context) {
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        // Send response first, then restart
        setTimeout(async () => {
          try {
            await execAsync('sudo systemctl restart discord-maid-bot');
          } catch (e) {
            // Expected - bot will restart
          }
        }, 2000);
        
        return { success: true, restarting: true };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.error) {
        return `❌ Failed to restart: ${result.error}`;
      }
      return `🔄 **Restarting bot...**\n\nI'll be back in a few seconds!`;
    }
  },

  'server-deploy': {
    keywords: ['deploy', 'deploy code', 'update bot', 'git pull', 'deploy latest'],
    plugin: 'server-admin',
    description: 'Deploy latest code from git',
    permission: 'admin',
    async execute(context) {
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        // Git pull
        const { stdout: pullOutput } = await execAsync('cd /home/think/discord-maid-bot && git pull origin dev-plugin-first-refactor');
        
        // Check if there were changes
        const hasChanges = !pullOutput.includes('Already up to date');
        
        if (hasChanges) {
          // npm install if package.json changed
          if (pullOutput.includes('package.json')) {
            await execAsync('cd /home/think/discord-maid-bot && npm install');
          }
          
          // Schedule restart
          setTimeout(async () => {
            try {
              await execAsync('sudo systemctl restart discord-maid-bot');
            } catch (e) {
              // Expected
            }
          }, 2000);
          
          return { success: true, deployed: true, output: pullOutput.substring(0, 500) };
        }
        
        return { success: true, deployed: false, message: 'Already up to date' };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.error) {
        return `❌ Deploy failed: ${result.error}`;
      }
      
      if (!result.deployed) {
        return `✅ **Already up to date**\n\nNo new changes to deploy.`;
      }
      
      return `🚀 **Deploying...**\n\n\`\`\`\n${result.output}\n\`\`\`\n\nRestarting bot...`;
    }
  },

  // ============ DISCORD MODERATION ============
  'discord-kick': {
    keywords: ['kick', 'kick user', 'kick member', 'remove member'],
    plugin: 'server-admin',
    description: 'Kick a member from the server',
    permission: 'admin',
    async execute(context) {
      // Extract user mention from query
      const userMatch = context.query?.match(/<@!?(\d+)>/);
      
      if (!userMatch) {
        return { needsUser: true };
      }
      
      if (!context.guild) {
        return { needsGuild: true };
      }
      
      try {
        const member = await context.guild.members.fetch(userMatch[1]);
        if (!member) {
          return { error: 'Member not found' };
        }
        
        await member.kick(`Kicked by ${context.username || 'admin'} via AI`);
        return { success: true, member: member.user.tag };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsUser) {
        return `👢 Who should I kick? Mention the user: "Kick @username"`;
      }
      if (result.needsGuild) {
        return `👢 I can only kick members in a server.`;
      }
      if (result.error) {
        return `❌ Failed to kick: ${result.error}`;
      }
      return `👢 **Kicked** ${result.member}`;
    }
  },

  'discord-ban': {
    keywords: ['ban', 'ban user', 'ban member', 'permanently ban'],
    plugin: 'server-admin',
    description: 'Ban a member from the server',
    permission: 'admin',
    async execute(context) {
      const userMatch = context.query?.match(/<@!?(\d+)>/);
      
      if (!userMatch) {
        return { needsUser: true };
      }
      
      if (!context.guild) {
        return { needsGuild: true };
      }
      
      try {
        const user = await context.client.users.fetch(userMatch[1]);
        await context.guild.members.ban(user, { reason: `Banned by ${context.username || 'admin'} via AI` });
        return { success: true, user: user.tag };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsUser) {
        return `🔨 Who should I ban? Mention the user: "Ban @username"`;
      }
      if (result.needsGuild) {
        return `🔨 I can only ban members in a server.`;
      }
      if (result.error) {
        return `❌ Failed to ban: ${result.error}`;
      }
      return `🔨 **Banned** ${result.user}`;
    }
  },

  'discord-timeout': {
    keywords: ['timeout', 'mute', 'silence', 'timeout user'],
    plugin: 'server-admin',
    description: 'Timeout a member',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      const userMatch = query.match(/<@!?(\d+)>/);
      
      if (!userMatch) {
        return { needsUser: true };
      }
      
      if (!context.guild) {
        return { needsGuild: true };
      }
      
      // Use AI to parse duration and reason from natural language
      let durationMs = 10 * 60 * 1000; // Default 10 minutes
      let durationStr = '10 minutes';
      let reason = 'No reason provided';
      
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const prompt = `You are parsing a Discord timeout/mute command. Extract the duration and reason from this message:

USER MESSAGE: "${query}"

Return ONLY a JSON object:
{
  "durationMinutes": number (in minutes, max 40320 which is 28 days),
  "durationText": "human readable duration like '30 minutes' or '2 hours'",
  "reason": "brief reason for the timeout, or 'Violated server rules' if not specified"
}

DURATION PARSING RULES:
- "a bit" or "briefly" = 10 minutes
- "a while" = 30 minutes
- "an hour" or "for a hour" = 60 minutes
- "rest of the day" = calculate hours until midnight (assume 8 hours if unsure)
- "until tomorrow" = 24 hours
- "a day" = 1440 minutes (24 hours)
- "a week" = 10080 minutes
- Explicit times like "30 minutes", "2 hours", "1 day" = convert to minutes
- If no duration mentioned, default to 10 minutes

REASON PARSING:
- Look for words like "for", "because", "due to" followed by the reason
- "being toxic" → "Toxic behavior"
- "spamming" → "Spamming"
- "being rude" → "Rude behavior"
- If no clear reason, use "Violated server rules"

Return ONLY the JSON, no other text.`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt,
            options: { maxOutputTokens: 150, temperature: 0.1 }
          });
          
          const responseText = result?.response?.text?.() || '';
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.durationMinutes && parsed.durationMinutes > 0) {
              // Cap at 28 days (Discord max)
              const cappedMinutes = Math.min(parsed.durationMinutes, 40320);
              durationMs = cappedMinutes * 60 * 1000;
              durationStr = parsed.durationText || `${cappedMinutes} minutes`;
            }
            if (parsed.reason) {
              reason = parsed.reason;
            }
            logger.info(`AI parsed timeout: duration=${durationStr}, reason="${reason}"`);
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for timeout, using defaults:', error.message);
        // Fall back to regex parsing
        const durationMatch = query.match(/(\d+)\s*(m|min|minute|h|hour|d|day)/i);
        if (durationMatch) {
          const value = parseInt(durationMatch[1]);
          const unit = durationMatch[2].toLowerCase();
          if (unit.startsWith('h')) {
            durationMs = value * 60 * 60 * 1000;
            durationStr = `${value} hour(s)`;
          } else if (unit.startsWith('d')) {
            durationMs = value * 24 * 60 * 60 * 1000;
            durationStr = `${value} day(s)`;
          } else {
            durationMs = value * 60 * 1000;
            durationStr = `${value} minute(s)`;
          }
        }
      }
      
      try {
        const member = await context.guild.members.fetch(userMatch[1]);
        await member.timeout(durationMs, `${reason} (by ${context.username || 'admin'} via AI)`);
        return { success: true, member: member.user.tag, duration: durationStr, reason, aiParsed: true };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsUser) {
        return `⏰ Who should I timeout? "Timeout @user for 10 minutes"`;
      }
      if (result.needsGuild) {
        return `⏰ I can only timeout members in a server.`;
      }
      if (result.error) {
        return `❌ Failed to timeout: ${result.error}`;
      }
      let response = `⏰ **Timed out** ${result.member} for ${result.duration}`;
      if (result.reason && result.reason !== 'No reason provided') {
        response += `\n📝 **Reason:** ${result.reason}`;
      }
      return response;
    }
  },

  'discord-role': {
    keywords: ['give role', 'add role', 'assign role', 'remove role', 'take role', 'make them', 'promote', 'demote'],
    plugin: 'server-admin',
    description: 'Give or remove a role from a member',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      const userMatch = query.match(/<@!?(\d+)>/);
      const roleMentionMatch = query.match(/<@&(\d+)>/);
      
      if (!userMatch) {
        return { needsUser: true };
      }
      
      if (!context.guild) {
        return { needsGuild: true };
      }
      
      // Get available roles for AI context
      const availableRoles = context.guild.roles.cache
        .filter(r => r.name !== '@everyone' && !r.managed)
        .map(r => r.name)
        .slice(0, 30); // Limit for prompt size
      
      let roleName = null;
      let isRemove = false;
      
      // If role is mentioned directly, use that
      if (roleMentionMatch) {
        const role = context.guild.roles.cache.get(roleMentionMatch[1]);
        if (role) roleName = role.name;
        isRemove = query.toLowerCase().includes('remove') || query.toLowerCase().includes('take');
      } else {
        // Use AI to parse role name with fuzzy matching
        try {
          const { getPlugin } = await import('../../../src/core/plugin-system.js');
          const aiPlugin = getPlugin('conversational-ai');
          
          if (aiPlugin) {
            const prompt = `You are parsing a Discord role management command. Match the requested role to available roles.

USER MESSAGE: "${query}"

AVAILABLE ROLES IN THIS SERVER:
${availableRoles.map(r => `- ${r}`).join('\n')}

Return ONLY a JSON object:
{
  "action": "add" or "remove",
  "roleName": "exact role name from the available list that best matches what the user wants",
  "confidence": "high", "medium", or "low"
}

MATCHING RULES:
- "make them admin" or "give admin" → find role containing "admin" (e.g., "Admin", "Administrator")
- "make them mod" or "moderator" → find role containing "mod" (e.g., "Moderator", "Mod")
- "give vip" → find role containing "vip" (e.g., "VIP", "VIP Member")
- "promote to staff" → find role containing "staff"
- "demote" or "remove" → action should be "remove"
- Match case-insensitively
- If multiple matches, pick the most likely one
- If no good match, set confidence to "low" and pick closest match

Return ONLY the JSON, no other text.`;

            const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
              prompt,
              options: { maxOutputTokens: 150, temperature: 0.1 }
            });
            
            const responseText = result?.response?.text?.() || '';
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.roleName) {
                roleName = parsed.roleName;
                isRemove = parsed.action === 'remove';
                logger.info(`AI parsed role: "${roleName}", action=${parsed.action}, confidence=${parsed.confidence}`);
              }
            }
          }
        } catch (error) {
          logger.warn('AI parsing failed for role, using regex fallback:', error.message);
        }
        
        // Fallback to regex if AI didn't work
        if (!roleName) {
          const roleMatch = query.match(/(?:role|the)\s+["']?([^"']+?)["']?(?:\s+to|\s+from|$)/i) ||
                           query.match(/(?:give|add|assign|remove|take)\s+(?:them\s+)?(?:the\s+)?["']?([^"'@]+?)["']?(?:\s+role)?/i);
          if (roleMatch && roleMatch[1]) {
            roleName = roleMatch[1].trim();
          }
          isRemove = query.toLowerCase().includes('remove') || 
                     query.toLowerCase().includes('take') || 
                     query.toLowerCase().includes('demote');
        }
      }
      
      if (!roleName) {
        return { needsRole: true, availableRoles: availableRoles.slice(0, 10) };
      }
      
      try {
        const member = await context.guild.members.fetch(userMatch[1]);
        
        // Find role with fuzzy matching
        let role = context.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
        
        // If exact match not found, try partial match
        if (!role) {
          role = context.guild.roles.cache.find(r => 
            r.name.toLowerCase().includes(roleName.toLowerCase()) ||
            roleName.toLowerCase().includes(r.name.toLowerCase())
          );
        }
        
        if (!role) {
          return { error: `Role "${roleName}" not found`, availableRoles: availableRoles.slice(0, 10) };
        }
        
        if (isRemove) {
          await member.roles.remove(role);
          return { success: true, action: 'removed', member: member.user.tag, role: role.name, aiParsed: true };
        } else {
          await member.roles.add(role);
          return { success: true, action: 'added', member: member.user.tag, role: role.name, aiParsed: true };
        }
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsUser) {
        return `🎭 Who should I give the role to? "Give @user the Admin role"`;
      }
      if (result.needsRole) {
        let response = `🎭 Which role? "Give @user the Admin role"`;
        if (result.availableRoles?.length > 0) {
          response += `\n\n**Available roles:** ${result.availableRoles.join(', ')}`;
        }
        return response;
      }
      if (result.needsGuild) {
        return `🎭 I can only manage roles in a server.`;
      }
      if (result.error) {
        let response = `❌ Failed: ${result.error}`;
        if (result.availableRoles?.length > 0) {
          response += `\n\n**Available roles:** ${result.availableRoles.join(', ')}`;
        }
        return response;
      }
      return `🎭 **${result.action === 'added' ? 'Added' : 'Removed'}** role **${result.role}** ${result.action === 'added' ? 'to' : 'from'} ${result.member}`;
    }
  },

  'discord-lock': {
    keywords: ['lock channel', 'unlock channel', 'lock this', 'unlock this'],
    plugin: 'server-admin',
    description: 'Lock or unlock a channel',
    permission: 'admin',
    async execute(context) {
      if (!context.guild || !context.channel) {
        return { needsGuild: true };
      }
      
      const isUnlock = context.query?.toLowerCase().includes('unlock');
      
      try {
        const { lockChannel, unlockChannel } = await import('../../server-admin/discord/channel-manager.js');
        
        if (isUnlock) {
          const result = await unlockChannel(context.channel, {
            executorId: context.userId,
            executorName: context.username
          });
          return { ...result, action: 'unlocked' };
        } else {
          const result = await lockChannel(context.channel, {
            executorId: context.userId,
            executorName: context.username
          });
          return { ...result, action: 'locked' };
        }
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild) {
        return `🔒 I can only lock/unlock channels in a server.`;
      }
      if (result.error) {
        return `❌ Failed: ${result.error}`;
      }
      const emoji = result.action === 'locked' ? '🔒' : '🔓';
      return `${emoji} Channel **${result.action}**`;
    }
  },

  'ssh-command': {
    keywords: ['ssh', 'run command', 'execute command', 'remote command', 'run on server'],
    plugin: 'server-admin',
    description: 'Execute a command on a remote server via SSH',
    permission: 'admin',
    async execute(context) {
      // This is dangerous - just suggest using the slash command
      return { requiresSlash: true };
    },
    formatResult(result) {
      return `🔐 For security, SSH commands must be run via slash command:\n\n` +
        `\`/admin ssh exec server:[name] command:[cmd]\`\n\n` +
        `First add a server with \`/admin ssh add\``;
    }
  },

  // ============ GAMES ============
  'game-list': {
    keywords: ['what games', 'list games', 'available games', 'show games', 'games list'],
    plugin: 'games',
    description: 'List available games',
    async execute() {
      return {
        games: [
          { key: 'trivia', name: 'Trivia', emoji: '🧠' },
          { key: 'hangman', name: 'Hangman', emoji: '🎯' },
          { key: 'numguess', name: 'Number Guess', emoji: '🔢' },
          { key: 'rps', name: 'Rock Paper Scissors', emoji: '✊' },
          { key: 'tictactoe', name: 'Tic Tac Toe', emoji: '⭕' },
          { key: 'connect4', name: 'Connect Four', emoji: '🔴' },
          { key: 'riddle', name: 'Riddles', emoji: '🧩' },
          { key: 'wordchain', name: 'Word Chain', emoji: '🔗' },
          { key: '20questions', name: '20 Questions', emoji: '❓' },
          { key: 'emojidecode', name: 'Emoji Decode', emoji: '😀' },
          { key: 'wouldyourather', name: 'Would You Rather', emoji: '🤔' },
          { key: 'mathblitz', name: 'Math Blitz', emoji: '🔢' },
          { key: 'reaction', name: 'Reaction Race', emoji: '⚡' },
          { key: 'mafia', name: 'Mafia', emoji: '🎭' }
        ]
      };
    },
    formatResult(result) {
      let response = '**🎮 Available Games:**\n\n';
      response += result.games.map(g => `${g.emoji} **${g.name}**`).join('\n');
      response += '\n\n_Say "play [game name]" to start!_';
      return response;
    }
  },

  'game-play': {
    keywords: ['play trivia', 'play hangman', 'play game', 'lets play', "let's play", 'start game', 'play rps', 'play riddle', 'play number'],
    plugin: 'games',
    description: 'Start a game',
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const query = context.query?.toLowerCase() || '';
      
      // All available games with their keywords and display names
      const gameMap = {
        'trivia': { keywords: ['trivia', 'quiz'], name: 'Trivia', emoji: '🧠' },
        'hangman': { keywords: ['hangman', 'hang man'], name: 'Hangman', emoji: '🎯' },
        'numguess': { keywords: ['number', 'guess number', 'number guess'], name: 'Number Guess', emoji: '🔢' },
        'rps': { keywords: ['rps', 'rock paper', 'rock-paper', 'rock scissors'], name: 'Rock Paper Scissors', emoji: '✊' },
        'tictactoe': { keywords: ['tic tac', 'tictactoe', 'tic-tac', 'noughts'], name: 'Tic Tac Toe', emoji: '⭕' },
        'connect4': { keywords: ['connect', 'connect 4', 'connect four'], name: 'Connect Four', emoji: '🔴' },
        'riddle': { keywords: ['riddle', 'riddles'], name: 'Riddles', emoji: '🧩' },
        'wordchain': { keywords: ['word chain', 'wordchain'], name: 'Word Chain', emoji: '🔗' },
        '20questions': { keywords: ['20 questions', 'twenty questions'], name: '20 Questions', emoji: '❓' },
        'emojidecode': { keywords: ['emoji', 'decode', 'emoji decode'], name: 'Emoji Decode', emoji: '😀' },
        'wouldyourather': { keywords: ['would you rather', 'wyr'], name: 'Would You Rather', emoji: '🤔' },
        'mathblitz': { keywords: ['math', 'math blitz', 'maths'], name: 'Math Blitz', emoji: '➕' },
        'reaction': { keywords: ['reaction', 'reaction race', 'quick'], name: 'Reaction Race', emoji: '⚡' },
        'mafia': { keywords: ['mafia', 'werewolf'], name: 'Mafia', emoji: '🎭' }
      };
      
      // Check for active game in channel
      const gamesPlugin = getPlugin('games');
      if (gamesPlugin?.getActiveGame && context.channelId) {
        const activeGame = gamesPlugin.getActiveGame(context.channelId);
        if (activeGame) {
          return { 
            activeGame: true, 
            currentGame: activeGame.type || 'unknown',
            channelId: context.channelId
          };
        }
      }
      
      // Try exact keyword match first
      let selectedGame = null;
      for (const [gameKey, gameInfo] of Object.entries(gameMap)) {
        if (gameInfo.keywords.some(kw => query.includes(kw))) {
          selectedGame = gameKey;
          break;
        }
      }
      
      // If no exact match, try fuzzy matching
      if (!selectedGame) {
        // Extract potential game name from query
        const playMatch = query.match(/(?:play|start|lets play|let's play)\s+(.+?)(?:\s+game)?$/i);
        if (playMatch) {
          const searchTerm = playMatch[1].trim();
          
          // Simple fuzzy match: find games where name contains search term or vice versa
          const matches = Object.entries(gameMap).filter(([key, info]) => {
            const nameLower = info.name.toLowerCase();
            return nameLower.includes(searchTerm) || 
                   searchTerm.includes(nameLower) ||
                   key.includes(searchTerm) ||
                   searchTerm.includes(key);
          });
          
          if (matches.length === 1) {
            selectedGame = matches[0][0];
          } else if (matches.length > 1) {
            return { 
              suggestions: matches.map(([key, info]) => ({ key, ...info })),
              searchTerm
            };
          } else {
            // No matches - suggest similar games
            return { 
              notFound: true, 
              searchTerm,
              allGames: Object.entries(gameMap).map(([key, info]) => ({ key, ...info }))
            };
          }
        }
      }
      
      // Default to showing game list if just "play" or "game"
      if (!selectedGame && (query.includes('play') || query.includes('game'))) {
        return { 
          needsSelection: true,
          allGames: Object.entries(gameMap).map(([key, info]) => ({ key, ...info }))
        };
      }
      
      if (!selectedGame) {
        return { needsSelection: true };
      }
      
      return { 
        game: selectedGame,
        gameInfo: gameMap[selectedGame],
        message: context.message,
        channelId: context.channelId,
        requiresInteraction: true
      };
    },
    formatResult(result) {
      if (result.activeGame) {
        return `🎮 There's already a **${result.currentGame}** game active in this channel!\n\n` +
          `Use \`/game stop\` to end it first, or join the current game.`;
      }
      
      if (result.suggestions) {
        const suggestionList = result.suggestions.map(g => `${g.emoji} **${g.name}** - \`play ${g.key}\``).join('\n');
        return `🎮 Did you mean one of these?\n\n${suggestionList}\n\n` +
          `Say "play [game name]" to start!`;
      }
      
      if (result.notFound) {
        const topGames = result.allGames.slice(0, 5).map(g => `${g.emoji} ${g.name}`).join(', ');
        return `🎮 I don't know a game called "${result.searchTerm}".\n\n` +
          `Try: ${topGames}\n\nOr say "what games" to see all available games!`;
      }
      
      if (result.needsSelection) {
        const gameList = result.allGames?.slice(0, 8).map(g => `${g.emoji} **${g.name}**`).join('\n') || 
          '🧠 Trivia, 🎯 Hangman, 🔢 Number Guess, ✊ RPS...';
        return `🎮 Which game would you like to play?\n\n${gameList}\n\n` +
          `Say "play [game name]" to start!`;
      }
      
      if (result.requiresInteraction) {
        return `🎮 To start **${result.gameInfo?.name || result.game}**, please use:\n\n` +
          `\`/game play game:${result.game}\`\n\n` +
          `_Games need Discord buttons for interaction._`;
      }
      
      return `🎮 Starting ${result.game}...`;
    }
  },

  // ============ DEVICE MANAGEMENT ============
  'device-rename': {
    keywords: ['rename', 'name device', 'call device', 'set device name', 'change device name', ' is ', 'call it', 'name it'],
    plugin: 'device-management',
    description: 'Rename a device',
    async execute(context) {
      const { deviceOps } = await import('../../../src/database/db.js');
      const query = context.query || '';
      
      // Get all devices for AI context
      const devices = deviceOps.getAll();
      const availableDevices = devices.map(d => ({
        name: d.name || null,
        ip: d.ip,
        mac: d.mac,
        type: d.type || 'unknown'
      }));
      
      let deviceId = null;
      let newName = null;
      let deviceType = null;
      let suggestedEmoji = null;
      
      // Use AI to parse the rename request
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const prompt = `You are parsing a device rename command. Extract the device identifier and new name.

USER MESSAGE: "${query}"

AVAILABLE DEVICES:
${availableDevices.map(d => `- ${d.name ? `"${d.name}"` : '(unnamed)'} at ${d.ip} (Type: ${d.type})`).join('\n')}

Return ONLY a JSON object:
{
  "deviceIdentifier": "IP address, MAC address, or current name of the device to rename",
  "newName": "the new name for the device (clean, no special chars except hyphen/underscore)",
  "deviceType": "pc", "server", "phone", "tablet", "router", "iot", or null if not mentioned,
  "suggestedEmoji": "a single emoji that represents this device type, or null",
  "confidence": "high", "medium", or "low"
}

PARSING RULES:
- "rename 192.168.0.100 to Gaming PC" → deviceIdentifier: "192.168.0.100", newName: "Gaming-PC"
- "call my server Kusanagi" → find device with type "server", newName: "Kusanagi"
- "192.168.0.50 is my phone" → deviceIdentifier: "192.168.0.50", newName: "My-Phone", deviceType: "phone"
- "name the router MainRouter" → find device with type "router", newName: "MainRouter"
- Convert spaces to hyphens in names
- If they mention a device type, set deviceType and suggestedEmoji:
  - pc/computer → 💻
  - server → 🖥️
  - phone → 📱
  - tablet → 📲
  - router → 📡
  - iot/smart → 🔌

Return ONLY the JSON, no other text.`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt,
            options: { maxOutputTokens: 200, temperature: 0.1 }
          });
          
          const responseText = result?.response?.text?.() || '';
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.deviceIdentifier && parsed.newName) {
              deviceId = parsed.deviceIdentifier;
              newName = parsed.newName;
              deviceType = parsed.deviceType;
              suggestedEmoji = parsed.suggestedEmoji;
              logger.info(`AI parsed device rename: "${deviceId}" → "${newName}", type=${deviceType}, emoji=${suggestedEmoji}`);
            }
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for device rename, using regex fallback:', error.message);
      }
      
      // Fallback to regex if AI didn't work
      if (!deviceId || !newName) {
        const patterns = [
          /rename\s+(\S+)\s+(?:to|as)\s+["']?([a-zA-Z0-9_\-\s]+)["']?/i,
          /name\s+(?:device\s+)?(\S+)\s+(?:to|as)\s+["']?([a-zA-Z0-9_\-\s]+)["']?/i,
          /call\s+(\S+)\s+["']?([a-zA-Z0-9_\-\s]+)["']?/i,
          /set\s+(?:device\s+)?name\s+(?:of\s+)?(\S+)\s+(?:to|as)\s+["']?([a-zA-Z0-9_\-\s]+)["']?/i,
          /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+is\s+["']?([a-zA-Z0-9_\-\s]+)["']?/i,
          /(?:device\s+)?(\S+)\s+is\s+(?:called\s+)?["']?([a-zA-Z0-9_\-\s]+)["']?/i
        ];
        
        for (const pattern of patterns) {
          const match = query.match(pattern);
          if (match) {
            deviceId = match[1];
            newName = match[2].trim().replace(/\s+/g, '-');
            break;
          }
        }
        
        // Extract device type from query
        const typeMatch = query.match(/(?:it'?s?\s+a\s+|type\s+is\s+|is\s+a\s+|my\s+)(\w+)/i);
        if (typeMatch) {
          deviceType = typeMatch[1].toLowerCase();
        }
      }
      
      if (!deviceId || !newName) {
        return { needsInfo: true, availableDevices: availableDevices.slice(0, 10) };
      }
      
      // Find device
      const device = devices.find(d => 
        d.ip === deviceId ||
        d.mac?.toLowerCase() === deviceId.toLowerCase() ||
        d.name?.toLowerCase() === deviceId.toLowerCase()
      );
      
      if (!device) {
        return { error: `Device "${deviceId}" not found`, notFound: true, availableDevices: availableDevices.slice(0, 10) };
      }
      
      // Update device with name and optionally type/emoji
      const oldName = device.name || device.notes || device.ip;
      
      // Update the notes field (used for device names in the database)
      deviceOps.updateNotes(device.id, newName);
      
      // Update emoji if suggested and not already set
      if (suggestedEmoji && !device.emoji) {
        deviceOps.updateEmoji(device.id, suggestedEmoji);
      }
      
      // Update device type if specified
      if (deviceType) {
        try {
          const { db } = await import('../../../src/database/db.js');
          db.prepare('UPDATE devices SET device_type = ? WHERE id = ?').run(deviceType, device.id);
        } catch (e) {
          // Type update failed, continue anyway
        }
      }
      
      return { 
        success: true, 
        oldName, 
        newName, 
        ip: device.ip, 
        type: deviceType,
        emoji: suggestedEmoji,
        aiParsed: true
      };
    },
    formatResult(result) {
      if (result.needsInfo) {
        let response = `📝 To rename a device, say:\n\n` +
          `"Rename 192.168.0.100 to MyPC"\n` +
          `"Call my server Kusanagi"\n` +
          `"192.168.0.50 is my phone"`;
        if (result.availableDevices?.length > 0) {
          response += `\n\n**Available devices:**\n${result.availableDevices.map(d => `• ${d.name || d.ip} (${d.ip})`).join('\n')}`;
        }
        return response;
      }
      
      if (result.notFound) {
        let response = `❌ ${result.error}`;
        if (result.availableDevices?.length > 0) {
          response += `\n\n**Available devices:**\n${result.availableDevices.map(d => `• ${d.name || d.ip} (${d.ip})`).join('\n')}`;
        }
        return response;
      }
      
      if (result.error) {
        return `❌ ${result.error}`;
      }
      
      let response = `✅ **Device Renamed!**\n\n` +
        `📱 **${result.oldName}** → **${result.newName}**\n` +
        `🌐 IP: ${result.ip}`;
      
      if (result.type) {
        response += `\n🏷️ Type: ${result.type}`;
      }
      if (result.emoji) {
        response += `\n${result.emoji} Emoji set automatically`;
      }
      
      return response;
    }
  },

  'device-emoji': {
    keywords: ['set emoji', 'device emoji', 'change emoji', 'add emoji', 'give emoji'],
    plugin: 'device-management',
    description: 'Set device emoji',
    async execute(context) {
      const { deviceOps } = await import('../../../src/database/db.js');
      const query = context.query || '';
      
      const devices = deviceOps.getAll();
      const availableDevices = devices.map(d => ({
        name: d.name || null,
        ip: d.ip,
        type: d.type || 'unknown',
        currentEmoji: d.emoji || null
      }));
      
      let emoji = null;
      let deviceId = null;
      
      // First try to extract emoji directly from query
      const emojiMatch = query.match(/(\p{Emoji})/u);
      if (emojiMatch) {
        emoji = emojiMatch[1];
      }
      
      // Use AI to parse the request and suggest emoji if not provided
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const prompt = `You are parsing a device emoji assignment command.

USER MESSAGE: "${query}"

AVAILABLE DEVICES:
${availableDevices.map(d => `- "${d.name || d.ip}" (Type: ${d.type}, Current emoji: ${d.currentEmoji || 'none'})`).join('\n')}

Return ONLY a JSON object:
{
  "deviceIdentifier": "the device name or IP from the list",
  "emoji": "the emoji to set (from user message or suggest based on device type)",
  "confidence": "high", "medium", or "low"
}

RULES:
- If user provides an emoji, use that
- If no emoji provided, suggest based on device type:
  - pc/computer/desktop → 💻
  - laptop → 💻
  - server → 🖥️
  - phone/mobile → 📱
  - tablet/ipad → 📲
  - router/gateway → 📡
  - tv/television → 📺
  - gaming/playstation/xbox → 🎮
  - printer → 🖨️
  - camera/security → 📷
  - speaker/audio → 🔊
  - iot/smart/sensor → 🔌
  - nas/storage → 💾
- Match device names fuzzy (e.g., "my pc" → device with type "pc" or name containing "pc")

Return ONLY the JSON, no other text.`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt,
            options: { maxOutputTokens: 150, temperature: 0.1 }
          });
          
          const responseText = result?.response?.text?.() || '';
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.deviceIdentifier) {
              deviceId = parsed.deviceIdentifier;
            }
            if (parsed.emoji && !emoji) {
              emoji = parsed.emoji;
            }
            logger.info(`AI parsed device emoji: device="${deviceId}", emoji="${emoji}"`);
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for device emoji, using regex fallback:', error.message);
      }
      
      // Fallback to regex if AI didn't work
      if (!deviceId) {
        const deviceMatch = query.match(/(?:for|on|to)\s+(\S+)/i) || query.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        if (deviceMatch) {
          deviceId = deviceMatch[1];
        }
      }
      
      if (!emoji || !deviceId) {
        return { needsInfo: true, availableDevices: availableDevices.slice(0, 10) };
      }
      
      // Find device with fuzzy matching
      let device = devices.find(d => 
        d.ip === deviceId ||
        d.name?.toLowerCase() === deviceId.toLowerCase()
      );
      
      // Try partial match if exact match fails
      if (!device) {
        device = devices.find(d => 
          d.name?.toLowerCase().includes(deviceId.toLowerCase()) ||
          deviceId.toLowerCase().includes(d.name?.toLowerCase() || '')
        );
      }
      
      if (!device) {
        return { error: `Device "${deviceId}" not found`, notFound: true, availableDevices: availableDevices.slice(0, 10) };
      }
      
      const oldEmoji = device.emoji;
      deviceOps.upsert({ ...device, emoji });
      
      return { success: true, device: device.name || device.ip, emoji, oldEmoji, aiParsed: true };
    },
    formatResult(result) {
      if (result.needsInfo) {
        let response = `🎨 To set a device emoji, say:\n\n` +
          `"Set emoji 🎮 for KUSANAGI"\n` +
          `"Give my PC an emoji"\n` +
          `"Add emoji to the server"`;
        if (result.availableDevices?.length > 0) {
          response += `\n\n**Available devices:**\n${result.availableDevices.map(d => `• ${d.currentEmoji || '📱'} ${d.name || d.ip}`).join('\n')}`;
        }
        return response;
      }
      
      if (result.notFound) {
        let response = `❌ ${result.error}`;
        if (result.availableDevices?.length > 0) {
          response += `\n\n**Available devices:**\n${result.availableDevices.map(d => `• ${d.name || d.ip}`).join('\n')}`;
        }
        return response;
      }
      
      let response = `✅ Set emoji ${result.emoji} for **${result.device}**`;
      if (result.oldEmoji) {
        response += ` (was ${result.oldEmoji})`;
      }
      return response;
    }
  },

  'device-set-type': {
    keywords: ['set type', 'device type', 'change type', 'mark as', 'is a', 'set as'],
    plugin: 'device-management',
    description: 'Set device type (pc, server, phone, etc)',
    async execute(context) {
      const { deviceOps } = await import('../../../src/database/db.js');
      const { DeviceType, getDeviceEmoji } = await import('../../network-management/device-detector.js');
      const query = context.query || '';
      
      const devices = deviceOps.getAll();
      const validTypes = Object.values(DeviceType);
      
      let deviceId = null;
      let deviceType = null;
      let autoEmoji = null;
      
      // Use AI to parse
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const prompt = `Parse a device type assignment command.

USER MESSAGE: "${query}"

AVAILABLE DEVICES:
${devices.slice(0, 15).map(d => `- "${d.notes || d.ip}" (${d.ip})`).join('\n')}

VALID DEVICE TYPES: ${validTypes.join(', ')}

Return ONLY JSON:
{
  "deviceIdentifier": "device name or IP",
  "deviceType": "one of the valid types",
  "confidence": "high/medium/low"
}

Examples:
- "set 192.168.0.100 as a server" → deviceType: "server"
- "my PC is a gaming computer" → deviceType: "gaming"
- "mark the router as router" → deviceType: "router"`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt,
            options: { maxOutputTokens: 150, temperature: 0.1 }
          });
          
          const responseText = result?.response?.text?.() || '';
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            deviceId = parsed.deviceIdentifier;
            deviceType = parsed.deviceType?.toLowerCase();
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for device type:', error.message);
      }
      
      // Fallback regex
      if (!deviceId || !deviceType) {
        const match = query.match(/(\S+)\s+(?:is\s+a|as\s+a?|type\s+)\s*(\w+)/i);
        if (match) {
          deviceId = match[1];
          deviceType = match[2].toLowerCase();
        }
      }
      
      if (!deviceId || !deviceType) {
        return { needsInfo: true, validTypes };
      }
      
      // Validate type
      if (!validTypes.includes(deviceType)) {
        return { error: `Invalid type "${deviceType}"`, validTypes };
      }
      
      // Find device
      const device = devices.find(d => 
        d.ip === deviceId ||
        d.notes?.toLowerCase() === deviceId.toLowerCase() ||
        d.notes?.toLowerCase().includes(deviceId.toLowerCase())
      );
      
      if (!device) {
        return { error: `Device "${deviceId}" not found`, notFound: true };
      }
      
      // Update type
      const { db } = await import('../../../src/database/db.js');
      db.prepare('UPDATE devices SET device_type = ? WHERE id = ?').run(deviceType, device.id);
      
      // Auto-set emoji if not already set
      if (!device.emoji) {
        autoEmoji = getDeviceEmoji(deviceType);
        deviceOps.updateEmoji(device.id, autoEmoji);
      }
      
      return { success: true, device: device.notes || device.ip, type: deviceType, emoji: autoEmoji };
    },
    formatResult(result) {
      if (result.needsInfo) {
        return `📋 To set device type, say:\n\n` +
          `"Set 192.168.0.100 as a server"\n` +
          `"Mark my PC as gaming"\n\n` +
          `**Valid types:** ${result.validTypes.join(', ')}`;
      }
      if (result.error) {
        if (result.validTypes) {
          return `❌ ${result.error}\n\n**Valid types:** ${result.validTypes.join(', ')}`;
        }
        return `❌ ${result.error}`;
      }
      let response = `✅ Set **${result.device}** type to **${result.type}**`;
      if (result.emoji) {
        response += ` ${result.emoji}`;
      }
      return response;
    }
  },

  'device-set-os': {
    keywords: ['set os', 'operating system', 'runs', 'running'],
    plugin: 'device-management',
    description: 'Set device operating system',
    async execute(context) {
      const { deviceOps, db } = await import('../../../src/database/db.js');
      const query = context.query || '';
      
      const devices = deviceOps.getAll();
      let deviceId = null;
      let os = null;
      
      // Use AI to parse
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const prompt = `Parse a device OS assignment command.

USER MESSAGE: "${query}"

AVAILABLE DEVICES:
${devices.slice(0, 15).map(d => `- "${d.notes || d.ip}" (${d.ip})`).join('\n')}

Return ONLY JSON:
{
  "deviceIdentifier": "device name or IP",
  "os": "operating system name (Windows 11, Ubuntu, macOS, Android, etc)",
  "confidence": "high/medium/low"
}

Examples:
- "my server runs Ubuntu" → os: "Ubuntu"
- "192.168.0.100 is running Windows 11" → os: "Windows 11"
- "set OS of my PC to Arch Linux" → os: "Arch Linux"`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt,
            options: { maxOutputTokens: 150, temperature: 0.1 }
          });
          
          const responseText = result?.response?.text?.() || '';
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            deviceId = parsed.deviceIdentifier;
            os = parsed.os;
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for device OS:', error.message);
      }
      
      if (!deviceId || !os) {
        return { needsInfo: true };
      }
      
      // Find device
      const device = devices.find(d => 
        d.ip === deviceId ||
        d.notes?.toLowerCase() === deviceId.toLowerCase() ||
        d.notes?.toLowerCase().includes(deviceId.toLowerCase())
      );
      
      if (!device) {
        return { error: `Device "${deviceId}" not found`, notFound: true };
      }
      
      // Update OS
      db.prepare('UPDATE devices SET os = ? WHERE id = ?').run(os, device.id);
      
      return { success: true, device: device.notes || device.ip, os };
    },
    formatResult(result) {
      if (result.needsInfo) {
        return `💿 To set device OS, say:\n\n` +
          `"My server runs Ubuntu"\n` +
          `"192.168.0.100 is running Windows 11"\n` +
          `"Set OS of my PC to Arch Linux"`;
      }
      if (result.error) return `❌ ${result.error}`;
      return `✅ Set **${result.device}** OS to **${result.os}**`;
    }
  },

  'device-deep-scan': {
    keywords: ['deep scan', 'full scan', 'nmap scan', 'detect devices', 'scan with nmap', 'identify devices'],
    plugin: 'network-management',
    description: 'Deep scan network using nmap for OS/type detection',
    permission: 'run_network_scan',
    longRunning: true,
    async execute(context) {
      const { deviceOps, db } = await import('../../../src/database/db.js');
      const { detectDeviceType, getDeviceEmoji } = await import('../../network-management/device-detector.js');
      
      const query = context.query || '';
      const devices = deviceOps.getAll().filter(d => d.online);
      
      // Check if scanning specific device or all
      let targetDevice = null;
      const ipMatch = query.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (ipMatch) {
        targetDevice = devices.find(d => d.ip === ipMatch[1]);
        if (!targetDevice) {
          return { error: `Device ${ipMatch[1]} not found or offline` };
        }
      }
      
      const toScan = targetDevice ? [targetDevice] : devices.slice(0, 10); // Limit to 10 for full scan
      const results = [];
      
      // Send initial progress
      if (context.sendProgress) {
        await context.sendProgress(
          `🔬 **Deep Scan Starting...**\n\n` +
          `📊 Scanning ${toScan.length} device(s) with nmap\n` +
          `⏱️ Estimated time: ${toScan.length * 15}-${toScan.length * 30} seconds\n\n` +
          `_Detecting device types and operating systems..._`
        );
      }
      
      let scanned = 0;
      for (const device of toScan) {
        // Update progress
        scanned++;
        if (context.sendProgress && toScan.length > 1) {
          await context.sendProgress(
            `🔬 **Deep Scan in Progress...**\n\n` +
            `📊 Progress: ${scanned}/${toScan.length} devices\n` +
            `🔍 Currently scanning: ${device.notes || device.ip}\n\n` +
            `_Please wait..._`
          );
        }
        try {
          const detection = await detectDeviceType({ ip: device.ip, mac: device.mac, hostname: device.hostname }, true);
          
          if (detection.type !== 'unknown') {
            // Update database
            db.prepare('UPDATE devices SET device_type = ?, os = ? WHERE id = ?')
              .run(detection.type, detection.os || null, device.id);
            
            // Auto-set emoji if not set
            if (!device.emoji) {
              const emoji = getDeviceEmoji(detection.type);
              deviceOps.updateEmoji(device.id, emoji);
            }
            
            results.push({
              ip: device.ip,
              name: device.notes || device.ip,
              type: detection.type,
              os: detection.os,
              method: detection.method,
              confidence: detection.confidence
            });
          } else {
            results.push({
              ip: device.ip,
              name: device.notes || device.ip,
              type: 'unknown',
              method: 'none'
            });
          }
        } catch (error) {
          results.push({
            ip: device.ip,
            name: device.notes || device.ip,
            error: error.message
          });
        }
      }
      
      return { results, scanned: results.length, total: devices.length };
    },
    formatResult(result) {
      if (result.error) return `❌ ${result.error}`;
      
      let response = `🔍 **Deep Scan Results** (${result.scanned}/${result.total} devices)\n\n`;
      
      for (const r of result.results) {
        if (r.error) {
          response += `❌ ${r.name}: Error - ${r.error}\n`;
        } else if (r.type === 'unknown') {
          response += `❓ ${r.name}: Unknown\n`;
        } else {
          const conf = r.confidence ? ` (${Math.round(r.confidence * 100)}%)` : '';
          response += `✅ ${r.name}: **${r.type}**${r.os ? ` - ${r.os}` : ''}${conf}\n`;
        }
      }
      
      return response;
    }
  },

  'device-info': {
    keywords: ['device info', 'about device', 'device details', 'show device', 'what is device'],
    plugin: 'device-management',
    description: 'Get detailed info about a device',
    hasButtons: true, // Flag for button support
    async execute(context) {
      const { deviceOps } = await import('../../../src/database/db.js');
      const query = context.query || '';
      
      const devices = deviceOps.getAll();
      let deviceId = null;
      
      // Extract device identifier
      const ipMatch = query.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (ipMatch) {
        deviceId = ipMatch[1];
      } else {
        // Try AI parsing
        try {
          const { getPlugin } = await import('../../../src/core/plugin-system.js');
          const aiPlugin = getPlugin('conversational-ai');
          
          if (aiPlugin) {
            const prompt = `Extract the device identifier from this query.

USER MESSAGE: "${query}"

AVAILABLE DEVICES:
${devices.slice(0, 15).map(d => `- "${d.notes || d.ip}" (${d.ip})`).join('\n')}

Return ONLY JSON: { "deviceIdentifier": "device name or IP" }`;

            const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
              prompt,
              options: { maxOutputTokens: 100, temperature: 0.1 }
            });
            
            const responseText = result?.response?.text?.() || '';
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              deviceId = parsed.deviceIdentifier;
            }
          }
        } catch (error) {
          logger.warn('AI parsing failed for device info:', error.message);
        }
      }
      
      if (!deviceId) {
        return { needsInfo: true, devices: devices.slice(0, 10) };
      }
      
      // Find device
      const device = devices.find(d => 
        d.ip === deviceId ||
        d.notes?.toLowerCase() === deviceId.toLowerCase() ||
        d.notes?.toLowerCase().includes(deviceId.toLowerCase())
      );
      
      if (!device) {
        return { error: `Device "${deviceId}" not found`, notFound: true };
      }
      
      // Check for Tailscale link
      let tailscaleInfo = null;
      if (device.tailscale_hostname || device.ip?.startsWith('100.') || device.mac?.startsWith('ts:')) {
        try {
          const { getTailscaleDeviceInfo } = await import('../../network-management/scanner.js');
          tailscaleInfo = await getTailscaleDeviceInfo(device.tailscale_hostname || device.hostname || device.ip);
        } catch (e) {
          // Tailscale info not available
        }
      }
      
      return { device, tailscaleInfo };
    },
    formatResult(result) {
      if (result.needsInfo) {
        let response = `📋 Which device? Say "info about [device name or IP]"\n\n**Devices:**\n`;
        response += result.devices.map(d => `• ${d.notes || d.ip}`).join('\n');
        return response;
      }
      if (result.error) return `❌ ${result.error}`;
      
      const d = result.device;
      const emoji = d.emoji || '📱';
      const ts = result.tailscaleInfo;
      
      let response = `${emoji} **${d.notes || d.hostname || d.ip}**\n\n`;
      response += `┌─────────────────────────────\n`;
      response += `│ 📍 **IP:** ${d.ip}\n`;
      response += `│ 🔗 **MAC:** ${d.mac}\n`;
      response += `│ 📊 **Type:** ${d.device_type || 'Unknown'}\n`;
      response += `│ 💿 **OS:** ${d.os || 'Unknown'}\n`;
      response += `│ 📁 **Group:** ${d.device_group || 'None'}\n`;
      response += `│ ${d.online ? '🟢' : '🔴'} **Status:** ${d.online ? 'Online' : 'Offline'}\n`;
      response += `└─────────────────────────────\n`;
      
      // Tailscale info if available
      if (ts?.tailscale) {
        response += `\n**🌐 Tailscale:**\n`;
        response += `┌─────────────────────────────\n`;
        response += `│ 📛 **Hostname:** ${ts.tailscale.hostname}\n`;
        response += `│ 📍 **VPN IP:** ${ts.tailscale.ip}\n`;
        response += `│ 💿 **OS:** ${ts.tailscale.os}\n`;
        response += `│ ${ts.tailscale.online ? '🟢' : '🔴'} **VPN Status:** ${ts.tailscale.online ? 'Online' : 'Offline'}\n`;
        response += `└─────────────────────────────\n`;
      }
      
      response += `\n📅 First seen: ${d.first_seen ? new Date(d.first_seen).toLocaleDateString() : 'Unknown'}`;
      response += ` | 🕐 Last seen: ${d.last_seen ? new Date(d.last_seen).toLocaleDateString() : 'Unknown'}`;
      
      response += `\n\n💡 _Say "ping ${d.ip}" or "scan ports on ${d.ip}" for more details_`;
      
      return response;
    },
    // Button definitions for Discord
    getButtons(result) {
      if (!result.device) return null;
      const ip = result.device.ip;
      return [
        { id: `ping_${ip}`, label: '🏓 Ping', style: 'PRIMARY' },
        { id: `portscan_${ip}`, label: '🔍 Scan Ports', style: 'SECONDARY' },
        { id: `fullscan_${ip}`, label: '🔬 Full Scan', style: 'SECONDARY' }
      ];
    }
  },
  
  // Device ping action
  'device-ping': {
    keywords: ['ping', 'ping device', 'check device', 'is device online', 'test connection'],
    plugin: 'network-management',
    description: 'Ping a device to check connectivity',
    async execute(context) {
      const { deviceOps } = await import('../../../src/database/db.js');
      const { pingDeviceDetailed } = await import('../../network-management/scanner.js');
      const query = context.query || '';
      
      // Extract IP
      const ipMatch = query.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      let ip = ipMatch?.[1];
      
      if (!ip) {
        // Try to find device by name
        const devices = deviceOps.getAll();
        const nameMatch = query.match(/ping\s+(.+)/i);
        if (nameMatch) {
          const searchTerm = nameMatch[1].trim().toLowerCase();
          const device = devices.find(d => 
            d.notes?.toLowerCase().includes(searchTerm) ||
            d.hostname?.toLowerCase().includes(searchTerm)
          );
          if (device) ip = device.ip;
        }
      }
      
      if (!ip) {
        return { needsInfo: true };
      }
      
      const result = await pingDeviceDetailed(ip);
      
      // Get device name if exists
      const devices = deviceOps.getAll();
      const device = devices.find(d => d.ip === ip);
      result.deviceName = device?.notes || device?.hostname || ip;
      
      return result;
    },
    formatResult(result) {
      if (result.needsInfo) {
        return `🏓 Which device? Say "ping [IP or device name]"`;
      }
      if (result.error) {
        return `❌ Ping failed: ${result.error}`;
      }
      
      const status = result.alive ? '🟢 **ONLINE**' : '🔴 **OFFLINE**';
      
      let response = `🏓 **Ping: ${result.deviceName}**\n\n`;
      response += `Status: ${status}\n`;
      
      if (result.alive) {
        response += `┌─────────────────────────────\n`;
        response += `│ ⏱️ **Min:** ${result.min} ms\n`;
        response += `│ ⏱️ **Avg:** ${result.avg} ms\n`;
        response += `│ ⏱️ **Max:** ${result.max} ms\n`;
        response += `│ 📉 **Packet Loss:** ${result.packetLoss}\n`;
        response += `└─────────────────────────────\n`;
      }
      
      return response;
    }
  },
  
  // Port scan action
  'device-port-scan': {
    keywords: ['port scan', 'scan ports', 'open ports', 'what ports', 'services', 'docker ports'],
    plugin: 'network-management',
    description: 'Scan open ports on a device',
    longRunning: true, // Flag for progress updates
    async execute(context) {
      const { deviceOps } = await import('../../../src/database/db.js');
      const { scanDevicePorts } = await import('../../network-management/scanner.js');
      const query = context.query || '';
      
      // Check for full scan flag
      const fullScan = query.includes('full') || query.includes('all ports') || query.includes('deep');
      
      // Extract IP
      const ipMatch = query.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      let ip = ipMatch?.[1];
      
      if (!ip) {
        // Try to find device by name
        const devices = deviceOps.getAll();
        const nameMatch = query.match(/(?:scan|ports|on)\s+(.+)/i);
        if (nameMatch) {
          const searchTerm = nameMatch[1].trim().toLowerCase().replace(/full|all|ports|scan|deep|deeper/gi, '').trim();
          if (searchTerm) {
            const device = devices.find(d => 
              d.notes?.toLowerCase().includes(searchTerm) ||
              d.hostname?.toLowerCase().includes(searchTerm)
            );
            if (device) ip = device.ip;
          }
        }
      }
      
      if (!ip) {
        return { needsInfo: true };
      }
      
      // Get device info early for progress message
      const devices = deviceOps.getAll();
      const device = devices.find(d => d.ip === ip);
      const deviceName = device?.notes || device?.hostname || ip;
      
      // Send progress update if we have a reply function
      if (context.sendProgress) {
        const scanType = fullScan ? 'deep' : 'quick';
        const estimatedTime = fullScan ? '1-2 minutes' : '15-30 seconds';
        await context.sendProgress(
          `🔍 **Scanning ports on ${deviceName}...**\n\n` +
          `⏳ Scan type: **${scanType}**\n` +
          `⏱️ Estimated time: ${estimatedTime}\n\n` +
          `_Checking for open ports and services..._`
        );
      }
      
      const result = await scanDevicePorts(ip, fullScan);
      
      // Set device info on result
      result.deviceName = deviceName;
      result.deviceId = device?.id;
      result.deviceIp = ip;
      
      // Get named services for this device
      if (device) {
        const { serviceOps } = await import('../../../src/database/db.js');
        result.namedServices = serviceOps.getByDevice(device.id);
      }
      
      // Update device OS if detected
      if (result.osInfo && device) {
        try {
          const { db } = await import('../../../src/database/db.js');
          db.prepare('UPDATE devices SET os = ? WHERE id = ?').run(result.osInfo, device.id);
        } catch (e) {
          // OS update failed
        }
      }
      
      return result;
    },
    formatResult(result) {
      if (result.needsInfo) {
        return `🔍 Which device? Say "scan ports on [IP or device name]"`;
      }
      if (result.error) {
        return `❌ Port scan failed: ${result.error}`;
      }
      
      let response = `🔍 **Port Scan: ${result.deviceName}**\n`;
      response += `_Scan type: ${result.scanType}_\n\n`;
      
      if (result.osInfo) {
        response += `💿 **Detected OS:** ${result.osInfo}\n\n`;
      }
      
      if (result.openPorts.length === 0) {
        response += `No open ports found (or host is blocking scans)`;
        return response;
      }
      
      // Build service map from named services
      const namedMap = {};
      (result.namedServices || []).forEach(s => {
        namedMap[s.port] = s;
      });
      
      response += `**📡 Open Ports (${result.openPorts.length}):**\n`;
      response += `┌──────┬────────────────┬─────────────────────\n`;
      response += `│ Port │ Service        │ Details\n`;
      response += `├──────┼────────────────┼─────────────────────\n`;
      
      result.openPorts.slice(0, 20).forEach(p => {
        const named = namedMap[p.port];
        const port = String(p.port).padEnd(4);
        const serviceName = named ? `⭐ ${named.name}` : (p.service || 'unknown');
        const service = serviceName.substring(0, 14).padEnd(14);
        const version = named?.description || p.version || '';
        response += `│ ${port} │ ${service} │ ${version}\n`;
      });
      
      response += `└──────┴────────────────┴─────────────────────\n`;
      
      if (result.openPorts.length > 20) {
        response += `\n_...and ${result.openPorts.length - 20} more ports_`;
      }
      
      // Show quick access links for named services with URLs
      const servicesWithUrls = (result.namedServices || []).filter(s => s.url);
      if (servicesWithUrls.length > 0) {
        response += `\n\n**🔗 Quick Access:**\n`;
        servicesWithUrls.forEach(s => {
          const icon = s.icon || '🌐';
          response += `${icon} [${s.name}](${s.url})\n`;
        });
      }
      
      response += `\n\n💡 _Name a service: "name port ${result.openPorts[0]?.port || 80} on ${result.deviceName} as Portainer"_`;
      
      return response;
    },
    // Button definitions for services
    getButtons(result) {
      if (!result.namedServices?.length) return null;
      return result.namedServices
        .filter(s => s.url)
        .slice(0, 5)
        .map(s => ({
          id: `service_${result.deviceId}_${s.port}`,
          label: `${s.icon || '🌐'} ${s.name}`,
          style: 'LINK',
          url: s.url
        }));
    }
  },
  
  // Name a service on a port
  'service-name': {
    keywords: ['name port', 'name service', 'call port', 'label port', 'service name', 'set service'],
    plugin: 'device-management',
    description: 'Name a service running on a port',
    async execute(context) {
      const { deviceOps, serviceOps } = await import('../../../src/database/db.js');
      const query = context.query || '';
      
      let port = null;
      let deviceId = null;
      let serviceName = null;
      let serviceUrl = null;
      let serviceIcon = null;
      
      // Try AI parsing
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const devices = deviceOps.getAll();
          const prompt = `Parse this service naming command.

USER MESSAGE: "${query}"

AVAILABLE DEVICES:
${devices.slice(0, 10).map(d => `- "${d.notes || d.ip}" (${d.ip})`).join('\n')}

Return ONLY JSON:
{
  "deviceIdentifier": "device name or IP",
  "port": port number,
  "serviceName": "name for the service",
  "serviceUrl": "URL to access (e.g., http://ip:port) or null",
  "serviceIcon": "emoji icon or null"
}

EXAMPLES:
- "name port 9000 on Think-Server as Portainer" → port: 9000, serviceName: "Portainer"
- "call port 8080 on 192.168.0.250 Home Assistant with url http://192.168.0.250:8080" → port: 8080, serviceName: "Home Assistant", serviceUrl: "http://192.168.0.250:8080"
- "label port 32400 as Plex 🎬" → port: 32400, serviceName: "Plex", serviceIcon: "🎬"`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt,
            options: { maxOutputTokens: 200, temperature: 0.1 }
          });
          
          const responseText = result?.response?.text?.() || '';
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            deviceId = parsed.deviceIdentifier;
            port = parsed.port;
            serviceName = parsed.serviceName;
            serviceUrl = parsed.serviceUrl;
            serviceIcon = parsed.serviceIcon;
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for service name:', error.message);
      }
      
      // Fallback regex
      if (!port || !serviceName) {
        const portMatch = query.match(/port\s+(\d+)/i);
        const nameMatch = query.match(/(?:as|called|name(?:d)?)\s+["']?([^"'\n]+)["']?/i);
        const ipMatch = query.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        
        if (portMatch) port = parseInt(portMatch[1]);
        if (nameMatch) serviceName = nameMatch[1].trim();
        if (ipMatch) deviceId = ipMatch[1];
      }
      
      if (!port || !serviceName) {
        return { needsInfo: true };
      }
      
      // Find device
      const devices = deviceOps.getAll();
      const device = devices.find(d => 
        d.ip === deviceId ||
        d.notes?.toLowerCase() === deviceId?.toLowerCase() ||
        d.notes?.toLowerCase().includes(deviceId?.toLowerCase() || '')
      );
      
      if (!device) {
        return { error: 'Device not found. Specify device name or IP.' };
      }
      
      // Auto-generate URL if not provided
      if (!serviceUrl) {
        const protocol = [443, 8443].includes(port) ? 'https' : 'http';
        serviceUrl = `${protocol}://${device.ip}:${port}`;
      }
      
      // Auto-suggest icon based on service name
      if (!serviceIcon) {
        const iconMap = {
          'portainer': '🐳', 'docker': '🐳', 'plex': '🎬', 'jellyfin': '🎬', 'emby': '🎬',
          'home assistant': '🏠', 'homeassistant': '🏠', 'grafana': '📊', 'prometheus': '📈',
          'nginx': '🌐', 'apache': '🌐', 'traefik': '🔀', 'pihole': '🛡️', 'adguard': '🛡️',
          'nextcloud': '☁️', 'syncthing': '🔄', 'transmission': '⬇️', 'qbittorrent': '⬇️',
          'sonarr': '📺', 'radarr': '🎥', 'lidarr': '🎵', 'prowlarr': '🔍', 'jackett': '🔍',
          'mysql': '🗄️', 'postgres': '🗄️', 'mongodb': '🗄️', 'redis': '🗄️', 'mariadb': '🗄️',
          'ssh': '🔐', 'ftp': '📁', 'smb': '📁', 'nfs': '📁', 'webdav': '📁',
          'minecraft': '⛏️', 'valheim': '🎮', 'ark': '🦖', 'rust': '🎮'
        };
        const lowerName = serviceName.toLowerCase();
        for (const [key, icon] of Object.entries(iconMap)) {
          if (lowerName.includes(key)) {
            serviceIcon = icon;
            break;
          }
        }
        serviceIcon = serviceIcon || '🌐';
      }
      
      // Save service
      serviceOps.upsert(device.id, port, serviceName, null, serviceUrl, serviceIcon);
      
      return {
        success: true,
        device: device.notes || device.ip,
        port,
        serviceName,
        serviceUrl,
        serviceIcon
      };
    },
    formatResult(result) {
      if (result.needsInfo) {
        return `📝 To name a service, say:\n` +
          `"Name port 9000 on Think-Server as Portainer"\n` +
          `"Label port 8080 on 192.168.0.250 as Home Assistant"`;
      }
      if (result.error) return `❌ ${result.error}`;
      
      return `✅ **Service Named!**\n\n` +
        `${result.serviceIcon} **${result.serviceName}**\n` +
        `📍 ${result.device}:${result.port}\n` +
        `🔗 ${result.serviceUrl}`;
    }
  },
  
  // List all named services
  'service-list': {
    keywords: ['list services', 'show services', 'my services', 'all services', 'what services'],
    plugin: 'device-management',
    description: 'List all named services',
    async execute(context) {
      const { serviceOps, deviceOps } = await import('../../../src/database/db.js');
      const query = context.query || '';
      
      // Check if filtering by device
      const ipMatch = query.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      let services;
      let deviceName = null;
      
      if (ipMatch) {
        const devices = deviceOps.getAll();
        const device = devices.find(d => d.ip === ipMatch[1]);
        if (device) {
          services = serviceOps.getByDevice(device.id);
          deviceName = device.notes || device.ip;
        }
      } else {
        services = serviceOps.getAll();
      }
      
      return { services: services || [], deviceName };
    },
    formatResult(result) {
      if (!result.services || result.services.length === 0) {
        return `📋 No named services found.\n\n` +
          `💡 Name a service: "name port 9000 on Think-Server as Portainer"`;
      }
      
      let response = result.deviceName 
        ? `📋 **Services on ${result.deviceName}:**\n\n`
        : `📋 **All Named Services:**\n\n`;
      
      // Group by device if showing all
      if (!result.deviceName) {
        const byDevice = {};
        result.services.forEach(s => {
          const key = s.device_name || s.ip;
          if (!byDevice[key]) byDevice[key] = [];
          byDevice[key].push(s);
        });
        
        for (const [device, services] of Object.entries(byDevice)) {
          response += `**${device}:**\n`;
          services.forEach(s => {
            response += `  ${s.icon || '🌐'} ${s.name} (port ${s.port})`;
            if (s.url) response += ` - [Open](${s.url})`;
            response += `\n`;
          });
          response += `\n`;
        }
      } else {
        result.services.forEach(s => {
          response += `${s.icon || '🌐'} **${s.name}** (port ${s.port})`;
          if (s.url) response += ` - [Open](${s.url})`;
          response += `\n`;
        });
      }
      
      return response;
    },
    getButtons(result) {
      if (!result.services?.length) return null;
      return result.services
        .filter(s => s.url)
        .slice(0, 5)
        .map(s => ({
          id: `service_open_${s.id}`,
          label: `${s.icon || '🌐'} ${s.name}`,
          style: 'LINK',
          url: s.url
        }));
    }
  },

  // Add a custom port/service to a device
  'service-add': {
    keywords: ['add port', 'add service', 'register port', 'custom port', 'manual port'],
    plugin: 'device-management',
    description: 'Add a custom port/service to a device (even if not detected by scan)',
    async execute(context) {
      const { deviceOps, serviceOps } = await import('../../../src/database/db.js');
      const query = context.query || '';
      
      let port = null;
      let deviceId = null;
      let serviceName = null;
      let serviceUrl = null;
      
      // Try AI parsing
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const devices = deviceOps.getAll();
          const prompt = `Parse this command to add a custom port/service.

USER MESSAGE: "${query}"

AVAILABLE DEVICES:
${devices.slice(0, 10).map(d => `- "${d.notes || d.ip}" (${d.ip})`).join('\n')}

Return ONLY JSON:
{
  "deviceIdentifier": "device name or IP",
  "port": port number,
  "serviceName": "name for the service (optional, can be null)",
  "serviceUrl": "URL to access (optional, can be null)"
}

EXAMPLES:
- "add port 3000 to Think-Server" → port: 3000, serviceName: null
- "add port 8080 as API on 192.168.0.250" → port: 8080, serviceName: "API"
- "register port 5000 on server with url http://192.168.0.250:5000" → port: 5000, serviceUrl: "http://..."`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt,
            options: { maxOutputTokens: 150, temperature: 0.1 }
          });
          
          const responseText = result?.response?.text?.() || '';
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            deviceId = parsed.deviceIdentifier;
            port = parsed.port;
            serviceName = parsed.serviceName;
            serviceUrl = parsed.serviceUrl;
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for service add:', error.message);
      }
      
      // Fallback regex
      if (!port) {
        const portMatch = query.match(/port\s+(\d+)/i);
        const ipMatch = query.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        const nameMatch = query.match(/(?:as|called|named)\s+["']?([^"'\n]+)["']?/i);
        
        if (portMatch) port = parseInt(portMatch[1]);
        if (ipMatch) deviceId = ipMatch[1];
        if (nameMatch) serviceName = nameMatch[1].trim();
      }
      
      if (!port) {
        return { needsInfo: true, missing: 'port' };
      }
      
      // Find device
      const devices = deviceOps.getAll();
      const device = devices.find(d => 
        d.ip === deviceId ||
        d.notes?.toLowerCase() === deviceId?.toLowerCase() ||
        d.notes?.toLowerCase().includes(deviceId?.toLowerCase() || '')
      );
      
      if (!device) {
        return { needsInfo: true, missing: 'device', availableDevices: devices.slice(0, 5) };
      }
      
      // Auto-generate URL if not provided
      if (!serviceUrl) {
        const protocol = [443, 8443].includes(port) ? 'https' : 'http';
        serviceUrl = `${protocol}://${device.ip}:${port}`;
      }
      
      // Use port number as default name if not provided
      const finalName = serviceName || `Port ${port}`;
      
      // Save service
      serviceOps.upsert(device.id, port, finalName, null, serviceUrl, '🔌');
      
      return {
        success: true,
        device: device.notes || device.ip,
        deviceIp: device.ip,
        port,
        serviceName: finalName,
        serviceUrl
      };
    },
    formatResult(result) {
      if (result.needsInfo) {
        if (result.missing === 'port') {
          return `📝 Please specify a port number:\n"Add port 3000 to Think-Server"`;
        }
        if (result.missing === 'device') {
          let response = `📝 Which device? Available:\n`;
          result.availableDevices?.forEach(d => {
            response += `• ${d.notes || d.ip}\n`;
          });
          return response;
        }
      }
      if (result.error) return `❌ ${result.error}`;
      
      return `✅ **Port Added!**\n\n` +
        `🔌 **${result.serviceName}**\n` +
        `📍 ${result.device}:${result.port}\n` +
        `🔗 ${result.serviceUrl}\n\n` +
        `💡 Check if it's running: "is port ${result.port} open on ${result.device}"`;
    }
  },

  // Check if a service/port is running
  'service-check': {
    keywords: ['check port', 'is port open', 'port status', 'service status', 'is service running', 'check service'],
    plugin: 'network-management',
    description: 'Check if a port/service is running on a device',
    longRunning: true,
    async execute(context) {
      const { deviceOps, serviceOps } = await import('../../../src/database/db.js');
      const { checkPort, checkPorts } = await import('../../network-management/scanner.js');
      const query = context.query || '';
      
      let port = null;
      let ports = [];
      let deviceId = null;
      let checkAllServices = false;
      
      // Check if user wants to check all services on a device
      if (query.match(/all\s+(?:services|ports)/i) || query.match(/check\s+services/i)) {
        checkAllServices = true;
      }
      
      // Extract port(s) and device
      const portMatch = query.match(/port\s+(\d+)/i);
      const portsMatch = query.match(/ports?\s+([\d,\s]+)/i);
      const ipMatch = query.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      
      if (portMatch) port = parseInt(portMatch[1]);
      if (portsMatch) {
        ports = portsMatch[1].split(/[,\s]+/).map(p => parseInt(p.trim())).filter(p => !isNaN(p));
      }
      if (ipMatch) deviceId = ipMatch[1];
      
      // Try to find device by name
      if (!deviceId) {
        const devices = deviceOps.getAll();
        const deviceNames = devices.map(d => d.notes?.toLowerCase()).filter(Boolean);
        for (const name of deviceNames) {
          if (query.toLowerCase().includes(name)) {
            const device = devices.find(d => d.notes?.toLowerCase() === name);
            if (device) {
              deviceId = device.ip;
              break;
            }
          }
        }
      }
      
      if (!deviceId) {
        return { needsInfo: true, missing: 'device' };
      }
      
      // Find device in database
      const devices = deviceOps.getAll();
      const device = devices.find(d => 
        d.ip === deviceId ||
        d.notes?.toLowerCase() === deviceId?.toLowerCase()
      );
      
      // If checking all services, get them from database
      if (checkAllServices && device) {
        const services = serviceOps.getByDevice(device.id);
        if (services.length > 0) {
          ports = services.map(s => s.port);
        } else {
          return { noServices: true, device: device.notes || device.ip };
        }
      }
      
      // Single port check
      if (port && ports.length === 0) {
        const result = await checkPort(deviceId, port);
        
        // Get service name from database if exists
        if (device) {
          const service = serviceOps.get(device.id, port);
          if (service) {
            result.serviceName = service.name;
            result.serviceIcon = service.icon;
            result.serviceUrl = service.url;
          }
        }
        
        return {
          single: true,
          device: device?.notes || deviceId,
          ...result
        };
      }
      
      // Multiple ports check
      if (ports.length > 0) {
        const results = await checkPorts(deviceId, ports);
        
        // Enrich with service names from database
        if (device) {
          for (const result of results) {
            const service = serviceOps.get(device.id, result.port);
            if (service) {
              result.serviceName = service.name;
              result.serviceIcon = service.icon;
              result.serviceUrl = service.url;
            }
          }
        }
        
        return {
          multiple: true,
          device: device?.notes || deviceId,
          results,
          openCount: results.filter(r => r.open).length,
          totalCount: results.length
        };
      }
      
      return { needsInfo: true, missing: 'port' };
    },
    formatResult(result) {
      if (result.needsInfo) {
        if (result.missing === 'device') {
          return `📝 Which device? Try:\n"Check port 8080 on Think-Server"\n"Is port 3000 open on 192.168.0.250"`;
        }
        if (result.missing === 'port') {
          return `📝 Which port? Try:\n"Check port 8080 on Think-Server"\n"Check all services on Think-Server"`;
        }
      }
      
      if (result.noServices) {
        return `📋 No services registered on **${result.device}**\n\n` +
          `💡 Add one: "add port 8080 to ${result.device}"`;
      }
      
      if (result.error) return `❌ Error: ${result.error}`;
      
      // Single port result
      if (result.single) {
        const icon = result.serviceIcon || (result.open ? '🟢' : '🔴');
        const name = result.serviceName || result.service || `Port ${result.port}`;
        const status = result.open ? 'OPEN ✅' : 'CLOSED ❌';
        
        let response = `**${icon} ${name}** on ${result.device}\n\n`;
        response += `Port ${result.port}: **${status}**\n`;
        
        if (result.open && result.serviceUrl) {
          response += `🔗 ${result.serviceUrl}`;
        } else if (!result.open) {
          response += `\n💡 The service might be down or the port is blocked.`;
        }
        
        return response;
      }
      
      // Multiple ports result
      if (result.multiple) {
        let response = `**📊 Service Status on ${result.device}**\n`;
        response += `${result.openCount}/${result.totalCount} services running\n\n`;
        
        result.results.forEach(r => {
          const icon = r.serviceIcon || (r.open ? '🟢' : '🔴');
          const name = r.serviceName || r.service || `Port ${r.port}`;
          const status = r.open ? '✅' : '❌';
          response += `${icon} ${name} (${r.port}): ${status}\n`;
        });
        
        return response;
      }
      
      return `❌ Could not check port status.`;
    }
  },

  // Delete a service
  'service-delete': {
    keywords: ['delete service', 'remove service', 'delete port', 'remove port', 'unregister service'],
    plugin: 'device-management',
    description: 'Remove a service from a device',
    async execute(context) {
      const { deviceOps, serviceOps } = await import('../../../src/database/db.js');
      const query = context.query || '';
      
      let port = null;
      let deviceId = null;
      let serviceName = null;
      
      // Extract info
      const portMatch = query.match(/port\s+(\d+)/i);
      const ipMatch = query.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      const nameMatch = query.match(/(?:service|called|named)\s+["']?([^"'\n]+)["']?/i);
      
      if (portMatch) port = parseInt(portMatch[1]);
      if (ipMatch) deviceId = ipMatch[1];
      if (nameMatch) serviceName = nameMatch[1].trim();
      
      // Find device by name if no IP
      if (!deviceId) {
        const devices = deviceOps.getAll();
        for (const d of devices) {
          if (d.notes && query.toLowerCase().includes(d.notes.toLowerCase())) {
            deviceId = d.ip;
            break;
          }
        }
      }
      
      if (!deviceId) {
        return { needsInfo: true, missing: 'device' };
      }
      
      // Find device
      const devices = deviceOps.getAll();
      const device = devices.find(d => d.ip === deviceId || d.notes?.toLowerCase() === deviceId?.toLowerCase());
      
      if (!device) {
        return { error: 'Device not found' };
      }
      
      // If service name provided but no port, find by name
      if (!port && serviceName) {
        const services = serviceOps.getByDevice(device.id);
        const service = services.find(s => s.name.toLowerCase() === serviceName.toLowerCase());
        if (service) {
          port = service.port;
        }
      }
      
      if (!port) {
        // List services to help user
        const services = serviceOps.getByDevice(device.id);
        return { needsInfo: true, missing: 'port', services, device: device.notes || device.ip };
      }
      
      // Get service info before deleting
      const service = serviceOps.get(device.id, port);
      
      // Delete
      serviceOps.delete(device.id, port);
      
      return {
        success: true,
        device: device.notes || device.ip,
        port,
        serviceName: service?.name || `Port ${port}`
      };
    },
    formatResult(result) {
      if (result.needsInfo) {
        if (result.missing === 'device') {
          return `📝 Which device? Try:\n"Delete port 8080 from Think-Server"`;
        }
        if (result.missing === 'port') {
          let response = `📝 Which service on **${result.device}**?\n\n`;
          if (result.services?.length > 0) {
            result.services.forEach(s => {
              response += `• ${s.icon || '🔌'} ${s.name} (port ${s.port})\n`;
            });
            response += `\nTry: "delete port ${result.services[0].port} from ${result.device}"`;
          } else {
            response += `No services registered on this device.`;
          }
          return response;
        }
      }
      if (result.error) return `❌ ${result.error}`;
      
      return `🗑️ **Service Removed**\n\n` +
        `Deleted **${result.serviceName}** (port ${result.port}) from ${result.device}`;
    }
  },

  // ============ RESEARCH ============
  'research': {
    keywords: ['research', 'look up', 'find out about', 'learn about', 'tell me about', 'what is', 'who is', 'explain'],
    plugin: 'research',
    description: 'Research a topic',
    permission: 'run_research', // Uses PERMISSIONS.RUN_RESEARCH
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const researchPlugin = getPlugin('research');
      
      if (!researchPlugin?.webResearch) {
        throw new Error('Research plugin not available');
      }
      
      // Extract topic from query
      const query = context.query || '';
      const topicPatterns = [
        /research\s+(?:about\s+)?(.+)/i,
        /look\s+up\s+(.+)/i,
        /find\s+out\s+about\s+(.+)/i,
        /learn\s+about\s+(.+)/i,
        /tell\s+me\s+about\s+(.+)/i,
        /what\s+is\s+(.+)/i,
        /who\s+is\s+(.+)/i,
        /explain\s+(.+)/i
      ];
      
      let topic = null;
      for (const pattern of topicPatterns) {
        const match = query.match(pattern);
        if (match) {
          topic = match[1].trim().replace(/\?$/, '');
          break;
        }
      }
      
      if (!topic) {
        return { needsTopic: true };
      }
      
      const result = await researchPlugin.webResearch(topic, context.userId);
      return { topic, response: result.response, filename: result.filename };
    },
    formatResult(result) {
      if (result.needsTopic) {
        return `🔍 What would you like me to research?\n\n` +
          `Say "Research [topic]" or "Tell me about [topic]"`;
      }
      
      // Truncate if too long
      let response = result.response;
      if (response.length > 1800) {
        response = response.substring(0, 1800) + '\n\n... _(truncated)_';
      }
      
      return `**🔍 Research: ${result.topic}**\n\n${response}\n\n_📄 Saved as: ${result.filename}_`;
    }
  },

  // ============ WEB SEARCH ============
  'web-search': {
    keywords: ['search for', 'search the web', 'google', 'look up online', 'find online', 'web search'],
    plugin: 'research',
    description: 'Search the web using DuckDuckGo',
    async execute(context) {
      const query = context.query || '';
      
      // Extract search query
      const searchPatterns = [
        /search\s+(?:for|the web for)?\s*(.+)/i,
        /google\s+(.+)/i,
        /look\s+up\s+online\s+(.+)/i,
        /find\s+online\s+(.+)/i,
        /web\s+search\s+(?:for)?\s*(.+)/i
      ];
      
      let searchQuery = null;
      for (const pattern of searchPatterns) {
        const match = query.match(pattern);
        if (match) {
          searchQuery = match[1].trim().replace(/\?$/, '');
          break;
        }
      }
      
      if (!searchQuery) {
        return { needsQuery: true };
      }
      
      try {
        // Use DuckDuckGo Instant Answer API
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1&skip_disambig=1`;
        const response = await fetch(url);
        const data = await response.json();
        
        const results = [];
        
        // Add abstract if available
        if (data.AbstractText) {
          results.push({
            title: data.Heading || searchQuery,
            snippet: data.AbstractText,
            url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`
          });
        }
        
        // Add related topics
        if (data.RelatedTopics) {
          for (const topic of data.RelatedTopics.slice(0, 4)) {
            if (topic.Text && topic.FirstURL) {
              results.push({
                title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 50),
                snippet: topic.Text,
                url: topic.FirstURL
              });
            }
          }
        }
        
        // If no results from API, provide search link
        if (results.length === 0) {
          return {
            query: searchQuery,
            noResults: true,
            searchUrl: `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`
          };
        }
        
        return {
          query: searchQuery,
          results: results.slice(0, 5),
          searchUrl: `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`
        };
      } catch (error) {
        return { error: error.message, query: searchQuery };
      }
    },
    formatResult(result) {
      if (result.needsQuery) {
        return `🔎 What would you like me to search for?\n\n` +
          `Say "Search for [query]" or "Google [query]"`;
      }
      
      if (result.error) {
        return `❌ Search failed: ${result.error}\n\n` +
          `Try searching directly: ${result.searchUrl || 'https://duckduckgo.com'}`;
      }
      
      if (result.noResults) {
        return `🔎 No instant results for "${result.query}"\n\n` +
          `Try searching directly: [DuckDuckGo](${result.searchUrl})`;
      }
      
      let response = `**🔎 Search: ${result.query}**\n\n`;
      
      for (const r of result.results) {
        const snippet = r.snippet.length > 150 ? r.snippet.substring(0, 150) + '...' : r.snippet;
        response += `**${r.title}**\n${snippet}\n[Link](${r.url})\n\n`;
      }
      
      response += `_[More results](${result.searchUrl})_`;
      
      return response;
    }
  },

  // ============ HOME ASSISTANT ============
  'homeassistant': {
    keywords: ['turn on light', 'turn off light', 'lights on', 'lights off', 'home assistant', 'smart home'],
    plugin: 'integrations',
    description: 'Control Home Assistant',
    async execute(context) {
      return { requiresSlashCommand: true };
    },
    formatResult() {
      return `🏠 To control Home Assistant devices, use:\n\n` +
        `\`/homeassistant\`\n\n` +
        `This shows available devices and lets you control them.`;
    }
  },

  // ============ PING ============
  'ping': {
    keywords: ['ping', 'latency', 'response time'],
    plugin: 'core',
    description: 'Check bot latency',
    async execute(context) {
      const client = context.client;
      return { ping: client?.ws?.ping || 0 };
    },
    formatResult(result) {
      return `🏓 **Pong!** Latency: ${result.ping}ms`;
    }
  },

  // ============ REMINDER & AUTOMATION CREATION ============
  'reminder-create': {
    keywords: ['remind me', 'remind us', 'set reminder', 'reminder in', 'reminder at', 'remind me every', "don't forget", 'wake me', 'alert me', 'at ', 'every day at', 'every morning', 'every night', 'every evening', 'schedule', 'automate', 'in 5', 'in 10', 'in 30'],
    plugin: 'smart-reminders',
    description: 'Create a reminder or scheduled automation via natural language',
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      
      const query = context.query || '';
      
      // Use AI-powered parser for better understanding
      const { parseReminderWithAI } = await import('../utils/ai-reminder-parser.js');
      const parsed = await parseReminderWithAI(query, context);
      
      // If AI parsing failed or needs clarification
      if (!parsed.success || !parsed.understood) {
        return { 
          needsInfo: true, 
          clarification: parsed.clarification,
          error: parsed.error 
        };
      }
      
      // Check if we have enough info
      if (!parsed.message || (!parsed.time?.triggerTime && !parsed.time?.interval)) {
        return { 
          needsInfo: true, 
          clarification: parsed.clarification || "I need more details. When should I remind you?"
        };
      }
      
      const reminderPlugin = getPlugin('smart-reminders');
      if (!reminderPlugin?.addReminder) {
        return { error: 'Smart reminders plugin not available' };
      }
      
      // Use AI-parsed actions if available, otherwise try to parse from message
      let actions = parsed.actions || [];
      if (actions.length === 0) {
        actions = parseAutomationActions(parsed.message || '');
      }
      
      // Convert AI action format to plugin format
      const formattedActions = actions.map(action => {
        if (action.type === 'wol' && action.device) {
          return { type: 'wol', mac: action.device }; // Will be resolved later
        }
        if (action.type === 'homeassistant') {
          return { 
            type: 'homeassistant', 
            service: action.action === 'turn on' ? 'light.turn_on' : 'light.turn_off',
            entityId: action.entity 
          };
        }
        return action;
      });
      
      // Determine target - user reminders with actions should still notify the user
      const targetUserId = parsed.target?.userId || context.userId;
      const hasTargetUser = parsed.target?.type === 'user' && parsed.target?.userId;
      const hasActions = formattedActions.length > 0;
      const isAutomationOnly = (parsed.type === 'automation' || parsed.target?.type === 'automation') && !hasTargetUser;
      
      // Determine the target type:
      // - If there's a target user (even with actions), notify them
      // - If automation-only (no target user), just run actions
      // - Otherwise, DM the creator
      let targetType;
      if (hasTargetUser) {
        targetType = 'user'; // Will notify the target user AND run actions if any
      } else if (isAutomationOnly || (hasActions && !hasTargetUser)) {
        targetType = 'automation'; // Just run actions, notify creator
      } else {
        targetType = 'dm';
      }
      
      // Rewrite the message with AI to sound more natural and include personality
      // Pass user IDs so the rewriter can fetch profiles for correct pronouns
      let rewrittenMessage = parsed.message || 'Reminder';
      try {
        const { rewriteReminderMessage } = await import('../utils/message-rewriter.js');
        rewrittenMessage = await rewriteReminderMessage(parsed.message, {
          senderName: context.username || 'Someone',
          senderUserId: context.userId,
          targetName: hasTargetUser ? `<@${targetUserId}>` : null,
          targetUserId: hasTargetUser ? targetUserId : null,
          isForOther: hasTargetUser,
          includePersonality: true,
          messageType: 'reminder'
        });
      } catch (e) {
        // If rewriting fails, use original message
      }
      
      const reminderData = {
        name: parsed.message?.substring(0, 30) || 'Reminder',
        message: rewrittenMessage,
        originalMessage: parsed.message, // Keep original for reference
        userId: context.userId,
        targetUserId: targetUserId,
        channelId: context.channelId,
        target: targetType,
        actions: hasActions ? formattedActions : undefined
      };
      
      if (parsed.type === 'recurring') {
        reminderData.type = 'recurring';
        reminderData.interval = parsed.time.interval || parsed.time.value;
      } else {
        reminderData.type = 'time';
        reminderData.triggerTime = parsed.time.triggerTime;
      }
      
      try {
        const reminder = await reminderPlugin.addReminder(reminderData);
        return {
          success: true,
          reminder,
          time: parsed.time,
          message: rewrittenMessage,
          originalMessage: parsed.message,
          targetUserId,
          hasTargetUser,
          actions: formattedActions,
          confidence: parsed.confidence,
          isAutomation: hasActions && !hasTargetUser,
          senderName: context.username
        };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsInfo) {
        // Use AI clarification if available
        if (result.clarification) {
          return `❓ ${result.clarification}`;
        }
        
        return `⏰ I can help with reminders and automations! Here's what I can do:\n\n` +
          `**Basic Reminders:**\n` +
          `• "Remind me in 30 minutes to check the server"\n` +
          `• "Remind me at 6pm to call mom"\n` +
          `• "Remind me every hour to drink water"\n\n` +
          `**Remind Others:**\n` +
          `• "Remind @user in 1 hour about the meeting"\n\n` +
          `**Scheduled Automations:**\n` +
          `• "At 6am wake my PC"\n` +
          `• "Every morning scan the network"\n` +
          `• "In 30 minutes turn on the lights"\n` +
          `• "Every day at 8am run a speed test"`;
      }
      
      if (result.error) {
        return `❌ Couldn't create reminder: ${result.error}`;
      }
      
      // Format time string
      let timeStr;
      if (result.time?.type === 'recurring' || result.time?.interval) {
        timeStr = `every ${result.time.interval || result.time.value}`;
      } else if (result.time?.triggerTime) {
        timeStr = new Date(result.time.triggerTime).toLocaleString();
      } else {
        timeStr = result.time?.value || 'scheduled';
      }
      
      // Different title based on type
      let title;
      if (result.hasTargetUser && result.actions?.length > 0) {
        title = '👤⚙️ **Reminder + Action for User!**';
      } else if (result.isAutomation) {
        title = '⚙️ **Automation Scheduled!**';
      } else if (result.hasTargetUser) {
        title = '👤 **Reminder for User Set!**';
      } else {
        title = '✅ **Reminder Set!**';
      }
      
      let response = `${title}\n\n`;
      
      // Show the AI-rewritten message (what will be delivered)
      response += `💬 **Will say:** ${result.message}\n`;
      
      // Show original if different (for transparency)
      if (result.originalMessage && result.originalMessage !== result.message) {
        response += `📝 *Original: "${result.originalMessage}"*\n`;
      }
      
      response += `⏰ **When:** ${timeStr}\n`;
      
      if (result.hasTargetUser || (result.targetUserId && result.targetUserId !== result.reminder?.userId)) {
        response += `👤 **For:** <@${result.targetUserId}>\n`;
        if (result.senderName) {
          response += `✉️ **From:** ${result.senderName}\n`;
        }
      }
      
      if (result.actions && result.actions.length > 0) {
        const actionNames = result.actions.map(a => {
          if (a.type === 'wol') return '⚡ Wake device';
          if (a.type === 'homeassistant') return '🏠 Home Assistant';
          if (a.type === 'scan') return '📡 Network scan';
          if (a.type === 'speedtest') return '🚀 Speed test';
          if (a.type === 'game') return '🎮 Start game';
          return a.type;
        });
        response += `🤖 **Actions:** ${actionNames.join(', ')}\n`;
      }
      
      response += `🆔 **ID:** ${result.reminder?.id || 'N/A'}`;
      
      // Add confidence warning if low
      if (result.confidence && result.confidence < 0.8) {
        response += `\n\n⚠️ *I'm ${Math.round(result.confidence * 100)}% confident I understood correctly. Use \`/bot reminder list\` to verify.*`;
      }
      
      return response;
    }
  },

  // ============ SCHEDULED AUTOMATION (redirects to reminder-create) ============
  'scheduled-automation': {
    keywords: [], // Empty - reminder-create handles these keywords now
    plugin: 'smart-reminders',
    description: 'Schedule automated actions (handled by reminder-create)',
    async execute(context) {
      // Redirect to reminder-create which now handles automations
      const reminderAction = ACTIONS['reminder-create'];
      return await reminderAction.execute(context);
    },
    formatResult(result) {
      // Use reminder-create's formatResult
      const reminderAction = ACTIONS['reminder-create'];
      return reminderAction.formatResult(result);
    }
  },

  // ============ HOME ASSISTANT CONTROL ============
  'homeassistant-control': {
    keywords: ['turn on the', 'turn off the', 'switch on', 'switch off', 'lights on', 'lights off', 'set brightness', 'activate scene', 'what lights', 'dim the', 'brighten'],
    plugin: 'integrations',
    description: 'Control Home Assistant devices',
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const query = context.query || '';
      const lowerQuery = query.toLowerCase();
      
      const integrationsPlugin = getPlugin('integrations');
      if (!integrationsPlugin?.homeassistant) {
        return { error: 'Home Assistant integration not configured', notConfigured: true };
      }
      
      const ha = integrationsPlugin.homeassistant;
      
      // Get entities for AI context
      let entities = [];
      try {
        entities = await ha.getEntities();
      } catch (error) {
        return { error: `Failed to connect to Home Assistant: ${error.message}` };
      }
      
      // "what lights are on" - handle this first (no AI needed)
      if (lowerQuery.includes('what lights') || lowerQuery.includes('which lights')) {
        const lights = entities.filter(e => 
          e.entity_id.startsWith('light.') && e.state === 'on'
        );
        
        return {
          success: true,
          action: 'query',
          lights: lights.map(l => ({
            name: l.attributes?.friendly_name || l.entity_id,
            brightness: l.attributes?.brightness ? Math.round(l.attributes.brightness / 255 * 100) : null
          }))
        };
      }
      
      // Use AI to parse the smart home command
      let parsedCommand = null;
      try {
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          // Get available entities for context (limit to controllable ones)
          const controllableEntities = entities
            .filter(e => ['light', 'switch', 'fan', 'cover', 'scene', 'script', 'climate'].some(d => e.entity_id.startsWith(d + '.')))
            .slice(0, 50)
            .map(e => ({
              id: e.entity_id,
              name: e.attributes?.friendly_name || e.entity_id,
              state: e.state,
              domain: e.entity_id.split('.')[0]
            }));
          
          const prompt = `You are parsing a smart home control command for Home Assistant.

USER MESSAGE: "${query}"

AVAILABLE ENTITIES:
${controllableEntities.map(e => `- ${e.name} (${e.id}) [${e.domain}] - ${e.state}`).join('\n')}

Return ONLY a JSON object:
{
  "action": "turn_on", "turn_off", "toggle", "set_brightness", "activate_scene", or "unknown",
  "entityId": "the exact entity_id from the list",
  "entityName": "the friendly name",
  "brightness": number 0-100 if setting brightness (null otherwise),
  "confidence": "high", "medium", or "low"
}

PARSING RULES:
- "turn on living room" → find light/switch with "living room" in name
- "lights off in bedroom" → find bedroom light, action: "turn_off"
- "dim the kitchen to 30%" → action: "set_brightness", brightness: 30
- "brighten the office" → action: "set_brightness", brightness: 100
- "activate movie mode" → find scene with "movie" in name
- "turn off all lights" → entityId: "all" (special case)
- Match entity names fuzzy (ignore case, partial match OK)
- For scenes, action should be "activate_scene"

Return ONLY the JSON, no other text.`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt,
            options: { maxOutputTokens: 200, temperature: 0.1 }
          });
          
          const responseText = result?.response?.text?.() || '';
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            parsedCommand = JSON.parse(jsonMatch[0]);
            logger.info(`AI parsed HA command: action=${parsedCommand.action}, entity=${parsedCommand.entityId}`);
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for Home Assistant, using regex fallback:', error.message);
      }
      
      // Execute based on AI parsing or fall back to regex
      if (parsedCommand && parsedCommand.action !== 'unknown' && parsedCommand.confidence !== 'low') {
        try {
          // Handle "all lights" special case
          if (parsedCommand.entityId === 'all' && parsedCommand.action.includes('turn')) {
            const service = parsedCommand.action === 'turn_on' ? 'turn_on' : 'turn_off';
            await ha.callService('light', service, { entity_id: 'all' });
            return {
              success: true,
              action: parsedCommand.action === 'turn_on' ? 'on' : 'off',
              device: 'all lights',
              aiParsed: true
            };
          }
          
          // Find the entity
          const entity = entities.find(e => e.entity_id === parsedCommand.entityId);
          if (!entity) {
            return { error: `Entity "${parsedCommand.entityName || parsedCommand.entityId}" not found`, notFound: true };
          }
          
          const domain = entity.entity_id.split('.')[0];
          
          if (parsedCommand.action === 'set_brightness' && parsedCommand.brightness !== null) {
            await ha.callService('light', 'turn_on', {
              entity_id: entity.entity_id,
              brightness_pct: parsedCommand.brightness
            });
            return {
              success: true,
              action: 'brightness',
              device: entity.attributes?.friendly_name || entity.entity_id,
              brightness: parsedCommand.brightness,
              aiParsed: true
            };
          }
          
          if (parsedCommand.action === 'activate_scene') {
            await ha.callService('scene', 'turn_on', { entity_id: entity.entity_id });
            return {
              success: true,
              action: 'scene',
              scene: entity.attributes?.friendly_name || entity.entity_id,
              aiParsed: true
            };
          }
          
          // Standard turn on/off
          const service = parsedCommand.action === 'turn_on' ? 'turn_on' : 'turn_off';
          await ha.callService(domain, service, { entity_id: entity.entity_id });
          
          return {
            success: true,
            action: parsedCommand.action === 'turn_on' ? 'on' : 'off',
            device: entity.attributes?.friendly_name || entity.entity_id,
            entityId: entity.entity_id,
            aiParsed: true
          };
        } catch (error) {
          return { error: error.message };
        }
      }
      
      // Fallback to regex parsing
      const toggleMatch = lowerQuery.match(/turn\s+(on|off)\s+(?:the\s+)?(.+)/i);
      if (toggleMatch) {
        const action = toggleMatch[1];
        const deviceName = toggleMatch[2].trim();
        
        const entity = entities.find(e => 
          e.attributes?.friendly_name?.toLowerCase().includes(deviceName) ||
          e.entity_id.toLowerCase().includes(deviceName.replace(/\s+/g, '_'))
        );
        
        if (!entity) {
          return { error: `Device "${deviceName}" not found`, notFound: true, query: deviceName };
        }
        
        const domain = entity.entity_id.split('.')[0];
        const service = action === 'on' ? 'turn_on' : 'turn_off';
        
        await ha.callService(domain, service, { entity_id: entity.entity_id });
        
        return {
          success: true,
          action,
          device: entity.attributes?.friendly_name || entity.entity_id,
          entityId: entity.entity_id
        };
      }
      
      // "set [light] to [X]%"
      const brightnessMatch = lowerQuery.match(/set\s+(.+?)\s+(?:to\s+)?(\d+)\s*%/i);
      if (brightnessMatch) {
        const deviceName = brightnessMatch[1].trim();
        const brightness = Math.min(100, Math.max(0, parseInt(brightnessMatch[2])));
        
        const entity = entities.find(e => 
          e.entity_id.startsWith('light.') &&
          (e.attributes?.friendly_name?.toLowerCase().includes(deviceName) ||
           e.entity_id.toLowerCase().includes(deviceName.replace(/\s+/g, '_')))
        );
        
        if (!entity) {
          return { error: `Light "${deviceName}" not found`, notFound: true };
        }
        
        await ha.callService('light', 'turn_on', {
          entity_id: entity.entity_id,
          brightness_pct: brightness
        });
        
        return {
          success: true,
          action: 'brightness',
          device: entity.attributes?.friendly_name || entity.entity_id,
          brightness
        };
      }
      
      // "activate [scene]"
      const sceneMatch = lowerQuery.match(/activate\s+(?:scene\s+)?(.+)/i);
      if (sceneMatch) {
        const sceneName = sceneMatch[1].trim();
        
        const scene = entities.find(e => 
          e.entity_id.startsWith('scene.') &&
          (e.attributes?.friendly_name?.toLowerCase().includes(sceneName) ||
           e.entity_id.toLowerCase().includes(sceneName.replace(/\s+/g, '_')))
        );
        
        if (!scene) {
          return { error: `Scene "${sceneName}" not found`, notFound: true };
        }
        
        await ha.callService('scene', 'turn_on', { entity_id: scene.entity_id });
        
        return {
          success: true,
          action: 'scene',
          scene: scene.attributes?.friendly_name || scene.entity_id
        };
      }
      
      return { needsInfo: true };
    },
    formatResult(result) {
      if (result.notConfigured) {
        return `🏠 Home Assistant is not configured.\n\nSet up the integration in your \`.env\` file with:\n• \`HOMEASSISTANT_URL\`\n• \`HOMEASSISTANT_TOKEN\``;
      }
      
      if (result.notFound) {
        return `❌ Device "${result.query || 'unknown'}" not found.\n\nTry using the exact device name from Home Assistant.`;
      }
      
      if (result.needsInfo) {
        return `🏠 I can control your smart home! Try:\n\n` +
          `• "Turn on the living room lights"\n` +
          `• "Turn off the bedroom fan"\n` +
          `• "Dim the kitchen to 30%"\n` +
          `• "What lights are on?"\n` +
          `• "Activate movie scene"`;
      }
      
      if (result.error) {
        return `❌ Home Assistant error: ${result.error}`;
      }
      
      if (result.action === 'query') {
        if (result.lights.length === 0) {
          return `💡 No lights are currently on.`;
        }
        const lightList = result.lights.map(l => 
          `• ${l.name}${l.brightness ? ` (${l.brightness}%)` : ''}`
        ).join('\n');
        return `💡 **Lights currently on:**\n\n${lightList}`;
      }
      
      if (result.action === 'brightness') {
        return `💡 Set **${result.device}** to **${result.brightness}%** brightness`;
      }
      
      if (result.action === 'scene') {
        return `🎬 Activated scene: **${result.scene}**`;
      }
      
      const emoji = result.action === 'on' ? '💡' : '🌙';
      return `${emoji} Turned **${result.action}** ${result.device}`;
    }
  },

  // ============ USER PROFILES ============
  'profile-setup': {
    keywords: ['create profile channel', 'setup profile channel', 'profile channel', 'introduce themselves', 'member profiles', 'user profiles'],
    plugin: 'user-profiles',
    description: 'Create a profile setup channel for members',
    permission: 'admin', // Requires bot admin
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const profilePlugin = getPlugin('user-profiles');
      
      if (!profilePlugin) {
        return { error: 'User profiles plugin not available' };
      }
      
      // Need guild context
      if (!context.guild) {
        return { needsGuild: true, needsSlash: true };
      }
      
      try {
        const result = await profilePlugin.createProfileChannel(context.guild);
        return { success: true, ...result };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild || result.needsSlash) {
        return `👤 To create a profile channel, use the slash command:\n\n\`/bot profile createchannel\``;
      }
      
      if (result.error) {
        return `❌ Failed to create profile channel: ${result.error}`;
      }
      
      if (result.created) {
        return `✅ **Profile Channel Created!**\n\n` +
          `I've created ${result.channel} where new members can introduce themselves~\n\n` +
          `Members can chat naturally in that channel and I'll learn about them!`;
      }
      
      return `👤 A profile channel already exists: ${result.channel}`;
    }
  },

  'profile-view': {
    keywords: ['my profile', 'view profile', 'show profile', 'what do you know about me', 'who am i'],
    plugin: 'user-profiles',
    description: 'View your profile',
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const profilePlugin = getPlugin('user-profiles');
      
      if (!profilePlugin) {
        return { error: 'User profiles plugin not available' };
      }
      
      const profile = await profilePlugin.getProfile(context.userId);
      return { profile, userId: context.userId };
    },
    formatResult(result) {
      if (result.error) {
        return `❌ ${result.error}`;
      }
      
      if (!result.profile) {
        return `👤 You haven't set up your profile yet!\n\n` +
          `Use \`/profile setup\` to get started, or just tell me about yourself~`;
      }
      
      const p = result.profile;
      let response = `👤 **Your Profile:**\n\n`;
      
      if (p.displayName) response += `📛 **Name:** ${p.displayName}\n`;
      if (p.gender) response += `⚧️ **Gender:** ${p.gender}\n`;
      if (p.pronouns) response += `💬 **Pronouns:** ${p.pronouns}\n`;
      if (p.personality) response += `🎭 **Personality:** ${p.personality}\n`;
      if (p.timezone) response += `🌍 **Timezone:** ${p.timezone}\n`;
      if (p.interests?.length) response += `🎯 **Interests:** ${p.interests.join(', ')}\n`;
      if (p.bio) response += `📝 **Bio:** ${p.bio}\n`;
      
      return response;
    }
  },

  // ============ DISCORD CHANNEL CREATION ============
  'discord-create-channel': {
    keywords: ['create channel', 'make channel', 'new channel', 'add channel', 'create a channel', 'make a channel', 'setup channel'],
    plugin: 'server-admin',
    description: 'Create a new Discord channel with AI-decided category and permissions',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      
      // Need guild context
      if (!context.guild) {
        return { needsGuild: true };
      }
      
      // Use smart channel helper with AI
      try {
        const { createSmartChannel } = await import('../utils/channel-helper.js');
        
        // Determine channel type from query
        const lowerQuery = query.toLowerCase();
        const channelType = lowerQuery.includes('voice') ? 'voice' : 'text';
        
        // Extract purpose from query - keep important context words like "admin", "private"
        // Only remove action words, not descriptive words
        let purpose = query
          .replace(/\b(create|make|new|add|setup|please|can you|could you)\b/gi, '')
          .replace(/\b(a|the|channel)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim() || 'general bot channel';
        
        logger.info(`Creating smart channel for purpose: "${purpose}" (type: ${channelType})`);
        
        // Create channel with AI-decided config
        const result = await createSmartChannel(context.guild, purpose, channelType, {
          topic: `Created by ${context.username || 'User'}`
        });
        
        return {
          success: true,
          channelName: result.channel.name,
          channelType: channelType,
          categoryName: result.category.name,
          isPrivate: result.config.isPrivate,
          existed: result.existed,
          aiReason: result.config.reason,
          channelId: result.channel.id
        };
        
      } catch (error) {
        logger.error('Smart channel creation failed:', error.message);
        // Fallback to basic creation
        return await this.fallbackCreate(query, context);
      }
    },
    
    // Fallback creation without AI categorization
    async fallbackCreate(query, context) {
      const lowerQuery = query.toLowerCase();
      
      // Extract channel name
      const patterns = [
        /(?:create|make|new|add|setup)\s+(?:a\s+)?(?:(text|voice)\s+)?channel\s+(?:called\s+|named\s+|for\s+)?["']?([a-zA-Z0-9_\-\s]+)["']?/i
      ];
      
      let channelType = lowerQuery.includes('voice') ? 'voice' : 'text';
      let channelName = null;
      
      for (const pattern of patterns) {
        const match = query.match(pattern);
        if (match) {
          if (match[1]) channelType = match[1].toLowerCase();
          if (match[2]) {
            channelName = match[2].trim()
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, '');
          }
          break;
        }
      }
      
      if (!channelName) {
        channelName = 'new-channel';
      }
      
      try {
        const { createChannel } = await import('../../server-admin/discord/channel-manager.js');
        const result = await createChannel(context.guild, channelName, channelType, null, {
          executorId: context.userId,
          executorName: context.username || 'User'
        });
        
        return { ...result, aiParsed: false, fallback: true };
      } catch (error) {
        return { error: error.message };
      }
    },
    
    formatResult(result) {
      if (result.needsGuild) {
        return `📢 I can only create channels in a server. Please use this command in a Discord server, not DMs.`;
      }
      
      if (result.error) {
        return `❌ Failed to create channel: ${result.error}`;
      }
      
      if (result.success) {
        const emoji = result.channelType === 'voice' ? '🔊' : '💬';
        const privacyEmoji = result.isPrivate ? '🔒' : '🌐';
        
        let response = `${emoji} **Channel Created!**\n\n`;
        
        if (result.existed) {
          response += `Found existing channel **#${result.channelName}**`;
        } else {
          response += `Created ${result.channelType} channel **#${result.channelName}**`;
        }
        
        response += `\n📁 **Category:** ${result.categoryName}`;
        response += `\n${privacyEmoji} **Access:** ${result.isPrivate ? 'Private (Admin only)' : 'Public'}`;
        
        if (result.aiReason) {
          response += `\n💡 *${result.aiReason}*`;
        }
        
        return response;
      }
      
      // Fallback result format
      if (result.channel) {
        const emoji = result.channel?.type === 'voice' ? '🔊' : '💬';
        return `${emoji} **Channel Created!**\n\nCreated channel **#${result.channel?.name}**`;
      }
      
      return `❌ Something went wrong creating the channel.`;
    }
  },

  // ============ DISCORD DELETE CHANNEL ============
  'discord-delete-channel': {
    keywords: ['delete channel', 'remove channel', 'delete this channel', 'get rid of channel'],
    plugin: 'server-admin',
    description: 'Delete a Discord channel',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      const lowerQuery = query.toLowerCase();
      
      if (!context.guild) {
        return { needsGuild: true };
      }
      
      // Check for "this channel" first
      if (lowerQuery.includes('this channel') && context.channel) {
        try {
          const { deleteChannel } = await import('../../server-admin/discord/channel-manager.js');
          const result = await deleteChannel(context.guild, context.channel.name, {
            executorId: context.userId,
            executorName: context.username || 'User'
          });
          return result;
        } catch (error) {
          return { error: error.message };
        }
      }
      
      // Get available channels for AI context
      const availableChannels = context.guild.channels.cache
        .filter(c => c.type === 0 || c.type === 2) // Text and voice channels
        .map(c => ({ name: c.name, type: c.type === 2 ? 'voice' : 'text' }))
        .slice(0, 30);
      
      let channelName = null;
      let matchedChannel = null;
      
      // Use AI to parse and match channel name
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const prompt = `You are parsing a Discord channel deletion request. Match the requested channel to available channels.

USER MESSAGE: "${query}"

AVAILABLE CHANNELS IN THIS SERVER:
${availableChannels.map(c => `- #${c.name} (${c.type})`).join('\n')}

Return ONLY a JSON object:
{
  "channelName": "exact channel name from the available list that best matches",
  "confidence": "high", "medium", or "low",
  "reasoning": "brief explanation of why this channel was matched"
}

MATCHING RULES:
- "delete the bot testing channel" → find channel with "bot" and "test" in name
- "remove old-chat" → find channel named "old-chat"
- "get rid of the gaming channel" → find channel with "gaming" in name
- Match case-insensitively and handle hyphens/underscores
- If user says a partial name, find the best match
- If ambiguous or no good match, set confidence to "low"

Return ONLY the JSON, no other text.`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt,
            options: { maxOutputTokens: 150, temperature: 0.1 }
          });
          
          const responseText = result?.response?.text?.() || '';
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.channelName && parsed.confidence !== 'low') {
              channelName = parsed.channelName;
              logger.info(`AI parsed channel deletion: "${channelName}", confidence=${parsed.confidence}`);
            } else if (parsed.confidence === 'low') {
              // Return for confirmation if low confidence
              return { 
                needsConfirmation: true, 
                suggestedChannel: parsed.channelName,
                reasoning: parsed.reasoning,
                availableChannels: availableChannels.slice(0, 10)
              };
            }
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for channel deletion, using regex fallback:', error.message);
      }
      
      // Fallback to regex if AI didn't work
      if (!channelName) {
        const patterns = [
          /delete\s+(?:the\s+)?(?:channel\s+)?(?:#)?["']?([a-zA-Z0-9_\-]+)["']?/i,
          /remove\s+(?:the\s+)?(?:channel\s+)?(?:#)?["']?([a-zA-Z0-9_\-]+)["']?/i,
          /get\s+rid\s+of\s+(?:the\s+)?(?:channel\s+)?(?:#)?["']?([a-zA-Z0-9_\-]+)["']?/i
        ];
        
        for (const pattern of patterns) {
          const match = query.match(pattern);
          if (match && match[1]) {
            channelName = match[1].trim();
            break;
          }
        }
      }
      
      if (!channelName) {
        return { needsName: true, availableChannels: availableChannels.slice(0, 10) };
      }
      
      try {
        const { deleteChannel } = await import('../../server-admin/discord/channel-manager.js');
        const result = await deleteChannel(context.guild, channelName, {
          executorId: context.userId,
          executorName: context.username || 'User'
        });
        
        return { ...result, aiParsed: true };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild) {
        return `📢 I can only delete channels in a server.`;
      }
      
      if (result.needsConfirmation) {
        let response = `🤔 I'm not sure which channel you mean.`;
        if (result.suggestedChannel) {
          response += ` Did you mean **#${result.suggestedChannel}**?`;
        }
        if (result.availableChannels?.length > 0) {
          response += `\n\n**Available channels:**\n${result.availableChannels.map(c => `• #${c.name}`).join('\n')}`;
        }
        response += `\n\nTry: "Delete channel [exact-name]" or "Delete this channel"`;
        return response;
      }
      
      if (result.needsName) {
        let response = `📢 Which channel should I delete?`;
        if (result.availableChannels?.length > 0) {
          response += `\n\n**Available channels:**\n${result.availableChannels.map(c => `• #${c.name}`).join('\n')}`;
        }
        response += `\n\nTry: "Delete channel old-chat" or "Delete this channel"`;
        return response;
      }
      
      if (result.error) {
        return `❌ Failed to delete channel: ${result.error}`;
      }
      
      if (result.success) {
        return `🗑️ **Channel Deleted!**\n\nDeleted channel **#${result.deletedChannel?.name}**`;
      }
      
      return `❌ Something went wrong deleting the channel.`;
    }
  },

  // ============ DISCORD RENAME CHANNEL ============
  'discord-rename-channel': {
    keywords: ['rename channel', 'change channel name', 'rename this channel'],
    plugin: 'server-admin',
    description: 'Rename a Discord channel',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      
      if (!context.guild) {
        return { needsGuild: true };
      }
      
      let channelName = null;
      let newName = null;
      
      // Check for "this channel"
      if (query.toLowerCase().includes('this channel') && context.channel) {
        channelName = context.channel.name;
      }
      
      // Use AI to parse the rename request
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        const channels = context.guild.channels.cache
          .filter(c => c.type === 0 || c.type === 2)
          .map(c => c.name).slice(0, 30);
        
        if (aiPlugin) {
          const prompt = `Parse a channel rename command.

USER MESSAGE: "${query}"

AVAILABLE CHANNELS: ${channels.join(', ')}

Return ONLY JSON:
{
  "currentName": "channel to rename (or 'this' if renaming current channel)",
  "newName": "new name in kebab-case",
  "confidence": "high", "medium", or "low"
}

Rules:
- "rename general to main-chat" → currentName: "general", newName: "main-chat"
- "rename this channel to announcements" → currentName: "this", newName: "announcements"
- Convert spaces to hyphens, lowercase`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt, options: { maxOutputTokens: 100, temperature: 0.1 }
          });
          
          const jsonMatch = result?.response?.text?.()?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.currentName === 'this' && context.channel) {
              channelName = context.channel.name;
            } else if (parsed.currentName) {
              channelName = parsed.currentName;
            }
            if (parsed.newName) newName = parsed.newName;
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for channel rename:', error.message);
      }
      
      if (!channelName || !newName) {
        return { needsInfo: true };
      }
      
      try {
        const { findChannel, renameChannel } = await import('../../server-admin/discord/channel-manager.js');
        const channel = findChannel(context.guild, channelName);
        if (!channel) return { error: `Channel "${channelName}" not found` };
        
        const result = await renameChannel(channel, newName, {
          executorId: context.userId,
          executorName: context.username
        });
        return result;
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild) return `📢 I can only rename channels in a server.`;
      if (result.needsInfo) return `📝 How to rename: "Rename channel general to main-chat" or "Rename this channel to announcements"`;
      if (result.error) return `❌ ${result.error}`;
      return `✏️ Renamed **#${result.channel?.oldName}** → **#${result.channel?.name}**`;
    }
  },

  // ============ DISCORD SET CHANNEL TOPIC ============
  'discord-set-topic': {
    keywords: ['set topic', 'channel topic', 'set description', 'channel description', 'change topic'],
    plugin: 'server-admin',
    description: 'Set channel topic/description',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      
      if (!context.guild) return { needsGuild: true };
      
      let channel = context.channel;
      let topic = null;
      
      // Use AI to parse
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const prompt = `Parse a channel topic command.

USER MESSAGE: "${query}"

Return ONLY JSON:
{
  "channelName": "channel name or 'this' for current channel",
  "topic": "the topic/description to set (max 1024 chars)"
}

Examples:
- "set topic to Welcome to our server!" → channelName: "this", topic: "Welcome to our server!"
- "set general topic to General discussion" → channelName: "general", topic: "General discussion"`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt, options: { maxOutputTokens: 150, temperature: 0.1 }
          });
          
          const jsonMatch = result?.response?.text?.()?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.channelName && parsed.channelName !== 'this') {
              const { findChannel } = await import('../../server-admin/discord/channel-manager.js');
              channel = findChannel(context.guild, parsed.channelName);
            }
            topic = parsed.topic;
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for set topic:', error.message);
      }
      
      if (!channel) return { error: 'Channel not found' };
      if (!topic) return { needsInfo: true };
      
      try {
        const { setTopic } = await import('../../server-admin/discord/channel-manager.js');
        return await setTopic(channel, topic, { executorId: context.userId, executorName: context.username });
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild) return `📢 I can only set topics in a server.`;
      if (result.needsInfo) return `📝 Usage: "Set topic to Welcome to our server!" or "Set general topic to General chat"`;
      if (result.error) return `❌ ${result.error}`;
      return `📝 Set topic for **#${result.channel?.name}**`;
    }
  },

  // ============ DISCORD SET SLOWMODE ============
  'discord-set-slowmode': {
    keywords: ['set slowmode', 'slowmode', 'slow mode', 'rate limit'],
    plugin: 'server-admin',
    description: 'Set channel slowmode',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      
      if (!context.guild) return { needsGuild: true };
      
      let channel = context.channel;
      let seconds = null;
      
      // Use AI to parse duration
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const prompt = `Parse a slowmode command.

USER MESSAGE: "${query}"

Return ONLY JSON:
{
  "channelName": "channel name or 'this'",
  "seconds": number (0 to disable, max 21600 = 6 hours)
}

Duration parsing:
- "5 seconds" → 5
- "30s" → 30
- "1 minute" → 60
- "5 minutes" → 300
- "1 hour" → 3600
- "disable" or "off" → 0`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt, options: { maxOutputTokens: 100, temperature: 0.1 }
          });
          
          const jsonMatch = result?.response?.text?.()?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.channelName && parsed.channelName !== 'this') {
              const { findChannel } = await import('../../server-admin/discord/channel-manager.js');
              channel = findChannel(context.guild, parsed.channelName);
            }
            seconds = parsed.seconds;
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for slowmode:', error.message);
      }
      
      if (!channel) return { error: 'Channel not found' };
      if (seconds === null) return { needsInfo: true };
      
      try {
        const { setSlowmode } = await import('../../server-admin/discord/channel-manager.js');
        return await setSlowmode(channel, seconds, { executorId: context.userId, executorName: context.username });
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild) return `📢 I can only set slowmode in a server.`;
      if (result.needsInfo) return `⏱️ Usage: "Set slowmode to 30 seconds" or "Disable slowmode"`;
      if (result.error) return `❌ ${result.error}`;
      const duration = result.channel?.slowmode > 0 ? `${result.channel.slowmode} seconds` : 'disabled';
      return `⏱️ Slowmode ${result.channel?.slowmode > 0 ? 'set to' : ''} **${duration}** in #${result.channel?.name}`;
    }
  },

  // ============ DISCORD UNBAN ============
  'discord-unban': {
    keywords: ['unban', 'unban user', 'remove ban', 'lift ban'],
    plugin: 'server-admin',
    description: 'Unban a user from the server',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      
      if (!context.guild) return { needsGuild: true };
      
      // Try to extract user ID from query
      const userIdMatch = query.match(/(\d{17,19})/);
      
      if (!userIdMatch) {
        // List recent bans
        try {
          const bans = await context.guild.bans.fetch({ limit: 10 });
          return { needsUser: true, bans: bans.map(b => ({ id: b.user.id, tag: b.user.tag, reason: b.reason })) };
        } catch {
          return { needsUser: true, bans: [] };
        }
      }
      
      try {
        await context.guild.members.unban(userIdMatch[1], `Unbanned by ${context.username} via AI`);
        const user = await context.client.users.fetch(userIdMatch[1]).catch(() => null);
        return { success: true, user: user?.tag || userIdMatch[1] };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild) return `🔓 I can only unban users in a server.`;
      if (result.needsUser) {
        let response = `🔓 Who should I unban? Provide the user ID.`;
        if (result.bans?.length > 0) {
          response += `\n\n**Recent bans:**\n${result.bans.map(b => `• ${b.tag} (${b.id})`).join('\n')}`;
        }
        return response;
      }
      if (result.error) return `❌ Failed to unban: ${result.error}`;
      return `🔓 **Unbanned** ${result.user}`;
    }
  },

  // ============ DISCORD REMOVE TIMEOUT ============
  'discord-remove-timeout': {
    keywords: ['remove timeout', 'untimeout', 'unmute', 'remove mute', 'lift timeout'],
    plugin: 'server-admin',
    description: 'Remove timeout from a user',
    permission: 'admin',
    async execute(context) {
      const userMatch = context.query?.match(/<@!?(\d+)>/);
      
      if (!userMatch) return { needsUser: true };
      if (!context.guild) return { needsGuild: true };
      
      try {
        const member = await context.guild.members.fetch(userMatch[1]);
        await member.timeout(null, `Timeout removed by ${context.username} via AI`);
        return { success: true, member: member.user.tag };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsUser) return `🔊 Who should I unmute? Mention the user: "Unmute @user"`;
      if (result.needsGuild) return `🔊 I can only remove timeouts in a server.`;
      if (result.error) return `❌ Failed: ${result.error}`;
      return `🔊 **Removed timeout** from ${result.member}`;
    }
  },

  // ============ DISCORD GET MEMBER INFO ============
  'discord-member-info': {
    keywords: ['member info', 'user info', 'who is', 'info about', 'whois'],
    plugin: 'server-admin',
    description: 'Get information about a member',
    async execute(context) {
      const userMatch = context.query?.match(/<@!?(\d+)>/);
      
      if (!userMatch) return { needsUser: true };
      if (!context.guild) return { needsGuild: true };
      
      try {
        const member = await context.guild.members.fetch(userMatch[1]);
        const roles = member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name);
        
        return {
          success: true,
          user: {
            tag: member.user.tag,
            id: member.user.id,
            nickname: member.nickname,
            joinedAt: member.joinedAt,
            createdAt: member.user.createdAt,
            roles: roles.slice(0, 10),
            isOwner: member.id === context.guild.ownerId,
            isBot: member.user.bot
          }
        };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsUser) return `👤 Who do you want info about? Mention them: "Who is @user"`;
      if (result.needsGuild) return `👤 I can only get member info in a server.`;
      if (result.error) return `❌ ${result.error}`;
      
      const u = result.user;
      let response = `**👤 ${u.tag}**${u.isBot ? ' 🤖' : ''}${u.isOwner ? ' 👑' : ''}\n\n`;
      if (u.nickname) response += `📛 **Nickname:** ${u.nickname}\n`;
      response += `🆔 **ID:** ${u.id}\n`;
      response += `📅 **Joined:** ${new Date(u.joinedAt).toLocaleDateString()}\n`;
      response += `🎂 **Created:** ${new Date(u.createdAt).toLocaleDateString()}\n`;
      if (u.roles.length > 0) response += `🎭 **Roles:** ${u.roles.join(', ')}`;
      return response;
    }
  },

  // ============ DISCORD SERVER INFO ============
  'discord-server-info': {
    keywords: ['server info', 'guild info', 'server stats', 'about server', 'server details'],
    plugin: 'server-admin',
    description: 'Get server information',
    async execute(context) {
      if (!context.guild) return { needsGuild: true };
      
      const guild = context.guild;
      const owner = await guild.fetchOwner().catch(() => null);
      
      return {
        success: true,
        server: {
          name: guild.name,
          id: guild.id,
          owner: owner?.user?.tag || 'Unknown',
          memberCount: guild.memberCount,
          channelCount: guild.channels.cache.size,
          roleCount: guild.roles.cache.size,
          emojiCount: guild.emojis.cache.size,
          boostLevel: guild.premiumTier,
          boostCount: guild.premiumSubscriptionCount,
          createdAt: guild.createdAt,
          description: guild.description
        }
      };
    },
    formatResult(result) {
      if (result.needsGuild) return `🏠 I can only get server info in a server.`;
      if (result.error) return `❌ ${result.error}`;
      
      const s = result.server;
      let response = `**🏠 ${s.name}**\n\n`;
      if (s.description) response += `📝 ${s.description}\n\n`;
      response += `👑 **Owner:** ${s.owner}\n`;
      response += `👥 **Members:** ${s.memberCount}\n`;
      response += `💬 **Channels:** ${s.channelCount}\n`;
      response += `🎭 **Roles:** ${s.roleCount}\n`;
      response += `😀 **Emojis:** ${s.emojiCount}\n`;
      response += `💎 **Boost Level:** ${s.boostLevel} (${s.boostCount} boosts)\n`;
      response += `📅 **Created:** ${new Date(s.createdAt).toLocaleDateString()}`;
      return response;
    }
  },

  // ============ DISCORD LIST ROLES ============
  'discord-list-roles': {
    keywords: ['list roles', 'show roles', 'all roles', 'server roles', 'what roles'],
    plugin: 'server-admin',
    description: 'List all server roles',
    async execute(context) {
      if (!context.guild) return { needsGuild: true };
      
      const roles = context.guild.roles.cache
        .filter(r => r.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .map(r => ({
          name: r.name,
          color: r.hexColor,
          members: r.members.size,
          mentionable: r.mentionable
        }));
      
      return { success: true, roles };
    },
    formatResult(result) {
      if (result.needsGuild) return `🎭 I can only list roles in a server.`;
      if (result.error) return `❌ ${result.error}`;
      
      if (result.roles.length === 0) return `🎭 No roles found.`;
      
      const list = result.roles.slice(0, 20).map(r => 
        `• **${r.name}** - ${r.members} members`
      ).join('\n');
      
      return `**🎭 Server Roles (${result.roles.length})**\n\n${list}` +
        (result.roles.length > 20 ? `\n\n_...and ${result.roles.length - 20} more_` : '');
    }
  },

  // ============ DISCORD BAN LIST ============
  'discord-ban-list': {
    keywords: ['ban list', 'banned users', 'show bans', 'list bans', 'who is banned'],
    plugin: 'server-admin',
    description: 'View banned users',
    permission: 'admin',
    async execute(context) {
      if (!context.guild) return { needsGuild: true };
      
      try {
        const bans = await context.guild.bans.fetch({ limit: 20 });
        return {
          success: true,
          bans: bans.map(b => ({
            tag: b.user.tag,
            id: b.user.id,
            reason: b.reason || 'No reason provided'
          }))
        };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild) return `🔨 I can only view bans in a server.`;
      if (result.error) return `❌ ${result.error}`;
      
      if (result.bans.length === 0) return `🔨 No banned users.`;
      
      const list = result.bans.map(b => 
        `• **${b.tag}**\n  ID: ${b.id}\n  Reason: ${b.reason}`
      ).join('\n\n');
      
      return `**🔨 Banned Users (${result.bans.length})**\n\n${list}`;
    }
  },

  // ============ DISCORD MOVE CHANNEL ============
  'discord-move-channel': {
    keywords: ['move channel', 'move to category', 'change category', 'put channel in'],
    plugin: 'server-admin',
    description: 'Move a channel to a category',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      if (!context.guild) return { needsGuild: true };
      
      let channelName = null;
      let categoryName = null;
      
      // Use AI to parse
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        const channels = context.guild.channels.cache.filter(c => c.type === 0 || c.type === 2).map(c => c.name);
        const categories = context.guild.channels.cache.filter(c => c.type === 4).map(c => c.name);
        
        if (aiPlugin) {
          const prompt = `Parse a channel move command.

USER MESSAGE: "${query}"

CHANNELS: ${channels.slice(0, 20).join(', ')}
CATEGORIES: ${categories.join(', ')}

Return ONLY JSON:
{
  "channelName": "channel to move",
  "categoryName": "target category"
}`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt, options: { maxOutputTokens: 100, temperature: 0.1 }
          });
          
          const jsonMatch = result?.response?.text?.()?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            channelName = parsed.channelName;
            categoryName = parsed.categoryName;
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for move channel:', error.message);
      }
      
      if (!channelName || !categoryName) return { needsInfo: true };
      
      try {
        const { findChannel, moveChannel } = await import('../../server-admin/discord/channel-manager.js');
        const channel = findChannel(context.guild, channelName);
        if (!channel) return { error: `Channel "${channelName}" not found` };
        
        const category = context.guild.channels.cache.find(c => 
          c.type === 4 && c.name.toLowerCase().includes(categoryName.toLowerCase())
        );
        if (!category) return { error: `Category "${categoryName}" not found` };
        
        const result = await moveChannel(channel, category.id, { executorId: context.userId, executorName: context.username });
        return { ...result, categoryName: category.name };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild) return `📁 I can only move channels in a server.`;
      if (result.needsInfo) return `📁 Usage: "Move channel general to category Text Channels"`;
      if (result.error) return `❌ ${result.error}`;
      return `📁 Moved **#${result.channel?.name}** to **${result.categoryName}**`;
    }
  },

  // ============ DISCORD CREATE ROLE ============
  'discord-create-role': {
    keywords: ['create role', 'make role', 'new role', 'add role'],
    plugin: 'server-admin',
    description: 'Create a new server role',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      if (!context.guild) return { needsGuild: true };
      
      let roleName = null;
      let roleColor = null;
      
      // Use AI to parse
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const prompt = `Parse a role creation command.

USER MESSAGE: "${query}"

Return ONLY JSON:
{
  "roleName": "name for the new role",
  "color": "hex color like #FF0000 or color name like 'red', 'blue', 'green', or null"
}

Examples:
- "create role VIP" → roleName: "VIP", color: null
- "make a red role called Admin" → roleName: "Admin", color: "#FF0000"
- "new role Moderator with blue color" → roleName: "Moderator", color: "#0000FF"`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt, options: { maxOutputTokens: 100, temperature: 0.1 }
          });
          
          const jsonMatch = result?.response?.text?.()?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            roleName = parsed.roleName;
            roleColor = parsed.color;
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for create role:', error.message);
      }
      
      if (!roleName) return { needsInfo: true };
      
      try {
        const roleOptions = { name: roleName, reason: `Created by ${context.username} via AI` };
        if (roleColor) roleOptions.color = roleColor;
        
        const role = await context.guild.roles.create(roleOptions);
        return { success: true, role: { name: role.name, color: role.hexColor, id: role.id } };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild) return `🎭 I can only create roles in a server.`;
      if (result.needsInfo) return `🎭 Usage: "Create role VIP" or "Create role Admin with red color"`;
      if (result.error) return `❌ ${result.error}`;
      return `🎭 Created role **${result.role?.name}**${result.role?.color !== '#000000' ? ` (${result.role?.color})` : ''}`;
    }
  },

  // ============ DISCORD DELETE ROLE ============
  'discord-delete-role': {
    keywords: ['delete role', 'remove role', 'destroy role'],
    plugin: 'server-admin',
    description: 'Delete a server role',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      if (!context.guild) return { needsGuild: true };
      
      const roles = context.guild.roles.cache.filter(r => r.name !== '@everyone' && !r.managed);
      let roleName = null;
      
      // Use AI to parse
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const prompt = `Parse a role deletion command.

USER MESSAGE: "${query}"

AVAILABLE ROLES: ${roles.map(r => r.name).slice(0, 30).join(', ')}

Return ONLY JSON:
{
  "roleName": "exact role name to delete from the list"
}`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt, options: { maxOutputTokens: 100, temperature: 0.1 }
          });
          
          const jsonMatch = result?.response?.text?.()?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            roleName = parsed.roleName;
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for delete role:', error.message);
      }
      
      if (!roleName) return { needsInfo: true, roles: roles.map(r => r.name).slice(0, 15) };
      
      try {
        const role = roles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
        if (!role) return { error: `Role "${roleName}" not found`, roles: roles.map(r => r.name).slice(0, 15) };
        
        const deletedName = role.name;
        await role.delete(`Deleted by ${context.username} via AI`);
        return { success: true, roleName: deletedName };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild) return `🎭 I can only delete roles in a server.`;
      if (result.needsInfo) {
        let response = `🎭 Which role should I delete?`;
        if (result.roles?.length > 0) response += `\n\n**Available roles:**\n${result.roles.map(r => `• ${r}`).join('\n')}`;
        return response;
      }
      if (result.error) {
        let response = `❌ ${result.error}`;
        if (result.roles?.length > 0) response += `\n\n**Available roles:**\n${result.roles.map(r => `• ${r}`).join('\n')}`;
        return response;
      }
      return `🗑️ Deleted role **${result.roleName}**`;
    }
  },

  // ============ DISCORD SET SERVER NAME ============
  'discord-set-server-name': {
    keywords: ['rename server', 'change server name', 'set server name', 'server name'],
    plugin: 'server-admin',
    description: 'Change the server name',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      if (!context.guild) return { needsGuild: true };
      
      let newName = null;
      
      // Use AI to parse
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const prompt = `Parse a server rename command.

USER MESSAGE: "${query}"
CURRENT SERVER NAME: "${context.guild.name}"

Return ONLY JSON:
{
  "newName": "the new server name"
}`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt, options: { maxOutputTokens: 100, temperature: 0.1 }
          });
          
          const jsonMatch = result?.response?.text?.()?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            newName = parsed.newName;
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for set server name:', error.message);
      }
      
      if (!newName) return { needsInfo: true };
      
      try {
        const oldName = context.guild.name;
        await context.guild.setName(newName, `Changed by ${context.username} via AI`);
        return { success: true, oldName, newName };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild) return `🏠 I can only rename servers in a server.`;
      if (result.needsInfo) return `🏠 Usage: "Rename server to My Awesome Server"`;
      if (result.error) return `❌ ${result.error}`;
      return `🏠 Renamed server **${result.oldName}** → **${result.newName}**`;
    }
  },

  // ============ DISCORD SET SERVER DESCRIPTION ============
  'discord-set-server-description': {
    keywords: ['server description', 'set server description', 'change server description'],
    plugin: 'server-admin',
    description: 'Set the server description',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      if (!context.guild) return { needsGuild: true };
      
      let description = null;
      
      // Use AI to parse
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const prompt = `Parse a server description command.

USER MESSAGE: "${query}"

Return ONLY JSON:
{
  "description": "the server description to set (max 120 chars)"
}`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt, options: { maxOutputTokens: 150, temperature: 0.1 }
          });
          
          const jsonMatch = result?.response?.text?.()?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            description = parsed.description;
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for set server description:', error.message);
      }
      
      if (!description) return { needsInfo: true };
      
      try {
        await context.guild.setDescription(description, `Set by ${context.username} via AI`);
        return { success: true, description };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild) return `🏠 I can only set descriptions in a server.`;
      if (result.needsInfo) return `🏠 Usage: "Set server description to Welcome to our community!"`;
      if (result.error) return `❌ ${result.error}`;
      return `🏠 Set server description: "${result.description}"`;
    }
  },

  // ============ DISCORD PURGE MESSAGES ============
  'discord-purge': {
    keywords: ['purge', 'delete messages', 'clear messages', 'bulk delete', 'clean chat', 'clear chat', 'remove messages'],
    plugin: 'server-admin',
    description: 'Bulk delete messages in a channel',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      if (!context.guild) return { needsGuild: true };
      if (!context.channel) return { error: 'No channel context' };
      
      let count = 10; // Default
      let targetUser = null;
      
      // Extract user mention
      const userMatch = query.match(/<@!?(\d+)>/);
      if (userMatch) targetUser = userMatch[1];
      
      // Use AI to parse count
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const prompt = `Parse a message purge/delete command.

USER MESSAGE: "${query}"

Return ONLY JSON:
{
  "count": number of messages to delete (1-100, default 10),
  "reason": "optional reason for deletion"
}

Examples:
- "purge 50 messages" → count: 50
- "delete last 20" → count: 20
- "clear chat" → count: 10
- "purge 100 spam messages" → count: 100, reason: "spam"`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt, options: { maxOutputTokens: 100, temperature: 0.1 }
          });
          
          const jsonMatch = result?.response?.text?.()?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.count) count = Math.min(100, Math.max(1, parsed.count));
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for purge:', error.message);
        // Fallback to regex
        const countMatch = query.match(/(\d+)/);
        if (countMatch) count = Math.min(100, Math.max(1, parseInt(countMatch[1])));
      }
      
      try {
        let messages = await context.channel.messages.fetch({ limit: count });
        
        // Filter by user if specified
        if (targetUser) {
          messages = messages.filter(m => m.author.id === targetUser);
        }
        
        // Filter out messages older than 14 days (Discord limitation)
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        messages = messages.filter(m => m.createdTimestamp > twoWeeksAgo);
        
        if (messages.size === 0) {
          return { error: 'No messages found to delete (messages older than 14 days cannot be bulk deleted)' };
        }
        
        const deleted = await context.channel.bulkDelete(messages, true);
        return { success: true, count: deleted.size, targetUser };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild) return `🗑️ I can only purge messages in a server.`;
      if (result.error) return `❌ ${result.error}`;
      let response = `🗑️ **Deleted ${result.count} messages**`;
      if (result.targetUser) response += ` from <@${result.targetUser}>`;
      return response;
    }
  },

  // ============ DISCORD ANNOUNCE ============
  'discord-announce': {
    keywords: ['announce', 'announcement', 'send announcement', 'make announcement', 'broadcast'],
    plugin: 'server-admin',
    description: 'Send an announcement message with embed',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      if (!context.guild) return { needsGuild: true };
      
      let title = null;
      let message = null;
      let color = '#5865F2'; // Discord blurple
      let channelName = null;
      
      // Use AI to parse
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        const channels = context.guild.channels.cache
          .filter(c => c.type === 0)
          .map(c => c.name).slice(0, 20);
        
        if (aiPlugin) {
          const prompt = `Parse an announcement command.

USER MESSAGE: "${query}"

AVAILABLE CHANNELS: ${channels.join(', ')}

Return ONLY JSON:
{
  "title": "announcement title (short, optional)",
  "message": "the announcement message content",
  "color": "hex color like #FF0000 or null for default blue",
  "channelName": "target channel name or null for current channel"
}

Examples:
- "announce Server maintenance tonight at 10pm" → title: "📢 Announcement", message: "Server maintenance tonight at 10pm"
- "announce in general: Welcome new members!" → channelName: "general", message: "Welcome new members!"`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt, options: { maxOutputTokens: 200, temperature: 0.1 }
          });
          
          const jsonMatch = result?.response?.text?.()?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            title = parsed.title || '📢 Announcement';
            message = parsed.message;
            if (parsed.color) color = parsed.color;
            channelName = parsed.channelName;
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for announce:', error.message);
      }
      
      if (!message) return { needsInfo: true };
      
      try {
        // Find target channel
        let targetChannel = context.channel;
        if (channelName) {
          const found = context.guild.channels.cache.find(c => 
            c.type === 0 && c.name.toLowerCase().includes(channelName.toLowerCase())
          );
          if (found) targetChannel = found;
        }
        
        // Create embed
        const { EmbedBuilder } = await import('discord.js');
        const embed = new EmbedBuilder()
          .setTitle(title || '📢 Announcement')
          .setDescription(message)
          .setColor(color)
          .setTimestamp()
          .setFooter({ text: `Announced by ${context.username}` });
        
        await targetChannel.send({ embeds: [embed] });
        return { success: true, channel: targetChannel.name, message };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild) return `📢 I can only send announcements in a server.`;
      if (result.needsInfo) return `📢 Usage: "Announce Server maintenance tonight" or "Announce in general: Welcome!"`;
      if (result.error) return `❌ ${result.error}`;
      return `📢 **Announcement sent** to #${result.channel}`;
    }
  },

  // ============ DISCORD CREATE INVITE ============
  'discord-create-invite': {
    keywords: ['create invite', 'make invite', 'invite link', 'generate invite', 'get invite', 'server invite'],
    plugin: 'server-admin',
    description: 'Create a server invite link',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      if (!context.guild) return { needsGuild: true };
      
      let maxAge = 86400; // 24 hours default
      let maxUses = 0; // Unlimited
      let temporary = false;
      
      // Use AI to parse options
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const prompt = `Parse an invite creation command.

USER MESSAGE: "${query}"

Return ONLY JSON:
{
  "maxAge": seconds until expiry (0 = never, 3600 = 1 hour, 86400 = 1 day, 604800 = 1 week),
  "maxUses": max number of uses (0 = unlimited),
  "temporary": true if temporary membership
}

Examples:
- "create invite" → maxAge: 86400, maxUses: 0
- "create permanent invite" → maxAge: 0, maxUses: 0
- "create invite for 10 uses" → maxUses: 10
- "create 1 hour invite" → maxAge: 3600
- "create temporary invite" → temporary: true`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt, options: { maxOutputTokens: 100, temperature: 0.1 }
          });
          
          const jsonMatch = result?.response?.text?.()?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.maxAge !== undefined) maxAge = parsed.maxAge;
            if (parsed.maxUses !== undefined) maxUses = parsed.maxUses;
            if (parsed.temporary !== undefined) temporary = parsed.temporary;
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for create invite:', error.message);
      }
      
      try {
        // Use the first text channel or current channel
        const channel = context.channel || context.guild.channels.cache.find(c => c.type === 0);
        if (!channel) return { error: 'No suitable channel found' };
        
        const invite = await channel.createInvite({
          maxAge,
          maxUses,
          temporary,
          reason: `Created by ${context.username} via AI`
        });
        
        return { 
          success: true, 
          url: invite.url,
          code: invite.code,
          maxAge: maxAge === 0 ? 'Never' : `${Math.floor(maxAge / 3600)} hours`,
          maxUses: maxUses === 0 ? 'Unlimited' : maxUses
        };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild) return `🔗 I can only create invites in a server.`;
      if (result.error) return `❌ ${result.error}`;
      return `🔗 **Invite Created!**\n\n` +
        `**Link:** ${result.url}\n` +
        `**Expires:** ${result.maxAge}\n` +
        `**Max Uses:** ${result.maxUses}`;
    }
  },

  // ============ DISCORD SET NICKNAME ============
  'discord-set-nickname': {
    keywords: ['set nickname', 'change nickname', 'nickname', 'set nick', 'change nick', 'rename user'],
    plugin: 'server-admin',
    description: 'Change a member\'s nickname',
    permission: 'admin',
    async execute(context) {
      const query = context.query || '';
      if (!context.guild) return { needsGuild: true };
      
      const userMatch = query.match(/<@!?(\d+)>/);
      if (!userMatch) return { needsUser: true };
      
      let nickname = null;
      
      // Use AI to parse nickname
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const aiPlugin = getPlugin('conversational-ai');
        
        if (aiPlugin) {
          const prompt = `Parse a nickname change command.

USER MESSAGE: "${query}"

Return ONLY JSON:
{
  "nickname": "the new nickname to set (or null to reset)"
}

Examples:
- "set nickname of @user to CoolGuy" → nickname: "CoolGuy"
- "change @user's nick to Admin Bob" → nickname: "Admin Bob"
- "reset @user's nickname" → nickname: null`;

          const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
            prompt, options: { maxOutputTokens: 100, temperature: 0.1 }
          });
          
          const jsonMatch = result?.response?.text?.()?.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            nickname = parsed.nickname;
          }
        }
      } catch (error) {
        logger.warn('AI parsing failed for set nickname:', error.message);
        // Fallback regex
        const nickMatch = query.match(/(?:to|as)\s+["']?([^"']+)["']?$/i);
        if (nickMatch) nickname = nickMatch[1].trim();
      }
      
      try {
        const member = await context.guild.members.fetch(userMatch[1]);
        const oldNick = member.nickname || member.user.username;
        
        await member.setNickname(nickname, `Changed by ${context.username} via AI`);
        
        return { 
          success: true, 
          member: member.user.tag,
          oldNick,
          newNick: nickname || member.user.username
        };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsGuild) return `📛 I can only change nicknames in a server.`;
      if (result.needsUser) return `📛 Who should I rename? "Set nickname of @user to NewName"`;
      if (result.error) return `❌ ${result.error}`;
      return `📛 Changed **${result.member}**'s nickname: **${result.oldNick}** → **${result.newNick}**`;
    }
  },

  // ============ NETWORK INSIGHTS ============
  'network-insights': {
    keywords: ['network insights', 'network analysis', 'analyze network', 'network report', 'network health'],
    plugin: 'network-insights',
    description: 'Generate AI-powered network insights and analysis',
    permission: 'admin',
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const insightsPlugin = getPlugin('network-insights');
      
      if (!insightsPlugin?.generateInsights) {
        return { error: 'Network insights plugin not available' };
      }
      
      try {
        const insight = await insightsPlugin.generateInsights();
        return { success: true, insight };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.error) {
        return `❌ Failed to generate insights: ${result.error}`;
      }
      
      return `**🧠 Network Insights**\n\n${result.insight?.insights || 'No insights available'}\n\n` +
        `_Devices: ${result.insight?.deviceCount || 0} | Speed tests: ${result.insight?.speedTestCount || 0}_`;
    }
  },

  // ============ DEVICE HEALTH ============
  'device-health': {
    keywords: ['device health', 'health report', 'device uptime', 'device reliability', 'unhealthy devices'],
    plugin: 'device-health',
    description: 'Get device health and uptime reports',
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const healthPlugin = getPlugin('device-health');
      
      if (!healthPlugin?.getHealthSummary) {
        return { error: 'Device health plugin not available' };
      }
      
      const summary = healthPlugin.getHealthSummary();
      const unhealthy = healthPlugin.getUnhealthyDevices();
      
      return { success: true, summary, unhealthy };
    },
    formatResult(result) {
      if (result.error) {
        return `❌ ${result.error}`;
      }
      
      const s = result.summary;
      let response = `**🏥 Device Health Summary**\n\n` +
        `📊 **Total Devices:** ${s.totalDevices}\n` +
        `✅ **Healthy (>90% uptime):** ${s.healthyDevices}\n` +
        `⚠️ **Unhealthy (<90% uptime):** ${s.unhealthyDevices}\n` +
        `📈 **Average Uptime:** ${s.averageUptime}%\n`;
      
      if (s.mostReliable) {
        response += `\n🏆 **Most Reliable:** ${s.mostReliable.name} (${s.mostReliable.uptimePercentage}%)`;
      }
      
      if (result.unhealthy?.length > 0) {
        response += `\n\n**⚠️ Devices Needing Attention:**\n`;
        response += result.unhealthy.slice(0, 5).map(d => 
          `• ${d.name}: ${d.uptimePercentage}% uptime`
        ).join('\n');
      }
      
      return response;
    }
  },

  // ============ SHUTDOWN/RESTART DEVICE ============
  'shutdown-device': {
    keywords: ['shutdown', 'turn off', 'power off', 'restart', 'reboot', 'shut down'],
    plugin: 'power-management',
    description: 'Shutdown or restart a remote device',
    permission: 'admin',
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const { deviceOps } = await import('../../../src/database/db.js');
      const query = context.query || '';
      const lowerQuery = query.toLowerCase();
      
      // Get all devices for AI context
      const devices = deviceOps.getAll();
      const availableDevices = devices.map(d => ({
        name: d.name || null,
        ip: d.ip,
        type: d.type || 'unknown',
        online: d.online
      }));
      
      let deviceId = null;
      let action = lowerQuery.includes('restart') || lowerQuery.includes('reboot') ? 'restart' : 'shutdown';
      
      // First try exact match
      deviceId = extractDeviceIdentifier(query);
      
      // If no exact match, use AI to fuzzy match
      if (!deviceId && query.length > 5) {
        try {
          const { getPlugin: getAIPlugin } = await import('../../../src/core/plugin-system.js');
          const aiPlugin = getAIPlugin('conversational-ai');
          
          if (aiPlugin && availableDevices.length > 0) {
            const prompt = `You are parsing a device shutdown/restart command.

USER MESSAGE: "${query}"

AVAILABLE DEVICES:
${availableDevices.map(d => `- "${d.name || d.ip}" (IP: ${d.ip}, Type: ${d.type}, ${d.online ? 'Online' : 'Offline'})`).join('\n')}

Return ONLY a JSON object:
{
  "deviceIdentifier": "exact device name or IP from the list",
  "action": "shutdown" or "restart",
  "confidence": "high", "medium", or "low"
}

MATCHING RULES:
- "shutdown my pc" → find device with type "pc" or name containing "pc"
- "restart the server" → find device with "server" in name or type, action: "restart"
- "turn off gaming" → find device with "gaming" in name, action: "shutdown"
- "reboot kusanagi" → find device named "kusanagi", action: "restart"
- Prefer online devices (they can be shut down)
- "shutdown", "turn off", "power off" → action: "shutdown"
- "restart", "reboot" → action: "restart"

Return ONLY the JSON, no other text.`;

            const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
              prompt,
              options: { maxOutputTokens: 150, temperature: 0.1 }
            });
            
            const responseText = result?.response?.text?.() || '';
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.deviceIdentifier && parsed.confidence !== 'low') {
                deviceId = parsed.deviceIdentifier;
                if (parsed.action) action = parsed.action;
                logger.info(`AI matched shutdown device: "${deviceId}", action=${action}`);
              } else if (parsed.confidence === 'low') {
                return {
                  needsDevice: true,
                  action,
                  availableDevices: availableDevices.filter(d => d.online).slice(0, 10),
                  aiUncertain: true
                };
              }
            }
          }
        } catch (error) {
          logger.warn('AI parsing failed for shutdown device:', error.message);
        }
      }
      
      if (!deviceId) {
        return { 
          needsDevice: true, 
          action,
          availableDevices: availableDevices.filter(d => d.online).slice(0, 10)
        };
      }
      
      // Find device with fuzzy matching
      let device = devices.find(d => 
        d.ip === deviceId ||
        d.mac?.toLowerCase() === deviceId.toLowerCase() ||
        d.name?.toLowerCase() === deviceId.toLowerCase()
      );
      
      // Try partial match
      if (!device) {
        device = devices.find(d => 
          d.name?.toLowerCase().includes(deviceId.toLowerCase()) ||
          deviceId.toLowerCase().includes(d.name?.toLowerCase() || '')
        );
      }
      
      if (!device) {
        return { 
          error: `Device "${deviceId}" not found`, 
          notFound: true,
          availableDevices: availableDevices.slice(0, 10)
        };
      }
      
      const powerPlugin = getPlugin('power-management');
      if (!powerPlugin?.powerControlDevice) {
        return { error: 'Power management plugin not available' };
      }
      
      try {
        await powerPlugin.powerControlDevice(device.mac, action);
        return { success: true, device: device.name || device.ip, action, aiParsed: true };
      } catch (error) {
        return { error: error.message, device: device.name || device.ip, action };
      }
    },
    formatResult(result) {
      if (result.needsDevice) {
        let response = `⚡ Which device would you like to ${result.action}?\n\n` +
          `Try: "${result.action} my PC" or "${result.action} the server"`;
        if (result.availableDevices?.length > 0) {
          response += `\n\n**Online devices:**\n${result.availableDevices.map(d => `• ${d.name || d.ip}`).join('\n')}`;
        }
        return response;
      }
      
      if (result.notFound) {
        let response = `❌ ${result.error}`;
        if (result.availableDevices?.length > 0) {
          response += `\n\n**Available devices:**\n${result.availableDevices.map(d => `• ${d.name || d.ip}`).join('\n')}`;
        }
        return response;
      }
      
      if (result.error) {
        return `❌ Failed to ${result.action} **${result.device}**: ${result.error}\n\n` +
          `_Note: Device must have shutdown API configured._`;
      }
      
      const emoji = result.action === 'restart' ? '🔄' : '⏹️';
      return `${emoji} **${result.action === 'restart' ? 'Restarting' : 'Shutting down'}** ${result.device}...`;
    }
  },

  // ============ LIST REMINDERS ============
  'reminder-list': {
    keywords: ['list reminders', 'show reminders', 'my reminders', 'view reminders', 'what reminders'],
    plugin: 'smart-reminders',
    description: 'List your active reminders',
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const reminderPlugin = getPlugin('smart-reminders');
      
      if (!reminderPlugin?.listReminders) {
        return { error: 'Smart reminders plugin not available' };
      }
      
      const reminders = await reminderPlugin.listReminders(context.userId);
      const active = reminders.filter(r => r.active);
      
      return { success: true, reminders: active, total: reminders.length };
    },
    formatResult(result) {
      if (result.error) {
        return `❌ ${result.error}`;
      }
      
      if (result.reminders.length === 0) {
        return `⏰ You don't have any active reminders.\n\n` +
          `Create one with: "Remind me in 30 minutes to check the server"`;
      }
      
      let response = `**⏰ Your Active Reminders (${result.reminders.length})**\n\n`;
      
      for (const r of result.reminders.slice(0, 10)) {
        const timeStr = r.type === 'recurring' 
          ? `Every ${r.interval}` 
          : new Date(r.triggerTime).toLocaleString();
        
        response += `• **${r.name || r.message?.substring(0, 30)}**\n`;
        response += `  ⏰ ${timeStr} | ID: \`${r.id}\`\n`;
      }
      
      if (result.reminders.length > 10) {
        response += `\n_...and ${result.reminders.length - 10} more_`;
      }
      
      return response;
    }
  },

  // ============ DELETE REMINDER ============
  'reminder-delete': {
    keywords: ['delete reminder', 'remove reminder', 'cancel reminder'],
    plugin: 'smart-reminders',
    description: 'Delete a reminder',
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const query = context.query || '';
      
      // Extract reminder ID
      const idMatch = query.match(/(\d{13,})/); // Timestamp-based IDs
      
      if (!idMatch) {
        return { needsId: true };
      }
      
      const reminderPlugin = getPlugin('smart-reminders');
      if (!reminderPlugin?.removeReminder) {
        return { error: 'Smart reminders plugin not available' };
      }
      
      try {
        const removed = await reminderPlugin.removeReminder(idMatch[1]);
        return { success: true, reminder: removed };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsId) {
        return `🗑️ Which reminder should I delete?\n\n` +
          `Use "list reminders" to see your reminders and their IDs, then:\n` +
          `"Delete reminder [ID]"`;
      }
      
      if (result.error) {
        return `❌ ${result.error}`;
      }
      
      return `✅ **Reminder Deleted**\n\n` +
        `Removed: "${result.reminder?.name || result.reminder?.message?.substring(0, 50)}"`;
    }
  },

  // ============ SPEED TEST HISTORY ============
  'speedtest-history': {
    keywords: ['speed history', 'speed test history', 'internet history', 'past speed tests', 'speed trends'],
    plugin: 'integrations',
    description: 'View speed test history and trends',
    async execute(context) {
      const { speedTestOps } = await import('../../../src/database/db.js');
      const history = speedTestOps.getRecent(20);
      
      if (!history || history.length === 0) {
        return { empty: true };
      }
      
      const avgDownload = history.reduce((sum, t) => sum + parseFloat(t.download), 0) / history.length;
      const avgUpload = history.reduce((sum, t) => sum + parseFloat(t.upload), 0) / history.length;
      const avgPing = history.reduce((sum, t) => sum + parseFloat(t.ping), 0) / history.length;
      
      return {
        success: true,
        count: history.length,
        avgDownload: avgDownload.toFixed(2),
        avgUpload: avgUpload.toFixed(2),
        avgPing: avgPing.toFixed(0),
        latest: history[0]
      };
    },
    formatResult(result) {
      if (result.empty) {
        return `📊 No speed test history found. Run "speed test" first!`;
      }
      
      return `**📊 Speed Test History**\n\n` +
        `📈 **${result.count} tests recorded**\n\n` +
        `⬇️ **Avg Download:** ${result.avgDownload} Mbps\n` +
        `⬆️ **Avg Upload:** ${result.avgUpload} Mbps\n` +
        `📶 **Avg Ping:** ${result.avgPing} ms\n\n` +
        `_Latest: ${result.latest?.download} Mbps down_`;
    }
  },

  // ============ DEVICE GROUPS ============
  'device-groups': {
    keywords: ['device groups', 'list groups', 'show groups', 'what groups'],
    plugin: 'device-management',
    description: 'List device groups',
    async execute() {
      const { deviceOps } = await import('../../../src/database/db.js');
      const groups = deviceOps.getAllGroups();
      
      if (!groups || groups.length === 0) {
        return { empty: true };
      }
      
      const groupData = groups.map(g => {
        const devices = deviceOps.getByGroup(g);
        const online = devices.filter(d => d.online).length;
        return { name: g, total: devices.length, online };
      });
      
      return { success: true, groups: groupData };
    },
    formatResult(result) {
      if (result.empty) {
        return `📁 No device groups found.\n\nCreate one with: "Add device X to group Gaming"`;
      }
      
      const list = result.groups.map(g => 
        `📁 **${g.name}** - ${g.total} devices (${g.online} online)`
      ).join('\n');
      
      return `**📁 Device Groups**\n\n${list}`;
    }
  },

  'device-group-view': {
    keywords: ['devices in group', 'show group', 'group devices', 'whats in group', 'list group'],
    plugin: 'device-management',
    description: 'View devices in a specific group',
    async execute(context) {
      const { deviceOps } = await import('../../../src/database/db.js');
      const query = context.query || '';
      
      // Get all groups for AI context
      const allGroups = deviceOps.getAllGroups() || [];
      
      let groupName = null;
      
      // Use AI to fuzzy match group name
      if (allGroups.length > 0) {
        try {
          const { getPlugin } = await import('../../../src/core/plugin-system.js');
          const aiPlugin = getPlugin('conversational-ai');
          
          if (aiPlugin) {
            const prompt = `You are parsing a device group query. Match the requested group to available groups.

USER MESSAGE: "${query}"

AVAILABLE GROUPS:
${allGroups.map(g => `- "${g}"`).join('\n')}

Return ONLY a JSON object:
{
  "groupName": "exact group name from the list that best matches",
  "confidence": "high", "medium", or "low"
}

MATCHING RULES:
- "show gaming group" → find group with "gaming" in name
- "devices in servers" → find group with "server" in name
- "what's in IoT" → find group with "iot" in name
- Match case-insensitively
- Partial matches are OK

Return ONLY the JSON, no other text.`;

            const { result } = await aiPlugin.requestFromCore('gemini-generate', { 
              prompt,
              options: { maxOutputTokens: 100, temperature: 0.1 }
            });
            
            const responseText = result?.response?.text?.() || '';
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.groupName && parsed.confidence !== 'low') {
                groupName = parsed.groupName;
                logger.info(`AI matched group: "${groupName}"`);
              }
            }
          }
        } catch (error) {
          logger.warn('AI parsing failed for group view:', error.message);
        }
      }
      
      // Fallback to regex
      if (!groupName) {
        const match = query.match(/(?:in\s+group|show\s+group|group|in)\s+["']?([a-zA-Z0-9_\-\s]+)["']?/i);
        if (match) {
          groupName = match[1].trim();
        }
      }
      
      if (!groupName) {
        return { needsGroup: true, availableGroups: allGroups };
      }
      
      // Try exact match first, then fuzzy
      let devices = deviceOps.getByGroup(groupName);
      
      if ((!devices || devices.length === 0) && allGroups.length > 0) {
        // Try fuzzy match
        const fuzzyMatch = allGroups.find(g => 
          g.toLowerCase().includes(groupName.toLowerCase()) ||
          groupName.toLowerCase().includes(g.toLowerCase())
        );
        if (fuzzyMatch) {
          groupName = fuzzyMatch;
          devices = deviceOps.getByGroup(groupName);
        }
      }
      
      if (!devices || devices.length === 0) {
        return { notFound: true, groupName, availableGroups: allGroups };
      }
      
      return { success: true, groupName, devices, aiParsed: true };
    },
    formatResult(result) {
      if (result.needsGroup) {
        let response = `📁 Which group would you like to see?`;
        if (result.availableGroups?.length > 0) {
          response += `\n\n**Available groups:**\n${result.availableGroups.map(g => `• ${g}`).join('\n')}`;
        }
        response += `\n\nTry: "Show group Gaming" or "Devices in Servers"`;
        return response;
      }
      
      if (result.notFound) {
        let response = `📁 No devices found in group "${result.groupName}"`;
        if (result.availableGroups?.length > 0) {
          response += `\n\n**Available groups:**\n${result.availableGroups.map(g => `• ${g}`).join('\n')}`;
        }
        return response;
      }
      
      const list = result.devices.slice(0, 10).map(d => {
        const status = d.online ? '🟢' : '🔴';
        const emoji = d.emoji || '📱';
        return `${status} ${emoji} ${d.name || d.ip}`;
      }).join('\n');
      
      return `**📁 Group: ${result.groupName}**\n\n${list}` +
        (result.devices.length > 10 ? `\n\n_...and ${result.devices.length - 10} more_` : '');
    }
  },

  // ============ SCHEDULED TASKS ============
  'scheduled-tasks': {
    keywords: ['scheduled tasks', 'list tasks', 'show tasks', 'automation tasks', 'cron jobs'],
    plugin: 'automation',
    description: 'List scheduled automation tasks',
    async execute() {
      const { taskOps } = await import('../../../src/database/db.js');
      const tasks = taskOps.getAll();
      
      if (!tasks || tasks.length === 0) {
        return { empty: true };
      }
      
      return { success: true, tasks };
    },
    formatResult(result) {
      if (result.empty) {
        return `⏰ No scheduled tasks found.\n\nUse \`/automation schedule\` to create one.`;
      }
      
      const list = result.tasks.slice(0, 10).map(t => {
        const status = t.enabled ? '🟢' : '🔴';
        return `${status} **${t.name}** - \`${t.cron_expression}\`\n   Command: ${t.command}`;
      }).join('\n\n');
      
      return `**⏰ Scheduled Tasks**\n\n${list}`;
    }
  },

  // ============ GAME LEADERBOARD ============
  'game-leaderboard': {
    keywords: ['game leaderboard', 'leaderboard', 'top players', 'game scores', 'who is winning'],
    plugin: 'games',
    description: 'Show game leaderboard',
    async execute() {
      const { getGlobalLeaderboard } = await import('../../games/games/game-manager.js');
      const leaderboard = await getGlobalLeaderboard(10);
      
      if (!leaderboard || leaderboard.length === 0) {
        return { empty: true };
      }
      
      return { success: true, leaderboard };
    },
    formatResult(result) {
      if (result.empty) {
        return `🏆 No scores yet! Play some games to get on the leaderboard.`;
      }
      
      const medals = ['🥇', '🥈', '🥉'];
      const list = result.leaderboard.map((p, i) => {
        const medal = medals[i] || `${i + 1}.`;
        return `${medal} <@${p.odId}> - **${p.totalPoints}** pts (${p.gamesWon} wins)`;
      }).join('\n');
      
      return `**🏆 Game Leaderboard**\n\n${list}`;
    }
  },

  // ============ SPEED ALERTS ============
  'speed-alert-config': {
    keywords: ['speed alert', 'set speed threshold', 'alert when slow', 'speed notification'],
    plugin: 'speed-alerts',
    description: 'Configure speed alerts',
    permission: 'admin',
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const plugin = getPlugin('speed-alerts');
      
      if (!plugin) {
        return { error: 'Speed alerts plugin not available' };
      }
      
      const settings = await plugin.getSettings();
      return { success: true, settings };
    },
    formatResult(result) {
      if (result.error) {
        return `❌ ${result.error}`;
      }
      
      const s = result.settings;
      return `**🚨 Speed Alert Settings**\n\n` +
        `📊 **Threshold:** ${s.threshold} Mbps\n` +
        `📢 **Channel:** ${s.alertChannel ? `<#${s.alertChannel}>` : 'Not set'}\n` +
        `✅ **Status:** ${s.enabled ? 'Enabled' : 'Disabled'}\n\n` +
        `_Use \`/automation speedalert config\` to change settings_`;
    }
  },

  // ============ DEVICE TRIGGERS LIST ============
  'device-triggers-list': {
    keywords: ['device triggers', 'list triggers', 'my triggers', 'automation triggers'],
    plugin: 'device-triggers',
    description: 'List device automation triggers',
    async execute(context) {
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const triggersPlugin = getPlugin('device-triggers');
        
        if (!triggersPlugin?.listTriggers) {
          return { error: 'Device triggers plugin not available' };
        }
        
        const triggers = await triggersPlugin.listTriggers(context.userId);
        
        if (!triggers || triggers.length === 0) {
          return { empty: true };
        }
        
        return { success: true, triggers };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.error) {
        return `❌ ${result.error}`;
      }
      
      if (result.empty) {
        return `🔔 No device triggers configured.\n\nUse \`/automation devicetrigger add\` to create one.`;
      }
      
      const list = result.triggers.slice(0, 8).map(t => {
        const status = t.enabled ? '✅' : '⚠️';
        return `${status} **${t.name}**\n   Event: ${t.event} → ${t.action.replace('_', ' ')}`;
      }).join('\n\n');
      
      return `**🔔 Device Triggers**\n\n${list}`;
    }
  },

  // ============ PERSONALITY ============
  'personality-change': {
    keywords: ['change personality', 'set personality', 'switch personality', 'be more', 'act like', 'personality to'],
    plugin: 'personality',
    description: 'Change bot personality style',
    async execute(context) {
      const query = context.query?.toLowerCase() || '';
      
      // Available personalities
      const personalities = {
        'maid': { name: 'Maid', emoji: '🌸' },
        'tsundere': { name: 'Tsundere', emoji: '💢' },
        'kuudere': { name: 'Kuudere', emoji: '❄️' },
        'dandere': { name: 'Dandere', emoji: '🥺' },
        'yandere': { name: 'Yandere', emoji: '🖤' },
        'genki': { name: 'Genki', emoji: '⭐' },
        'oneesan': { name: 'Onee-san', emoji: '💋' },
        'chuunibyou': { name: 'Chuunibyou', emoji: '🔮' },
        'butler': { name: 'Butler', emoji: '🎩' },
        'catgirl': { name: 'Catgirl', emoji: '🐱' }
      };
      
      // Try to detect which personality they want
      let selectedKey = null;
      for (const [key, info] of Object.entries(personalities)) {
        if (query.includes(key) || query.includes(info.name.toLowerCase())) {
          selectedKey = key;
          break;
        }
      }
      
      if (!selectedKey) {
        return { needsSelection: true, personalities };
      }
      
      // Set the personality
      try {
        const { configOps } = await import('../../../src/database/db.js');
        configOps.set(`personality_${context.userId}`, selectedKey);
        return { success: true, personality: personalities[selectedKey], key: selectedKey };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.needsSelection) {
        const list = Object.entries(result.personalities)
          .map(([key, info]) => `${info.emoji} **${info.name}**`)
          .join('\n');
        return `🎭 Which personality would you like?\n\n${list}\n\nSay "change personality to [name]"`;
      }
      
      if (result.error) {
        return `❌ Failed to change personality: ${result.error}`;
      }
      
      return `${result.personality.emoji} **Personality changed to ${result.personality.name}!**\n\n_Try chatting with me to see the difference~_`;
    }
  },

  'personality-list': {
    keywords: ['list personalities', 'show personalities', 'available personalities', 'what personalities'],
    plugin: 'personality',
    description: 'List available bot personalities',
    async execute(context) {
      const { configOps } = await import('../../../src/database/db.js');
      const currentKey = configOps.get(`personality_${context.userId}`) || 'maid';
      
      const personalities = [
        { key: 'maid', name: 'Maid', emoji: '🌸', desc: 'Polite and helpful' },
        { key: 'tsundere', name: 'Tsundere', emoji: '💢', desc: 'Reluctantly helpful' },
        { key: 'kuudere', name: 'Kuudere', emoji: '❄️', desc: 'Cool and composed' },
        { key: 'dandere', name: 'Dandere', emoji: '🥺', desc: 'Shy and quiet' },
        { key: 'yandere', name: 'Yandere', emoji: '🖤', desc: 'Obsessively devoted' },
        { key: 'genki', name: 'Genki', emoji: '⭐', desc: 'Energetic and cheerful' },
        { key: 'oneesan', name: 'Onee-san', emoji: '💋', desc: 'Mature and caring' },
        { key: 'chuunibyou', name: 'Chuunibyou', emoji: '🔮', desc: 'Dramatic and mystical' },
        { key: 'butler', name: 'Butler', emoji: '🎩', desc: 'Formal and refined' },
        { key: 'catgirl', name: 'Catgirl', emoji: '🐱', desc: 'Playful and cute' }
      ];
      
      return { personalities, currentKey };
    },
    formatResult(result) {
      const list = result.personalities.map(p => {
        const current = p.key === result.currentKey ? ' ← current' : '';
        return `${p.emoji} **${p.name}**${current}\n   _${p.desc}_`;
      }).join('\n');
      
      return `**🎭 Available Personalities**\n\n${list}\n\nSay "change personality to [name]" to switch!`;
    }
  },

  // ============ DEVICE HEALTH EXTENDED ============
  'device-health-summary': {
    keywords: ['health summary', 'network health summary', 'overall health', 'health overview'],
    plugin: 'device-health',
    description: 'Get health summary for all devices',
    async execute() {
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const healthPlugin = getPlugin('device-health');
        
        if (!healthPlugin?.getHealthSummary) {
          return { error: 'Device health plugin not available' };
        }
        
        const summary = healthPlugin.getHealthSummary();
        return { success: true, summary };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.error) {
        return `❌ ${result.error}`;
      }
      
      const s = result.summary;
      if (s.totalDevices === 0) {
        return `📊 No health data available. Run a network scan first!`;
      }
      
      let response = `**📊 Network Health Summary**\n\n`;
      response += `📱 **Total Devices:** ${s.totalDevices}\n`;
      response += `📈 **Average Uptime:** ${s.averageUptime}%\n`;
      response += `✅ **Healthy (≥90%):** ${s.healthyDevices}\n`;
      response += `⚠️ **Unhealthy (<90%):** ${s.unhealthyDevices}\n`;
      
      if (s.mostReliable) {
        response += `\n🏆 **Most Reliable:** ${s.mostReliable.name} (${s.mostReliable.uptimePercentage}%)`;
      }
      if (s.leastReliable) {
        response += `\n⚠️ **Needs Attention:** ${s.leastReliable.name} (${s.leastReliable.uptimePercentage}%)`;
      }
      
      return response;
    }
  },

  'device-health-unhealthy': {
    keywords: ['unhealthy devices', 'problem devices', 'devices with issues', 'unreliable devices'],
    plugin: 'device-health',
    description: 'List devices with poor health',
    async execute() {
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const healthPlugin = getPlugin('device-health');
        
        if (!healthPlugin?.getUnhealthyDevices) {
          return { error: 'Device health plugin not available' };
        }
        
        const unhealthy = healthPlugin.getUnhealthyDevices();
        return { success: true, devices: unhealthy };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.error) {
        return `❌ ${result.error}`;
      }
      
      if (!result.devices || result.devices.length === 0) {
        return `✅ All devices are healthy! (≥90% uptime)`;
      }
      
      const list = result.devices.slice(0, 10).map(d => 
        `🔴 **${d.name}** - ${d.uptimePercentage}% uptime (${d.offlineIncidents} incidents)`
      ).join('\n');
      
      return `**⚠️ Unhealthy Devices (<90% uptime)**\n\n${list}\n\n_${result.devices.length} device(s) need attention_`;
    }
  },

  'device-health-reliable': {
    keywords: ['reliable devices', 'best devices', 'most stable', 'highest uptime'],
    plugin: 'device-health',
    description: 'List most reliable devices',
    async execute() {
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const healthPlugin = getPlugin('device-health');
        
        if (!healthPlugin?.getMostReliableDevices) {
          return { error: 'Device health plugin not available' };
        }
        
        const reliable = healthPlugin.getMostReliableDevices();
        return { success: true, devices: reliable };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.error) {
        return `❌ ${result.error}`;
      }
      
      if (!result.devices || result.devices.length === 0) {
        return `❌ No devices with >99% uptime found`;
      }
      
      const list = result.devices.slice(0, 10).map(d => 
        `🟢 **${d.name}** - ${d.uptimePercentage}% uptime (${d.averageResponseTime}ms avg)`
      ).join('\n');
      
      return `**🏆 Most Reliable Devices (>99% uptime)**\n\n${list}\n\n_${result.devices.length} rock-solid device(s)_`;
    }
  },

  'device-health-alerts': {
    keywords: ['health alerts', 'predictive alerts', 'device warnings', 'unusual behavior'],
    plugin: 'device-health',
    description: 'Check for predictive health alerts',
    async execute() {
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const healthPlugin = getPlugin('device-health');
        
        if (!healthPlugin?.checkPredictiveAlerts) {
          return { error: 'Device health plugin not available' };
        }
        
        const alerts = await healthPlugin.checkPredictiveAlerts();
        return { success: true, alerts };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.error) {
        return `❌ ${result.error}`;
      }
      
      if (!result.alerts || result.alerts.length === 0) {
        return `✅ No predictive alerts. All devices are behaving normally.`;
      }
      
      const list = result.alerts.map(a => 
        `⚠️ **${a.device}** - offline for ${a.offlineDuration} min (usually ${a.uptimePercentage}% uptime)`
      ).join('\n');
      
      return `**🔮 Predictive Alerts**\n\n${list}\n\n_${result.alerts.length} unusual behavior(s) detected_`;
    }
  },

  // ============ NETWORK INSIGHTS HISTORY ============
  'network-insights-history': {
    keywords: ['insights history', 'past insights', 'previous insights', 'network analysis history'],
    plugin: 'network-insights',
    description: 'View past network insights',
    async execute() {
      try {
        const { getPlugin } = await import('../../../src/core/plugin-system.js');
        const insightsPlugin = getPlugin('network-insights');
        
        if (!insightsPlugin?.getInsightHistory) {
          return { error: 'Network insights plugin not available' };
        }
        
        const history = await insightsPlugin.getInsightHistory(5);
        return { success: true, history };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.error) {
        return `❌ ${result.error}`;
      }
      
      if (!result.history || result.history.length === 0) {
        return `📚 No insights history available. Say "analyze network" to generate insights.`;
      }
      
      const list = result.history.map((insight, i) => {
        const date = new Date(insight.timestamp).toLocaleDateString();
        const preview = insight.insights.split('\n')[0].substring(0, 80);
        return `**${i + 1}. ${date}**\n${preview}...`;
      }).join('\n\n');
      
      return `**📚 Network Insights History**\n\n${list}`;
    }
  },

  // ============ PLUGIN MANAGEMENT ============
  'plugin-list': {
    keywords: ['list plugins', 'show plugins', 'what plugins', 'loaded plugins', 'available plugins'],
    plugin: 'core',
    description: 'List loaded plugins',
    async execute() {
      try {
        const { getLoadedPlugins } = await import('../../../src/core/plugin-system.js');
        const plugins = getLoadedPlugins();
        return { success: true, plugins };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.error) {
        return `❌ ${result.error}`;
      }
      
      const enabled = result.plugins.filter(p => p.enabled);
      const disabled = result.plugins.filter(p => !p.enabled);
      
      let response = `**🔌 Loaded Plugins (${result.plugins.length})**\n\n`;
      
      response += `**✅ Enabled (${enabled.length}):**\n`;
      response += enabled.slice(0, 12).map(p => `• ${p.name} v${p.version}`).join('\n');
      if (enabled.length > 12) response += `\n...and ${enabled.length - 12} more`;
      
      if (disabled.length > 0) {
        response += `\n\n**❌ Disabled (${disabled.length}):**\n`;
        response += disabled.map(p => `• ${p.name}`).join('\n');
      }
      
      return response;
    }
  },

  'plugin-stats': {
    keywords: ['plugin stats', 'plugin statistics', 'plugin info'],
    plugin: 'core',
    description: 'Show plugin statistics',
    async execute() {
      try {
        const { getPluginStats } = await import('../../../src/core/plugin-system.js');
        const stats = getPluginStats();
        return { success: true, stats };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.error) {
        return `❌ ${result.error}`;
      }
      
      const s = result.stats;
      return `**📊 Plugin Statistics**\n\n` +
        `📦 **Total:** ${s.total}\n` +
        `✅ **Enabled:** ${s.enabled}\n` +
        `❌ **Disabled:** ${s.disabled}\n` +
        `📋 **With Commands:** ${s.withCommands}`;
    }
  },

  // ============ DASHBOARD ============
  'dashboard-url': {
    keywords: ['dashboard', 'web dashboard', 'dashboard url', 'open dashboard', 'web interface'],
    plugin: 'core',
    description: 'Get web dashboard URL',
    async execute() {
      const port = process.env.DASHBOARD_PORT || 3000;
      const host = process.env.DASHBOARD_HOST || 'localhost';
      return { 
        success: true, 
        url: `http://${host}:${port}`,
        port 
      };
    },
    formatResult(result) {
      return `**🌐 Web Dashboard**\n\n` +
        `🔗 **URL:** ${result.url}\n\n` +
        `**Features:**\n` +
        `• Real-time device monitoring\n` +
        `• Speed test history graphs\n` +
        `• Scheduled task management\n` +
        `• Plugin management\n` +
        `• Log viewing (admin)\n\n` +
        `🔐 Default: \`admin\` / \`admin123\``;
    }
  },

  // ============ TAILSCALE STATUS ============
  'tailscale-status': {
    keywords: ['tailscale', 'tailscale status', 'vpn status', 'tailscale devices'],
    plugin: 'network-management',
    description: 'Check Tailscale VPN status',
    async execute() {
      try {
        const { isTailscaleAvailable, getTailscaleStatus } = await import('../../network-management/scanner.js');
        
        const available = await isTailscaleAvailable();
        if (!available) {
          return { available: false };
        }
        
        const status = await getTailscaleStatus();
        return { success: true, available: true, status };
      } catch (error) {
        return { error: error.message };
      }
    },
    formatResult(result) {
      if (result.error) {
        return `❌ ${result.error}`;
      }
      
      if (!result.available) {
        return `📡 Tailscale is not available on this system.`;
      }
      
      const s = result.status;
      if (!s) {
        return `📡 Tailscale is installed but status unavailable.`;
      }
      
      let response = `**📡 Tailscale Status**\n\n`;
      response += `🔗 **Connected:** ${s.BackendState === 'Running' ? 'Yes' : 'No'}\n`;
      
      if (s.Self) {
        response += `🖥️ **This Device:** ${s.Self.HostName}\n`;
        response += `🌐 **Tailscale IP:** ${s.Self.TailscaleIPs?.[0] || 'N/A'}\n`;
      }
      
      if (s.Peer && Object.keys(s.Peer).length > 0) {
        const peers = Object.values(s.Peer);
        const online = peers.filter(p => p.Online).length;
        response += `\n👥 **Peers:** ${online}/${peers.length} online`;
      }
      
      return response;
    }
  }
};

/**
 * Action Executor class
 */
export class ActionExecutor {
  constructor(config = {}) {
    this.enabled = config.enabled !== false;
    this.client = config.client || null;
  }

  /**
   * Set Discord client reference
   */
  setClient(client) {
    this.client = client;
  }

  /**
   * Detect if a message requests an action
   * @param {string} query - User's message
   * @param {Object} context - Additional context
   * @returns {Promise<Object|null>} Detected action or null
   */
  async detectAction(query, context = {}) {
    if (!this.enabled || !query) return null;
    
    try {
      // Use AI-based intent classification
      const { classifyIntent, mapActionToExecutor } = await import('../utils/ai-intent-classifier.js');
      
      const classification = await classifyIntent(query, context);
      
      // If classified as conversation, return null (let normal chat handle it)
      if (classification.action === 'conversation') {
        return null;
      }
      
      // Map the classified action to the executor action ID
      const actionId = mapActionToExecutor(classification.action);
      
      // Find the action in ACTIONS or registered actions
      let action = ACTIONS[actionId];
      
      // If not found in built-in actions, check registered actions
      if (!action) {
        try {
          const { getAction } = await import('../context/action-registry.js');
          action = getAction(actionId);
        } catch (e) {
          // Registry not available
        }
      }
      
      if (!action) {
        // Action not found, but AI classified it - log for debugging
        this.logger?.debug?.(`AI classified as ${actionId} but action not found`);
        return null;
      }
      
      return {
        id: actionId,
        action,
        confidence: classification.confidence,
        reason: classification.reason,
        source: classification.source || 'ai'
      };
      
    } catch (error) {
      // If AI classification fails, fall back to keyword matching
      this.logger?.warn?.(`AI classification failed, using fallback: ${error.message}`);
      return this.detectActionFallback(query);
    }
  }

  /**
   * Fallback keyword-based action detection (used when AI is unavailable)
   * @param {string} query - User's message
   * @returns {Object|null} Detected action or null
   */
  detectActionFallback(query) {
    if (!query) return null;
    
    const lowerQuery = query.toLowerCase();
    
    // Check all built-in actions
    for (const [actionId, action] of Object.entries(ACTIONS)) {
      for (const keyword of action.keywords) {
        if (lowerQuery.includes(keyword)) {
          return {
            id: actionId,
            action,
            keyword,
            confidence: this.calculateConfidence(lowerQuery, keyword),
            source: 'fallback'
          };
        }
      }
    }
    
    // Check dynamically registered actions
    try {
      const { detectRegisteredAction } = require('../context/action-registry.js');
      const registered = detectRegisteredAction(query);
      if (registered) {
        return {
          ...registered,
          confidence: this.calculateConfidence(lowerQuery, registered.keyword),
          source: 'fallback'
        };
      }
    } catch (e) {
      // Registry not available, skip
    }
    
    return null;
  }

  /**
   * Calculate confidence score for action detection
   */
  calculateConfidence(query, keyword) {
    // Higher confidence for exact matches or question patterns
    let confidence = 0.7;
    
    if (query.includes('?')) confidence += 0.1;
    if (query.startsWith(keyword)) confidence += 0.1;
    if (query.includes('please') || query.includes('can you')) confidence += 0.1;
    
    return Math.min(1, confidence);
  }

  /**
   * Check if the required plugin is available
   */
  async isPluginAvailable(pluginName) {
    if (pluginName === 'core') return true;
    
    try {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const plugin = getPlugin(pluginName);
      return plugin?.enabled !== false;
    } catch {
      return false;
    }
  }

  /**
   * Check if user has permission to execute an action
   * Uses the existing auth system from src/auth/auth.js
   * 
   * @param {Object} action - Action definition
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Permission check result
   */
  async checkPermission(action, context) {
    // Get permission requirement from action
    // Can be: 'everyone', 'viewer', 'operator', 'admin', or a specific PERMISSION constant
    const permission = action.permission || (action.adminOnly ? 'admin' : 'everyone');
    
    // Everyone can use 'everyone' actions
    if (permission === 'everyone') {
      return { allowed: true };
    }
    
    const userId = context.userId;
    const member = context.member || context.message?.member;
    
    // Try to get user's role from the database (Discord user config)
    let userRole = null;
    try {
      const { configOps } = await import('../../../src/database/db.js');
      const discordUserConfig = configOps.get(`discord_user_${userId}`);
      if (discordUserConfig) {
        const config = JSON.parse(discordUserConfig);
        userRole = config.role;
      }
    } catch (e) {
      // Database not available
    }
    
    // Import auth system
    let ROLES, PERMISSIONS, hasPermission;
    try {
      const auth = await import('../../../src/auth/auth.js');
      ROLES = auth.ROLES;
      PERMISSIONS = auth.PERMISSIONS;
      hasPermission = auth.hasPermission;
    } catch (e) {
      // Auth not available, fall back to Discord permissions
      return this.checkDiscordPermission(permission, userId, member);
    }
    
    // Check if permission is a specific PERMISSION constant
    if (Object.values(PERMISSIONS).includes(permission)) {
      // Use the auth system's hasPermission
      if (userRole && hasPermission(userRole, permission)) {
        return { allowed: true };
      }
      // Fall back to Discord admin check
      const isOwner = process.env.BOT_OWNER_ID === userId;
      const hasAdminPerm = member?.permissions?.has?.('Administrator');
      if (isOwner || hasAdminPerm) {
        return { allowed: true };
      }
      return { allowed: false, reason: `🔒 This action requires the "${permission}" permission.` };
    }
    
    // Check role-based permissions
    if (permission === 'admin' || permission === ROLES?.ADMIN) {
      const isOwner = process.env.BOT_OWNER_ID === userId;
      const hasAdminPerm = member?.permissions?.has?.('Administrator');
      const isAdminRole = userRole === ROLES?.ADMIN;
      
      if (isOwner || hasAdminPerm || isAdminRole) {
        return { allowed: true };
      }
      return { allowed: false, reason: '🔒 This action requires administrator permissions.' };
    }
    
    if (permission === 'operator' || permission === ROLES?.OPERATOR) {
      const isOwner = process.env.BOT_OWNER_ID === userId;
      const hasAdminPerm = member?.permissions?.has?.('Administrator');
      const isOperatorOrHigher = userRole === ROLES?.ADMIN || userRole === ROLES?.OPERATOR;
      const hasModPerm = member?.permissions?.has?.('ManageMessages') || 
                         member?.permissions?.has?.('ModerateMembers');
      
      if (isOwner || hasAdminPerm || isOperatorOrHigher || hasModPerm) {
        return { allowed: true };
      }
      return { allowed: false, reason: '🔒 This action requires operator permissions.' };
    }
    
    if (permission === 'viewer' || permission === ROLES?.VIEWER) {
      // Viewer is the lowest role, most users should have this
      const isOwner = process.env.BOT_OWNER_ID === userId;
      const hasAnyRole = userRole !== null;
      
      if (isOwner || hasAnyRole) {
        return { allowed: true };
      }
      // For viewer, we're lenient - allow if they're in the server
      if (member) {
        return { allowed: true };
      }
      return { allowed: false, reason: '🔒 This action requires viewer permissions.' };
    }
    
    return { allowed: true };
  }

  /**
   * Fallback Discord permission check
   */
  checkDiscordPermission(permission, userId, member) {
    const isOwner = process.env.BOT_OWNER_ID === userId;
    
    if (permission === 'admin') {
      const hasAdminPerm = member?.permissions?.has?.('Administrator');
      if (isOwner || hasAdminPerm) {
        return { allowed: true };
      }
      return { allowed: false, reason: '🔒 This action requires administrator permissions.' };
    }
    
    if (permission === 'operator' || permission === 'moderator') {
      const hasModPerm = member?.permissions?.has?.('ManageMessages') || 
                         member?.permissions?.has?.('ModerateMembers') ||
                         member?.permissions?.has?.('Administrator');
      if (isOwner || hasModPerm) {
        return { allowed: true };
      }
      return { allowed: false, reason: '🔒 This action requires moderator permissions.' };
    }
    
    return { allowed: true };
  }

  /**
   * Execute an action
   * @param {string} actionId - Action identifier
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Execution result
   */
  async execute(actionId, context = {}) {
    // Check built-in actions first
    let action = ACTIONS[actionId];
    
    // If not found, check registry
    if (!action) {
      try {
        const { getAction } = require('../context/action-registry.js');
        action = getAction(actionId);
      } catch (e) {
        // Registry not available
      }
    }
    
    if (!action) {
      return { success: false, error: 'Unknown action' };
    }

    // Check plugin availability
    const available = await this.isPluginAvailable(action.plugin);
    if (!available) {
      return { 
        success: false, 
        error: `The ${action.plugin} plugin is not available`,
        suggestCommand: true
      };
    }

    // Check permissions
    const permCheck = await this.checkPermission(action, context);
    if (!permCheck.allowed) {
      return {
        success: false,
        error: permCheck.reason || 'Permission denied',
        permissionDenied: true
      };
    }

    try {
      logger.info(`Executing action: ${actionId} (user: ${context.userId})`);
      
      // Create progress callback for long-running actions
      let progressMessage = null;
      const sendProgress = async (progressText) => {
        if (context.message?.channel) {
          try {
            if (progressMessage) {
              // Edit existing progress message
              await progressMessage.edit(progressText);
            } else {
              // Send new progress message
              progressMessage = await context.message.channel.send(progressText);
            }
          } catch (e) {
            logger.debug('Failed to send progress update:', e.message);
          }
        }
      };
      
      // For long-running actions, send initial progress
      if (action.longRunning && context.message?.channel) {
        await sendProgress(`⏳ _Processing ${action.description || actionId}..._`);
      }
      
      const result = await action.execute({
        ...context,
        client: this.client,
        sendProgress
      });
      
      const formatted = action.formatResult(result);
      
      // Delete progress message if we sent one (the final result will be sent separately)
      if (progressMessage) {
        try {
          await progressMessage.delete();
        } catch (e) {
          // Message might already be deleted
        }
      }
      
      return {
        success: true,
        actionId,
        result,
        formatted,
        description: action.description,
        buttons: action.getButtons?.(result) || null
      };
    } catch (error) {
      logger.error(`Action execution failed: ${actionId}`, error);
      return {
        success: false,
        actionId,
        error: error.message,
        suggestCommand: true
      };
    }
  }

  /**
   * Process a user query and execute if action detected
   * Supports multiple actions in a single query (e.g., "rename X to A and Y to B")
   * @param {string} query - User's message
   * @param {Object} context - Additional context
   * @returns {Promise<Object|null>} Action result or null if no action
   */
  async processQuery(query, context = {}) {
    // First, check for multiple actions (compound commands)
    const multiResult = await this.processMultipleActions(query, context);
    if (multiResult) {
      return multiResult;
    }
    
    // Single action detection (now AI-powered)
    const detected = await this.detectAction(query, context);
    
    if (!detected) return null;
    
    // Only execute if confidence is high enough
    if (detected.confidence < 0.7) {
      return {
        detected: true,
        executed: false,
        action: detected.action,
        reason: 'low_confidence'
      };
    }

    const result = await this.execute(detected.id, {
      ...context,
      query
    });

    return {
      detected: true,
      executed: result.success,
      ...result
    };
  }

  /**
   * Process multiple actions in a single query
   * Handles patterns like "rename X to A and Y to B"
   * @param {string} query - User's message
   * @param {Object} context - Additional context
   * @returns {Promise<Object|null>} Combined result or null
   */
  async processMultipleActions(query, context = {}) {
    const results = [];
    
    // Check for multiple device renames
    // Pattern: "rename X to A and Y to B" or "X is A and Y is B"
    const renamePatterns = [
      // "rename 192.168.0.100 to Kusanagi and 192.168.0.200 to Madara"
      /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+(?:to|is)\s+([a-zA-Z0-9_\-]+)/gi,
      // "name device X to A"
      /(?:rename|name)\s+(\S+)\s+(?:to|as)\s+([a-zA-Z0-9_\-]+)/gi
    ];
    
    const renames = [];
    for (const pattern of renamePatterns) {
      let match;
      while ((match = pattern.exec(query)) !== null) {
        renames.push({ deviceId: match[1], newName: match[2] });
      }
    }
    
    // If we found multiple renames, execute them all
    if (renames.length > 1) {
      const { deviceOps } = await import('../../../src/database/db.js');
      const devices = deviceOps.getAll();
      
      for (const rename of renames) {
        const device = devices.find(d => 
          d.ip === rename.deviceId ||
          d.mac?.toLowerCase() === rename.deviceId.toLowerCase() ||
          d.name?.toLowerCase() === rename.deviceId.toLowerCase()
        );
        
        if (device) {
          const oldName = device.name || device.ip;
          deviceOps.upsert({ ...device, name: rename.newName });
          results.push({
            success: true,
            oldName,
            newName: rename.newName,
            ip: device.ip
          });
        } else {
          results.push({
            success: false,
            deviceId: rename.deviceId,
            newName: rename.newName,
            error: 'Device not found'
          });
        }
      }
      
      if (results.length > 0) {
        // Format combined results
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        let formatted = `**📝 Batch Rename Complete**\n\n`;
        
        for (const r of results) {
          if (r.success) {
            formatted += `✅ **${r.oldName}** → **${r.newName}** (${r.ip})\n`;
          } else {
            formatted += `❌ **${r.deviceId}** → ${r.newName}: ${r.error}\n`;
          }
        }
        
        formatted += `\n_${successCount} succeeded, ${failCount} failed_`;
        
        return {
          detected: true,
          executed: successCount > 0,
          success: successCount > 0,
          actionId: 'batch-rename',
          results,
          formatted,
          description: `Renamed ${successCount} device(s)`
        };
      }
    }
    
    // Check for multiple wake commands
    // Pattern: "wake X and Y" or "turn on X and Y"
    const wakePattern = /(?:wake|turn on|power on|boot)\s+(.+?)(?:\s+and\s+|\s*,\s*)/gi;
    const wakeTargets = [];
    let wakeMatch;
    
    // Simple check for "and" in wake commands
    if (/(?:wake|turn on|power on).+\s+and\s+/i.test(query)) {
      const targets = query.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|[a-zA-Z0-9_\-]+)/g);
      if (targets && targets.length > 1) {
        // Filter out command words
        const filtered = targets.filter(t => 
          !['wake', 'turn', 'on', 'power', 'boot', 'up', 'and', 'the', 'device'].includes(t.toLowerCase())
        );
        
        if (filtered.length > 1) {
          const { wakeDevice } = await import('../../network-management/commands.js');
          const { deviceOps } = await import('../../../src/database/db.js');
          const devices = deviceOps.getAll();
          
          for (const target of filtered) {
            const device = devices.find(d => 
              d.ip === target ||
              d.name?.toLowerCase() === target.toLowerCase()
            );
            
            if (device && device.mac) {
              try {
                await wakeDevice(device.mac);
                results.push({
                  success: true,
                  device: device.name || device.ip,
                  ip: device.ip,
                  mac: device.mac
                });
              } catch (e) {
                results.push({
                  success: false,
                  device: target,
                  error: e.message
                });
              }
            } else if (device && !device.mac) {
              results.push({
                success: false,
                device: device.name || device.ip,
                error: 'No MAC address'
              });
            } else {
              results.push({
                success: false,
                device: target,
                error: 'Device not found'
              });
            }
          }
          
          if (results.length > 0) {
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;
            
            let formatted = `**⚡ Batch Wake-on-LAN**\n\n`;
            
            for (const r of results) {
              if (r.success) {
                formatted += `✅ **${r.device}** - WOL sent\n`;
              } else {
                formatted += `❌ **${r.device}**: ${r.error}\n`;
              }
            }
            
            formatted += `\n_${successCount} packets sent, ${failCount} failed_`;
            
            return {
              detected: true,
              executed: successCount > 0,
              success: successCount > 0,
              actionId: 'batch-wake',
              results,
              formatted,
              description: `Woke ${successCount} device(s)`
            };
          }
        }
      }
    }
    
    return null;
  }
}

export default ActionExecutor;
