import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { updateGameStats } from './game-manager.js';

// Active RPS challenges
const activeChallenges = new Map();

// Choices
const CHOICES = {
  rock: { emoji: '🪨', beats: 'scissors', name: 'Rock' },
  paper: { emoji: '📄', beats: 'rock', name: 'Paper' },
  scissors: { emoji: '✂️', beats: 'paper', name: 'Scissors' }
};

// Create choice buttons
function createChoiceButtons(disabled = false) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('rps_rock')
        .setLabel('Rock')
        .setEmoji('🪨')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('rps_paper')
        .setLabel('Paper')
        .setEmoji('📄')
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('rps_scissors')
        .setLabel('Scissors')
        .setEmoji('✂️')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled)
    );
}

// Challenge another player
export async function challengeRPS(interaction, opponent, bestOf = 3) {
  const challengerId = interaction.user.id;
  const opponentId = opponent.id;
  
  if (challengerId === opponentId) {
    await interaction.reply({ content: "❌ You can't challenge yourself!", ephemeral: true });
    return;
  }
  
  if (opponent.bot) {
    await interaction.reply({ content: "❌ You can't challenge a bot!", ephemeral: true });
    return;
  }
  
  const challengeKey = `${challengerId}_${opponentId}`;
  
  const challenge = {
    challengerId,
    challengerName: interaction.user.username,
    opponentId,
    opponentName: opponent.username,
    bestOf,
    round: 1,
    scores: { [challengerId]: 0, [opponentId]: 0 },
    choices: {},
    messageId: null
  };
  
  activeChallenges.set(challengeKey, challenge);
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('⚔️ Rock Paper Scissors Challenge!')
    .setDescription(`**${interaction.user.username}** challenges **${opponent.username}**!\n\nBest of ${bestOf} rounds`)
    .addFields(
      { name: '📊 Score', value: `${interaction.user.username}: 0 | ${opponent.username}: 0`, inline: false }
    )
    .setFooter({ text: 'Both players: Click your choice!' });
  
  const row = createChoiceButtons();
  
  const message = await interaction.reply({ 
    content: `<@${opponentId}> You've been challenged!`,
    embeds: [embed], 
    components: [row],
    fetchReply: true 
  });
  
  challenge.messageId = message.id;
  
  // Set up collector
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000
  });
  
  collector.on('collect', async (buttonInteraction) => {
    const odId = buttonInteraction.user.id;
    
    // Only allow the two players
    if (odId !== challengerId && odId !== opponentId) {
      await buttonInteraction.reply({ content: "❌ This isn't your game!", ephemeral: true });
      return;
    }
    
    const choice = buttonInteraction.customId.replace('rps_', '');
    challenge.choices[odId] = choice;
    
    await buttonInteraction.reply({ 
      content: `You chose ${CHOICES[choice].emoji} ${CHOICES[choice].name}!`, 
      ephemeral: true 
    });
    
    // Check if both players have chosen
    if (challenge.choices[challengerId] && challenge.choices[opponentId]) {
      collector.stop('round_complete');
      await resolveRound(interaction.channel, challenge, challengeKey);
    }
  });
  
  collector.on('end', async (collected, reason) => {
    if (reason === 'time') {
      activeChallenges.delete(challengeKey);
      
      const timeoutEmbed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('⏰ Challenge Timed Out')
        .setDescription('One or both players didn\'t respond in time.');
      
      await message.edit({ embeds: [timeoutEmbed], components: [] });
    }
  });
}

