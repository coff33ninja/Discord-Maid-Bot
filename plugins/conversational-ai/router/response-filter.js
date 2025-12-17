/**
 * Smart Response Filter
 * 
 * Determines when the AI should respond after being activated.
 * Prevents the bot from responding to every message after a mention.
 * 
 * @module plugins/conversational-ai/router/response-filter
 */

import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('response-filter');

/**
 * Tracks channel attention state
 * @type {Map<string, {lastMention: number, lastBotMessage: number}>}
 */
const channelAttention = new Map();

/**
 * Patterns that indicate the message is directed at the bot
 */
const BOT_DIRECTED_PATTERNS = [
  // Direct address
  /^(hey|hi|hello|yo|ok|okay)\s*(bot|maid|ai)?\s*[,!.]?\s*/i,
  // Questions
  /^(can you|could you|would you|will you|please|pls)\b/i,
  /\?$/,
  // Commands/requests
  /^(show|tell|give|get|find|search|look|check|help|explain|what|how|why|when|where|who)\b/i,
  // Continuations
  /^(yes|no|yeah|nah|sure|okay|ok|thanks|thank you|thx|ty)\s*[,!.]?\s*/i,
  /^(and|but|also|what about|how about)\b/i,
  // References to previous bot response
  /\b(you said|you mentioned|earlier|before|that|this)\b/i
];

/**
 * Patterns that indicate the message is NOT for the bot (user-to-user chat)
 */
const USER_CHAT_PATTERNS = [
  // Addressing other users
  /<@!?\d+>/,  // User mentions (not bot)
  /^@\w+/,     // @username style
  // Casual chat indicators
  /\b(lol|lmao|rofl|haha|hehe|xd|bruh|bro|dude|man|guys)\b/i,
  // Gaming/activity chat
  /\b(gg|wp|ez|noob|rekt|pog|poggers|clutch|diff)\b/i,
  // Reactions to others
  /^(nice|cool|awesome|great|sick|based|true|facts|real|fr|ngl)\s*$/i
];

/**
 * Response Filter class
 * Manages attention windows and determines response appropriateness
 */
export class ResponseFilter {
  /**
   * @param {Object} config - Configuration
   * @param {number} config.attentionWindowMs - How long attention lasts after mention (ms)
   * @param {boolean} config.smartResponseEnabled - Enable smart filtering
   * @param {boolean} config.respondToReplies - Always respond to direct replies
   * @param {number} config.minConfidenceToRespond - Minimum confidence to respond (0-1)
   * @param {string} config.botId - Bot's user ID
   */
  constructor(config = {}) {
    this.attentionWindowMs = config.attentionWindowMs ?? 120000; // 2 minutes
    this.smartResponseEnabled = config.smartResponseEnabled !== false;
    this.respondToReplies = config.respondToReplies !== false;
    this.minConfidenceToRespond = config.minConfidenceToRespond ?? 0.6;
    this.botId = config.botId || null;
  }

  /**
   * Set bot ID
   * @param {string} botId - Bot's user ID
   */
  setBotId(botId) {
    this.botId = botId;
  }

  /**
   * Record that the bot was mentioned in a channel
   * @param {string} channelId - Channel ID
   */
  recordMention(channelId) {
    const state = channelAttention.get(channelId) || {};
    state.lastMention = Date.now();
    channelAttention.set(channelId, state);
    logger.debug(`Recorded mention in channel ${channelId}`);
  }

  /**
   * Record that the bot sent a message in a channel
   * @param {string} channelId - Channel ID
   */
  recordBotMessage(channelId) {
    const state = channelAttention.get(channelId) || {};
    state.lastBotMessage = Date.now();
    channelAttention.set(channelId, state);
  }

  /**
   * Check if the bot is currently "paying attention" to a channel
   * @param {string} channelId - Channel ID
   * @returns {boolean} Whether bot is in attention window
   */
  isInAttentionWindow(channelId) {
    const state = channelAttention.get(channelId);
    if (!state) return false;

    const now = Date.now();
    const lastActivity = Math.max(state.lastMention || 0, state.lastBotMessage || 0);
    
    return (now - lastActivity) < this.attentionWindowMs;
  }

