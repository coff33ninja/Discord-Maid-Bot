/**
 * AI Message Rewriter
 * 
 * Rewrites messages to sound more natural and include personality.
 * Used for reminders, notifications, and other bot-to-user messages.
 * 
 * @module plugins/conversational-ai/utils/message-rewriter
 */

import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('message-rewriter');

/**
 * Get the current bot personality
 * @returns {Promise<Object>} Personality data
 */
async function getCurrentPersonality() {
  try {
    const { getPlugin } = await import('../../../src/core/plugin-system.js');
    const personalityPlugin = getPlugin('personality');
    
    if (personalityPlugin?.getCurrentPersonality) {
      return personalityPlugin.getCurrentPersonality();
    }
    
    // Default personality if plugin not available
    return {
      name: 'Akeno',
      traits: ['helpful', 'friendly', 'playful'],
      style: 'warm and caring',
      quirks: ['uses ~ at end of sentences', 'calls user Master']
    };
  } catch (e) {
    return {
      name: 'Akeno',
      traits: ['helpful', 'friendly'],
      style: 'warm',
      quirks: []
    };
  }
}

/**
 * Rewrite a reminder message to sound more natural with personality
 * @param {string} originalMessage - The original reminder message
 * @param {Object} options - Rewrite options
 * @returns {Promise<string>} Rewritten message
 */
export async function rewriteReminderMessage(originalMessage, options = {}) {
  if (!originalMessage) return originalMessage;
  
  const {
    senderName = 'Someone',
    targetName = null,
    isForOther = false,
    includePersonality = true,
    messageType = 'reminder' // 'reminder', 'notification', 'alert'
  } = options;

  try {
    const { generateWithRotation } = await import('../../../src/config/gemini-keys.js');
    
    const personality = includePersonality ? await getCurrentPersonality() : null;
    
    const personalityContext = personality ? `
Bot Personality:
- Name: ${personality.name}
- Traits: ${personality.traits?.join(', ') || 'helpful, friendly'}
- Style: ${personality.style || 'warm and caring'}
- Quirks: ${personality.quirks?.join(', ') || 'none'}
` : '';

    const prompt = `You are rewriting a reminder message to sound more natural and personal.

Original message from ${senderName}: "${originalMessage}"
${isForOther ? `This reminder is being delivered TO: ${targetName}` : 'This is a self-reminder'}
Message type: ${messageType}
${personalityContext}

TASK: Rewrite this message to:
1. Sound like a natural, friendly delivery from one person to another
2. Keep the core meaning but make it sound conversational
3. ${isForOther ? `Frame it as "${senderName} wanted me to remind you..."` : 'Frame it as a helpful reminder'}
4. ${includePersonality && personality ? `Include the bot's personality (${personality.name}'s style)` : 'Keep it neutral'}
5. Be concise but warm
6. If it's a romantic/personal message, keep the sentiment but make it sweet

Examples:
- "call mom" → "Don't forget to give your mom a call~"
- "that I need to kiss her" (from John to Jane) → "John wanted me to let you know he's thinking about you and can't wait to see you for that kiss~ 💕"
- "check the server" → "Time to check on the server, Master~"
- "meeting at 3pm" → "Heads up! You have a meeting coming up at 3pm~"

Respond with ONLY the rewritten message, no quotes, no explanation.`;

    const { result } = await generateWithRotation(prompt, {
      maxOutputTokens: 200,
      temperature: 0.7 // Some creativity for natural language
    });

    const response = result?.response;
    if (!response || typeof response.text !== 'function') {
      logger.warn('Could not rewrite message, using original');
      return originalMessage;
    }

    const rewritten = response.text().trim();
    
    // Sanity check - if rewritten is empty or too different, use original
    if (!rewritten || rewritten.length < 3) {
      return originalMessage;
    }

    logger.debug(`Rewrote "${originalMessage.substring(0, 30)}..." to "${rewritten.substring(0, 30)}..."`);
    
    return rewritten;

  } catch (error) {
    logger.error('Message rewrite failed:', error.message);
    return originalMessage;
  }
}

/**
 * Rewrite a notification/alert message
 * @param {string} message - Original message
 * @param {string} type - Type of notification
 * @returns {Promise<string>} Rewritten message
 */
export async function rewriteNotification(message, type = 'info') {
  return rewriteReminderMessage(message, {
    messageType: type,
    isForOther: false,
    includePersonality: true
  });
}

/**
 * Format a reminder delivery message
 * @param {Object} reminder - Reminder data
 * @param {Object} context - Delivery context
 * @returns {Promise<string>} Formatted delivery message
 */
export async function formatReminderDelivery(reminder, context = {}) {
  const {
    senderName = 'Someone',
    senderMention = null,
    targetName = null,
    isForOther = false
  } = context;

  const originalMessage = reminder.message || reminder.name || 'Reminder';
  
  // Rewrite the message with personality
  const rewrittenMessage = await rewriteReminderMessage(originalMessage, {
    senderName,
    targetName,
    isForOther,
    includePersonality: true,
    messageType: 'reminder'
  });

  // Build the full delivery message
  let delivery = '';
  
  if (isForOther && senderMention) {
    delivery = `📬 **Reminder from ${senderMention}**\n\n${rewrittenMessage}`;
  } else if (isForOther) {
    delivery = `📬 **Reminder from ${senderName}**\n\n${rewrittenMessage}`;
  } else {
    delivery = `⏰ **Reminder**\n\n${rewrittenMessage}`;
  }

  return delivery;
}

export default {
  rewriteReminderMessage,
  rewriteNotification,
  formatReminderDelivery
};
