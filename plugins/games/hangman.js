import { EmbedBuilder } from 'discord.js';
import { generateWithRotation } from './plugin.js';
import { getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats } from './game-manager.js';
import { generateWithRotation } from '../../src/config/gemini-keys.js';

// Word categories with sample words (AI will generate more)
const CATEGORIES = {
  animals: { name: 'Animals', emoji: '🐾', words: ['elephant', 'giraffe', 'penguin', 'dolphin', 'kangaroo', 'butterfly', 'crocodile', 'flamingo'] },
  movies: { name: 'Movies', emoji: '🎬', words: ['inception', 'avatar', 'titanic', 'gladiator', 'interstellar', 'frozen', 'jaws', 'matrix'] },
  countries: { name: 'Countries', emoji: '🌍', words: ['australia', 'brazil', 'canada', 'denmark', 'egypt', 'france', 'germany', 'japan'] },
  food: { name: 'Food', emoji: '🍕', words: ['spaghetti', 'hamburger', 'chocolate', 'pineapple', 'strawberry', 'avocado', 'croissant', 'burrito'] },
  technology: { name: 'Technology', emoji: '💻', words: ['computer', 'keyboard', 'bluetooth', 'algorithm', 'database', 'software', 'internet', 'processor'] },
  anime: { name: 'Anime', emoji: '🎌', words: ['naruto', 'pikachu', 'goku', 'totoro', 'spirited', 'evangelion', 'fullmetal', 'deathnote'] },
  sports: { name: 'Sports', emoji: '⚽', words: ['basketball', 'football', 'swimming', 'volleyball', 'badminton', 'gymnastics', 'skateboard', 'marathon'] },
  random: { name: 'Random', emoji: '🎲', words: [] }
};

// Hangman ASCII art stages
const HANGMAN_STAGES = [
  `
  ┌───┐
  │   
  │   
  │   
  │   
──┴──`,
  `
  ┌───┐
  │   O
  │   
  │   
  │   
──┴──`,
  `
  ┌───┐
  │   O
  │   │
  │   
  │   
──┴──`,
  `
  ┌───┐
  │   O
  │  /│
  │   
  │   
──┴──`,
  `
  ┌───┐
  │   O
  │  /│\\
  │   
  │   
──┴──`,
  `
  ┌───┐
  │   O
  │  /│\\
  │  / 
  │   
──┴──`,
  `
  ┌───┐
  │   O
  │  /│\\
  │  / \\
  │   
──┴── DEAD!`
];

// Get a word for the category
async function getWord(category) {
  const cat = CATEGORIES[category] || CATEGORIES.random;

// Note: This game uses generateWithRotation which should be accessed through
// the games plugin's requestFromCore('gemini-generate', { prompt }) method.
// TODO: Refactor to use plugin.requestFromCore() instead of direct import
  
  // For random or to get fresh words, use AI
  if (category === 'random' || Math.random() > 0.5) {
    try {
      const prompt = `Give me ONE single word for a hangman game. Category: ${cat.name || 'anything'}.
      
Rules:
- Single word only (no spaces)
- 5-12 letters
- Common enough to be guessable
- No proper nouns unless it's a category like movies/anime

Reply with ONLY the word, nothing else.`;

      const { result } = await generateWithRotation(prompt);
      const word = result.response.text().trim().toLowerCase().replace(/[^a-z]/g, '');
      
      if (word.length >= 4 && word.length <= 15) {
        return word;
      }
    } catch (e) {
      console.error('Failed to generate word:', e);
    }
  }
  
  // Fallback to preset words
  const words = cat.words.length > 0 ? cat.words : CATEGORIES.animals.words;
  return words[Math.floor(Math.random() * words.length)];
}

// Create game display embed
function createGameEmbed(game, title = '🎯 Hangman') {
  const displayWord = game.word
    .split('')
    .map(letter => game.guessedLetters.has(letter) ? letter.toUpperCase() : '▢')
    .join(' ');
  
  const wrongGuesses = Array.from(game.wrongLetters).join(', ').toUpperCase() || 'None';
  const remainingLives = 6 - game.mistakes;
  
  const embed = new EmbedBuilder()
    .setColor(game.mistakes >= 6 ? '#ef4444' : game.won ? '#10b981' : '#667eea')
    .setTitle(title)
    .setDescription(`\`\`\`${HANGMAN_STAGES[game.mistakes]}\`\`\``)
    .addFields(
      { name: '📝 Word', value: `\`${displayWord}\``, inline: false },
      { name: '❌ Wrong Guesses', value: wrongGuesses, inline: true },
      { name: '❤️ Lives', value: '❤️'.repeat(remainingLives) + '🖤'.repeat(game.mistakes), inline: true },
      { name: '🏷️ Category', value: `${game.categoryEmoji} ${game.categoryName}`, inline: true }
    )
    .setFooter({ text: 'Type a letter to guess!' });
  
  return embed;
}

// Start a new hangman game
export async function startHangman(interaction, category = 'random') {
  const channelId = interaction.channelId;
  
  if (hasActiveGame(channelId)) {
    await interaction.reply({ content: '⚠️ A game is already active in this channel! Use `/game stop` to end it.', ephemeral: true });
    return;
  }
  
  await interaction.deferReply();
  
  const cat = CATEGORIES[category] || CATEGORIES.random;
  const word = await getWord(category);
  
  const game = {
    type: 'hangman',
    word: word.toLowerCase(),
    guessedLetters: new Set(),
    wrongLetters: new Set(),
    mistakes: 0,
    players: new Map(), // odId -> { guesses, correct }
    categoryName: cat.name,
    categoryEmoji: cat.emoji,
    startedBy: interaction.user.id,
    startedAt: Date.now(),
    won: false,
    ended: false
  };
  
  setActiveGame(channelId, game);
  
  const embed = createGameEmbed(game, '🎮 Hangman Started!');
  embed.setDescription(`\`\`\`${HANGMAN_STAGES[0]}\`\`\`\n**Type a single letter to guess!**`);
  
  await interaction.editReply({ embeds: [embed] });
  
  // Set up message collector for guesses
  setupGuessCollector(interaction.channel, channelId);
}

