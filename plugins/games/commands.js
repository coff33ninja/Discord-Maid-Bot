/**
 * Games Commands
 * 
 * Handles all game-related commands and game management.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';

// Import game modules
import { startAITrivia } from './games/trivia.js';
import { startHangman } from './games/hangman.js';
import { startNumberGuess } from './games/numguess.js';
import { challengeRPS, quickRPS } from './games/rps.js';
import { challengeTTT, playTTTvsAI } from './games/tictactoe.js';
import { startRiddles } from './games/riddles.js';
import { startWordChain } from './games/wordchain.js';
import { start20Questions } from './games/twenty-questions.js';
import { startEmojiDecode } from './games/emojidecode.js';
import { startWouldYouRather } from './games/wouldyourather.js';
import { startCaptionContest } from './games/caption.js';
import { startAcronymGame } from './games/acronym.js';
import { startStoryBuilder } from './games/storybuilder.js';
import { challengeConnect4, playConnect4AI } from './games/connectfour.js';
import { startMathBlitz } from './games/mathblitz.js';
import { startReactionRace } from './games/reaction.js';
import { startMafia } from './games/mafia.js';
import { clearActiveGame, getActiveGame, getAllActiveGames, getGlobalLeaderboard } from './games/game-manager.js';

const logger = createLogger('games');

// Standalone plugin - defines its own commands
export const parentCommand = null;

// Commands this plugin handles (for routing)
export const handlesCommands = ['game'];

/**
 * Command definitions - /game (18 games with full options)
 */
