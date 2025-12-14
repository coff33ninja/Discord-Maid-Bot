import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats } from './game-manager.js';

const EMOJIS = ['🎯', '⚡', '🔥', '💎', '🌟', '🎪', '🎨', '🎭', '🎪', '🚀'];

// Start Reaction Race
export async function startReactionRace(interaction, rounds = 5) {
  const channelId = interaction.channelId;
  
  if (hasActiveGame(channelId)) {
    await interaction.reply({ content: '⚠️ A game is already active in this channel!', ephemeral: true });
    return;
  }
  
  const game = {
    type: 'reaction',
    currentRound: 0,
    totalRounds: rounds,
    currentEmoji: null,
    raceStartTime: null,
    scores: new Map(),
    reactionTimes: new Map(),
    startedBy: interaction.user.id,
    ended: false
  };
  
  setActiveGame(channelId, game);
  
  const embed = new EmbedBuilder()
    .setColor('#ff9800')
    .setTitle('⚡ Reaction Race!')
    .setDescription(`**${rounds} rounds** of lightning-fast reactions!\n\nWhen you see the emoji, click the button as fast as you can!`)
    .setFooter({ text: 'Get ready... First round starting soon!' });
  
  await interaction.reply({ embeds: [embed] });
  
  // Random delay before first round
  setTimeout(() => startRound(interaction.channel, channelId), 2000 + Math.random() * 2000);
}

// Start a round
async function startRound(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game || game.type !== 'reaction' || game.ended) return;
  
  game.currentRound++;
  
  // Show "Get Ready" message
  const readyEmbed = new EmbedBuilder()
    .setColor('#ff9800')
    .setTitle(`⏳ Round ${game.currentRound}/${game.totalRounds}`)
    .setDescription('**Get ready...**\n\nClick the button when you see the emoji!')
    .setFooter({ text: 'Wait for it...' });
  
  const msg = await channel.send({ embeds: [readyEmbed] });
  
  // Random delay before showing the target
  const delay = 1500 + Math.random() * 3000;
  
  setTimeout(async () => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.ended) return;
    
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    currentGame.currentEmoji = emoji;
    currentGame.raceStartTime = Date.now();
    currentGame.roundWinner = null;
    
    const goEmbed = new EmbedBuilder()
      .setColor('#4caf50')
      .setTitle(`# ${emoji} GO! ${emoji}`)
      .setDescription('**CLICK NOW!**')
      .setFooter({ text: 'First to click wins!' });
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('reaction_click')
        .setLabel('CLICK!')
        .setStyle(ButtonStyle.Success)
        .setEmoji(emoji)
    );
    
    await msg.edit({ embeds: [goEmbed], components: [row] });
    
    setupReactionCollector(msg, channel, channelId);
  }, delay);
}

// Set up collector
function setupReactionCollector(message, channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  const collector = message.createMessageComponentCollector({
    filter: (i) => i.customId === 'reaction_click',
    time: 5000 // 5 second window
  });
  
  collector.on('collect', async (i) => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.ended) return;
    
    // Only first click counts
    if (currentGame.roundWinner) {
      const reactionTime = Date.now() - currentGame.raceStartTime;
      await i.reply({ content: `You clicked in ${reactionTime}ms, but someone was faster!`, ephemeral: true });
      return;
    }
    
    const odId = i.user.id;
    const reactionTime = Date.now() - currentGame.raceStartTime;
    currentGame.roundWinner = odId;
    
    // Calculate points (faster = more points)
    const points = Math.max(10, Math.round(200 - reactionTime / 5));
    
    // Update scores
    if (!currentGame.scores.has(odId)) {
      currentGame.scores.set(odId, { odId, username: i.user.username, points: 0, wins: 0, bestTime: Infinity });
    }
    const score = currentGame.scores.get(odId);
    score.points += points;
    score.wins++;
    if (reactionTime < score.bestTime) score.bestTime = reactionTime;
    
    collector.stop('winner');
    
    const embed = new EmbedBuilder()
      .setColor('#4caf50')
      .setTitle('⚡ Winner!')
      .setDescription(`**${i.user.username}** was fastest!\n\n⏱️ Reaction time: **${reactionTime}ms**\n🏆 Points: **+${points}**`);
    
    await message.edit({ embeds: [embed], components: [] });
    await i.reply({ content: `You won! ${reactionTime}ms reaction time!`, ephemeral: true });
    
    // Next round or end
    if (currentGame.currentRound < currentGame.totalRounds) {
      setTimeout(() => startRound(channel, channelId), 2000 + Math.random() * 1000);
    } else {
      setTimeout(() => endReactionRace(channel, channelId), 2000);
    }
  });
  
  collector.on('end', async (collected, reason) => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.ended) return;
    
    if (reason === 'time' && !currentGame.roundWinner) {
      const embed = new EmbedBuilder()
        .setColor('#f44336')
        .setTitle('⏰ Too Slow!')
        .setDescription('No one clicked in time!');
      
      await message.edit({ embeds: [embed], components: [] });
      
      // Next round or end
      if (currentGame.currentRound < currentGame.totalRounds) {
        setTimeout(() => startRound(channel, channelId), 2000);
      } else {
        setTimeout(() => endReactionRace(channel, channelId), 2000);
      }
    }
  });
}

// End game
function endReactionRace(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  game.ended = true;
  
  const scores = Array.from(game.scores.values()).sort((a, b) => b.points - a.points);
  
  let leaderboard = '';
  const medals = ['🥇', '🥈', '🥉'];
  
  for (let i = 0; i < Math.min(scores.length, 10); i++) {
    const score = scores[i];
    const medal = medals[i] || `${i + 1}.`;
    leaderboard += `${medal} **${score.username}** - ${score.points} pts (${score.wins} wins, best: ${score.bestTime}ms)\n`;
    
    await updateGameStats(score.odId, 'reaction', score.wins > 0, score.points);
  }
  
  if (!leaderboard) leaderboard = 'No one played!';
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('⚡ Reaction Race Complete!')
    .addFields({ name: '📊 Final Scores', value: leaderboard, inline: false })
    .setFooter({ text: 'Use /reaction to play again!' });
  
  channel.send({ embeds: [embed] });
  clearActiveGame(channelId);
}

// Stop game
export function stopReactionRace(channelId) {
  const game = getActiveGame(channelId);
  if (game && game.type === 'reaction') {
    clearActiveGame(channelId);
    return true;
  }
  return false;
}