  /**
   * Analyze if a message is likely directed at the bot
   * @param {Object} message - Discord message
   * @param {Object} context - Additional context
   * @returns {Object} Analysis result with confidence score
   */
  analyzeIntent(message, context = {}) {
    const content = message.content || '';
    const result = {
      isDirected: false,
      confidence: 0,
      reasons: []
    };

    // If smart response is disabled, always respond in attention window
    if (!this.smartResponseEnabled) {
      result.isDirected = true;
      result.confidence = 1;
      result.reasons.push('smart_response_disabled');
      return result;
    }

    let score = 0;
    const maxScore = 10;

    // Check if it's a reply to the bot's message
    if (this.respondToReplies && context.isReplyToBot) {
      score += 5;
      result.reasons.push('reply_to_bot');
    }

    // Check for bot-directed patterns
    for (const pattern of BOT_DIRECTED_PATTERNS) {
      if (pattern.test(content)) {
        score += 2;
        result.reasons.push('bot_directed_pattern');
        break; // Only count once
      }
    }

    // Check for user-chat patterns (negative score)
    for (const pattern of USER_CHAT_PATTERNS) {
      if (pattern.test(content)) {
        // Check if it's not the bot being mentioned
        if (pattern.source.includes('\\d+') && this.botId) {
          const mentionMatch = content.match(/<@!?(\d+)>/);
          if (mentionMatch && mentionMatch[1] === this.botId) {
            continue; // This is a bot mention, don't penalize
          }
        }
        score -= 2;
        result.reasons.push('user_chat_pattern');
        break;
      }
    }

    // Question marks are strong indicators
    if (content.includes('?')) {
      score += 1.5;
      result.reasons.push('has_question');
    }

    // Short messages after bot response are likely continuations
    if (content.length < 50 && context.recentBotMessage) {
      score += 1;
      result.reasons.push('short_continuation');
    }

    // Messages that start with common conversation starters
    if (/^(so|well|anyway|btw|by the way)/i.test(content)) {
      score += 1;
      result.reasons.push('conversation_starter');
    }

    // Normalize score to confidence (0-1)
    result.confidence = Math.max(0, Math.min(1, (score + 2) / maxScore));
    result.isDirected = result.confidence >= this.minConfidenceToRespond;

    logger.debug(`Intent analysis for "${content.slice(0, 50)}...": confidence=${result.confidence.toFixed(2)}, directed=${result.isDirected}`);

    return result;
  }

  /**
   * Determine if the bot should respond to a message
   * @param {Object} message - Discord message
   * @param {Object} classification - Message classification from router
   * @returns {Object} Decision result
   */
  async shouldRespond(message, classification) {
    const channelId = message.channelId || message.channel?.id;
    const guildId = message.guild?.id || message.guildId;
    const isDM = message.channel?.type === 1 || message.channel?.type === 'DM';

    // Always respond in DMs
    if (isDM) {
      return { respond: true, reason: 'dm_channel' };
    }

    // Check if this is an AI auto-chat channel (respond to ALL messages)
    if (guildId && channelId) {
      try {
        const { isAIChatChannel } = await import('../utils/channel-helper.js');
        const isAutoChat = await isAIChatChannel(guildId, channelId);
        if (isAutoChat) {
          return { respond: true, reason: 'ai_chat_channel' };
        }
      } catch (e) {
        // Channel helper not available, continue with normal logic
      }
      
      // Also check if this is an NSFW channel (always respond in NSFW channels)
      try {
        const { isNsfwChannel } = await import('../utils/nsfw-manager.js');
        const isNsfw = isNsfwChannel(guildId, channelId);
        if (isNsfw) {
          return { respond: true, reason: 'nsfw_channel' };
        }
      } catch (e) {
        // NSFW manager not available, continue with normal logic
      }
    }

    // Always respond to explicit mentions
    if (classification.type === 'mention') {
      this.recordMention(channelId);
      return { respond: true, reason: 'direct_mention' };
    }

    // Always respond to prefix commands
    if (classification.type === 'prefix') {
      return { respond: true, reason: 'prefix_command' };
    }

    // For natural/passive messages, check attention window
    if (!this.isInAttentionWindow(channelId)) {
      return { respond: false, reason: 'outside_attention_window' };
    }

    // Check if message is a reply to the bot
    const isReplyToBot = message.reference?.messageId && 
      this.isReplyToBot(message);

    // Analyze intent
    const state = channelAttention.get(channelId) || {};
    const recentBotMessage = state.lastBotMessage && 
      (Date.now() - state.lastBotMessage) < 30000; // Within 30 seconds

    const analysis = this.analyzeIntent(message, {
      isReplyToBot,
      recentBotMessage
    });

    if (analysis.isDirected) {
      return { 
        respond: true, 
        reason: 'intent_analysis',
        confidence: analysis.confidence,
        analysisReasons: analysis.reasons
      };
    }

    return { 
      respond: false, 
      reason: 'low_confidence',
      confidence: analysis.confidence
    };
  }

  /**
   * Check if a message is a reply to the bot
   * @param {Object} message - Discord message
   * @returns {boolean}
   */
  isReplyToBot(message) {
    if (!this.botId || !message.reference) return false;
    
    // This would need the referenced message to be fetched
    // For now, we'll rely on the message handler to pass this info
    return false;
  }

  /**
   * Clear attention state for a channel
   * @param {string} channelId - Channel ID
   */
  clearAttention(channelId) {
    channelAttention.delete(channelId);
  }

  /**
   * Get attention state for debugging
   * @param {string} channelId - Channel ID
   * @returns {Object|null}
   */
  getAttentionState(channelId) {
    return channelAttention.get(channelId) || null;
  }
}

export default ResponseFilter;
