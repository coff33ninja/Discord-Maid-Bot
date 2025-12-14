/**
 * Games Commands - Queued Loading System
 * 
 * Uses autocomplete to show available games, then dynamically loads the selected game.
 * This is faster than loading all 18 subcommands at once.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';
import { clearActiveGame, getActiveGame, getAllActiveGames, getGlobalLeaderboard } from './games/game-manager.js';

const logger = createLogger('games');

// Standalone plugin - defines its own commands
export const parentCommand = null;

// Handler-only mode (commands defined in commands array, not injected into parent)
export const commandGroup = null;

// Commands this plugin handles (for routing)
export const handlesCommands = ['game'];

// Available games registry
const GAMES = {
  trivia: { name: 'Trivia', emoji: '🧠', description: 'AI-generated trivia questions', multiplayer: true },
  hangman: { name: 'Hangman', emoji: '🎯', description: 'Guess the word letter by letter', multiplayer: true },
  numguess: { name: 'Number Guess', emoji: '🔢', description: 'Guess the secret number', multiplayer: true },
  rps: { name: 'Rock Paper Scissors', emoji: '✊', description: 'Classic RPS game', multiplayer: true },
  tictactoe: { name: 'Tic Tac Toe', emoji: '⭕', description: 'Classic 3x3 grid game', multiplayer: true },
  connect4: { name: 'Connect Four', emoji: '🔴', description: 'Connect 4 in a row', multiplayer: true },
  riddle: { name: 'Riddles', emoji: '🧩', description: 'Solve AI-generated riddles', multiplayer: true },
  wordchain: { name: 'Word Chain', emoji: '🔗', description: 'Chain words by last letter', multiplayer: true },
  '20questions': { name: '20 Questions', emoji: '❓', description: 'AI guesses what you\'re thinking', multiplayer: false },
  emojidecode: { name: 'Emoji Decode', emoji: '😀', description: 'Guess from emoji clues', multiplayer: true },
  wouldyourather: { name: 'Would You Rather', emoji: '🤔', description: 'Choose between options', multiplayer: true },
  caption: { name: 'Caption Contest', emoji: '📝', description: 'Create funny captions', multiplayer: true },
  acronym: { name: 'Acronym Game', emoji: '🔤', description: 'Create phrases from letters', multiplayer: true },
  story: { name: 'Story Builder', emoji: '📖', description: 'Collaborative storytelling', multiplayer: true },
  mathblitz: { name: 'Math Blitz', emoji: '🔢', description: 'Speed math challenges', multiplayer: true },
  reaction: { name: 'Reaction Race', emoji: '⚡', description: 'Test your reaction time', multiplayer: true },
  mafia: { name: 'Mafia', emoji: '🎭', description: 'Social deduction game', multiplayer: true }
};

/**
 * Command definitions - Simplified with queued loading
 */
export const commands = [
  new SlashCommandBuilder()
    .setName('game')
    .setDescription('🎮 Play games')
    // Play a game
    .addSubcommand(sub => sub
      .setName('play')
      .setDescription('Start a game')
      .addStringOption(opt => opt
        .setName('game')
        .setDescription('Which game to play')
        .setRequired(true)
        .setAutocomplete(true))
      .addStringOption(opt => opt
        .setName('difficulty')
        .setDescription('Difficulty level')
        .addChoices(
          { name: '🟢 Easy', value: 'easy' },
          { name: '� Mediu,m', value: 'medium' },
          { name: '� MHard', value: 'hard' }
        ))
      .addUserOption(opt => opt
        .setName('opponent')
        .setDescription('Challenge a player (for multiplayer games)'))
      .addIntegerOption(opt => opt
        .setName('rounds')
        .setDescription('Number of rounds (1-20)')
        .setMinValue(1)
        .setMaxValue(20)))
    // List available games
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List all available games'))
    // View stats
    .addSubcommand(sub => sub
      .setName('stats')
      .setDescription('View game statistics'))
    // Stop current game
    .addSubcommand(sub => sub
      .setName('stop')
      .setDescription('Stop the current game'))
    // Leaderboard
    .addSubcommand(sub => sub
      .setName('leaderboard')
      .setDescription('View the games leaderboard'))
];

/**
 * Handle autocomplete for game selection
 */
export async function handleAutocomplete(interaction) {
  const focused = interaction.options.getFocused(true);
  
  if (focused.name === 'game') {
    const search = focused.value.toLowerCase();
    const choices = Object.entries(GAMES)
      .filter(([key, game]) => 
        key.includes(search) || 
        game.name.toLowerCase().includes(search))
      .slice(0, 25)
      .map(([key, game]) => ({
        name: `${game.emoji} ${game.name} - ${game.description}`,
        value: key
      }));
    
    await interaction.respond(choices);
  }
}

/**
 * Handle game commands
 */
