import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats } from './game-manager.js';

// Roles
const ROLES = {
  villager: { name: 'Villager', emoji: '👤', team: 'village', description: 'Find and eliminate the Mafia!' },
  mafia: { name: 'Mafia', emoji: '🔪', team: 'mafia', description: 'Eliminate villagers without getting caught!' },
  doctor: { name: 'Doctor', emoji: '💉', team: 'village', description: 'Save one person each night!' },
  detective: { name: 'Detective', emoji: '🔍', team: 'village', description: 'Investigate one person each night!' }
};

// Assign roles based on player count
function assignRoles(playerCount) {
  const roles = [];
  
  // Mafia count: roughly 1/4 of players
  const mafiaCount = Math.max(1, Math.floor(playerCount / 4));
  
  for (let i = 0; i < mafiaCount; i++) roles.push('mafia');
  
  // Special roles if enough players
  if (playerCount >= 5) roles.push('doctor');
  if (playerCount >= 6) roles.push('detective');
  
  // Fill rest with villagers
  while (roles.length < playerCount) roles.push('villager');
  
  // Shuffle
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  
  return roles;
}

// Start Mafia game (lobby phase)
export async function startMafia(interaction, minPlayers = 4) {
  const channelId = interaction.channelId;
  
  if (hasActiveGame(channelId)) {
    await interaction.reply({ content: '⚠️ A game is already active in this channel!', ephemeral: true });
    return;
  }
  
  const game = {
    type: 'mafia',
    phase: 'lobby', // lobby, night, day, voting
    players: new Map(),
    alive: new Set(),
    dead: new Set(),
    roles: new Map(),
    minPlayers,
    nightActions: { mafiaTarget: null, doctorSave: null, detectiveCheck: null },
    dayNumber: 0,
    votes: new Map(),
    lastKilled: null,
    startedBy: interaction.user.id,
    ended: false
  };
  
  // Add host
  game.players.set(interaction.user.id, { id: interaction.user.id, username: interaction.user.username });
  game.alive.add(interaction.user.id);
  
  setActiveGame(channelId, game);
  
  const embed = new EmbedBuilder()
    .setColor('#8b0000')
    .setTitle('🔪 Mafia - Lobby')
    .setDescription(`**${interaction.user.username}** is starting a Mafia game!\n\nClick **Join** to play!\nMinimum ${minPlayers} players needed.`)
    .addFields(
      { name: '👥 Players', value: `1. ${interaction.user.username}`, inline: false },
      { name: '📋 Roles', value: '👤 Villagers, 🔪 Mafia, 💉 Doctor, 🔍 Detective', inline: false }
    )
    .setFooter({ text: 'Host: Click Start when ready!' });
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('mafia_join')
      .setLabel('Join Game')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('✋'),
    new ButtonBuilder()
      .setCustomId('mafia_start')
      .setLabel('Start Game')
      .setStyle(ButtonStyle.Success)
      .setEmoji('▶️'),
    new ButtonBuilder()
      .setCustomId('mafia_leave')
      .setLabel('Leave')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🚪')
  );
  
  const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
  
  setupLobbyCollector(msg, interaction.channel, channelId);
}

// Lobby collector
function setupLobbyCollector(message, channel, channelId) {
  const collector = message.createMessageComponentCollector({
    filter: (i) => i.customId.startsWith('mafia_'),
    time: 300000 // 5 minute lobby
  });
  
  collector.on('collect', async (i) => {
    const game = getActiveGame(channelId);
    if (!game || game.phase !== 'lobby') {
      collector.stop();
      return;
    }
    
    const odId = i.user.id;
    
    if (i.customId === 'mafia_join') {
      if (game.players.has(odId)) {
        await i.reply({ content: 'You\'re already in the game!', ephemeral: true });
        return;
      }
      
      game.players.set(odId, { id: odId, username: i.user.username });
      game.alive.add(odId);
      
      await updateLobbyEmbed(message, game);
      await i.reply({ content: '✅ You joined the game!', ephemeral: true });
    }
    else if (i.customId === 'mafia_leave') {
      if (!game.players.has(odId)) {
        await i.reply({ content: 'You\'re not in the game!', ephemeral: true });
        return;
      }
      
      if (odId === game.startedBy) {
        await i.reply({ content: 'Host can\'t leave! Use /game stop to cancel.', ephemeral: true });
        return;
      }
      
      game.players.delete(odId);
      game.alive.delete(odId);
      
      await updateLobbyEmbed(message, game);
      await i.reply({ content: '👋 You left the game.', ephemeral: true });
    }
    else if (i.customId === 'mafia_start') {
      if (odId !== game.startedBy) {
        await i.reply({ content: 'Only the host can start the game!', ephemeral: true });
        return;
      }
      
      if (game.players.size < game.minPlayers) {
        await i.reply({ content: `Need at least ${game.minPlayers} players!`, ephemeral: true });
        return;
      }
      
      collector.stop('starting');
      await i.deferUpdate();
      
      // Assign roles
      const playerIds = Array.from(game.players.keys());
      const roles = assignRoles(playerIds.length);
      
      for (let i = 0; i < playerIds.length; i++) {
        game.roles.set(playerIds[i], roles[i]);
      }
      
      // DM roles to players
      for (const [playerId, role] of game.roles) {
        const player = game.players.get(playerId);
        const roleInfo = ROLES[role];
        
        try {
          const user = await channel.client.users.fetch(playerId);
          await user.send(`🎭 **Mafia Game Started!**\n\nYour role: ${roleInfo.emoji} **${roleInfo.name}**\n${roleInfo.description}`);
        } catch (e) {
          // Can't DM user
        }
      }
      
      // Start night phase
      game.phase = 'night';
      game.dayNumber = 1;
      
      const nightEmbed = new EmbedBuilder()
        .setColor('#1a1a2e')
        .setTitle('🌙 Night 1')
        .setDescription('The town falls asleep...\n\nRoles have been assigned via DM!\nMafia, Doctor, and Detective: check your DMs for actions.')
        .addFields({ name: '👥 Alive', value: Array.from(game.alive).map(id => game.players.get(id).username).join(', '), inline: false })
        .setFooter({ text: 'Night actions processing...' });
      
      await message.edit({ embeds: [nightEmbed], components: [] });
      
      // Process night after delay
      setTimeout(() => processNight(channel, channelId), 15000);
    }
  });
  
  collector.on('end', (collected, reason) => {
    if (reason === 'time') {
      const game = getActiveGame(channelId);
      if (game && game.phase === 'lobby') {
        channel.send('⏰ Mafia lobby timed out!');
        clearActiveGame(channelId);
      }
    }
  });
}

