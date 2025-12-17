/**
 * AI Intent Classifier
 * 
 * Uses Gemini AI to intelligently classify user intents
 * instead of relying on simple keyword matching.
 * 
 * @module plugins/conversational-ai/utils/ai-intent-classifier
 */

import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('ai-intent-classifier');

/**
 * Available action categories with their descriptions
 * Gemini uses these to understand what each action does
 */
const ACTION_CATEGORIES = {
  // Network & Devices
  'network-scan': {
    description: 'Scan the network to find connected devices',
    examples: ['scan network', 'what devices are online', 'find devices', 'show me connected devices', 'who is on my network']
  },
  'wake-device': {
    description: 'Wake up a device using Wake-on-LAN (turn on a PC/computer)',
    examples: ['wake my pc', 'turn on gaming computer', 'boot up server', 'wake device', 'power on my machine']
  },
  'shutdown-device': {
    description: 'Shutdown or restart a remote device',
    examples: ['shutdown my pc', 'turn off computer', 'restart my server', 'power off device']
  },
  'device-rename': {
    description: 'Rename a device on the network (give it a friendly name)',
    examples: ['rename 192.168.0.100 to Gaming PC', 'call my server Kusanagi', 'name device', '192.168.0.50 is my phone', 'rename device as']
  },
  'device-emoji': {
    description: 'Set or change the emoji for a device',
    examples: ['set emoji for device', 'change device emoji', 'give device an emoji']
  },
  'device-set-type': {
    description: 'Set the type of a device (pc, server, phone, tablet, router, printer, iot, tv, gaming)',
    examples: ['set device type to server', 'mark as pc', 'this is a phone', 'change type to router', 'set 192.168.0.100 as server']
  },
  'device-set-os': {
    description: 'Set the operating system of a device (Windows, Linux, macOS, Android, iOS)',
    examples: ['set os to Windows', 'runs Linux', 'device is running Ubuntu', 'operating system is macOS']
  },
  'device-deep-scan': {
    description: 'Run a deep network scan using nmap to detect device types and operating systems',
    examples: ['deep scan', 'full scan', 'nmap scan', 'detect all devices', 'identify devices', 'scan with nmap']
  },
  'device-info': {
    description: 'Get detailed information about a specific device',
    examples: ['device info', 'about device', 'show device details', 'what is this device', 'info about 192.168.0.100']
  },
  'device-ping': {
    description: 'Ping a device to check if it is online and measure latency',
    examples: ['ping 192.168.0.100', 'ping my server', 'is device online', 'check connection to', 'test ping']
  },
  'device-port-scan': {
    description: 'Scan open ports on a device to see what services are running',
    examples: ['scan ports on 192.168.0.100', 'what ports are open', 'port scan server', 'check services', 'docker ports']
  },
  'service-name': {
    description: 'Name a service running on a specific port (e.g., Portainer on port 9000)',
    examples: ['name port 9000 as Portainer', 'call port 8080 Home Assistant', 'label port 32400 as Plex']
  },
  'service-list': {
    description: 'List all named services across devices',
    examples: ['list services', 'show my services', 'what services do I have', 'all services']
  },
  'service-add': {
    description: 'Add a custom port/service to a device (even if not detected by scan)',
    examples: ['add port 3000 to server', 'register port 8080 on Think-Server', 'add custom port 5000']
  },
  'service-check': {
    description: 'Check if a port/service is running on a device',
    examples: ['is port 8080 open', 'check port 3000 on server', 'is Portainer running', 'check all services on Think-Server']
  },
  'service-delete': {
    description: 'Remove a service from a device',
    examples: ['delete port 8080 from server', 'remove service Portainer', 'unregister port 3000']
  },
  
  // Speed & Internet
  'speedtest': {
    description: 'Run an internet speed test to check bandwidth',
    examples: ['speed test', 'check internet speed', 'how fast is my connection', 'test bandwidth', 'internet slow?']
  },
  
  // Weather
  'weather': {
    description: 'Get current weather information',
    examples: ['weather', 'what is the temperature', 'is it raining', 'forecast', 'how hot is it']
  },
  
  // Games
  'game-play': {
    description: 'Start playing a game (trivia, hangman, riddles, etc)',
    examples: ['play trivia', 'lets play a game', 'start hangman', 'play riddles', 'game time']
  },
  'game-list': {
    description: 'List available games to play',
    examples: ['what games can we play', 'list games', 'available games', 'show games']
  },
  
  // Research
  'research': {
    description: 'Research or look up information about a topic',
    examples: ['research quantum computing', 'look up python', 'tell me about AI', 'what is blockchain']
  },
  
  // Smart Home
  'home-assistant': {
    description: 'Control smart home devices via Home Assistant',
    examples: ['turn on lights', 'control smart home', 'home assistant', 'toggle bedroom light', 'smart devices']
  },
  
  // Reminders
  'reminder-create': {
    description: 'Create a reminder for yourself or someone else',
    examples: ['remind me to call mom', 'set reminder for meeting', 'remind @user to check email', 'remember to buy milk']
  },
  
  // Server Admin
  'server-status': {
    description: 'Check server/bot status (CPU, memory, uptime, is it running)',
    examples: ['is the bot running', 'server status', 'check server', 'bot status', 'is the server up', 'system status']
  },
  'server-logs': {
    description: 'View server or bot logs',
    examples: ['show logs', 'view bot logs', 'recent logs', 'what happened', 'error logs']
  },
  'server-restart': {
    description: 'Restart the bot or server service',
    examples: ['restart bot', 'restart server', 'reboot the bot', 'restart service']
  },
  'server-deploy': {
    description: 'Deploy latest code updates to the server',
    examples: ['deploy', 'update bot', 'git pull', 'deploy latest', 'push updates']
  },
  'server-admin-help': {
    description: 'Show what server admin commands are available',
    examples: ['what can you do with the server', 'server admin commands', 'admin help', 'server management options']
  },
  
  // Discord Moderation
  'discord-kick': {
    description: 'Kick a member from the Discord server',
    examples: ['kick user', 'kick @member', 'remove user from server']
  },
  'discord-ban': {
    description: 'Ban a member from the Discord server',
    examples: ['ban user', 'ban @member', 'permanently remove user']
  },
  'discord-timeout': {
    description: 'Timeout/mute a member temporarily',
    examples: ['timeout user', 'mute @member', 'silence user for 10 minutes']
  },
  'discord-role': {
    description: 'Manage roles (give or remove roles from members)',
    examples: ['give role to user', 'add admin role', 'remove role from member']
  },
  'discord-lock': {
    description: 'Lock or unlock a channel',
    examples: ['lock channel', 'unlock this channel', 'prevent messages']
  },
  'discord-create-channel': {
    description: 'Create a new Discord text or voice channel',
    examples: ['create channel general', 'make a voice channel', 'new channel announcements', 'add channel gaming']
  },
  'discord-delete-channel': {
    description: 'Delete a Discord channel',
    examples: ['delete channel old-chat', 'remove channel test', 'delete this channel']
  },
  'discord-rename-channel': {
    description: 'Rename a Discord channel',
    examples: ['rename channel general to main-chat', 'rename this channel to announcements', 'change channel name']
  },
  'discord-set-topic': {
    description: 'Set channel topic or description',
    examples: ['set topic to Welcome!', 'change channel description', 'set channel topic']
  },
  'discord-set-slowmode': {
    description: 'Set channel slowmode',
    examples: ['set slowmode to 30 seconds', 'enable slowmode', 'disable slowmode', 'slow mode 1 minute']
  },
  'discord-unban': {
    description: 'Unban a user from the server',
    examples: ['unban user', 'remove ban', 'lift ban from user']
  },
  'discord-remove-timeout': {
    description: 'Remove timeout from a user',
    examples: ['unmute user', 'remove timeout', 'untimeout @user']
  },
  'discord-member-info': {
    description: 'Get information about a server member',
    examples: ['who is @user', 'member info', 'user info', 'info about @user']
  },
  'discord-server-info': {
    description: 'Get server information and statistics',
    examples: ['server info', 'server stats', 'about this server', 'guild info']
  },
  'discord-list-roles': {
    description: 'List all server roles',
    examples: ['list roles', 'show roles', 'what roles are there', 'server roles']
  },
  'discord-ban-list': {
    description: 'View banned users',
    examples: ['ban list', 'who is banned', 'show bans', 'list banned users']
  },
  'discord-move-channel': {
    description: 'Move a channel to a category',
    examples: ['move channel to category', 'put general in text channels', 'move channel']
  },
  'discord-create-role': {
    description: 'Create a new server role',
    examples: ['create role VIP', 'make a new role', 'add role Admin']
  },
  'discord-delete-role': {
    description: 'Delete a server role',
    examples: ['delete role VIP', 'remove role', 'destroy role']
  },
  'discord-set-server-name': {
    description: 'Change the server name',
    examples: ['rename server', 'change server name to', 'set server name']
  },
  'discord-set-server-description': {
    description: 'Set the server description',
    examples: ['set server description', 'change server description', 'server description to']
  },
  'discord-purge': {
    description: 'Bulk delete messages in a channel',
    examples: ['purge 50 messages', 'delete last 20 messages', 'clear chat', 'bulk delete']
  },
  'discord-announce': {
    description: 'Send an announcement message with embed',
    examples: ['announce server maintenance', 'make announcement', 'broadcast message']
  },
  'discord-create-invite': {
    description: 'Create a server invite link',
    examples: ['create invite', 'make invite link', 'generate invite', 'get server invite']
  },
  'discord-set-nickname': {
    description: 'Change a member nickname',
    examples: ['set nickname of @user to', 'change nickname', 'rename user']
  },
  
  // Network & Device Health
  'network-insights': {
    description: 'Generate AI-powered network analysis and insights',
    examples: ['network insights', 'analyze my network', 'network health report', 'how is my network doing']
  },
  'device-health': {
    description: 'Get device health and uptime reports',
    examples: ['device health', 'show device uptime', 'which devices are unreliable', 'health report']
  },
  'shutdown-device': {
    description: 'Shutdown or restart a remote device',
    examples: ['shutdown my PC', 'restart the server', 'turn off computer', 'reboot gaming PC']
  },
  
  // Reminder Management
  'reminder-list': {
    description: 'List your active reminders',
    examples: ['list my reminders', 'show reminders', 'what reminders do I have', 'view my reminders']
  },
  'reminder-delete': {
    description: 'Delete a reminder',
    examples: ['delete reminder', 'remove reminder', 'cancel reminder']
  },
  
  // Speed & History
  'speedtest-history': {
    description: 'View speed test history and trends',
    examples: ['speed test history', 'how has my internet been', 'past speed tests', 'speed trends']
  },
  
  // Device Groups
  'device-groups': {
    description: 'List all device groups',
    examples: ['list device groups', 'show groups', 'what groups do I have']
  },
  'device-group-view': {
    description: 'View devices in a specific group',
    examples: ['show devices in group Gaming', 'devices in group Servers', 'show group IoT']
  },
  
  // Automation
  'scheduled-tasks': {
    description: 'List scheduled automation tasks',
    examples: ['list scheduled tasks', 'show automation tasks', 'what tasks are scheduled']
  },
  'device-triggers-list': {
    description: 'List device automation triggers',
    examples: ['list device triggers', 'show my triggers', 'what triggers do I have']
  },
  'speed-alert-config': {
    description: 'View or configure speed alerts',
    examples: ['speed alert settings', 'show speed alerts', 'speed notification config']
  },
  
  // Games
  'game-leaderboard': {
    description: 'Show game leaderboard and top players',
    examples: ['game leaderboard', 'who is winning', 'top players', 'game scores']
  },
  
  // Personality
  'personality-change': {
    description: 'Change the bot personality style',
    examples: ['change personality to tsundere', 'be more energetic', 'switch to butler mode', 'act like a catgirl']
  },
  'personality-list': {
    description: 'List available bot personalities',
    examples: ['list personalities', 'what personalities are available', 'show personality options']
  },
  
  // Device Health Extended
  'device-health-summary': {
    description: 'Get overall health summary for all devices',
    examples: ['health summary', 'network health overview', 'overall device health']
  },
  'device-health-unhealthy': {
    description: 'List devices with poor health or issues',
    examples: ['unhealthy devices', 'problem devices', 'which devices have issues']
  },
  'device-health-reliable': {
    description: 'List most reliable devices with high uptime',
    examples: ['reliable devices', 'most stable devices', 'best uptime devices']
  },
  'device-health-alerts': {
    description: 'Check for predictive health alerts',
    examples: ['health alerts', 'any device warnings', 'predictive alerts']
  },
  
  // Network Insights History
  'network-insights-history': {
    description: 'View past network analysis insights',
    examples: ['insights history', 'past network insights', 'previous analysis']
  },
  
  // Plugin Management
  'plugin-list': {
    description: 'List all loaded plugins',
    examples: ['list plugins', 'what plugins are loaded', 'show plugins']
  },
  'plugin-stats': {
    description: 'Show plugin statistics',
    examples: ['plugin stats', 'plugin statistics', 'how many plugins']
  },
  
  // Dashboard
  'dashboard-url': {
    description: 'Get the web dashboard URL',
    examples: ['dashboard url', 'open dashboard', 'web interface', 'where is the dashboard']
  },
  
  // Tailscale
  'tailscale-status': {
    description: 'Check Tailscale VPN status and connected peers',
    examples: ['tailscale status', 'vpn status', 'tailscale devices', 'is tailscale connected']
  },
  
  // User Profiles
  'profile-setup': {
    description: 'Create a profile setup channel for members to introduce themselves',
    examples: ['create profile channel', 'setup profile channel', 'let members introduce themselves', 'member profiles']
  },
  'profile-view': {
    description: 'View your own profile or what the bot knows about you',
    examples: ['my profile', 'view profile', 'what do you know about me', 'who am i to you', 'show my profile']
  },
  
  // SSH/Remote
  'ssh-command': {
    description: 'Execute a command on a remote server via SSH',
    examples: ['run command on server', 'ssh execute', 'remote command', 'execute on linux server']
  },
  
  // Bot Info
  'help': {
    description: 'Show general help and available commands (say "full help" or "all commands" for detailed list)',
    examples: ['help', 'what can you do', 'commands', 'how to use', 'full help', 'all commands', 'show everything you can do']
  },
  'bot-stats': {
    description: 'Show bot statistics and uptime',
    examples: ['bot stats', 'statistics', 'how long have you been running']
  },
  
  // Conversation
  'conversation': {
    description: 'General conversation, chat, or questions not matching other categories',
    examples: ['hello', 'how are you', 'tell me a joke', 'what do you think about...']
  },
  
  // Music Player
  'music-play': {
    description: 'Start playing music in a voice channel',
    examples: ['play music', 'start music', 'put on some music', 'play some tunes']
  },
  'music-stop': {
    description: 'Stop playing music',
    examples: ['stop music', 'stop playing', 'turn off music', 'disconnect']
  },
  'music-skip': {
    description: 'Skip to next track',
    examples: ['skip', 'next song', 'skip this', 'next track']
  },
  'music-pause': {
    description: 'Pause or resume music',
    examples: ['pause', 'pause music', 'resume', 'unpause']
  },
  'music-volume': {
    description: 'Adjust music volume',
    examples: ['volume 50', 'louder', 'quieter', 'turn it up', 'turn down the music']
  },
  'music-playlist': {
    description: 'Change music playlist/genre',
    examples: ['play rock', 'switch to christmas music', 'change playlist', 'play country']
  },
  'music-nowplaying': {
    description: 'Show what song is currently playing',
    examples: ['what song is this', 'whats playing', 'now playing', 'current song']
  },
  'music-setup': {
    description: 'Setup 24/7 music in this server - creates voice and control channels, starts playing automatically',
    examples: ['setup music', 'setup music channel', 'create music channel', 'setup 24/7 music', 'configure music']
  },
  'ai-chat-setup': {
    description: 'Create a dedicated AI chat channel where the bot responds to all messages without needing @mention',
    examples: ['setup chat channel', 'create your chat room', 'make ai channel', 'setup ai chat', 'create dedicated channel for you', 'your own channel']
  },
  
  // NSFW channel management
  'nsfw-enable': {
    description: 'Enable NSFW/adult content mode for the current channel - relaxes AI content filters',
    examples: ['enable nsfw', 'unlock nsfw', 'nsfw on', 'adult mode', 'enable adult content', 'unlock explicit']
  },
  'nsfw-disable': {
    description: 'Disable NSFW/adult content mode for the current channel - restores normal content filters',
    examples: ['disable nsfw', 'lock nsfw', 'nsfw off', 'disable adult', 'lock explicit']
  },
  'nsfw-list': {
    description: 'List all channels with NSFW mode enabled in this server',
    examples: ['list nsfw channels', 'show nsfw', 'which channels are nsfw', 'nsfw list']
  },
  
  // Not implemented / Coming soon (music removed)
  'not-implemented': {
    description: 'Feature that is planned but not yet implemented (calendar, notifications, traffic monitoring, automations)',
    examples: ['calendar', 'schedule meeting', 'send notification', 'monitor traffic', 'create automation', 'workflow', 'alert me when service goes down']
  }
};