export async function handleCommand(interaction, commandName, subcommand) {
  if (commandName !== 'game') return false;
  
  try {
    switch (subcommand) {
      case 'play':
        return await handlePlayGame(interaction);
      case 'list':
        return await handleListGames(interaction);
      case 'stats':
        return await handleGameStats(interaction);
      case 'stop':
        return await handleStopGame(interaction);
      case 'leaderboard':
        return await handleLeaderboard(interaction);
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
 * Play a game - dynamically loads the game module
 */
async function handlePlayGame(interaction) {
  const gameKey = interaction.options.getString('game');
  const difficulty = interaction.options.getString('difficulty') || 'medium';
  const opponent = interaction.options.getUser('opponent');
  const rounds = interaction.options.getInteger('rounds') || 5;
  
  const gameInfo = GAMES[gameKey];
  if (!gameInfo) {
    await interaction.reply({ content: `❌ Unknown game: ${gameKey}`, ephemeral: true });
    return true;
  }
  
  logger.info(`Starting game: ${gameKey} (difficulty: ${difficulty}, rounds: ${rounds})`);
  
  // Dynamically load and start the game
  switch (gameKey) {
    case 'trivia': {
      const { startAITrivia } = await import('./games/trivia.js');
      await startAITrivia(interaction, 'general', difficulty, rounds);
      break;
    }
    case 'hangman': {
      const { startHangman } = await import('./games/hangman.js');
      await startHangman(interaction, 'random');
      break;
    }
    case 'numguess': {
      const { startNumberGuess } = await import('./games/numguess.js');
      const max = difficulty === 'easy' ? 50 : difficulty === 'hard' ? 500 : 100;
      await startNumberGuess(interaction, max);
      break;
    }
    case 'rps': {
      const { challengeRPS, quickRPS } = await import('./games/rps.js');
      if (opponent) {
        await challengeRPS(interaction, opponent, rounds);
      } else {
        await quickRPS(interaction);
      }
      break;
    }
    case 'tictactoe': {
      const { challengeTTT, playTTTvsAI } = await import('./games/tictactoe.js');
      if (opponent) {
        await challengeTTT(interaction, opponent);
      } else {
        await playTTTvsAI(interaction);
      }
      break;
    }
    case 'connect4': {
      const { challengeConnect4, playConnect4AI } = await import('./games/connectfour.js');
      if (opponent) {
        await challengeConnect4(interaction, opponent);
      } else {
        await playConnect4AI(interaction);
      }
      break;
    }
    case 'riddle': {
      const { startRiddles } = await import('./games/riddles.js');
      await startRiddles(interaction, difficulty, rounds);
      break;
    }
    case 'wordchain': {
      const { startWordChain } = await import('./games/wordchain.js');
      await startWordChain(interaction, { difficulty, rounds });
      break;
    }
    case '20questions': {
      const { start20Questions } = await import('./games/twenty-questions.js');
      await start20Questions(interaction, 'random');
      break;
    }
    case 'emojidecode': {
      const { startEmojiDecode } = await import('./games/emojidecode.js');
      await startEmojiDecode(interaction, 'random', rounds);
      break;
    }
    case 'wouldyourather': {
      const { startWouldYouRather } = await import('./games/wouldyourather.js');
      await startWouldYouRather(interaction, rounds);
      break;
    }
    case 'caption': {
      const { startCaptionContest } = await import('./games/caption.js');
      await startCaptionContest(interaction, rounds);
      break;
    }
    case 'acronym': {
      const { startAcronymGame } = await import('./games/acronym.js');
      await startAcronymGame(interaction, rounds, 4);
      break;
    }
    case 'story': {
      const { startStoryBuilder } = await import('./games/storybuilder.js');
      await startStoryBuilder(interaction, 'random', rounds);
      break;
    }
    case 'mathblitz': {
      const { startMathBlitz } = await import('./games/mathblitz.js');
      await startMathBlitz(interaction, difficulty, rounds);
      break;
    }
    case 'reaction': {
      const { startReactionRace } = await import('./games/reaction.js');
      await startReactionRace(interaction, rounds);
      break;
    }
    case 'mafia': {
      const { startMafia } = await import('./games/mafia.js');
      await startMafia(interaction, 5);
      break;
    }
    default:
      await interaction.reply({ content: `❌ Game "${gameKey}" not implemented yet!`, ephemeral: true });
  }
  
  return true;
}

/**
 * List all available games
 */
async function handleListGames(interaction) {
  const gamesList = Object.entries(GAMES)
    .map(([key, game]) => `${game.emoji} **${game.name}** - ${game.description}`)
    .join('\n');
  
  const embed = new EmbedBuilder()
    .setColor('#FF6B6B')
    .setTitle('🎮 Available Games')
    .setDescription(gamesList)
    .addFields(
      { name: '📝 How to Play', value: 'Use `/game play` and select a game from the autocomplete menu!', inline: false },
      { name: '🎯 Options', value: '• `difficulty` - Easy/Medium/Hard\n• `opponent` - Challenge a player\n• `rounds` - Number of rounds', inline: false }
    )
    .setFooter({ text: `${Object.keys(GAMES).length} games available` })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
  return true;
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
      { name: '🎲 Available Games', value: `${Object.keys(GAMES).length}`, inline: true }
    )
    .setFooter({ text: 'Use /game play to start a game!' })
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
