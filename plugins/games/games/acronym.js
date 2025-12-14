import { EmbedBuilder } from 'discord.js';
import { getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats } from './game-manager.js';
import { generateWithRotation } from './ai-helper.js';

// Generate random letters for acronym
function generateLetters(length = 3) {
  const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
  const vowels = 'AEIOU';
  let letters = '';
  
  for (let i = 0; i < length; i++) {
    // Mix consonants and vowels for pronounceable acronyms
    if (i % 2 === 0 || Math.random() > 0.7) {
      letters += consonants[Math.floor(Math.random() * consonants.length)];
    } else {
      letters += vowels[Math.floor(Math.random() * vowels.length)];
    }
  }
  
  return letters;
}

// AI judges the submissions
async function judgeSubmissions(letters, submissions) {
  if (submissions.length === 0) return null;
  
  const submissionList = submissions.map((s, i) => `${i + 1}. "${s.phrase}" by ${s.username}`).join('\n');
  
  const prompt = `You're judging an acronym game. The letters are: ${letters}

Submissions:
${submissionList}

Pick the funniest/most creative one. Consider:
- Humor and creativity
- How well it fits the letters
- Cleverness

Reply with ONLY valid JSON:
{
  "winner": 1,
  "reason": "brief funny reason why this won"
}`;

  try {
    const { result } = await generateWithRotation(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) {
    // Fall back to random if AI fails
  }
  return { winner: Math.floor(Math.random() * submissions.length) + 1, reason: 'Randomly selected!' };
}

// Start Acronym Game
export async function startAcronymGame(interaction, rounds = 5, letterCount = 3) {
  const channelId = interaction.channelId;
  
  if (hasActiveGame(channelId)) {
    await interaction.reply({ content: '⚠️ A game is already active in this channel!', ephemeral: true });
    return;
  }
  
  const game = {
    type: 'acronym',
    currentRound: 0,
    totalRounds: rounds,
    letterCount,
    currentLetters: null,
    phase: 'waiting',
    submissions: new Map(),
    scores: new Map(),
    startedBy: interaction.user.id,
    ended: false,
    submissionTime: 45
  };
  
  setActiveGame(channelId, game);
  
  const embed = new EmbedBuilder()
    .setColor('#ff5722')
    .setTitle('🔤 Acronym Game!')
    .setDescription(`**${rounds} rounds** of creative acronyms!\n\n• You'll get ${letterCount} random letters\n• Create a funny phrase using those letters\n• AI picks the winner!`)
    .setFooter({ text: 'First letters coming up...' });
  
  await interaction.reply({ embeds: [embed] });
  
  setTimeout(() => showAcronymRound(interaction.channel, channelId), 2000);
}


// Show acronym round
async function showAcronymRound(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game || game.type !== 'acronym' || game.ended) return;
  
  game.currentRound++;
  game.submissions.clear();
  game.phase = 'submitting';
  game.currentLetters = generateLetters(game.letterCount);
  
  const embed = new EmbedBuilder()
    .setColor('#ff5722')
    .setTitle(`🔤 Round ${game.currentRound}/${game.totalRounds}`)
    .setDescription(`# ${game.currentLetters.split('').join(' . ')}`)
    .addFields(
      { name: '📝 How to Play', value: `Type a phrase where each word starts with these letters!\nExample: FBI → "Frogs Being Intelligent"`, inline: false },
      { name: '⏱️ Time', value: `${game.submissionTime} seconds`, inline: true }
    )
    .setFooter({ text: 'Type your phrase in chat!' });
  
  await channel.send({ embeds: [embed] });
  
  setupAcronymCollector(channel, channelId);
}

