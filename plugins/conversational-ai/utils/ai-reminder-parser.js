/**
 * AI-Powered Reminder Parser
 * 
 * Uses Gemini AI to parse natural language reminder requests
 * with better understanding of context and intent.
 * 
 * @module plugins/conversational-ai/utils/ai-reminder-parser
 */

import { createLogger } from '../../../src/logging/logger.js';

const logger = createLogger('ai-reminder-parser');

/**
 * Parse a reminder request using AI
 * @param {string} input - Natural language input
 * @param {Object} context - Context with userId, channelId, etc.
 * @returns {Promise<Object>} Parsed reminder data
 */
export async function parseReminderWithAI(input, context = {}) {
  if (!input || typeof input !== 'string') {
    return { success: false, error: 'Empty or invalid input' };
  }

  try {
    // Get Gemini API
    const { generateWithRotation } = await import('../../../src/config/gemini-keys.js');
    
    const now = new Date();
    const currentTime = now.toLocaleString();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    const prompt = `You are a reminder and automation parsing assistant. Parse the following request and extract structured data.

Current time: ${currentTime}
Current day: ${currentDay}

User request: "${input}"

Extract the following information and respond ONLY with valid JSON (no markdown, no explanation):
{
  "understood": true/false,
  "type": "time" | "recurring" | "presence" | "automation" | "unknown",
  "message": "the reminder message/what to remind about or automate",
  "time": {
    "type": "duration" | "clock" | "recurring" | "relative",
    "value": "the time value (e.g., '5m', '3pm', 'every hour', 'tomorrow')",
    "triggerTime": null or ISO timestamp if calculable,
    "interval": null or interval string for recurring (e.g., "1h", "1d")
  },
  "target": {
    "type": "self" | "user" | "channel" | "role" | "automation",
    "userId": null or mentioned user ID,
    "channelId": null or mentioned channel
  },
  "actions": [
    { "type": "wol", "device": "device name" },
    { "type": "homeassistant", "action": "turn on/off", "entity": "lights/switch name" },
    { "type": "scan" },
    { "type": "speedtest" }
  ],
  "confidence": 0.0 to 1.0,
  "clarification": null or "question to ask if unclear"
}

Rules:
1. "remind me in 5 minutes to X" → type: "time", time.type: "duration", time.value: "5m"
2. "remind me at 3pm to X" → type: "time", time.type: "clock", time.value: "3pm"
3. "remind me every hour to X" → type: "recurring", time.type: "recurring", time.interval: "1h"
4. "remind me tomorrow to X" → type: "time", time.type: "relative", time.value: "tomorrow"
5. "remind @user to X" → target.type: "user", extract userId from mention
6. "remind @user in 1 hour to wake their PC" → target.type: "user", actions: [{ type: "wol" }]
7. "at 6am wake my PC" → type: "automation", actions: [{ type: "wol", device: "PC" }]
8. "every morning turn on the lights" → type: "recurring", actions: [{ type: "homeassistant", action: "turn on", entity: "lights" }]
9. "in 30 minutes run a speed test" → type: "automation", actions: [{ type: "speedtest" }]
10. "every day at 8am scan the network" → type: "recurring", actions: [{ type: "scan" }]
11. "remind @user to start the game server" → target.type: "user", actions: [{ type: "game", action: "start" }]
12. If the message is unclear, set understood: false and provide clarification question
13. Extract the actual reminder message (what to remind about), not the time part
14. For durations: convert to short form (5 minutes → 5m, 2 hours → 2h, 1 day → 1d)
15. If actions are detected AND there's a target user, keep target.type: "user" but include actions
16. "every morning" = 8am, "every night" = 10pm, "every evening" = 6pm
17. Look for Discord user mentions in format <@123456789> and extract the ID

Examples:
- "remind me in 30 minutes to check the oven" → message: "check the oven", time.value: "30m", actions: []
- "set a reminder for 6pm to call mom" → message: "call mom", time.value: "6pm", actions: []
- "every day at 9am remind me to take medicine" → message: "take medicine", time.interval: "1d", actions: []
- "don't let me forget to buy milk" → message: "buy milk", clarification: "When should I remind you?"
- "at 6am wake my gaming PC" → message: "wake gaming PC", time.value: "6am", actions: [{ type: "wol", device: "gaming PC" }]
- "every hour scan the network" → message: "scan network", time.interval: "1h", actions: [{ type: "scan" }]
- "in 5 minutes turn off the bedroom lights" → message: "turn off bedroom lights", time.value: "5m", actions: [{ type: "homeassistant", action: "turn off", entity: "bedroom lights" }]
- "remind <@123456789> in 1 hour to wake their PC" → message: "wake their PC", target.type: "user", target.userId: "123456789", actions: [{ type: "wol" }]
- "remind @john at 6pm to start the game server" → message: "start the game server", target.type: "user", actions: [{ type: "game", action: "start" }]
- "tell <@987654321> in 30 minutes to run a speed test" → message: "run a speed test", target.type: "user", target.userId: "987654321", actions: [{ type: "speedtest" }]

JSON response:`;

    const { result } = await generateWithRotation(prompt);
    const response = result.response;
    
    if (!response || typeof response.text !== 'function') {
      return { success: false, error: 'AI response unavailable' };
    }
    
    let text = response.text().trim();
    
    // Clean up response - remove markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse JSON
    const parsed = JSON.parse(text);
    
    // Calculate trigger time if not provided
    if (parsed.understood && parsed.time && !parsed.time.triggerTime) {
      parsed.time.triggerTime = calculateTriggerTime(parsed.time, now);
    }
    
    return {
      success: parsed.understood,
      ...parsed,
      originalInput: input
    };
    
  } catch (error) {
    logger.error('AI reminder parsing failed:', error);
    
    // Fall back to regex parsing
    return fallbackParse(input);
  }
}