// Set up collector for letter guesses
function setupGuessCollector(channel, channelId) {
  const collector = channel.createMessageCollector({
    filter: (m) => {
      const content = m.content.toLowerCase().trim();
      // Single letter or full word guess
      return (content.length === 1 && /^[a-z]$/.test(content)) || content.length > 1;
    },
    time: 300000 // 5 minute timeout
  });
  
  collector.on('collect', async (message) => {
    const game = getActiveGame(channelId);
    if (!game || game.type !== 'hangman' || game.ended) {
      collector.stop();
      return;
    }
    
    const guess = message.content.toLowerCase().trim();
    const odId = message.author.id;
    
    // Track player
    if (!game.players.has(odId)) {
      game.players.set(odId, { odId, guesses: 0, correct: 0, odName: message.author.username });
    }
    const player = game.players.get(odId);
    player.guesses++;
    
    // Full word guess
    if (guess.length > 1) {
      if (guess === game.word) {
        game.won = true;
        game.ended = true;
        game.winner = odId;
        player.correct += game.word.length;
        
        // Reveal all letters
        for (const letter of game.word) {
          game.guessedLetters.add(letter);
        }
        
        await showGameEnd(channel, game, message.author);
        collector.stop();
        clearActiveGame(channelId);
        return;
      } else {
        game.mistakes += 2; // Penalty for wrong word guess
        await message.react('❌');
        
        if (game.mistakes >= 6) {
          game.ended = true;
          await showGameEnd(channel, game);
          collector.stop();
          clearActiveGame(channelId);
          return;
        }
        
        const embed = createGameEmbed(game);
        await channel.send({ embeds: [embed] });
        return;
      }
    }
    
    // Single letter guess
    const letter = guess;
    
    // Already guessed
    if (game.guessedLetters.has(letter) || game.wrongLetters.has(letter)) {
      await message.react('🔄');
      return;
    }
    
    // Check if letter is in word
    if (game.word.includes(letter)) {
      game.guessedLetters.add(letter);
      player.correct++;
      await message.react('✅');
      
      // Check if word is complete
      const isComplete = game.word.split('').every(l => game.guessedLetters.has(l));
      
      if (isComplete) {
        game.won = true;
        game.ended = true;
        game.winner = odId;
        
        await showGameEnd(channel, game, message.author);
        collector.stop();
        clearActiveGame(channelId);
        return;
      }
    } else {
      game.wrongLetters.add(letter);
      game.mistakes++;
      await message.react('❌');
      
      if (game.mistakes >= 6) {
        game.ended = true;
        await showGameEnd(channel, game);
        collector.stop();
        clearActiveGame(channelId);
        return;
      }
    }
    
    // Show updated game state
    const embed = createGameEmbed(game);
    await channel.send({ embeds: [embed] });
  });
  
  collector.on('end', (collected, reason) => {
    if (reason === 'time') {
      const game = getActiveGame(channelId);
      if (game && !game.ended) {
        game.ended = true;
        channel.send('⏰ Hangman game timed out due to inactivity!');
        clearActiveGame(channelId);
      }
    }
  });
}

// Show game end results
async function showGameEnd(channel, game, winner = null) {
  const embed = new EmbedBuilder()
    .setTitle(game.won ? '🎉 Hangman - Victory!' : '💀 Hangman - Game Over!')
    .setColor(game.won ? '#10b981' : '#ef4444')
    .setDescription(`\`\`\`${HANGMAN_STAGES[game.mistakes]}\`\`\``)
    .addFields(
      { name: '📝 The Word Was', value: `**${game.word.toUpperCase()}**`, inline: false }
    );
  
  if (game.won && winner) {
    embed.addFields({ name: '🏆 Winner', value: `<@${winner.id}> guessed it!`, inline: false });
    
    // Award points
    const points = Math.max(10, (6 - game.mistakes) * 20);
    updateGameStats(winner.id, 'hangman', true, points);
    embed.addFields({ name: '🎯 Points Earned', value: `+${points}`, inline: true });
  }
  
  // Show player stats
  if (game.players.size > 0) {
    const playerStats = Array.from(game.players.values())
      .sort((a, b) => b.correct - a.correct)
      .slice(0, 5)
      .map((p, i) => `${i + 1}. ${p.odName}: ${p.correct} correct`)
      .join('\n');
    
    embed.addFields({ name: '📊 Player Stats', value: playerStats || 'No guesses', inline: false });
  }
  
  embed.setFooter({ text: 'Use /hangman to play again!' });
  
  await channel.send({ embeds: [embed] });
  
  // Update stats for all players
  for (const [odId, player] of game.players) {
    if (odId !== game.winner) {
      updateGameStats(odId, 'hangman', false, player.correct);
    }
  }
}

// Stop hangman game
export function stopHangman(channelId) {
  const game = getActiveGame(channelId);
  if (game && game.type === 'hangman') {
    clearActiveGame(channelId);
    return true;
  }
  return false;
}

// Get categories
export function getHangmanCategories() {
  return Object.entries(CATEGORIES).map(([key, val]) => ({
    key,
    name: val.name,
    emoji: val.emoji
  }));
}

export { CATEGORIES };

