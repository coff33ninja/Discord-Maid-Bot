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
  
  // SSH/Remote
  'ssh-command': {
    description: 'Execute a command on a remote server via SSH',
    examples: ['run command on server', 'ssh execute', 'remote command', 'execute on linux server']
  },
  
  // Bot Info
  'help': {
    description: 'Show general help and available commands',
    examples: ['help', 'what can you do', 'commands', 'how to use']
  },
  'bot-stats': {
    description: 'Show bot statistics and uptime',
    examples: ['bot stats', 'statistics', 'how long have you been running']
  },
  
  // Conversation
  'conversation': {
    description: 'General conversation, chat, or questions not matching other categories',
    examples: ['hello', 'how are you', 'tell me a joke', 'what do you think about...']
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
    { keywords: ['wake', 'turn on', 'boot', 'power on'], action: 'wake-device' },
    { keywords: ['speed test', 'bandwidth', 'internet speed'], action: 'speedtest' },
    { keywords: ['weather', 'temperature', 'forecast'], action: 'weather' },
    { keywords: ['play', 'game', 'trivia', 'hangman'], action: 'game-play' },
    { keywords: ['remind', 'reminder', 'remember to'], action: 'reminder-create' },
    { keywords: ['server status', 'bot running', 'is the bot', 'check server'], action: 'server-status' },
    { keywords: ['logs', 'show logs', 'view logs'], action: 'server-logs' },
    { keywords: ['restart bot', 'restart server', 'reboot'], action: 'server-restart' },
    { keywords: ['deploy', 'update bot', 'git pull'], action: 'server-deploy' },
    { keywords: ['server admin', 'do with the server', 'admin commands'], action: 'server-admin-help' },
    { keywords: ['kick', 'kick user'], action: 'discord-kick' },
    { keywords: ['ban', 'ban user'], action: 'discord-ban' },
    { keywords: ['timeout', 'mute'], action: 'discord-timeout' },
    { keywords: ['help', 'what can you do', 'commands'], action: 'help' },
    { keywords: ['research', 'look up', 'tell me about'], action: 'research' },
    { keywords: ['home assistant', 'smart home', 'lights'], action: 'home-assistant' }
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
    'server-status': 'server-status',
    'server-logs': 'view-logs',
    'server-restart': 'restart-bot',
    'server-deploy': 'deploy-code',
    'server-admin-help': 'server-admin-help',
    'discord-kick': 'discord-kick',
    'discord-ban': 'discord-ban',
    'discord-timeout': 'discord-timeout',
    'discord-role': 'discord-add-role',
    'discord-lock': 'discord-lock-channel',
    'ssh-command': 'ssh-exec',
    'shutdown-device': 'shutdown-device',
    // Most actions map directly
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