/**
 * Calculate trigger time from parsed time data
 */
function calculateTriggerTime(timeData, now) {
  if (!timeData || !timeData.value) return null;
  
  const value = timeData.value.toLowerCase();
  
  // Duration: "5m", "2h", "1d"
  if (timeData.type === 'duration') {
    const match = value.match(/^(\d+)\s*(s|m|h|d|w)$/);
    if (match) {
      const num = parseInt(match[1]);
      const unit = match[2];
      const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
      return now.getTime() + (num * multipliers[unit]);
    }
  }
  
  // Clock time: "3pm", "15:00"
  if (timeData.type === 'clock') {
    const target = new Date(now);
    
    // 12-hour format
    const match12 = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
    if (match12) {
      let hours = parseInt(match12[1]);
      const minutes = match12[2] ? parseInt(match12[2]) : 0;
      const period = match12[3];
      
      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      
      target.setHours(hours, minutes, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      return target.getTime();
    }
    
    // 24-hour format
    const match24 = value.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      target.setHours(parseInt(match24[1]), parseInt(match24[2]), 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      return target.getTime();
    }
  }
  
  // Relative: "tomorrow", "next week"
  if (timeData.type === 'relative') {
    const target = new Date(now);
    
    if (value.includes('tomorrow')) {
      target.setDate(target.getDate() + 1);
      target.setHours(9, 0, 0, 0); // Default to 9am
      return target.getTime();
    }
    
    if (value.includes('next week')) {
      target.setDate(target.getDate() + 7);
      target.setHours(9, 0, 0, 0);
      return target.getTime();
    }
  }
  
  return null;
}

/**
 * Fallback regex-based parsing when AI fails
 */
function fallbackParse(input) {
  const clean = input.toLowerCase().trim();
  
  // Try to extract basic patterns
  const patterns = [
    // "remind me in X to Y"
    { regex: /remind\s+me\s+in\s+(\d+)\s*(m|min|minutes?|h|hr|hours?|d|days?)\s+(?:to\s+)?(.+)/i, type: 'duration' },
    // "remind me at X to Y"
    { regex: /remind\s+me\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+(?:to\s+)?(.+)/i, type: 'clock' },
    // "remind me every X to Y"
    { regex: /remind\s+me\s+every\s+(\d*\s*(?:m|min|minutes?|h|hr|hours?|d|days?))\s+(?:to\s+)?(.+)/i, type: 'recurring' },
    // "set reminder for X: Y"
    { regex: /set\s+(?:a\s+)?reminder\s+(?:for|in)\s+(\d+\s*(?:m|h|d)\w*)\s*[:\s]+(.+)/i, type: 'duration' }
  ];
  
  for (const { regex, type } of patterns) {
    const match = clean.match(regex);
    if (match) {
      let timeValue = match[1].trim();
      const message = (match[3] || match[2]).trim();
      
      // Normalize time value
      if (type === 'duration') {
        timeValue = timeValue.replace(/\s+/g, '').replace(/minutes?/, 'm').replace(/hours?/, 'h').replace(/days?/, 'd');
      }
      
      return {
        success: true,
        understood: true,
        type: type === 'recurring' ? 'recurring' : 'time',
        message,
        time: {
          type,
          value: timeValue,
          triggerTime: type !== 'recurring' ? calculateTriggerTime({ type, value: timeValue }, new Date()) : null,
          interval: type === 'recurring' ? timeValue : null
        },
        target: { type: 'self' },
        confidence: 0.7,
        fallback: true
      };
    }
  }
  
  return {
    success: false,
    understood: false,
    clarification: "I couldn't understand that reminder request. Try something like:\n• \"remind me in 30 minutes to check the oven\"\n• \"remind me at 3pm to call mom\"\n• \"remind me every day to take medicine\"",
    originalInput: input
  };
}

/**
 * Format parsed reminder for confirmation
 */
export function formatReminderConfirmation(parsed) {
  if (!parsed.success) {
    return parsed.clarification || "I couldn't understand that reminder request.";
  }
  
  const typeEmoji = {
    time: '⏰',
    recurring: '🔄',
    presence: '📡'
  };
  
  let response = `${typeEmoji[parsed.type] || '📌'} **Reminder Parsed**\n\n`;
  response += `📝 **Message:** ${parsed.message}\n`;
  
  if (parsed.time) {
    if (parsed.type === 'recurring') {
      response += `🔄 **Interval:** Every ${parsed.time.interval || parsed.time.value}\n`;
    } else if (parsed.time.triggerTime) {
      response += `⏰ **When:** ${new Date(parsed.time.triggerTime).toLocaleString()}\n`;
    } else {
      response += `⏰ **When:** ${parsed.time.value}\n`;
    }
  }
  
  if (parsed.confidence < 0.8) {
    response += `\n⚠️ *Confidence: ${Math.round(parsed.confidence * 100)}% - please verify this is correct*`;
  }
  
  return response;
}

export default {
  parseReminderWithAI,
  formatReminderConfirmation
};