/**
 * Build the classification prompt for Gemini
 */
function buildClassificationPrompt(userQuery) {
  const categories = Object.entries(ACTION_CATEGORIES)
    .map(([id, info]) => `- ${id}: ${info.description}\n  Examples: ${info.examples.slice(0, 3).join(', ')}`)
    .join('\n');

  return `You are an intent classifier for a Discord bot. Analyze the user's message and determine which action they want.

AVAILABLE ACTIONS:
${categories}

USER MESSAGE: "${userQuery}"

INSTRUCTIONS:
1. Analyze the user's intent carefully
2. Match to the MOST APPROPRIATE action from the list above
3. If the message is general chat/greeting/question not matching any specific action, use "conversation"
4. Consider context clues and synonyms
5. Return ONLY a JSON object, no other text

RESPOND WITH EXACTLY THIS JSON FORMAT:
{
  "action": "action-id-here",
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}`;
}

/**
 * Classify user intent using Gemini AI
 * @param {string} query - User's message
 * @param {Object} context - Additional context (userId, channelId, etc)
 * @returns {Promise<Object>} Classification result
 */
export async function classifyIntent(query, context = {}) {
  if (!query || query.trim().length === 0) {
    return { action: 'conversation', confidence: 0, reason: 'Empty query' };
  }

  try {
    // Get Gemini API with key rotation
    const { generateWithRotation } = await import('../../../src/config/gemini-keys.js');
    
    const prompt = buildClassificationPrompt(query);
    
    const { result } = await generateWithRotation(prompt, {
      maxOutputTokens: 150,
      temperature: 0.1 // Low temperature for consistent classification
    });

    const response = result?.response;
    
    if (!response || typeof response.text !== 'function') {
      logger.warn('Empty response from Gemini, falling back to fallback');
      return fallbackClassification(query);
    }

    const responseText = response.text();

    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('Could not parse JSON from Gemini response:', responseText);
      return { action: 'conversation', confidence: 0.5, reason: 'Parse error' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate the action exists
    if (!ACTION_CATEGORIES[parsed.action] && parsed.action !== 'conversation') {
      logger.warn(`Unknown action from classifier: ${parsed.action}`);
      parsed.action = 'conversation';
      parsed.confidence = 0.5;
    }

    logger.debug(`Classified "${query.substring(0, 50)}..." as ${parsed.action} (${parsed.confidence})`);
    
    return {
      action: parsed.action,
      confidence: parsed.confidence || 0.8,
      reason: parsed.reason || 'AI classification',
      source: 'gemini'
    };

  } catch (error) {
    logger.error('Intent classification error:', error.message);
    
    // Fallback to simple keyword matching if AI fails
    return fallbackClassification(query);
  }
}

/**
 * Fallback keyword-based classification when AI is unavailable
 */
function fallbackClassification(query) {
  const lowerQuery = query.toLowerCase();
  
  // Quick keyword checks for common intents
  const quickMatches = [
    { keywords: ['scan', 'devices online', 'network'], action: 'network-scan' },
    { keywords: ['rename', 'name device', 'call it', 'call my', ' is my ', ' as '], action: 'device-rename' },
    { keywords: ['device emoji', 'set emoji', 'change emoji'], action: 'device-emoji' },
    { keywords: ['set type', 'device type', 'mark as', 'is a pc', 'is a server', 'is a phone'], action: 'device-set-type' },
    { keywords: ['set os', 'operating system', 'runs windows', 'runs linux', 'running ubuntu'], action: 'device-set-os' },
    { keywords: ['deep scan', 'full scan', 'nmap scan', 'identify devices', 'detect devices'], action: 'device-deep-scan' },
    { keywords: ['device info', 'about device', 'device details', 'show device'], action: 'device-info' },
    { keywords: ['ping', 'ping device', 'is online', 'check connection', 'test ping'], action: 'device-ping' },
    { keywords: ['port scan', 'scan ports', 'open ports', 'what ports', 'docker ports', 'services on'], action: 'device-port-scan' },
    { keywords: ['name port', 'name service', 'label port', 'call port', 'set service name'], action: 'service-name' },
    { keywords: ['list services', 'show services', 'my services', 'all services', 'what services'], action: 'service-list' },
    { keywords: ['add port', 'add service', 'register port', 'custom port', 'manual port'], action: 'service-add' },
    { keywords: ['check port', 'is port open', 'port status', 'service running', 'check service', 'is service'], action: 'service-check' },
    { keywords: ['delete service', 'remove service', 'delete port', 'remove port', 'unregister'], action: 'service-delete' },
    { keywords: ['wake', 'turn on', 'boot', 'power on'], action: 'wake-device' },
    { keywords: ['speed test', 'bandwidth', 'internet speed'], action: 'speedtest' },
    { keywords: ['weather', 'temperature', 'forecast'], action: 'weather' },
    { keywords: ['play', 'game', 'trivia', 'hangman'], action: 'game-play' },
    { keywords: ['remind', 'reminder', 'remember to'], action: 'reminder-create' },
    { keywords: ['server status', 'bot running', 'is the bot', 'check server'], action: 'server-status' },
    { keywords: ['logs', 'show logs', 'view logs'], action: 'server-logs' },
    { keywords: ['restart bot', 'restart server', 'reboot bot'], action: 'server-restart' },
    { keywords: ['deploy', 'update bot', 'git pull', 'deploy code'], action: 'server-deploy' },
    { keywords: ['server admin', 'do with the server', 'admin commands'], action: 'server-admin-help' },
    { keywords: ['kick', 'kick user', 'kick member'], action: 'discord-kick' },
    { keywords: ['ban', 'ban user', 'ban member'], action: 'discord-ban' },
    { keywords: ['timeout', 'mute', 'silence'], action: 'discord-timeout' },
    { keywords: ['give role', 'add role', 'remove role', 'assign role'], action: 'discord-role' },
    { keywords: ['lock channel', 'unlock channel'], action: 'discord-lock' },
    { keywords: ['ssh', 'run command on server', 'remote command'], action: 'ssh-command' },
    { keywords: ['help', 'what can you do', 'commands', 'full help', 'all commands', 'everything you can do'], action: 'help' },
    { keywords: ['research', 'look up', 'tell me about'], action: 'research' },
    { keywords: ['home assistant', 'smart home', 'lights'], action: 'home-assistant' },
    { keywords: ['profile channel', 'introduce themselves', 'member profiles'], action: 'profile-setup' },
    { keywords: ['my profile', 'what do you know about me', 'who am i'], action: 'profile-view' },
    { keywords: ['create channel', 'make channel', 'new channel', 'add channel'], action: 'discord-create-channel' },
    { keywords: ['delete channel', 'remove channel'], action: 'discord-delete-channel' },
    { keywords: ['rename channel', 'change channel name'], action: 'discord-rename-channel' },
    { keywords: ['set topic', 'channel topic', 'channel description'], action: 'discord-set-topic' },
    { keywords: ['slowmode', 'slow mode', 'rate limit'], action: 'discord-set-slowmode' },
    { keywords: ['unban', 'remove ban', 'lift ban'], action: 'discord-unban' },
    { keywords: ['unmute', 'remove timeout', 'untimeout'], action: 'discord-remove-timeout' },
    { keywords: ['member info', 'user info', 'whois', 'who is'], action: 'discord-member-info' },
    { keywords: ['server info', 'guild info', 'server stats', 'about server'], action: 'discord-server-info' },
    { keywords: ['list roles', 'show roles', 'server roles', 'all roles'], action: 'discord-list-roles' },
    { keywords: ['ban list', 'banned users', 'show bans', 'who is banned'], action: 'discord-ban-list' },
    { keywords: ['move channel', 'move to category', 'put channel in'], action: 'discord-move-channel' },
    { keywords: ['create role', 'make role', 'new role', 'add role'], action: 'discord-create-role' },
    { keywords: ['delete role', 'remove role', 'destroy role'], action: 'discord-delete-role' },
    { keywords: ['rename server', 'change server name', 'set server name'], action: 'discord-set-server-name' },
    { keywords: ['server description', 'set server description'], action: 'discord-set-server-description' },
    { keywords: ['purge', 'delete messages', 'clear messages', 'bulk delete', 'clean chat'], action: 'discord-purge' },
    { keywords: ['announce', 'announcement', 'broadcast'], action: 'discord-announce' },
    { keywords: ['create invite', 'invite link', 'generate invite', 'server invite'], action: 'discord-create-invite' },
    { keywords: ['set nickname', 'change nickname', 'rename user'], action: 'discord-set-nickname' },
    { keywords: ['network insights', 'analyze network', 'network health', 'network report'], action: 'network-insights' },
    { keywords: ['device health', 'health report', 'device uptime', 'unhealthy devices'], action: 'device-health' },
    { keywords: ['shutdown', 'turn off', 'power off', 'restart', 'reboot'], action: 'shutdown-device' },
    { keywords: ['list reminders', 'show reminders', 'my reminders', 'view reminders'], action: 'reminder-list' },
    { keywords: ['delete reminder', 'remove reminder', 'cancel reminder'], action: 'reminder-delete' },
    { keywords: ['speed history', 'speed test history', 'past speed tests'], action: 'speedtest-history' },
    { keywords: ['device groups', 'list groups', 'show groups'], action: 'device-groups' },
    { keywords: ['devices in group', 'show group', 'group devices'], action: 'device-group-view' },
    { keywords: ['scheduled tasks', 'list tasks', 'automation tasks'], action: 'scheduled-tasks' },
    { keywords: ['device triggers', 'list triggers', 'my triggers'], action: 'device-triggers-list' },
    { keywords: ['speed alert', 'speed threshold', 'speed notification'], action: 'speed-alert-config' },
    { keywords: ['leaderboard', 'top players', 'game scores', 'who is winning'], action: 'game-leaderboard' },
    { keywords: ['change personality', 'switch personality', 'personality to', 'act like'], action: 'personality-change' },
    { keywords: ['list personalities', 'show personalities', 'available personalities'], action: 'personality-list' },
    { keywords: ['health summary', 'overall health', 'health overview'], action: 'device-health-summary' },
    { keywords: ['unhealthy devices', 'problem devices', 'devices with issues'], action: 'device-health-unhealthy' },
    { keywords: ['reliable devices', 'most stable', 'best uptime'], action: 'device-health-reliable' },
    { keywords: ['health alerts', 'predictive alerts', 'device warnings'], action: 'device-health-alerts' },
    { keywords: ['insights history', 'past insights', 'previous insights'], action: 'network-insights-history' },
    { keywords: ['list plugins', 'show plugins', 'loaded plugins'], action: 'plugin-list' },
    { keywords: ['plugin stats', 'plugin statistics'], action: 'plugin-stats' },
    { keywords: ['dashboard', 'web dashboard', 'dashboard url'], action: 'dashboard-url' },
    { keywords: ['tailscale', 'tailscale status', 'vpn status'], action: 'tailscale-status' },
    // Music player
    { keywords: ['play music', 'start music', 'put on music', 'play some music'], action: 'music-play' },
    { keywords: ['stop music', 'stop playing', 'turn off music', 'music off'], action: 'music-stop' },
    { keywords: ['skip', 'next song', 'skip song', 'next track'], action: 'music-skip' },
    { keywords: ['pause music', 'pause', 'resume', 'unpause'], action: 'music-pause' },
    { keywords: ['volume', 'louder', 'quieter', 'turn up', 'turn down'], action: 'music-volume' },
    { keywords: ['playlist', 'play rock', 'play country', 'play christmas', 'change playlist'], action: 'music-playlist' },
    { keywords: ['what song', 'whats playing', 'now playing', 'current song'], action: 'music-nowplaying' },
    { keywords: ['setup music', 'setup music channel', 'create music channel', '24/7 music', 'configure music'], action: 'music-setup' },
    { keywords: ['setup chat channel', 'create chat room', 'your own channel', 'ai chat channel', 'dedicated channel', 'setup ai chat'], action: 'ai-chat-setup' },
    // NSFW management
    { keywords: ['enable nsfw', 'unlock nsfw', 'nsfw on', 'adult mode on', 'enable adult', 'unlock explicit'], action: 'nsfw-enable' },
    { keywords: ['disable nsfw', 'lock nsfw', 'nsfw off', 'adult mode off', 'disable adult', 'lock explicit'], action: 'nsfw-disable' },
    { keywords: ['list nsfw', 'nsfw list', 'nsfw channels', 'show nsfw', 'which nsfw'], action: 'nsfw-list' },
    // Not implemented
    { keywords: ['calendar', 'schedule meeting', 'appointment', 'schedule event'], action: 'not-implemented' },
    { keywords: ['push notification', 'mobile alert', 'notify my phone'], action: 'not-implemented' },
    { keywords: ['monitor traffic', 'bandwidth monitor', 'network usage', 'data usage'], action: 'not-implemented' },
    { keywords: ['alert when down', 'notify when offline', 'service down alert', 'uptime monitor'], action: 'not-implemented' },
    { keywords: ['create automation', 'workflow', 'if this then that', 'auto trigger'], action: 'not-implemented' }
  ];

  for (const match of quickMatches) {
    if (match.keywords.some(kw => lowerQuery.includes(kw))) {
      return {
        action: match.action,
        confidence: 0.6,
        reason: 'Keyword fallback',
        source: 'fallback'
      };
    }
  }

  return {
    action: 'conversation',
    confidence: 0.5,
    reason: 'No match found',
    source: 'fallback'
  };
}

/**
 * Map classified action to the actual ACTIONS object key
 * Some actions have different names in the classifier vs executor
 */
export function mapActionToExecutor(classifiedAction) {
  const actionMap = {
    // Server admin - map to actual action IDs in action-executor.js
    'server-status': 'server-status',
    'server-logs': 'server-logs',
    'server-restart': 'server-restart',
    'server-deploy': 'server-deploy',
    'server-admin-help': 'server-admin-help',
    // Discord moderation
    'discord-kick': 'discord-kick',
    'discord-ban': 'discord-ban',
    'discord-timeout': 'discord-timeout',
    'discord-role': 'discord-role',
    'discord-lock': 'discord-lock',
    'discord-create-channel': 'discord-create-channel',
    'discord-delete-channel': 'discord-delete-channel',
    // SSH
    'ssh-command': 'ssh-command',
    // Power management
    'shutdown-device': 'shutdown-device',
    // Home assistant
    'home-assistant': 'homeassistant-control',
    // Most actions map directly (same name in classifier and executor)
  };

  return actionMap[classifiedAction] || classifiedAction;
}

/**
 * Get action category info
 */
export function getActionInfo(actionId) {
  return ACTION_CATEGORIES[actionId] || null;
}

/**
 * Get all available actions
 */
export function getAvailableActions() {
  return Object.keys(ACTION_CATEGORIES);
}

export default {
  classifyIntent,
  mapActionToExecutor,
  getActionInfo,
  getAvailableActions,
  ACTION_CATEGORIES
};