export const commands = [
  new SlashCommandBuilder()
    .setName('game')
    .setDescription('🎮 Play games')
    // Trivia with full options
    .addSubcommand(sub => sub.setName('trivia').setDescription('Trivia game')
      .addStringOption(opt => opt.setName('category').setDescription('Question category')
        .addChoices(
          { name: '🧠 General Knowledge', value: 'general' },
          { name: '🔬 Science', value: 'science' },
          { name: '📜 History', value: 'history' },
          { name: '🌍 Geography', value: 'geography' },
          { name: '🎌 Anime', value: 'anime' },
          { name: '🎮 Gaming', value: 'gaming' },
          { name: '💻 Technology', value: 'tech' },
          { name: '🎬 Movies & TV', value: 'movies' },
          { name: '🎵 Music', value: 'music' },
          { name: '⚽ Sports', value: 'sports' }
        ))
      .addStringOption(opt => opt.setName('difficulty').setDescription('Difficulty level')
        .addChoices(
          { name: '🟢 Easy', value: 'easy' },
          { name: '🟡 Medium', value: 'medium' },
          { name: '🔴 Hard', value: 'hard' }
        ))
      .addIntegerOption(opt => opt.setName('rounds').setDescription('Number of questions (1-20)').setMinValue(1).setMaxValue(20)))
    // Hangman with categories
    .addSubcommand(sub => sub.setName('hangman').setDescription('Hangman game')
      .addStringOption(opt => opt.setName('category').setDescription('Word category')
        .addChoices(
          { name: '🐾 Animals', value: 'animals' },
          { name: '🎬 Movies', value: 'movies' },
          { name: '🌍 Countries', value: 'countries' },
          { name: '🍕 Food', value: 'food' },
          { name: '💻 Technology', value: 'technology' },
          { name: '🎌 Anime', value: 'anime' },
          { name: '⚽ Sports', value: 'sports' },
          { name: '🎲 Random', value: 'random' }
        ))
      .addStringOption(opt => opt.setName('difficulty').setDescription('Difficulty')
        .addChoices(
          { name: '🟢 Easy', value: 'easy' },
          { name: '🟡 Medium', value: 'medium' },
          { name: '🔴 Hard', value: 'hard' }
        )))
    // Word chain with options
    .addSubcommand(sub => sub.setName('wordchain').setDescription('Word chain game')
      .addStringOption(opt => opt.setName('difficulty').setDescription('Difficulty')
        .addChoices(
          { name: '🟢 Easy (30s, hints)', value: 'easy' },
          { name: '🟡 Normal (20s, hints)', value: 'normal' },
          { name: '🔴 Hard (15s, no hints)', value: 'hard' },
          { name: '💀 Expert (10s, no hints)', value: 'expert' }
        ))
      .addIntegerOption(opt => opt.setName('rounds').setDescription('Number of rounds (5-50)').setMinValue(5).setMaxValue(50))
      .addBooleanOption(opt => opt.setName('trust_mode').setDescription('Trust mode (no validation)')))
    // Multiplayer games
    .addSubcommand(sub => sub.setName('tictactoe').setDescription('Tic Tac Toe')
      .addUserOption(opt => opt.setName('opponent').setDescription('Player to challenge (leave empty for AI)')))
    .addSubcommand(sub => sub.setName('connect4').setDescription('Connect Four')
      .addUserOption(opt => opt.setName('opponent').setDescription('Player to challenge (leave empty for AI)')))
    .addSubcommand(sub => sub.setName('rps').setDescription('Rock Paper Scissors')
      .addUserOption(opt => opt.setName('opponent').setDescription('Player to challenge (leave empty for quick game)'))
      .addIntegerOption(opt => opt.setName('rounds').setDescription('Best of')
        .addChoices({ name: 'Best of 3', value: 3 }, { name: 'Best of 5', value: 5 }, { name: 'Best of 7', value: 7 })))
    // Single player games
    .addSubcommand(sub => sub.setName('numguess').setDescription('Number guessing game')
      .addIntegerOption(opt => opt.setName('max').setDescription('Maximum number (10-1000)').setMinValue(10).setMaxValue(1000)))
    .addSubcommand(sub => sub.setName('riddle').setDescription('Riddle game')
      .addStringOption(opt => opt.setName('difficulty').setDescription('Difficulty')
        .addChoices({ name: '🟢 Easy', value: 'easy' }, { name: '🟡 Medium', value: 'medium' }, { name: '🔴 Hard', value: 'hard' }))
      .addIntegerOption(opt => opt.setName('rounds').setDescription('Number of riddles (1-10)').setMinValue(1).setMaxValue(10)))
    .addSubcommand(sub => sub.setName('20questions').setDescription('20 Questions with AI')
      .addStringOption(opt => opt.setName('category').setDescription('Category')
        .addChoices(
          { name: '🐾 Animals', value: 'animals' },
          { name: '📦 Objects', value: 'objects' },
          { name: '👤 People', value: 'people' },
          { name: '🌍 Places', value: 'places' },
          { name: '🎲 Random', value: 'random' }
        )))
    .addSubcommand(sub => sub.setName('emojidecode').setDescription('Guess from emojis')
      .addStringOption(opt => opt.setName('category').setDescription('Category')
        .addChoices(
          { name: '🎬 Movies', value: 'movies' },
          { name: '🎵 Songs', value: 'songs' },
          { name: '📚 Books', value: 'books' },
          { name: '🎲 Random', value: 'random' }
        )))
    .addSubcommand(sub => sub.setName('wouldyourather').setDescription('Would You Rather')
      .addStringOption(opt => opt.setName('category').setDescription('Category')
        .addChoices({ name: '😂 Funny', value: 'funny' }, { name: '🤔 Serious', value: 'serious' }, { name: '🎲 Random', value: 'random' })))
    .addSubcommand(sub => sub.setName('caption').setDescription('Caption contest'))
    .addSubcommand(sub => sub.setName('acronym').setDescription('Acronym game')
      .addIntegerOption(opt => opt.setName('length').setDescription('Acronym length (3-6)').setMinValue(3).setMaxValue(6)))
    .addSubcommand(sub => sub.setName('story').setDescription('Collaborative story builder')
      .addStringOption(opt => opt.setName('genre').setDescription('Story genre')
        .addChoices(
          { name: '🧙 Fantasy', value: 'fantasy' },
          { name: '🚀 Sci-Fi', value: 'scifi' },
          { name: '👻 Horror', value: 'horror' },
          { name: '😂 Comedy', value: 'comedy' },
          { name: '🎲 Random', value: 'random' }
        ))
      .addIntegerOption(opt => opt.setName('rounds').setDescription('Number of rounds (3-20)').setMinValue(3).setMaxValue(20)))
    .addSubcommand(sub => sub.setName('mathblitz').setDescription('Math blitz')
      .addStringOption(opt => opt.setName('difficulty').setDescription('Difficulty')
        .addChoices({ name: '🟢 Easy', value: 'easy' }, { name: '🟡 Medium', value: 'medium' }, { name: '🔴 Hard', value: 'hard' }))
      .addIntegerOption(opt => opt.setName('rounds').setDescription('Number of rounds (5-30)').setMinValue(5).setMaxValue(30)))
    .addSubcommand(sub => sub.setName('reaction').setDescription('Reaction race'))
    .addSubcommand(sub => sub.setName('mafia').setDescription('Mafia/Werewolf game')
      .addIntegerOption(opt => opt.setName('players').setDescription('Number of players (5-20)').setMinValue(5).setMaxValue(20)))
    // Management commands
    .addSubcommand(sub => sub.setName('stats').setDescription('View your game statistics'))
    .addSubcommand(sub => sub.setName('stop').setDescription('Stop the current game'))
    .addSubcommand(sub => sub.setName('leaderboard').setDescription('View the games leaderboard'))
];

