import { EmbedBuilder } from 'discord.js';
import { getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats } from './game-manager.js';
import { generateWithRotation } from '../config/gemini-keys.js';

// Difficulty settings
const DIFFICULTIES = {
  easy: { name: 'Easy', emoji: '🟢', points: 50, time: 60 },
  medium: { name: 'Medium', emoji: '🟡', points: 100, time: 45 },
  hard: { name: 'Hard', emoji: '🔴', points: 200, time: 30 }
};

// Generate a riddle
async function generateRiddle(difficulty) {
  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
  
  const prompt = `Generate a ${diff.name.toLowerCase()} riddle.

Rules:
- The riddle should be clever but solvable
- Answer should be a single word or short phrase
- ${difficulty === 'easy' ? 'Make it straightforward' : difficulty === 'hard' ? 'Make it tricky and require lateral thinking' : 'Balance cleverness with solvability'}

Reply with ONLY valid JSON:
{
  "riddle": "The riddle text here",
  "answer": "the answer",
  "hint": "a helpful hint",
  "explanation": "why this is the answer"
}`;

  const { result } = await generateWithRotation(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) throw new Error('Failed to generate riddle');
  return JSON.parse(jsonMatch[0]);
}

// Check if answer is correct
async function checkAnswer(correctAnswer, userAnswer) {
  const prompt = `Correct answer: "${correctAnswer}"
User's answer: "${userAnswer}"

Is the user's answer correct? Consider:
- Alternate spellings
- Synonyms that mean the same thing
- Plural/singular variations

Reply with ONLY: "CORRECT" or "INCORRECT"`;

  const { result } = await generateWithRotation(prompt);
  const response = result.response.text().trim().toUpperCase();
  return response.includes('CORRECT') && !response.includes('INCORRECT');
}

// Start riddle game
export async function startRiddles(interaction, difficulty = 'medium', rounds = 5) {
  const channelId = interaction.channelId;
  
  if (hasActiveGame(channelId)) {
    await interaction.reply({ content: '⚠️ A game is already active in this channel!', ephemeral: true });
    return;
  }
  
  await interaction.deferReply();
  
  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
  
  const game = {
    type: 'riddles',
    difficulty,
    difficultyInfo: diff,
    currentRound: 0,
    totalRounds: rounds,
    currentRiddle: null,
    hintUsed: false,
    scores: new Map(),
    startedBy: interaction.user.id,
    ended: false
  };
  
  setActiveGame(channelId, game);
  
  const embed = new EmbedBuilder()
    .setColor('#f59e0b')
    .setTitle('🧩 Riddle Me This!')
    .setDescription(`Get ready for **${rounds} riddles**!\n\nDifficulty: ${diff.emoji} ${diff.name}\nTime per riddle: ${diff.time} seconds`)
    .setFooter({ text: 'First riddle coming in 3 seconds...' });
  
  await interaction.editReply({ embeds: [embed] });
  
  // Start first riddle after delay
  setTimeout(() => askRiddle(interaction.channel, channelId), 3000);
}

// Ask the next riddle
async function askRiddle(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game || game.type !== 'riddles' || game.ended) return;
  
  game.currentRound++;
  game.hintUsed = false;
  
  try {
    const riddleData = await generateRiddle(game.difficulty);
    game.currentRiddle = riddleData;
    game.riddleStartTime = Date.now();
    game.answered = false;
    
    const embed = new EmbedBuilder()
      .setColor('#f59e0b')
      .setTitle(`🧩 Riddle ${game.currentRound}/${game.totalRounds}`)
      .setDescription(`*${riddleData.riddle}*`)
      .addFields(
        { name: '⏱️ Time', value: `${game.difficultyInfo.time} seconds`, inline: true },
        { name: '🏆 Points', value: `${game.difficultyInfo.points}`, inline: true }
      )
      .setFooter({ text: 'Type your answer! Say "hint" for a hint (half points)' });
    
    await channel.send({ embeds: [embed] });
    
    // Set up collector for this riddle
    setupRiddleCollector(channel, channelId);
    
  } catch (error) {
    await channel.send(`❌ Failed to generate riddle: ${error.message}`);
    endRiddleGame(channel, channelId);
  }
}

