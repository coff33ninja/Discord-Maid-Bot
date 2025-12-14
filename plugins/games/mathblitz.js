import { EmbedBuilder } from 'discord.js';
import { getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats } from './game-manager.js';

// Difficulty settings
const DIFFICULTIES = {
  easy: { name: 'Easy', emoji: '🟢', ops: ['+', '-'], max: 20, time: 15, points: 50 },
  medium: { name: 'Medium', emoji: '🟡', ops: ['+', '-', '*'], max: 50, time: 12, points: 100 },
  hard: { name: 'Hard', emoji: '🔴', ops: ['+', '-', '*', '/'], max: 100, time: 10, points: 200 }
};

// Generate math problem
function generateProblem(difficulty) {
  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
  const op = diff.ops[Math.floor(Math.random() * diff.ops.length)];
  
  let a, b, answer;
  
  switch (op) {
    case '+':
      a = Math.floor(Math.random() * diff.max) + 1;
      b = Math.floor(Math.random() * diff.max) + 1;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * diff.max) + 1;
      b = Math.floor(Math.random() * a) + 1; // Ensure positive result
      answer = a - b;
      break;
    case '*':
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      answer = a * b;
      break;
    case '/':
      b = Math.floor(Math.random() * 12) + 1;
      answer = Math.floor(Math.random() * 12) + 1;
      a = b * answer; // Ensure clean division
      break;
  }
  
  return { question: `${a} ${op} ${b}`, answer };
}

// Start Math Blitz
export async function startMathBlitz(interaction, difficulty = 'medium', rounds = 10) {
  const channelId = interaction.channelId;
  
  if (hasActiveGame(channelId)) {
    await interaction.reply({ content: '⚠️ A game is already active in this channel!', ephemeral: true });
    return;
  }
  
  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
  
  const game = {
    type: 'mathblitz',
    difficulty,
    difficultyInfo: diff,
    currentRound: 0,
    totalRounds: rounds,
    currentProblem: null,
    problemStartTime: null,
    answered: false,
    scores: new Map(),
    startedBy: interaction.user.id,
    ended: false
  };
  
  setActiveGame(channelId, game);
  
  const embed = new EmbedBuilder()
    .setColor('#2196f3')
    .setTitle('🔢 Math Blitz!')
    .setDescription(`**${rounds} problems** • ${diff.emoji} ${diff.name} difficulty\n\nFirst to answer correctly wins points!\nTime limit: ${diff.time} seconds per problem`)
    .setFooter({ text: 'First problem in 3 seconds...' });
  
  await interaction.reply({ embeds: [embed] });
  
  setTimeout(() => showProblem(interaction.channel, channelId), 3000);
}

// Show next problem
async function showProblem(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game || game.type !== 'mathblitz' || game.ended) return;
  
  game.currentRound++;
  game.answered = false;
  
  const problem = generateProblem(game.difficulty);
  game.currentProblem = problem;
  game.problemStartTime = Date.now();
  
  const embed = new EmbedBuilder()
    .setColor('#2196f3')
    .setTitle(`🔢 Problem ${game.currentRound}/${game.totalRounds}`)
    .setDescription(`# ${problem.question} = ?`)
    .addFields(
      { name: '⏱️ Time', value: `${game.difficultyInfo.time} seconds`, inline: true },
      { name: '🏆 Points', value: `${game.difficultyInfo.points}`, inline: true }
    )
    .setFooter({ text: 'Type your answer!' });
  
  await channel.send({ embeds: [embed] });
  
  setupMathCollector(channel, channelId);
}

// Set up collector
function setupMathCollector(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  const collector = channel.createMessageCollector({
    filter: (m) => !m.author.bot && /^-?\d+$/.test(m.content.trim()),
    time: game.difficultyInfo.time * 1000
  });
  
  collector.on('collect', async (message) => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.answered || currentGame.ended) return;
    
    const answer = parseInt(message.content.trim());
    const odId = message.author.id;
    
    if (answer === currentGame.currentProblem.answer) {
      currentGame.answered = true;
      collector.stop('answered');
      
      // Calculate points with time bonus
      const responseTime = (Date.now() - currentGame.problemStartTime) / 1000;
      const timeBonus = Math.max(0, (currentGame.difficultyInfo.time - responseTime) / currentGame.difficultyInfo.time);
      const points = Math.round(currentGame.difficultyInfo.points * (0.5 + 0.5 * timeBonus));
      
      // Update scores
      if (!currentGame.scores.has(odId)) {
        currentGame.scores.set(odId, { odId, username: message.author.username, points: 0, correct: 0 });
      }
      const score = currentGame.scores.get(odId);
      score.points += points;
      score.correct++;
      
      await message.react('🎉');
      
      const embed = new EmbedBuilder()
        .setColor('#4caf50')
        .setTitle('✅ Correct!')
        .setDescription(`**${message.author.username}** got it!\n\n${currentGame.currentProblem.question} = **${currentGame.currentProblem.answer}**`)
        .addFields(
          { name: '🏆 Points', value: `+${points}`, inline: true },
          { name: '⏱️ Time', value: `${responseTime.toFixed(2)}s`, inline: true }
        );
      
      await channel.send({ embeds: [embed] });
      
      // Next problem or end
      if (currentGame.currentRound < currentGame.totalRounds) {
        setTimeout(() => showProblem(channel, channelId), 2000);
      } else {
        endMathBlitz(channel, channelId);
      }
    } else {
      await message.react('❌');
    }
  });
  
  collector.on('end', async (collected, reason) => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.ended) return;
    
    if (reason === 'time' && !currentGame.answered) {
      const embed = new EmbedBuilder()
        .setColor('#f44336')
        .setTitle('⏰ Time\'s Up!')
        .setDescription(`${currentGame.currentProblem.question} = **${currentGame.currentProblem.answer}**`);
      
      await channel.send({ embeds: [embed] });
      
      // Next problem or end
      if (currentGame.currentRound < currentGame.totalRounds) {
        setTimeout(() => showProblem(channel, channelId), 2000);
      } else {
        endMathBlitz(channel, channelId);
      }
    }
  });
}

// End game
function endMathBlitz(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  game.ended = true;
  
  const scores = Array.from(game.scores.values()).sort((a, b) => b.points - a.points);
  
  let leaderboard = '';
  const medals = ['🥇', '🥈', '🥉'];
  
  for (let i = 0; i < Math.min(scores.length, 10); i++) {
    const score = scores[i];
    const medal = medals[i] || `${i + 1}.`;
    leaderboard += `${medal} **${score.username}** - ${score.points} pts (${score.correct}/${game.totalRounds})\n`;
    
    updateGameStats(score.odId, 'mathblitz', score.correct > 0, score.points);
  }
  
  if (!leaderboard) leaderboard = 'No one scored!';
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('🔢 Math Blitz Complete!')
    .addFields({ name: '📊 Final Scores', value: leaderboard, inline: false })
    .setFooter({ text: 'Use /mathblitz to play again!' });
  
  channel.send({ embeds: [embed] });
  clearActiveGame(channelId);
}

// Stop game
export function stopMathBlitz(channelId) {
  const game = getActiveGame(channelId);
  if (game && game.type === 'mathblitz') {
    clearActiveGame(channelId);
    return true;
  }
  return false;
}

export { DIFFICULTIES as MATH_DIFFICULTIES };