// Update lobby embed
async function updateLobbyEmbed(message, game) {
  const playerList = Array.from(game.players.values())
    .map((p, i) => `${i + 1}. ${p.username}${p.id === game.startedBy ? ' 👑' : ''}`)
    .join('\n');
  
  const embed = new EmbedBuilder()
    .setColor('#8b0000')
    .setTitle('🔪 Mafia - Lobby')
    .setDescription(`Waiting for players...\n\n${game.players.size}/${game.minPlayers} minimum players`)
    .addFields(
      { name: '👥 Players', value: playerList || 'None', inline: false },
      { name: '📋 Roles', value: '👤 Villagers, 🔪 Mafia, 💉 Doctor, 🔍 Detective', inline: false }
    )
    .setFooter({ text: 'Host: Click Start when ready!' });
  
  await message.edit({ embeds: [embed] });
}

// Process night phase
async function processNight(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game || game.ended) return;
  
  // For simplicity, AI picks random targets for night actions
  const aliveArray = Array.from(game.alive);
  
  // Mafia kills random villager
  const mafiaPlayers = aliveArray.filter(id => game.roles.get(id) === 'mafia');
  const nonMafia = aliveArray.filter(id => game.roles.get(id) !== 'mafia');
  
  if (mafiaPlayers.length > 0 && nonMafia.length > 0) {
    game.nightActions.mafiaTarget = nonMafia[Math.floor(Math.random() * nonMafia.length)];
  }
  
  // Doctor saves random person
  const doctor = aliveArray.find(id => game.roles.get(id) === 'doctor');
  if (doctor) {
    game.nightActions.doctorSave = aliveArray[Math.floor(Math.random() * aliveArray.length)];
  }
  
  // Resolve night
  let killed = null;
  if (game.nightActions.mafiaTarget && game.nightActions.mafiaTarget !== game.nightActions.doctorSave) {
    killed = game.nightActions.mafiaTarget;
    game.alive.delete(killed);
    game.dead.add(killed);
    game.lastKilled = killed;
  }
  
  // Reset night actions
  game.nightActions = { mafiaTarget: null, doctorSave: null, detectiveCheck: null };
  
  // Check win conditions
  const winner = checkWinCondition(game);
  if (winner) {
    endMafiaGame(channel, channelId, winner);
    return;
  }
  
  // Start day phase
  game.phase = 'day';
  game.votes.clear();
  
  const killedPlayer = killed ? game.players.get(killed) : null;
  const killedRole = killed ? ROLES[game.roles.get(killed)] : null;
  
  const dayEmbed = new EmbedBuilder()
    .setColor('#ffd700')
    .setTitle(`☀️ Day ${game.dayNumber}`)
    .setDescription(killed 
      ? `The town wakes up to find **${killedPlayer.username}** dead!\nThey were a ${killedRole.emoji} ${killedRole.name}.`
      : 'The town wakes up... everyone survived the night!')
    .addFields(
      { name: '👥 Alive', value: Array.from(game.alive).map(id => game.players.get(id).username).join(', '), inline: false },
      { name: '💀 Dead', value: game.dead.size > 0 ? Array.from(game.dead).map(id => game.players.get(id).username).join(', ') : 'None', inline: false }
    )
    .setFooter({ text: 'Discuss and vote! Type a player\'s name to vote.' });
  
  await channel.send({ embeds: [dayEmbed] });
  
  setupDayCollector(channel, channelId);
}