// Set up collector for riddle answers
function setupRiddleCollector(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  const collector = channel.createMessageCollector({
    filter: (m) => !m.author.bot,
    time: game.difficultyInfo.time * 1000
  });
  
  collector.on('collect', async (message) => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.answered || currentGame.ended) return;
    
    const content = message.content.trim().toLowerCase();
    const odId = message.author.id;
    
    // Handle hint request
    if (content === 'hint') {
      if (currentGame.hintUsed) {
        await message.reply('💡 Hint already shown!');
        return;
      }
      
      currentGame.hintUsed = true;
      await message.reply(`💡 **Hint:** ${currentGame.currentRiddle.hint}`);
      return;
    }
    
    // Check answer
    try {
      const correct = await checkAnswer(currentGame.currentRiddle.answer, message.content);
      
      if (correct) {
        currentGame.answered = true;
        collector.stop('answered');
        
        // Calculate points
        const responseTime = (Date.now() - currentGame.riddleStartTime) / 1000;
        const timeBonus = Math.max(0, (currentGame.difficultyInfo.time - responseTime) / currentGame.difficultyInfo.time);
        let points = Math.round(currentGame.difficultyInfo.points * (0.5 + 0.5 * timeBonus));
        
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
          .setDescription(`**${message.author.username}** got it!\n\nThe answer was: **${currentGame.currentRiddle.answer}**`)
          .addFields(
            { name: '📖 Explanation', value: currentGame.currentRiddle.explanation, inline: false },
            { name: '🏆 Points', value: `+${points}${currentGame.hintUsed ? ' (hint used)' : ''}`, inline: true },
            { name: '⏱️ Time', value: `${responseTime.toFixed(1)}s`, inline: true }
          );
        
        await channel.send({ embeds: [embed] });
        
        // Next riddle or end
        if (currentGame.currentRound < currentGame.totalRounds) {
          setTimeout(() => askRiddle(channel, channelId), 3000);
        } else {
          endRiddleGame(channel, channelId);
        }
      } else {
        await message.react('❌');
      }
    } catch (e) {
      // Silently fail on check errors
    }
  });
  
  collector.on('end', async (collected, reason) => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.ended) return;
    
    if (reason === 'time' && !currentGame.answered) {
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('⏰ Time\'s Up!')
        .setDescription(`The answer was: **${currentGame.currentRiddle.answer}**`)
        .addFields(
          { name: '📖 Explanation', value: currentGame.currentRiddle.explanation, inline: false }
        );
      
      await channel.send({ embeds: [embed] });
      
      // Next riddle or end
      if (currentGame.currentRound < currentGame.totalRounds) {
        setTimeout(() => askRiddle(channel, channelId), 3000);
      } else {
        endRiddleGame(channel, channelId);
      }
    }
  });
}

// End the riddle game
function endRiddleGame(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  game.ended = true;
  
  // Build leaderboard
  const scores = Array.from(game.scores.values())
    .sort((a, b) => b.points - a.points);
  
  let leaderboard = '';
  const medals = ['🥇', '🥈', '🥉'];
  
  for (let i = 0; i < Math.min(scores.length, 10); i++) {
    const score = scores[i];
    const medal = medals[i] || `${i + 1}.`;
    leaderboard += `${medal} **${score.odName}** - ${score.points} pts (${score.correct}/${game.totalRounds})\n`;
    
    // Update game stats
    updateGameStats(score.odId, 'riddles', score.correct > 0, score.points);
  }
  
  if (!leaderboard) leaderboard = 'No one scored!';
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('🏆 Riddle Game Over!')
    .setDescription(`**${game.totalRounds} riddles completed!**`)
    .addFields(
      { name: '📊 Final Scores', value: leaderboard, inline: false }
    )
    .setFooter({ text: 'Use /riddle to play again!' });
  
  channel.send({ embeds: [embed] });
  clearActiveGame(channelId);
}

// Stop game
export function stopRiddles(channelId) {
  const game = getActiveGame(channelId);
  if (game && game.type === 'riddles') {
    clearActiveGame(channelId);
    return true;
  }
  return false;
}

export { DIFFICULTIES as RIDDLE_DIFFICULTIES };
