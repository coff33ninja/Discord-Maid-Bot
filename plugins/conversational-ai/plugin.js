/**
 * Conversational AI Plugin
 * 
 * Provides chat functionality with AI-powered responses using Gemini API.
 * Supports multiple personalities and maintains chat history.
 * 
 * Features:
 * - Natural conversation with AI
 * - Personality-aware responses
 * - Chat history tracking
 * - Context-aware replies
 * 
 * @module plugins/conversational-ai
 */

import { Plugin } from '../../src/core/plugin-system.js';
import { createLogger } from '../../src/logging/logger.js';

export default class ConversationalAIPlugin extends Plugin {
  constructor() {
    super('conversational-ai', '1.0.0', 'AI-powered conversational chat with personality support', {
      optionalDependencies: ['personality'],
      category: 'ai',
      author: 'Discord Maid Bot',
      keywords: ['chat', 'ai', 'conversation', 'gemini']
    });
    this.logger = createLogger('conversational-ai');
  }

  async onLoad() {
    this.logger.info(`[${this.name}] Loading conversational AI plugin...`);
    this.logger.info(`[${this.name}] ✅ Conversational AI plugin loaded`);
  }

  async onUnload() {
    this.logger.info(`[${this.name}] Unloading conversational AI plugin...`);
  }
}
