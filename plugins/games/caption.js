import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { generateWithRotation } from './plugin.js';
import { getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats } from './game-manager.js';

// Generate a scenario to caption
async function generateScenario() {
  const prompt = `Generate a funny, absurd, or interesting scenario that people can write captions for.

Examples of good scenarios:
- "A cat wearing a business suit in a job interview"
- "Two aliens trying to understand a vending machine"
- "A superhero whose only power is making perfect toast"

Reply with ONLY valid JSON:
{
  "scenario": "the scenario description",
  "context": "optional extra context or setting"
}`;

  const { result } = await generateWithRotation(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);

// Note: This game uses generateWithRotation which should be accessed through
// the games plugin's requestFromCore('gemini-generate', { prompt }) method.
// TODO: Refactor to use plugin.requestFromCore() instead of direct import
  
  if (!jsonMatch) throw new Error('Failed to generate scenario');
  return JSON.parse(jsonMatch[0]);
}

// Start Caption Contest
export async function startCaptionContest(interaction, rounds = 3) {
  const channelId = interaction.channelId;
  
  if (hasActiveGame(channelId)) {
    await interaction.reply({ content: '⚠️ A game is already active in this channel!', ephemeral: true });
    return;
  }
  
  await interaction.deferReply();
  
  const game = {
    type: 'caption',
    currentRound: 0,
    totalRounds: rounds,
    phase: 'waiting', // waiting, submitting, voting, results
    currentScenario: null,
    submissions: new Map(), // odId -> caption
    votes: new Map(), // odId -> odId they voted for
    scores: new Map(),
    startedBy: interaction.user.id,
    ended: false,
    submissionTime: 60,
    votingTime: 30
  };
  
  setActiveGame(channelId, game);
  
  const embed = new EmbedBuilder()
    .setColor('#9c27b0')
    .setTitle('📝 Caption Contest!')
    .setDescription(`**${rounds} rounds** of creative captions!\n\n• Submit your funniest caption\n• Vote for the best one\n• Most votes wins!`)
    .setFooter({ text: 'First scenario coming up...' });
  
  await interaction.editReply({ embeds: [embed] });
  
  setTimeout(() => showCaptionScenario(interaction.channel, channelId), 2000);
}


// Show caption scenario
async function showCaptionScenario(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game || game.type !== 'caption' || game.ended) return;
  
  game.currentRound++;
  game.submissions.clear();
  game.votes.clear();
  game.phase = 'submitting';
  
  try {
    const scenario = await generateScenario();
    game.currentScenario = scenario;
    
    const embed = new EmbedBuilder()
      .setColor('#9c27b0')
      .setTitle(`📝 Round ${game.currentRound}/${game.totalRounds}`)
      .setDescription(`**Caption this scenario:**\n\n*"${scenario.scenario}"*${scenario.context ? `\n\n${scenario.context}` : ''}`)
      .addFields({ name: '⏱️ Time', value: `${game.submissionTime} seconds to submit!`, inline: true })
      .setFooter({ text: 'Type your caption in chat!' });
    
    await channel.send({ embeds: [embed] });
    
    setupCaptionSubmissionCollector(channel, channelId);
    
  } catch (error) {
    await channel.send(`❌ Failed to generate scenario: ${error.message}`);
    endCaptionGame(channel, channelId);
  }
}

