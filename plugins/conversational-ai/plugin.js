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

export default class ConversationalAIPlugin {
  constructor() {
    this.name = 'conversational-ai';
    this.version = '1.0.0';
    this.description = 'AI-powered conversational chat with personality support';
  }

  async onLoad(client, coreHandlers) {
    console.log(`[${this.name}] Loading conversational AI plugin...`);
    this.client = client;
    this.coreHandlers = coreHandlers;
    console.log(`[${this.name}] ✅ Conversational AI plugin loaded`);
  }

  async onUnload() {
    console.log(`[${this.name}] Unloading conversational AI plugin...`);
  }
}
