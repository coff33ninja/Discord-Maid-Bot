import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { initDatabase } from '../database/db.js';
import { createLogger } from '../logging/logger.js';
import { initializeAuth } from '../auth/auth.js';
import { initPluginSystem } from './plugin-system.js';
import { startDashboard } from '../dashboard/server.js';
import { registerCommands } from '../commands/slash-commands.js';
import { initScheduler } from '../scheduler/tasks.js';
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

      // Initialize scheduler (will be moved to plugin later)
      const handlers = {}; // Handlers will come from plugins
      initScheduler(this.client, handlers);
      this.logger.info('Scheduler initialized');

      // Pass Discord client to plugins
      const { getLoadedPlugins } = await import('./plugin-system.js');
      const plugins = getLoadedPlugins();
      plugins.forEach(pluginData => {
        if (typeof pluginData.plugin.setClient === 'function') {
          pluginData.plugin.setClient(this.client);
        }
      });
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
