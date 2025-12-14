import { EmbedBuilder } from 'discord.js';
import { getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats } from './game-manager.js';
import { generateWithRotation } from './ai-helper.js';

// Categories
const CATEGORIES = {
  movies: { name: 'Movies', emoji: '🎬' },
  songs: { name: 'Songs', emoji: '🎵' },
  anime: { name: 'Anime', emoji: '🎌' },
  games: { name: 'Video Games', emoji: '🎮' },
  phrases: { name: 'Phrases/Sayings', emoji: '💬' },
  books: { name: 'Books', emoji: '📚' },
  tvshows: { name: 'TV Shows', emoji: '📺' },
  random: { name: 'Random Mix', emoji: '🎲' }
};

// Generate emoji puzzle
async function generateEmojiPuzzle(category) {
  const cat = CATEGORIES[category] || CATEGORIES.random;
  const categoryText = cat.name === 'Random Mix' ? 'movie, song, anime, game, phrase, or TV show' : cat.name.toLowerCase();
  
  const prompt = `Create an emoji puzzle for a ${categoryText}.

Rules:
- Use 3-8 emojis to represent the title/phrase
- Should be recognizable but not too obvious
- Pick something well-known

Reply with ONLY valid JSON:
{
  "emojis": "🎭🦁👑",
  "answer": "The Lion King",
  "category": "${cat.name}",
  "hint": "Disney animated classic"
}`;

  const { result } = await generateWithRotation(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) throw new Error('Failed to generate puzzle');
  return JSON.parse(jsonMatch[0]);
}

// Check answer
async function checkAnswer(correctAnswer, userAnswer) {
  const prompt = `Correct answer: "${correctAnswer}"
User's answer: "${userAnswer}"

Is this correct? Consider alternate titles, translations, or close variations.
Reply with ONLY: "CORRECT" or "INCORRECT"`;

  const { result } = await generateWithRotation(prompt);
  const response = result.response.text().trim().toUpperCase();
  return response.includes('CORRECT') && !response.includes('INCORRECT');
}

// Start emoji decode game
export async function startEmojiDecode(interaction, category = 'random', rounds = 5) {
  const channelId = interaction.channelId;
  
  if (hasActiveGame(channelId)) {
    await interaction.reply({ content: '⚠️ A game is already active in this channel!', ephemeral: true });
    return;
  }
  
  await interaction.deferReply();
  
  const cat = CATEGORIES[category] || CATEGORIES.random;
  
  const game = {
    type: 'emojidecode',
    category,
    categoryInfo: cat,
    currentRound: 0,
    totalRounds: rounds,
    currentPuzzle: null,
    hintUsed: false,
    scores: new Map(),
    startedBy: interaction.user.id,
    ended: false,
    timePerRound: 45
  };
  
  setActiveGame(channelId, game);
  
  const embed = new EmbedBuilder()
    .setColor('#f59e0b')
    .setTitle('🔮 Emoji Decode!')
    .setDescription(`Guess the **${cat.emoji} ${cat.name}** from emojis!\n\n**${rounds} rounds** • 45 seconds each`)
    .setFooter({ text: 'First puzzle coming in 3 seconds...' });
  
  await interaction.editReply({ embeds: [embed] });
  
  setTimeout(() => showPuzzle(interaction.channel, channelId), 3000);
}

// Show next puzzle
async function showPuzzle(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game || game.type !== 'emojidecode' || game.ended) return;
  
  game.currentRound++;
  game.hintUsed = false;
  
  try {
    const puzzle = await generateEmojiPuzzle(game.category);
    game.currentPuzzle = puzzle;
    game.puzzleStartTime = Date.now();
    game.answered = false;
    
    const embed = new EmbedBuilder()
      .setColor('#f59e0b')
      .setTitle(`🔮 Round ${game.currentRound}/${game.totalRounds}`)
      .setDescription(`# ${puzzle.emojis}`)
      .addFields(
        { name: '🏷️ Category', value: puzzle.category, inline: true },
        { name: '⏱️ Time', value: `${game.timePerRound}s`, inline: true }
      )
      .setFooter({ text: 'Type your guess! Say "hint" for a hint (half points)' });
    
    await channel.send({ embeds: [embed] });
    
    setupEmojiCollector(channel, channelId);
    
  } catch (error) {
    await channel.send(`❌ Failed to generate puzzle: ${error.message}`);
    endEmojiGame(channel, channelId);
  }
}

