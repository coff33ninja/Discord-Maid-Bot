/**
 * Personality Plugin
 * 
 * Manages bot personality system with multiple personality types.
 * Users can select different personalities that affect how the bot responds.
 * 
 * Features:
 * - 10 unique personalities (maid, tsundere, kuudere, etc.)
 * - Per-user personality preferences
 * - Personality preview and switching
 * - Integration with conversational AI
 * 
 * @module plugins/personality
 */

export default class PersonalityPlugin {
  constructor() {
    this.name = 'personality';
    this.version = '1.0.0';
    this.description = 'Bot personality management system with multiple personality types';
  }

  async onLoad(client, coreHandlers) {
    console.log(`[${this.name}] Loading personality plugin...`);
    this.client = client;
    this.coreHandlers = coreHandlers;
    console.log(`[${this.name}] ✅ Personality plugin loaded`);
  }

  async onUnload() {
    console.log(`[${this.name}] Unloading personality plugin...`);
  }
}
