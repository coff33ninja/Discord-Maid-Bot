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
      const online = result.devices?.filter(d => d.online) || [];
      const offline = result.devices?.filter(d => !d.online) || [];
      
      // Helper to format device: "Name (IP)" if named, otherwise just IP
      const formatDevice = (d) => {
        const label = d.name ? `${d.name} (${d.ip})` : d.ip;
        const type = d.type ? ` [${d.type}]` : '';
        return `• ${label}${type}`;
      };
      
      let response = `I found **${result.count || result.devices?.length || 0}** devices on the network.\n\n`;
      
      if (online.length > 0) {
        response += `**�  Online (${online.length}):**\n`;
        response += online.slice(0, 10).map(formatDevice).join('\n');
        if (online.length > 10) response += `\n...and ${online.length - 10} more`;
        response += '\n\n';
      }
      
      if (offline.length > 0) {
        response += `**🔴 Offline (${offline.length}):**\n`;
        response += offline.slice(0, 5).map(formatDevice).join('\n');
        if (offline.length > 5) response += `\n...and ${offline.length - 5} more`;
      }
      
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
      
      // Extract device identifier from query
      const deviceId = extractDeviceIdentifier(context.query || '');
      
      if (!deviceId) {
        // List available devices that can be woken
        const devices = deviceOps.getAll().filter(d => d.mac && !d.online);
        return { 
          needsSelection: true, 
          devices: devices.slice(0, 10),
          message: 'Which device would you like to wake?'
        };
      }
      
      // Find device by IP, MAC, or name
      const devices = deviceOps.getAll();
      const device = devices.find(d => 
        d.ip === deviceId ||
        d.mac?.toLowerCase() === deviceId.toLowerCase() ||
        d.name?.toLowerCase() === deviceId.toLowerCase()
      );
      
      if (!device) {
        return { error: `Device "${deviceId}" not found`, notFound: true };
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
        }
      };
    },
    formatResult(result) {
      if (result.needsSelection) {
        let response = `${result.message}\n\n**Available devices:**\n`;
        if (result.devices.length === 0) {
          response += '_No offline devices with MAC addresses found._';
        } else {
          response += result.devices.map(d => `• ${d.name || d.ip} (${d.ip})`).join('\n');
        }
        response += '\n\nTry: "Wake up [device name or IP]"';
        return response;
      }
      
      if (result.notFound) {
        return `❌ ${result.error}\n\nTry "list devices" to see available devices.`;
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
      
      if (!integrationsPlugin?.speedtest?.runSpeedTest) {
        throw new Error('Speed test not available');
      }
      
      return await integrationsPlugin.speedtest.runSpeedTest();
    },
    formatResult(result) {
      return `**🚀 Speed Test Results:**\n\n` +
        `⬇️ **Download:** ${result.download?.toFixed(2) || 'N/A'} Mbps\n` +
        `⬆️ **Upload:** ${result.upload?.toFixed(2) || 'N/A'} Mbps\n` +
        `📶 **Ping:** ${result.ping?.toFixed(0) || 'N/A'} ms\n` +
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
    async execute() {
      return { showHelp: true };
    },
    formatResult() {
      return `Here's what I can do:\n\n` +
        `**🌐 Network:** Scan devices, check what's online, wake devices\n` +
        `**🚀 Speed Test:** Check your internet speed\n` +
        `**🎮 Games:** Play trivia, hangman, and more\n` +
        `**🔍 Research:** Look up topics\n` +
        `**🏠 Smart Home:** Control Home Assistant devices\n\n` +
        `Just ask me naturally! For example:\n` +
        `• "What devices are online?"\n` +
        `• "Run a speed test"\n` +
        `• "Let's play trivia"`;
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
      const query = context.query?.toLowerCase() || '';
      
      // Detect which game
      const gameMap = {
        'trivia': ['trivia', 'quiz'],
        'hangman': ['hangman', 'hang man'],
        'numguess': ['number', 'guess number', 'number guess'],
        'rps': ['rps', 'rock paper', 'rock-paper'],
        'tictactoe': ['tic tac', 'tictactoe', 'tic-tac'],
        'connect4': ['connect', 'connect 4', 'connect four'],
        'riddle': ['riddle', 'riddles'],
        'wordchain': ['word chain', 'wordchain'],
        '20questions': ['20 questions', 'twenty questions'],
        'emojidecode': ['emoji', 'decode'],
        'wouldyourather': ['would you rather', 'wyr'],
        'mathblitz': ['math', 'math blitz'],
        'reaction': ['reaction', 'reaction race'],
        'mafia': ['mafia']
      };
      
      let selectedGame = null;
      for (const [gameKey, keywords] of Object.entries(gameMap)) {
        if (keywords.some(kw => query.includes(kw))) {
          selectedGame = gameKey;
          break;
        }
      }
      
      // Default to trivia if no specific game mentioned
      if (!selectedGame && (query.includes('play') || query.includes('game'))) {
        selectedGame = 'trivia';
      }
      
      if (!selectedGame) {
        return { needsSelection: true };
      }
      
      return { 
        game: selectedGame, 
        message: context.message,
        channelId: context.channelId,
        requiresInteraction: true
      };
    },
    formatResult(result) {
      if (result.needsSelection) {
        return `🎮 Which game would you like to play?\n\n` +
          `Say "play trivia", "play hangman", "play riddles", etc.\n` +
          `Or use \`/game list\` to see all games!`;
      }
      
      if (result.requiresInteraction) {
        return `🎮 To start **${result.game}**, please use the slash command:\n\n` +
          `\`/game play game:${result.game}\`\n\n` +
          `_Games require Discord interactions for buttons and responses._`;
      }
      
      return `🎮 Starting ${result.game}...`;
    }
  },

  // ============ DEVICE MANAGEMENT ============
  'device-rename': {
    keywords: ['rename', 'name device', 'call device', 'set device name', 'change device name', ' is '],
    plugin: 'device-management',
    description: 'Rename a device',
    async execute(context) {
      const { deviceOps } = await import('../../../src/database/db.js');
      const query = context.query || '';
      
      // Try to extract device and new name
      // Patterns: "rename 192.168.0.100 to MyPC", "192.168.0.100 is Kusanagi"
      const patterns = [
        // "rename X to Y" patterns
        /rename\s+(\S+)\s+(?:to|as)\s+["']?([a-zA-Z0-9_\-]+)["']?/i,
        /name\s+(?:device\s+)?(\S+)\s+(?:to|as)\s+["']?([a-zA-Z0-9_\-]+)["']?/i,
        /call\s+(\S+)\s+["']?([a-zA-Z0-9_\-]+)["']?/i,
        /set\s+(?:device\s+)?name\s+(?:of\s+)?(\S+)\s+(?:to|as)\s+["']?([a-zA-Z0-9_\-]+)["']?/i,
        // "X is Y" pattern (e.g., "192.168.0.100 is Kusanagi")
        /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+is\s+["']?([a-zA-Z0-9_\-]+)["']?/i,
        // "device X is Y" pattern
        /(?:device\s+)?(\S+)\s+is\s+(?:called\s+)?["']?([a-zA-Z0-9_\-]+)["']?/i
      ];
      
      let deviceId = null;
      let newName = null;
      let deviceType = null;
      
      // Also try to extract device type (pc, server, phone, etc.)
      const typeMatch = query.match(/(?:it'?s?\s+a\s+|type\s+is\s+|is\s+a\s+)(\w+)/i);
      if (typeMatch) {
        deviceType = typeMatch[1].toLowerCase();
      }
      
      for (const pattern of patterns) {
        const match = query.match(pattern);
        if (match) {
          deviceId = match[1];
          newName = match[2].trim();
          break;
        }
      }
      
      if (!deviceId || !newName) {
        return { needsInfo: true };
      }
      
      // Find device
      const devices = deviceOps.getAll();
      const device = devices.find(d => 
        d.ip === deviceId ||
        d.mac?.toLowerCase() === deviceId.toLowerCase() ||
        d.name?.toLowerCase() === deviceId.toLowerCase()
      );
      
      if (!device) {
        return { error: `Device "${deviceId}" not found`, notFound: true };
      }
      
      // Update device with name and optionally type
      const oldName = device.name || device.ip;
      const updateData = { ...device, name: newName };
      if (deviceType) {
        updateData.type = deviceType;
      }
      deviceOps.upsert(updateData);
      
      return { success: true, oldName, newName, ip: device.ip, type: deviceType };
    },
    formatResult(result) {
      if (result.needsInfo) {
        return `📝 To rename a device, say:\n\n` +
          `"Rename 192.168.0.100 to MyPC"\n` +
          `"Name device KUSANAGI as Gaming PC"\n` +
          `"Name 192.168.0.200 to Madara and it's a PC"\n\n` +
          `Or use \`/device config\` for more options.`;
      }
      
      if (result.notFound) {
        return `❌ ${result.error}\n\nUse "list devices" to see available devices.`;
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
      
      return response;
    }
  },

  'device-emoji': {
    keywords: ['set emoji', 'device emoji', 'change emoji', 'add emoji'],
    plugin: 'device-management',
    description: 'Set device emoji',
    async execute(context) {
      const { deviceOps } = await import('../../../src/database/db.js');
      const query = context.query || '';
      
      // Extract emoji and device
      const emojiMatch = query.match(/(\p{Emoji})/u);
      const deviceMatch = query.match(/(?:for|on|to)\s+(\S+)/i) || query.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      
      if (!emojiMatch || !deviceMatch) {
        return { needsInfo: true };
      }
      
      const emoji = emojiMatch[1];
      const deviceId = deviceMatch[1];
      
      const devices = deviceOps.getAll();
      const device = devices.find(d => 
        d.ip === deviceId ||
        d.name?.toLowerCase() === deviceId.toLowerCase()
      );
      
      if (!device) {
        return { error: `Device "${deviceId}" not found`, notFound: true };
      }
      
      deviceOps.upsert({ ...device, emoji });
      
      return { success: true, device: device.name || device.ip, emoji };
    },
    formatResult(result) {
      if (result.needsInfo) {
        return `🎨 To set a device emoji, say:\n\n` +
          `"Set emoji 🎮 for KUSANAGI"\n` +
          `"Add emoji 💻 to 192.168.0.100"`;
      }
      
      if (result.notFound) {
        return `❌ ${result.error}`;
      }
      
      return `✅ Set emoji ${result.emoji} for **${result.device}**`;
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

  // ============ REMINDERS ============
  'reminder-set': {
    keywords: ['remind me', 'set reminder', 'reminder for', 'remember to', "don't let me forget"],
    plugin: 'smart-reminders',
    description: 'Set a reminder',
    async execute(context) {
      // Reminders need slash commands for proper scheduling
      return { 
        requiresSlashCommand: true,
        query: context.query
      };
    },
    formatResult(result) {
      return `⏰ To set a reminder, please use:\n\n` +
        `\`/bot reminder set\`\n\n` +
        `This allows you to set the exact time and message for your reminder.`;
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
   * @returns {Object|null} Detected action or null
   */
  detectAction(query) {
    if (!this.enabled || !query) return null;
    
    const lowerQuery = query.toLowerCase();
    
    // First check built-in actions
    for (const [actionId, action] of Object.entries(ACTIONS)) {
      for (const keyword of action.keywords) {
        if (lowerQuery.includes(keyword)) {
          return {
            id: actionId,
            action,
            keyword,
            confidence: this.calculateConfidence(lowerQuery, keyword),
            source: 'builtin'
          };
        }
      }
    }
    
    // Then check dynamically registered actions
    try {
      const { detectRegisteredAction } = require('../context/action-registry.js');
      const registered = detectRegisteredAction(query);
      if (registered) {
        return {
          ...registered,
          confidence: this.calculateConfidence(lowerQuery, registered.keyword)
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
      
      const result = await action.execute({
        ...context,
        client: this.client
      });
      
      const formatted = action.formatResult(result);
      
      return {
        success: true,
        actionId,
        result,
        formatted,
        description: action.description
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
    
    // Single action detection
    const detected = this.detectAction(query);
    
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
