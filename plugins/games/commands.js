/**
 * Games Commands
 * 
 * Handles all game-related commands and game management.
 */

import { EmbedBuilder } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';

// These are subcommands under /game
export const parentCommand = 'game';

// We'll handle multiple game subcommands via bridge routing
export const commandGroup = null; // Special case - handled in bridge

/**
 * Handle game commands
 */
export async function handleCommand(interaction, commandName, subcommand) {
  if (commandName !== 'game') return false;
  
  // Game management commands
  if (subcommand === 'stop') {
    return await handleStopGame(interaction);
  } else if (subcommand === 'stats') {
    return await handleGameStats(interaction);
  } else if (subcommand === 'leaderboard') {
    return await handleLeaderboard(interaction);
  }
  
  // Individual game commands
  switch (subcommand) {
    case 'trivia':
      return await handleTrivia(interaction);
    case 'hangman':
      return await handleHangman(interaction);
    case 'numguess':
      return await handleNumGuess(interaction);
    case 'rps':
      return await handleRPS(interaction);
    case 'tictactoe':
      return await handleTicTacToe(interaction);
    case '20questions':
      return await handle20Questions(interaction);
    case 'riddles':
      return await handleRiddles(interaction);
    case 'wordchain':
      return await handleWordChain(interaction);
    case 'emojidecode':
      return await handleEmojiDecode(interaction);
    case 'wouldyourather':
      return await handleWouldYouRather(interaction);
    case 'caption':
      return await handleCaption(interaction);
    case 'acronym':
      return await handleAcronym(interaction);
    case 'story':
      return await handleStory(interaction);
    case 'connectfour':
      return await handleConnectFour(interaction);
    case 'mathblitz':
      return await handleMathBlitz(interaction);
    case 'reaction':
      return await handleReaction(interaction);
    case 'mafia':
      return await handleMafia(interaction);
    default:
      return false;
  }
}

/**
 * Stop active game in channel
 */
async function handleStopGame(interaction) {
  try {
    const { getPlugin } = await import('../../src/core/plugin-system.js');
    const gamesPlugin = getPlugin('games');
    
    if (!gamesPlugin) {
      await interaction.reply({ content: '❌ Games plugin not available!', ephemeral: true });
      return true;
    }
    
    const channelId = interaction.channelId;
    const activeGame = gamesPlugin.getActiveGame(channelId);
    
    if (!activeGame) {
      await interaction.reply({ content: '❌ No active game in this channel!', ephemeral: true });
      return true;
    }
    
    gamesPlugin.stopGame(channelId);
    
    await interaction.reply({
      content: `✅ Stopped **${activeGame.gameType}** game!`,
      ephemeral: false
    });
    return true;
  } catch (error) {
    logger.error('Stop game error:', error);
    await interaction.reply({ content: `❌ Failed to stop game: ${error.message}`, ephemeral: true });
    return true;
  }
}

/**
 * Show game statistics
 */
async function handleGameStats(interaction) {
  try {
    const { getPlugin } = await import('../../src/core/plugin-system.js');

const logger = createLogger('games');
    const gamesPlugin = getPlugin('games');
    
    if (!gamesPlugin) {
      await interaction.reply({ content: '❌ Games plugin not available!', ephemeral: true });
      return true;
    }
    
    const activeGames = gamesPlugin.getActiveGames();
    
    const embed = new EmbedBuilder()
      .setColor('#FF6B6B')
      .setTitle('🎮 Game Statistics')
      .addFields(
        { name: '🎯 Active Games', value: `${activeGames.length}`, inline: true },
        { name: '🎲 Total Games', value: '18', inline: true },
        { name: '👥 Players', value: 'Multiple', inline: true }
      )
      .setFooter({ text: 'Use /game <gamename> to start a game!' })
      .setTimestamp();
    
    if (activeGames.length > 0) {
      const gamesList = activeGames.map(g => `${g.gameType} in <#${g.channelId}>`).join('\n');
      embed.addFields({ name: '🎮 Active Games', value: gamesList, inline: false });
    }
    
    await interaction.reply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Game stats error:', error);
    await interaction.reply({ content: `❌ Failed to get stats: ${error.message}`, ephemeral: true });
    return true;
  }
}

/**
 * Show leaderboard
 */