/**
 * Handle game commands
 */
export async function handleCommand(interaction, commandName, subcommand) {
  if (commandName !== 'game') return false;
  
  try {
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
      case 'riddle':
        return await handleRiddle(interaction);
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
      case 'connect4':
        return await handleConnect4(interaction);
      case 'mathblitz':
        return await handleMathBlitz(interaction);
      case 'reaction':
        return await handleReaction(interaction);
      case 'mafia':
        return await handleMafia(interaction);
      default:
        return false;
    }
  } catch (error) {
    logger.error(`Game error (${subcommand}):`, error);
    const reply = { content: `❌ Game error: ${error.message}`, ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(reply);
    } else {
      await interaction.reply(reply);
    }
    return true;
  }
}

/**
 * Stop active game in channel
 */
async function handleStopGame(interaction) {
  const channelId = interaction.channelId;
  const activeGame = getActiveGame(channelId);
  
  if (!activeGame) {
    await interaction.reply({ content: '❌ No active game in this channel!', ephemeral: true });
    return true;
  }
  
  clearActiveGame(channelId);
  await interaction.reply({ content: `✅ Stopped **${activeGame.type}** game!` });
  return true;
}

/**
 * Show game statistics
 */
async function handleGameStats(interaction) {
  const activeGames = getAllActiveGames();
  
  const embed = new EmbedBuilder()
    .setColor('#FF6B6B')
    .setTitle('🎮 Game Statistics')
    .addFields(
      { name: '🎯 Active Games', value: `${activeGames.length}`, inline: true },
      { name: '🎲 Available Games', value: '18', inline: true }
    )
    .setFooter({ text: 'Use /game <gamename> to start a game!' })
    .setTimestamp();
  
  if (activeGames.length > 0) {
    const gamesList = activeGames.map(g => `• ${g.gameType} in <#${g.channelId}>`).join('\n');
    embed.addFields({ name: '🎮 Currently Playing', value: gamesList, inline: false });
  }
  
  await interaction.reply({ embeds: [embed] });
  return true;
}

/**
 * Show leaderboard
 */