// Set up collector for submissions
function setupAcronymCollector(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  const collector = channel.createMessageCollector({
    filter: (m) => !m.author.bot && game.phase === 'submitting',
    time: game.submissionTime * 1000
  });
  
  collector.on('collect', async (message) => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.phase !== 'submitting') return;
    
    const words = message.content.trim().split(/\s+/);
    const letters = currentGame.currentLetters.split('');
    
    // Validate: must have same number of words as letters
    if (words.length !== letters.length) {
      await message.react('❌');
      return;
    }
    
    // Validate: each word starts with correct letter
    let valid = true;
    for (let i = 0; i < letters.length; i++) {
      if (!words[i] || words[i][0].toUpperCase() !== letters[i]) {
        valid = false;
        break;
      }
    }
    
    if (!valid) {
      await message.react('❌');
      return;
    }
    
    // Valid submission!
    const odId = message.author.id;
    currentGame.submissions.set(odId, {
      odId,
      username: message.author.username,
      phrase: message.content.trim()
    });
    
    await message.react('✅');
    
    // Initialize score if needed
    if (!currentGame.scores.has(odId)) {
      currentGame.scores.set(odId, { odId, username: message.author.username, points: 0, wins: 0 });
    }
  });
  
  collector.on('end', async () => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.ended) return;
    
    currentGame.phase = 'judging';
    
    const submissions = Array.from(currentGame.submissions.values());
    
    if (submissions.length === 0) {
      await channel.send('😢 No valid submissions! Moving to next round...');
      
      if (currentGame.currentRound < currentGame.totalRounds) {
        setTimeout(() => showAcronymRound(channel, channelId), 2000);
      } else {
        endAcronymGame(channel, channelId);
      }
      return;
    }
    
    if (submissions.length === 1) {
      // Only one submission, they win by default
      const winner = submissions[0];
      currentGame.scores.get(winner.odId).points += 100;
      currentGame.scores.get(winner.odId).wins++;
      
      const embed = new EmbedBuilder()
        .setColor('#4caf50')
        .setTitle('🏆 Winner by Default!')
        .setDescription(`**${winner.username}**: "${winner.phrase}"\n\n+100 points!`);
      
      await channel.send({ embeds: [embed] });
    } else {
      // AI judges
      const result = await judgeSubmissions(currentGame.currentLetters, submissions);
      const winnerIndex = result.winner - 1;
      const winner = submissions[winnerIndex] || submissions[0];
      
      currentGame.scores.get(winner.odId).points += 100;
      currentGame.scores.get(winner.odId).wins++;
      
      let submissionsList = submissions.map((s, i) => 
        `${i === winnerIndex ? '🏆' : '•'} **${s.username}**: "${s.phrase}"`
      ).join('\n');
      
      const embed = new EmbedBuilder()
        .setColor('#4caf50')
        .setTitle(`🏆 Round ${currentGame.currentRound} Winner!`)
        .setDescription(`**${currentGame.currentLetters}**\n\n${submissionsList}`)
        .addFields({ name: '🤖 AI Says', value: result.reason, inline: false });
      
      await channel.send({ embeds: [embed] });
    }
    
    // Next round or end
    if (currentGame.currentRound < currentGame.totalRounds) {
      setTimeout(() => showAcronymRound(channel, channelId), 3000);
    } else {
      endAcronymGame(channel, channelId);
    }
  });
}

// End game
function endAcronymGame(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  game.ended = true;
  
  const scores = Array.from(game.scores.values()).sort((a, b) => b.points - a.points);
  
  let leaderboard = '';
  const medals = ['🥇', '🥈', '🥉'];
  
  for (let i = 0; i < Math.min(scores.length, 10); i++) {
    const score = scores[i];
    const medal = medals[i] || `${i + 1}.`;
    leaderboard += `${medal} **${score.username}** - ${score.points} pts (${score.wins} wins)\n`;
    
    await updateGameStats(score.odId, 'acronym', score.wins > 0, score.points);
  }
  
  if (!leaderboard) leaderboard = 'No one played!';
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('🔤 Acronym Game Over!')
    .addFields({ name: '📊 Final Scores', value: leaderboard, inline: false })
    .setFooter({ text: 'Use /acronym to play again!' });
  
  channel.send({ embeds: [embed] });
  clearActiveGame(channelId);
}

// Stop game
export function stopAcronymGame(channelId) {
  const game = getActiveGame(channelId);
  if (game && game.type === 'acronym') {
    clearActiveGame(channelId);
    return true;
  }
  return false;
}
