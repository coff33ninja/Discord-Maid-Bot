import { Plugin } from '../../src/core/plugin-system.js';

/**
 * Core Commands Plugin
 * 
 * Provides essential bot commands:
 * - /help - Show all available commands
 * - /stats - Display bot statistics
 * - /ping - Check bot latency
 * - /dashboard - Get dashboard URL
 * - /plugin - Manage plugins (admin only)
 */
export default class CoreCommandsPlugin extends Plugin {
  constructor() {
    super(
      'core-commands',
      '1.0.0',
      'Essential bot commands (help, stats, ping, dashboard, plugin management)'
    );
  }

  async onLoad() {
    console.log('📋 Core Commands plugin loaded');
  }

  async onEnable() {
    console.log('✅ Core Commands plugin enabled');
  }

  async onDisable() {
    console.log('⏸️  Core Commands plugin disabled');
  }

  async onUnload() {
    console.log('👋 Core Commands plugin unloaded');
  }
}
