import { EmbedBuilder } from 'discord.js';
import { getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats } from './game-manager.js';

// Start number guessing game
export async function startNumberGuess(interaction, maxNumber = 100, maxAttempts = 10) {
  const channelId = interaction.channelId;
  
  if (hasActiveGame(channelId)) {
    await interaction.reply({ content: '⚠️ A game is already active in this channel! Use `/game stop` to end it.', ephemeral: true });
    return;
  }
  
  const secretNumber = Math.floor(Math.random() * maxNumber) + 1;
  
  const game = {
    type: 'numguess',
    secretNumber,
    maxNumber,
    maxAttempts,
    attempts: 0,
    guesses: [],
    players: new Map(),
    startedBy: interaction.user.id,
    startedAt: Date.now(),
    won: false,
    ended: false
  };
  
  setActiveGame(channelId, game);
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('🔢 Number Guessing Game!')
    .setDescription(`I'm thinking of a number between **1** and **${maxNumber}**...\n\nType a number to guess!`)
    .addFields(
      { name: '🎯 Attempts', value: `0 / ${maxAttempts}`, inline: true },
      { name: '📊 Range', value: `1 - ${maxNumber}`, inline: true }
    )
    .setFooter({ text: 'First to guess correctly wins!' });
  
  await interaction.reply({ embeds: [embed] });
  
  // Set up collector
  setupNumberCollector(interaction.channel, channelId);
}

function setupNumberCollector(channel, channelId) {
  const collector = channel.createMessageCollector({
    filter: (m) => {
      const num = parseInt(m.content.trim());
      return !isNaN(num) && num > 0;
    },
    time: 180000 // 3 minute timeout
  });
  
  collector.on('collect', async (message) => {
    const game = getActiveGame(channelId);
    if (!game || game.type !== 'numguess' || game.ended) {
      collector.stop();
      return;
    }
    
    const guess = parseInt(message.content.trim());
    const odId = message.author.id;
    
    // Validate range
    if (guess < 1 || guess > game.maxNumber) {
      await message.react('⚠️');
      return;
    }
    
    // Track player
    if (!game.players.has(odId)) {
      game.players.set(odId, { odId, guesses: 0, odName: message.author.username });
    }
    const player = game.players.get(odId);
    player.guesses++;
    game.attempts++;
    game.guesses.push({ odId, guess, odName: message.author.username });
    
    // Check guess
    if (guess === game.secretNumber) {
      game.won = true;
      game.ended = true;
      game.winner = odId;
      
      await message.react('🎉');
      
      const points = Math.max(10, (game.maxAttempts - game.attempts + 1) * 15);
      await updateGameStats(odId, 'numguess', true, points);
      
      const embed = new EmbedBuilder()
        .setColor('#10b981')
        .setTitle('🎉 Correct!')
        .setDescription(`**${message.author.username}** guessed it!\n\nThe number was **${game.secretNumber}**`)
        .addFields(
          { name: '🎯 Attempts Used', value: `${game.attempts}`, inline: true },
          { name: '🏆 Points', value: `+${points}`, inline: true }
        )
        .setFooter({ text: 'Use /numguess to play again!' });
      
      await channel.send({ embeds: [embed] });
      collector.stop();
      clearActiveGame(channelId);
      return;
    }
    
    // Wrong guess
    const hint = guess < game.secretNumber ? '📈 **Higher!**' : '📉 **Lower!**';
    const distance = Math.abs(game.secretNumber - guess);
    let temperature = '❄️ Cold';
    if (distance <= 5) temperature = '🔥 Very Hot!';
    else if (distance <= 10) temperature = '🌡️ Hot';
    else if (distance <= 20) temperature = '😊 Warm';
    else if (distance <= 35) temperature = '🌤️ Cool';
    
    await message.react(guess < game.secretNumber ? '⬆️' : '⬇️');
    
    // Check if out of attempts
    if (game.attempts >= game.maxAttempts) {
      game.ended = true;
      
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('💀 Game Over!')
        .setDescription(`No one guessed it!\n\nThe number was **${game.secretNumber}**`)
        .addFields(
          { name: '🎯 Total Attempts', value: `${game.attempts}`, inline: true }
        )
        .setFooter({ text: 'Use /numguess to play again!' });
      
      await channel.send({ embeds: [embed] });
      collector.stop();
      clearActiveGame(channelId);
      return;
    }
    
    // Show hint
    const embed = new EmbedBuilder()
      .setColor('#f59e0b')
      .setTitle(hint)
      .setDescription(`${temperature}`)
      .addFields(
        { name: '🎯 Attempts', value: `${game.attempts} / ${game.maxAttempts}`, inline: true },
        { name: '👤 Guessed By', value: message.author.username, inline: true }
      )
      .setFooter({ text: 'Keep guessing!' });
    
    await channel.send({ embeds: [embed] });
  });
  
  collector.on('end', (collected, reason) => {
    if (reason === 'time') {
      const game = getActiveGame(channelId);
      if (game && !game.ended) {
        game.ended = true;
        channel.send(`⏰ Game timed out! The number was **${game.secretNumber}**`);
        clearActiveGame(channelId);
      }
    }
  });
}

// Stop game
export function stopNumberGuess(channelId) {
  const game = getActiveGame(channelId);
  if (game && game.type === 'numguess') {
    clearActiveGame(channelId);
    return game.secretNumber;
  }
  return null;
}