// Day phase collector
function setupDayCollector(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  const collector = channel.createMessageCollector({
    filter: (m) => !m.author.bot && game.alive.has(m.author.id),
    time: 60000 // 1 minute discussion/voting
  });
  
  collector.on('collect', async (message) => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.phase !== 'day') return;
    
    const content = message.content.toLowerCase();
    const voterId = message.author.id;
    
    // Check if voting for someone
    for (const [playerId, player] of currentGame.players) {
      if (currentGame.alive.has(playerId) && content.includes(player.username.toLowerCase())) {
        currentGame.votes.set(voterId, playerId);
        await message.react('🗳️');
        
        // Check if majority
        const voteCounts = new Map();
        for (const target of currentGame.votes.values()) {
          voteCounts.set(target, (voteCounts.get(target) || 0) + 1);
        }
        
        const majority = Math.floor(currentGame.alive.size / 2) + 1;
        for (const [target, count] of voteCounts) {
          if (count >= majority) {
            collector.stop('majority');
            await executePlayer(channel, channelId, target);
            return;
          }
        }
        break;
      }
    }
  });
  
  collector.on('end', async (collected, reason) => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.ended) return;
    
    if (reason === 'time') {
      // No majority - no execution
      await channel.send('⏰ Time\'s up! No one was executed.');
      
      // Start next night
      currentGame.phase = 'night';
      currentGame.dayNumber++;
      
      const nightEmbed = new EmbedBuilder()
        .setColor('#1a1a2e')
        .setTitle(`🌙 Night ${currentGame.dayNumber}`)
        .setDescription('The town falls asleep...')
        .setFooter({ text: 'Night actions processing...' });
      
      await channel.send({ embeds: [nightEmbed] });
      
      setTimeout(() => processNight(channel, channelId), 10000);
    }
  });
}

// Execute a player
async function executePlayer(channel, channelId, playerId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  const player = game.players.get(playerId);
  const role = ROLES[game.roles.get(playerId)];
  
  game.alive.delete(playerId);
  game.dead.add(playerId);
  
  const embed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle('⚖️ Execution!')
    .setDescription(`The town has voted to execute **${player.username}**!\n\nThey were a ${role.emoji} ${role.name}.`);
  
  await channel.send({ embeds: [embed] });
  
  // Check win condition
  const winner = checkWinCondition(game);
  if (winner) {
    endMafiaGame(channel, channelId, winner);
    return;
  }
  
  // Start next night
  game.phase = 'night';
  game.dayNumber++;
  
  setTimeout(async () => {
    const nightEmbed = new EmbedBuilder()
      .setColor('#1a1a2e')
      .setTitle(`🌙 Night ${game.dayNumber}`)
      .setDescription('The town falls asleep...')
      .setFooter({ text: 'Night actions processing...' });
    
    await channel.send({ embeds: [nightEmbed] });
    
    setTimeout(() => processNight(channel, channelId), 10000);
  }, 3000);
}

// Check win condition
function checkWinCondition(game) {
  const aliveMafia = Array.from(game.alive).filter(id => game.roles.get(id) === 'mafia').length;
  const aliveVillage = game.alive.size - aliveMafia;
  
  if (aliveMafia === 0) return 'village';
  if (aliveMafia >= aliveVillage) return 'mafia';
  return null;
}

// End game
function endMafiaGame(channel, channelId, winner) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  game.ended = true;
  
  const winnerTeam = winner === 'village' ? '👥 Village' : '🔪 Mafia';
  const winnerColor = winner === 'village' ? '#4caf50' : '#f44336';
  
  let roleReveal = '';
  for (const [playerId, role] of game.roles) {
    const player = game.players.get(playerId);
    const roleInfo = ROLES[role];
    const status = game.alive.has(playerId) ? '✅' : '💀';
    roleReveal += `${status} **${player.username}** - ${roleInfo.emoji} ${roleInfo.name}\n`;
    
    // Update stats
    const won = (winner === 'village' && roleInfo.team === 'village') || 
                (winner === 'mafia' && roleInfo.team === 'mafia');
    updateGameStats(playerId, 'mafia', won, won ? 100 : 25);
  }
  
  const embed = new EmbedBuilder()
    .setColor(winnerColor)
    .setTitle(`🎭 ${winnerTeam} Wins!`)
    .setDescription(winner === 'village' 
      ? 'The town has eliminated all the Mafia!' 
      : 'The Mafia has taken over the town!')
    .addFields({ name: '📋 Role Reveal', value: roleReveal, inline: false })
    .setFooter({ text: 'Use /mafia to play again!' });
  
  channel.send({ embeds: [embed] });
  clearActiveGame(channelId);
}

// Stop game
export function stopMafia(channelId) {
  const game = getActiveGame(channelId);
  if (game && game.type === 'mafia') {
    clearActiveGame(channelId);
    return true;
  }
  return false;
}
