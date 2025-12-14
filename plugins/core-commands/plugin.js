import { Plugin } from '../../src/core/plugin-system.js';
import { createLogger } from '../../src/logging/logger.js';

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
    this.logger = createLogger('core-commands');
  }

  async onLoad() {
    this.logger.info('📋 Core Commands plugin loaded');
  }

  async onEnable() {
    this.logger.info('✅ Core Commands plugin enabled');
  }

  async onDisable() {
    this.logger.info('⏸️  Core Commands plugin disabled');
  }

  async onUnload() {
    this.logger.info('👋 Core Commands plugin unloaded');
  }
}