// Resolve a round
async function resolveRound(channel, challenge, challengeKey) {
  const { challengerId, opponentId, challengerName, opponentName, bestOf, round, scores, choices } = challenge;
  
  const choice1 = choices[challengerId];
  const choice2 = choices[opponentId];
  
  let result;
  let winnerId = null;
  
  if (choice1 === choice2) {
    result = "🤝 It's a tie!";
  } else if (CHOICES[choice1].beats === choice2) {
    result = `🎉 **${challengerName}** wins the round!`;
    winnerId = challengerId;
    scores[challengerId]++;
  } else {
    result = `🎉 **${opponentName}** wins the round!`;
    winnerId = opponentId;
    scores[opponentId]++;
  }
  
  const winsNeeded = Math.ceil(bestOf / 2);
  const gameOver = scores[challengerId] >= winsNeeded || scores[opponentId] >= winsNeeded;
  
  const embed = new EmbedBuilder()
    .setColor(gameOver ? '#10b981' : '#f59e0b')
    .setTitle(gameOver ? '🏆 Game Over!' : `Round ${round} Result`)
    .setDescription(`${CHOICES[choice1].emoji} **${challengerName}** vs **${opponentName}** ${CHOICES[choice2].emoji}\n\n${result}`)
    .addFields(
      { name: '📊 Score', value: `${challengerName}: ${scores[challengerId]} | ${opponentName}: ${scores[opponentId]}`, inline: false }
    );
  
  if (gameOver) {
    const finalWinnerId = scores[challengerId] > scores[opponentId] ? challengerId : opponentId;
    const finalWinnerName = finalWinnerId === challengerId ? challengerName : opponentName;
    const loserId = finalWinnerId === challengerId ? opponentId : challengerId;
    
    embed.addFields({ name: '👑 Winner', value: `**${finalWinnerName}** wins the match!`, inline: false });
    
    // Update stats
    await updateGameStats(finalWinnerId, 'rps', true, 50);
    await updateGameStats(loserId, 'rps', false, 10);
    
    activeChallenges.delete(challengeKey);
    
    await channel.send({ embeds: [embed] });
  } else {
    // Next round
    challenge.round++;
    challenge.choices = {};
    
    embed.setFooter({ text: `Round ${challenge.round} starting... Click your choice!` });
    
    const row = createChoiceButtons();
    const message = await channel.send({ embeds: [embed], components: [row] });
    
    // New collector for next round
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000
    });
    
    collector.on('collect', async (buttonInteraction) => {
      const odId = buttonInteraction.user.id;
      
      if (odId !== challengerId && odId !== opponentId) {
        await buttonInteraction.reply({ content: "❌ This isn't your game!", ephemeral: true });
        return;
      }
      
      const choice = buttonInteraction.customId.replace('rps_', '');
      challenge.choices[odId] = choice;
      
      await buttonInteraction.reply({ 
        content: `You chose ${CHOICES[choice].emoji} ${CHOICES[choice].name}!`, 
        ephemeral: true 
      });
      
      if (challenge.choices[challengerId] && challenge.choices[opponentId]) {
        collector.stop('round_complete');
        await resolveRound(channel, challenge, challengeKey);
      }
    });
    
    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        activeChallenges.delete(challengeKey);
        await channel.send('⏰ RPS game timed out!');
      }
    });
  }
}

// Quick RPS against bot
export async function quickRPS(interaction) {
  const userChoice = null;
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('🎮 Quick RPS')
    .setDescription('Choose your weapon!')
    .setFooter({ text: 'Playing against the bot' });
  
  const row = createChoiceButtons();
  
  const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
  
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30000,
    max: 1
  });
  
  collector.on('collect', async (buttonInteraction) => {
    if (buttonInteraction.user.id !== interaction.user.id) {
      await buttonInteraction.reply({ content: "❌ This isn't your game!", ephemeral: true });
      return;
    }
    
    const userChoice = buttonInteraction.customId.replace('rps_', '');
    const choices = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * 3)];
    
    let result;
    let won = false;
    
    if (userChoice === botChoice) {
      result = "🤝 It's a tie!";
    } else if (CHOICES[userChoice].beats === botChoice) {
      result = '🎉 You win!';
      won = true;
    } else {
      result = '😢 You lose!';
    }
    
    const resultEmbed = new EmbedBuilder()
      .setColor(won ? '#10b981' : userChoice === botChoice ? '#f59e0b' : '#ef4444')
      .setTitle(result)
      .setDescription(`${CHOICES[userChoice].emoji} **You** vs **Bot** ${CHOICES[botChoice].emoji}`)
      .setFooter({ text: 'Use /rps to play again!' });
    
    if (won) {
      await updateGameStats(interaction.user.id, 'rps', true, 20);
      resultEmbed.addFields({ name: '🏆 Points', value: '+20', inline: true });
    }
    
    await buttonInteraction.update({ embeds: [resultEmbed], components: [] });
  });
  
  collector.on('end', async (collected, reason) => {
    if (reason === 'time' && collected.size === 0) {
      await message.edit({ 
        embeds: [new EmbedBuilder().setColor('#ef4444').setTitle('⏰ Timed out!')], 
        components: [] 
      });
    }
  });
}