async function handleLeaderboard(interaction) {
  await interaction.reply({
    content: '🏆 **Game Leaderboards**\n\n🚧 Leaderboard system coming soon!\n\nThis will track:\n- Top players\n- Win rates\n- High scores\n- Achievements',
    ephemeral: false
  });
  return true;
}

/**
 * Individual game handlers (simplified - full implementation in src/games/)
 */

async function handleTrivia(interaction) {
  await interaction.reply({
    content: '🎯 **Trivia Game**\n\n🚧 Starting trivia game...\n\nFull game implementation coming soon!\n\nWill include:\n- AI-generated questions\n- Research mode\n- Speed mode\n- Multiple categories',
    ephemeral: false
  });
  return true;
}

async function handleHangman(interaction) {
  await interaction.reply({
    content: '🎯 **Hangman Game**\n\n🚧 Starting hangman...\n\nGuess the word letter by letter!',
    ephemeral: false
  });
  return true;
}

async function handleNumGuess(interaction) {
  await interaction.reply({
    content: '🎯 **Number Guessing Game**\n\n🚧 Starting number guess...\n\nGuess the number between 1-100!',
    ephemeral: false
  });
  return true;
}

async function handleRPS(interaction) {
  await interaction.reply({
    content: '🎯 **Rock Paper Scissors**\n\n🚧 Starting RPS...\n\nChoose your move!',
    ephemeral: false
  });
  return true;
}

async function handleTicTacToe(interaction) {
  await interaction.reply({
    content: '🎯 **Tic Tac Toe**\n\n🚧 Starting tic tac toe...\n\nClassic 3x3 grid game!',
    ephemeral: false
  });
  return true;
}

async function handle20Questions(interaction) {
  await interaction.reply({
    content: '🎯 **20 Questions**\n\n🚧 Starting 20 questions...\n\nThink of something and I\'ll guess it!',
    ephemeral: false
  });
  return true;
}

async function handleRiddles(interaction) {
  await interaction.reply({
    content: '🎯 **Riddles**\n\n🚧 Starting riddles...\n\nSolve the riddle!',
    ephemeral: false
  });
  return true;
}

async function handleWordChain(interaction) {
  await interaction.reply({
    content: '🎯 **Word Chain**\n\n🚧 Starting word chain...\n\nCreate a chain of words!',
    ephemeral: false
  });
  return true;
}

async function handleEmojiDecode(interaction) {
  await interaction.reply({
    content: '🎯 **Emoji Decode**\n\n🚧 Starting emoji decode...\n\nGuess the phrase from emojis!',
    ephemeral: false
  });
  return true;
}

async function handleWouldYouRather(interaction) {
  await interaction.reply({
    content: '🎯 **Would You Rather**\n\n🚧 Starting would you rather...\n\nChoose between two options!',
    ephemeral: false
  });
  return true;
}

async function handleCaption(interaction) {
  await interaction.reply({
    content: '🎯 **Caption Contest**\n\n🚧 Starting caption contest...\n\nCreate the best caption!',
    ephemeral: false
  });
  return true;
}

async function handleAcronym(interaction) {
  await interaction.reply({
    content: '🎯 **Acronym Game**\n\n🚧 Starting acronym game...\n\nCreate phrases from acronyms!',
    ephemeral: false
  });
  return true;
}

async function handleStory(interaction) {
  await interaction.reply({
    content: '🎯 **Story Builder**\n\n🚧 Starting story builder...\n\nBuild a story together!',
    ephemeral: false
  });
  return true;
}

async function handleConnectFour(interaction) {
  await interaction.reply({
    content: '🎯 **Connect Four**\n\n🚧 Starting connect four...\n\nConnect 4 in a row!',
    ephemeral: false
  });
  return true;
}

async function handleMathBlitz(interaction) {
  await interaction.reply({
    content: '🎯 **Math Blitz**\n\n🚧 Starting math blitz...\n\nSolve math problems quickly!',
    ephemeral: false
  });
  return true;
}

async function handleReaction(interaction) {
  await interaction.reply({
    content: '🎯 **Reaction Race**\n\n🚧 Starting reaction race...\n\nTest your reaction time!',
    ephemeral: false
  });
  return true;
}

async function handleMafia(interaction) {
  await interaction.reply({
    content: '🎯 **Mafia Game**\n\n🚧 Starting mafia...\n\nMultiplayer deduction game!',
    ephemeral: false
  });
  return true;
}