async function handleLeaderboard(interaction) {
  const leaderboard = await getGlobalLeaderboard(10);
  
  if (leaderboard.length === 0) {
    await interaction.reply({ content: '🏆 No scores yet! Play some games to get on the leaderboard.', ephemeral: true });
    return true;
  }
  
  const medals = ['🥇', '🥈', '🥉'];
  const lines = leaderboard.map((p, i) => {
    const medal = medals[i] || `${i + 1}.`;
    return `${medal} <@${p.odId}> - **${p.totalPoints}** pts (${p.gamesWon}/${p.gamesPlayed} wins)`;
  });
  
  const embed = new EmbedBuilder()
    .setColor('#FFD700')
    .setTitle('🏆 Games Leaderboard')
    .setDescription(lines.join('\n'))
    .setFooter({ text: 'Play games to climb the leaderboard!' })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
  return true;
}

// ============================================
// GAME HANDLERS
// ============================================

async function handleTrivia(interaction) {
  const category = interaction.options.getString('category') || 'general';
  const difficulty = interaction.options.getString('difficulty') || 'medium';
  const rounds = interaction.options.getInteger('rounds') || 5;
  await startAITrivia(interaction, category, difficulty, rounds);
  return true;
}

async function handleHangman(interaction) {
  const category = interaction.options.getString('category') || 'random';
  await startHangman(interaction, category);
  return true;
}

async function handleNumGuess(interaction) {
  const max = interaction.options.getInteger('max') || 100;
  await startNumberGuess(interaction, max);
  return true;
}

async function handleRPS(interaction) {
  const opponent = interaction.options.getUser('opponent');
  const rounds = interaction.options.getInteger('rounds') || 3;
  
  if (opponent) {
    await challengeRPS(interaction, opponent, rounds);
  } else {
    await quickRPS(interaction);
  }
  return true;
}

async function handleTicTacToe(interaction) {
  const opponent = interaction.options.getUser('opponent');
  
  if (opponent) {
    await challengeTTT(interaction, opponent);
  } else {
    await playTTTvsAI(interaction);
  }
  return true;
}

async function handle20Questions(interaction) {
  const category = interaction.options.getString('category') || 'random';
  await start20Questions(interaction, category);
  return true;
}

async function handleRiddle(interaction) {
  const difficulty = interaction.options.getString('difficulty') || 'medium';
  const rounds = interaction.options.getInteger('rounds') || 5;
  await startRiddles(interaction, difficulty, rounds);
  return true;
}

async function handleWordChain(interaction) {
  const difficulty = interaction.options.getString('difficulty') || 'normal';
  const rounds = interaction.options.getInteger('rounds');
  const trustMode = interaction.options.getBoolean('trust_mode') || false;
  await startWordChain(interaction, { difficulty, rounds, trust_mode: trustMode });
  return true;
}

async function handleEmojiDecode(interaction) {
  const category = interaction.options.getString('category') || 'random';
  await startEmojiDecode(interaction, category);
  return true;
}

async function handleWouldYouRather(interaction) {
  const category = interaction.options.getString('category') || 'random';
  await startWouldYouRather(interaction, category);
  return true;
}

async function handleCaption(interaction) {
  await startCaptionContest(interaction);
  return true;
}

async function handleAcronym(interaction) {
  const length = interaction.options.getInteger('length') || 4;
  await startAcronymGame(interaction, 5, length);
  return true;
}

async function handleStory(interaction) {
  const genre = interaction.options.getString('genre') || 'random';
  const rounds = interaction.options.getInteger('rounds') || 10;
  await startStoryBuilder(interaction, genre, rounds);
  return true;
}

async function handleConnect4(interaction) {
  const opponent = interaction.options.getUser('opponent');
  
  if (opponent) {
    await challengeConnect4(interaction, opponent);
  } else {
    await playConnect4AI(interaction);
  }
  return true;
}

async function handleMathBlitz(interaction) {
  const difficulty = interaction.options.getString('difficulty') || 'medium';
  const rounds = interaction.options.getInteger('rounds') || 10;
  await startMathBlitz(interaction, difficulty, rounds);
  return true;
}

async function handleReaction(interaction) {
  await startReactionRace(interaction);
  return true;
}

async function handleMafia(interaction) {
  const players = interaction.options.getInteger('players') || 6;
  await startMafia(interaction, players);
  return true;
}