// Set up submission collector
function setupCaptionSubmissionCollector(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  const collector = channel.createMessageCollector({
    filter: (m) => !m.author.bot && game.phase === 'submitting',
    time: game.submissionTime * 1000
  });
  
  collector.on('collect', async (message) => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.phase !== 'submitting') return;
    
    const odId = message.author.id;
    
    // Only one submission per person
    if (currentGame.submissions.has(odId)) {
      await message.react('🔄');
      return;
    }
    
    currentGame.submissions.set(odId, {
      odId,
      username: message.author.username,
      caption: message.content.trim()
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
    
    const submissions = Array.from(currentGame.submissions.values());
    
    if (submissions.length < 2) {
      await channel.send('😢 Need at least 2 submissions to vote! Moving on...');
      
      if (currentGame.currentRound < currentGame.totalRounds) {
        setTimeout(() => showCaptionScenario(channel, channelId), 2000);
      } else {
        endCaptionGame(channel, channelId);
      }
      return;
    }
    
    // Start voting phase
    currentGame.phase = 'voting';
    
    let captionList = submissions.map((s, i) => `**${i + 1}.** "${s.caption}"`).join('\n\n');
    
    const embed = new EmbedBuilder()
      .setColor('#9c27b0')
      .setTitle('🗳️ Vote for the Best Caption!')
      .setDescription(`*"${currentGame.currentScenario.scenario}"*\n\n${captionList}`)
      .addFields({ name: '⏱️ Time', value: `${currentGame.votingTime} seconds to vote!`, inline: true })
      .setFooter({ text: 'Type the number of your favorite caption!' });
    
    await channel.send({ embeds: [embed] });
    
    setupCaptionVotingCollector(channel, channelId, submissions);
  });
}

// Set up voting collector
function setupCaptionVotingCollector(channel, channelId, submissions) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  const collector = channel.createMessageCollector({
    filter: (m) => !m.author.bot && /^\d+$/.test(m.content.trim()),
    time: game.votingTime * 1000
  });
  
  collector.on('collect', async (message) => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.phase !== 'voting') return;
    
    const odId = message.author.id;
    const voteNum = parseInt(message.content.trim());
    
    // Can't vote for yourself
    if (submissions[voteNum - 1]?.odId === odId) {
      await message.react('🚫');
      return;
    }
    
    // Valid vote?
    if (voteNum < 1 || voteNum > submissions.length) {
      await message.react('❌');
      return;
    }
    
    currentGame.votes.set(odId, submissions[voteNum - 1].odId);
    await message.react('✅');
  });
  
  collector.on('end', async () => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.ended) return;
    
    // Count votes
    const voteCounts = new Map();
    for (const votedFor of currentGame.votes.values()) {
      voteCounts.set(votedFor, (voteCounts.get(votedFor) || 0) + 1);
    }
    
    // Find winner
    let maxVotes = 0;
    let winnerId = null;
    for (const [odId, count] of voteCounts) {
      if (count > maxVotes) {
        maxVotes = count;
        winnerId = odId;
      }
    }
    
    const winner = submissions.find(s => s.odId === winnerId);
    
    if (winner) {
      const points = maxVotes * 50;
      currentGame.scores.get(winner.odId).points += points;
      currentGame.scores.get(winner.odId).wins++;
      
      const embed = new EmbedBuilder()
        .setColor('#4caf50')
        .setTitle('🏆 Winner!')
        .setDescription(`**${winner.username}** wins with ${maxVotes} votes!\n\n*"${winner.caption}"*`)
        .addFields({ name: '🏆 Points', value: `+${points}`, inline: true });
      
      await channel.send({ embeds: [embed] });
    } else {
      await channel.send('🤷 No votes cast!');
    }
    
    // Next round or end
    if (currentGame.currentRound < currentGame.totalRounds) {
      setTimeout(() => showCaptionScenario(channel, channelId), 3000);
    } else {
      endCaptionGame(channel, channelId);
    }
  });
}

// End game
function endCaptionGame(channel, channelId) {
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
    
    updateGameStats(score.odId, 'caption', score.wins > 0, score.points);
  }
  
  if (!leaderboard) leaderboard = 'No one played!';
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('📝 Caption Contest Over!')
    .addFields({ name: '📊 Final Scores', value: leaderboard, inline: false })
    .setFooter({ text: 'Use /caption to play again!' });
  
  channel.send({ embeds: [embed] });
  clearActiveGame(channelId);
}

// Stop game
export function stopCaptionContest(channelId) {
  const game = getActiveGame(channelId);
  if (game && game.type === 'caption') {
    clearActiveGame(channelId);
    return true;
  }
  return false;
}

