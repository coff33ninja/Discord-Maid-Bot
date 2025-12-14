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

export default class ConversationalAIPlugin extends Plugin {
  constructor() {
    super('1.0.0.0-beta', '1.0.0', 'AI-powered conversational chat with personality support', {
      optionalDependencies: ['personality'],
      category: 'ai',
      author: 'Discord Maid Bot',
      keywords: ['chat', 'ai', 'conversation', 'gemini']
    });
  }

  async onLoad() {
    console.log(`[${this.name}] Loading conversational AI plugin...`);
    console.log(`[${this.name}] ✅ Conversational AI plugin loaded`);
  }

  async onUnload() {
    console.log(`[${this.name}] Unloading conversational AI plugin...`);
  }
}
