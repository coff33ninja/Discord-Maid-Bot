/**
 * Discord Maid Bot - Entry Point
 * 
 * Minimal entry point that initializes and starts the bot
 * All core logic is in src/core/
 */

import { MaidBot } from './src/core/bot.js';

// Create and start bot
const bot = new MaidBot();

// Start the bot
bot.start().catch((error) => {
  console.error('Fatal error starting bot:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await bot.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await bot.stop();
  process.exit(0);
});

console.log('🌸 Starting Discord Maid Bot...');