// Set up collector
function setupEmojiCollector(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  const collector = channel.createMessageCollector({
    filter: (m) => !m.author.bot,
    time: game.timePerRound * 1000
  });
  
  collector.on('collect', async (message) => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.answered || currentGame.ended) return;
    
    const content = message.content.trim().toLowerCase();
    const odId = message.author.id;
    
    // Handle hint
    if (content === 'hint') {
      if (currentGame.hintUsed) {
        await message.reply('💡 Hint already shown!');
        return;
      }
      
      currentGame.hintUsed = true;
      await message.reply(`💡 **Hint:** ${currentGame.currentPuzzle.hint}`);
      return;
    }
    
    // Check answer
    try {
      const correct = await checkAnswer(currentGame.currentPuzzle.answer, message.content);
      
      if (correct) {
        currentGame.answered = true;
        collector.stop('answered');
        
        const responseTime = (Date.now() - currentGame.puzzleStartTime) / 1000;
        const timeBonus = Math.max(0, (currentGame.timePerRound - responseTime) / currentGame.timePerRound);
        let points = Math.round(100 * (0.5 + 0.5 * timeBonus));
        
        if (currentGame.hintUsed) points = Math.round(points * 0.5);
        
        // Update scores
        const currentScore = currentGame.scores.get(odId) || { odId, points: 0, correct: 0, odName: message.author.username };
        currentScore.points += points;
        currentScore.correct++;
        currentGame.scores.set(odId, currentScore);
        
        await message.react('🎉');
        
        const embed = new EmbedBuilder()
          .setColor('#10b981')
          .setTitle('✅ Correct!')
          .setDescription(`**${message.author.username}** got it!\n\n${currentGame.currentPuzzle.emojis} = **${currentGame.currentPuzzle.answer}**`)
          .addFields(
            { name: '🏆 Points', value: `+${points}${currentGame.hintUsed ? ' (hint used)' : ''}`, inline: true },
            { name: '⏱️ Time', value: `${responseTime.toFixed(1)}s`, inline: true }
          );
        
        await channel.send({ embeds: [embed] });
        
        if (currentGame.currentRound < currentGame.totalRounds) {
          setTimeout(() => showPuzzle(channel, channelId), 3000);
        } else {
          endEmojiGame(channel, channelId);
        }
      } else {
        await message.react('❌');
      }
    } catch (e) {
      // Silently fail
    }
  });
  
  collector.on('end', async (collected, reason) => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.ended) return;
    
    if (reason === 'time' && !currentGame.answered) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('⏰ Time\'s Up!')
        .setDescription(`${currentGame.currentPuzzle.emojis} = **${currentGame.currentPuzzle.answer}**`);
      
      await channel.send({ embeds: [embed] });
      
      if (currentGame.currentRound < currentGame.totalRounds) {
        setTimeout(() => showPuzzle(channel, channelId), 3000);
      } else {
        endEmojiGame(channel, channelId);
      }
    }
  });
}

// End game
function endEmojiGame(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  game.ended = true;
  
  const scores = Array.from(game.scores.values())
    .sort((a, b) => b.points - a.points);
  
  let leaderboard = '';
  const medals = ['🥇', '🥈', '🥉'];
  
  for (let i = 0; i < Math.min(scores.length, 10); i++) {
    const score = scores[i];
    const medal = medals[i] || `${i + 1}.`;
    leaderboard += `${medal} **${score.odName}** - ${score.points} pts (${score.correct}/${game.totalRounds})\n`;
    
    updateGameStats(score.odId, 'emojidecode', score.correct > 0, score.points);
  }
  
  if (!leaderboard) leaderboard = 'No one scored!';
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('🔮 Emoji Decode Complete!')
    .addFields(
      { name: '📊 Final Scores', value: leaderboard, inline: false }
    )
    .setFooter({ text: 'Use /emojidecode to play again!' });
  
  channel.send({ embeds: [embed] });
  clearActiveGame(channelId);
}

// Stop game
export function stopEmojiDecode(channelId) {
  const game = getActiveGame(channelId);
  if (game && game.type === 'emojidecode') {
    clearActiveGame(channelId);
    return true;
  }
  return false;
}

export { CATEGORIES as EMOJI_CATEGORIES };
