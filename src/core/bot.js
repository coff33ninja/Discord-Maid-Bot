import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { initDatabase } from '../database/db.js';
import { createLogger } from '../logging/logger.js';
import { initializeAuth } from '../auth/auth.js';
import { initPluginSystem } from './plugin-system.js';
import { startDashboard } from '../dashboard/server.js';
import { registerCommands } from '../commands/slash-commands.js';
import { EventRouter } from './event-router.js';

// Load environment variables
dotenv.config();

/**
 * Main Bot Class
 * Minimal core that initializes systems and manages lifecycle
 */
export class MaidBot {
  constructor() {
    this.logger = createLogger('core');
    this.client = null;
    this.eventRouter = null;
  }

  /**
   * Initialize all core systems
   */
  async initialize() {
    this.logger.info('Initializing Discord Maid Bot...');

    // Initialize database
    initDatabase();
    this.logger.info('Database initialized');

    // Initialize authentication
    await initializeAuth();
    this.logger.info('Authentication system initialized');

    // Initialize plugin system
    await initPluginSystem();
    this.logger.info('Plugin system initialized');

    // Apply plugin schema extensions to database
    const { applyPluginSchemas } = await import('../database/db.js');
    await applyPluginSchemas();

    // Register core handlers for plugins
    await this.registerCoreHandlers();
    this.logger.info('Core handlers registered for plugins');

    // Create Discord client
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    // Initialize event router
    this.eventRouter = new EventRouter(this);
    this.logger.info('Event router initialized');

    // Setup event handlers
    this.setupEventHandlers();
  }

  /**
   * Setup Discord event handlers
   */
  setupEventHandlers() {
    // Bot ready event
    this.client.once('ready', async () => {
      this.logger.info('='.repeat(60));
      this.logger.info('🌸 Maid Bot is ready to serve! 🌸');
      this.logger.info('='.repeat(60));
      this.logger.info(`Logged in as: ${this.client.user.tag}`);
      this.logger.info(`Serving ${this.client.guilds.cache.size} server(s)`);

      // Register slash commands
      await registerCommands(this.client);
      this.logger.info('Slash commands registered');

      // Start web dashboard
      const dashboardPort = process.env.DASHBOARD_PORT || 3000;
      startDashboard(dashboardPort);
      this.logger.info(`Dashboard started on port ${dashboardPort}`);

      // Pass Discord client to plugins (they will initialize their own services)
      const { getLoadedPlugins, getPlugin } = await import('./plugin-system.js');
      const plugins = getLoadedPlugins();
      for (const pluginData of plugins) {
        if (pluginData && pluginData.name) {
          const plugin = getPlugin(pluginData.name);
          if (plugin && typeof plugin.setClient === 'function') {
            plugin.setClient(this.client);
          }
        }
      }
      this.logger.info('Discord client passed to plugins');

      // Set bot status
      this.client.user.setPresence({
        activities: [{ name: 'at your service ✨ | /help', type: 0 }],
        status: 'online',
      });

      this.logger.info('='.repeat(60));
      this.logger.info('Bot startup complete!');
    });

    // Route interaction events to event router
    this.client.on('interactionCreate', async (interaction) => {
      await this.eventRouter.routeInteraction(interaction);
    });

    // Route message events to event router
    this.client.on('messageCreate', async (message) => {
      await this.eventRouter.routeMessage(message);
    });

    // Error handling
    this.client.on('error', (error) => {
      this.logger.error('Discord client error:', error);
    });

    process.on('unhandledRejection', (error) => {
      this.logger.error('Unhandled rejection:', error);
    });
  }

  /**
   * Start the bot
   */
  async start() {
    try {
      await this.initialize();
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
      this.logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  }

  /**
   * Register core handlers for plugins
   * Plugins use these to request data/actions from core without importing core directly
   */
  async registerCoreHandlers() {
    const { registerCoreHandler } = await import('./plugin-system.js');
    const { deviceOps, configOps } = await import('../database/db.js');

    registerCoreHandler('get-all-devices', async () => {
      return deviceOps.getAll();
    });

    registerCoreHandler('update-device-notes', async (data) => {
      const { deviceId, notes } = data;
      deviceOps.updateNotes(deviceId, notes);
      return { success: true };
    });

    registerCoreHandler('set-device-emoji', async (data) => {
      const { mac, emoji } = data;
      deviceOps.setEmoji(mac, emoji);
      return { success: true };
    });

    registerCoreHandler('assign-device-group', async (data) => {
      const { mac, groupName } = data;
      deviceOps.assignGroup(mac, groupName);
      return { success: true };
    });

    // Register Gemini AI service
    registerCoreHandler('gemini-generate', async (data) => {
      const { generateWithRotation } = await import('../config/gemini-keys.js');
      const { prompt, options } = data;
      return await generateWithRotation(prompt, options || {});
    });

    // Register SMB service
    registerCoreHandler('smb-save', async (data) => {
      const { saveToSMB } = await import('../config/smb-config.js');
      const { filename, content } = data;
      return await saveToSMB(filename, content);
    });

    registerCoreHandler('smb-config', async () => {
      const { getSMBConfig } = await import('../config/smb-config.js');
      return getSMBConfig();
    });

    // Sync environment variables to database (for integrations)
    configOps.syncFromEnv('HA_URL', 'ha_url', process.env.HA_URL);
    configOps.syncFromEnv('HA_TOKEN', 'ha_token', process.env.HA_TOKEN);
    configOps.syncFromEnv('SMB_HOST', 'smb_host', process.env.SMB_HOST);
    configOps.syncFromEnv('SMB_USERNAME', 'smb_username', process.env.SMB_USERNAME);
    configOps.syncFromEnv('SMB_PASSWORD', 'smb_password', process.env.SMB_PASSWORD);
    configOps.syncFromEnv('SMB_SHARE', 'smb_share', process.env.SMB_SHARE);

    // Note: Integrations like Home Assistant are initialized by their plugins
    // No need to initialize them from core
  }

  /**
   * Stop the bot gracefully
   */
  async stop() {
    this.logger.info('Stopping Discord Maid Bot...');
    if (this.client) {
      await this.client.destroy();
    }
    this.logger.info('Bot stopped');
  }
}
