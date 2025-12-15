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
        `**🏠 Smart Home:** Control Home Assistant devices\n` +
        `**🖥️ Server Admin:** Check status, view logs, restart, deploy\n\n` +
        `Just ask me naturally! For example:\n` +
        `• "What devices are online?"\n` +
        `• "Run a speed test"\n` +
        `• "Let's play trivia"\n` +
        `• "Is the bot running?"\n` +
        `• "Show server logs"`;
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
      let rewrittenMessage = parsed.message || 'Reminder';
      try {
        const { rewriteReminderMessage } = await import('../utils/message-rewriter.js');
        rewrittenMessage = await rewriteReminderMessage(parsed.message, {
          senderName: context.username || 'Someone',
          targetName: hasTargetUser ? `<@${targetUserId}>` : null,
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
    keywords: ['turn on the', 'turn off the', 'switch on', 'switch off', 'lights on', 'lights off', 'set brightness', 'activate scene', 'what lights'],
    plugin: 'integrations',
    description: 'Control Home Assistant devices',
    async execute(context) {
      const { getPlugin } = await import('../../../src/core/plugin-system.js');
      const query = context.query?.toLowerCase() || '';
      
      const integrationsPlugin = getPlugin('integrations');
      if (!integrationsPlugin?.homeassistant) {
        return { error: 'Home Assistant integration not configured', notConfigured: true };
      }
      
      const ha = integrationsPlugin.homeassistant;
      
      // Parse the command
      // "turn on/off [device]"
      const toggleMatch = query.match(/turn\s+(on|off)\s+(?:the\s+)?(.+)/i);
      if (toggleMatch) {
        const action = toggleMatch[1];
        const deviceName = toggleMatch[2].trim();
        
        try {
          const entities = await ha.getEntities();
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
        } catch (error) {
          return { error: error.message };
        }
      }
      
      // "set [light] to [X]%"
      const brightnessMatch = query.match(/set\s+(.+?)\s+(?:to\s+)?(\d+)\s*%/i);
      if (brightnessMatch) {
        const deviceName = brightnessMatch[1].trim();
        const brightness = Math.min(100, Math.max(0, parseInt(brightnessMatch[2])));
        
        try {
          const entities = await ha.getEntities();
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
        } catch (error) {
          return { error: error.message };
        }
      }
      
      // "what lights are on"
      if (query.includes('what lights') || query.includes('which lights')) {
        try {
          const entities = await ha.getEntities();
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
        } catch (error) {
          return { error: error.message };
        }
      }
      
      // "activate [scene]"
      const sceneMatch = query.match(/activate\s+(?:scene\s+)?(.+)/i);
      if (sceneMatch) {
        const sceneName = sceneMatch[1].trim();
        
        try {
          const entities = await ha.getEntities();
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
        } catch (error) {
          return { error: error.message };
        }
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
          `• "Set kitchen lights to 50%"\n` +
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
