import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { updateGameStats } from './game-manager.js';

// Active games
const activeGames = new Map();

// Board display
const EMPTY = '⬜';
const X = '❌';
const O = '⭕';

// Create board buttons
function createBoardButtons(board, disabled = false) {
  const rows = [];
  
  for (let row = 0; row < 3; row++) {
    const actionRow = new ActionRowBuilder();
    
    for (let col = 0; col < 3; col++) {
      const index = row * 3 + col;
      const cell = board[index];
      
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt_${index}`)
          .setLabel(cell === EMPTY ? '‎' : ' ') // Invisible char for empty
          .setEmoji(cell)
          .setStyle(cell === EMPTY ? ButtonStyle.Secondary : (cell === X ? ButtonStyle.Danger : ButtonStyle.Primary))
          .setDisabled(disabled || cell !== EMPTY)
      );
    }
    
    rows.push(actionRow);
  }
  
  return rows;
}

// Check for winner
function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6] // Diagonals
  ];
  
  for (const [a, b, c] of lines) {
    if (board[a] !== EMPTY && board[a] === board[b] && board[b] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  
  // Check for draw
  if (board.every(cell => cell !== EMPTY)) {
    return { winner: 'draw', line: null };
  }
  
  return null;
}

// AI move (simple minimax for unbeatable AI)
function getAIMove(board, aiSymbol) {
  const humanSymbol = aiSymbol === X ? O : X;
  
  // Try to win
  for (let i = 0; i < 9; i++) {
    if (board[i] === EMPTY) {
      board[i] = aiSymbol;
      if (checkWinner(board)?.winner === aiSymbol) {
        board[i] = EMPTY;
        return i;
      }
      board[i] = EMPTY;
    }
  }
  
  // Block human win
  for (let i = 0; i < 9; i++) {
    if (board[i] === EMPTY) {
      board[i] = humanSymbol;
      if (checkWinner(board)?.winner === humanSymbol) {
        board[i] = EMPTY;
        return i;
      }
      board[i] = EMPTY;
    }
  }
  
  // Take center
  if (board[4] === EMPTY) return 4;
  
  // Take corner
  const corners = [0, 2, 6, 8];
  const emptyCorners = corners.filter(i => board[i] === EMPTY);
  if (emptyCorners.length > 0) {
    return emptyCorners[Math.floor(Math.random() * emptyCorners.length)];
  }
  
  // Take any empty
  const empty = board.map((cell, i) => cell === EMPTY ? i : -1).filter(i => i !== -1);
  return empty[Math.floor(Math.random() * empty.length)];
}

// Challenge another player
export async function challengeTTT(interaction, opponent) {
  const challengerId = interaction.user.id;
  const opponentId = opponent.id;
  
  if (challengerId === opponentId) {
    await interaction.reply({ content: "❌ You can't challenge yourself!", ephemeral: true });
    return;
  }
  
  if (opponent.bot) {
    await interaction.reply({ content: "❌ Use `/tictactoe ai` to play against the bot!", ephemeral: true });
    return;
  }
  
  const gameKey = `${interaction.channelId}_ttt`;
  
  if (activeGames.has(gameKey)) {
    await interaction.reply({ content: '⚠️ A Tic Tac Toe game is already active in this channel!', ephemeral: true });
    return;
  }
  
  const game = {
    board: Array(9).fill(EMPTY),
    players: {
      [challengerId]: { symbol: X, name: interaction.user.username },
      [opponentId]: { symbol: O, name: opponent.username }
    },
    currentTurn: challengerId,
    challengerId,
    opponentId,
    vsAI: false
  };
  
  activeGames.set(gameKey, game);
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('⭕ Tic Tac Toe ❌')
    .setDescription(`**${interaction.user.username}** (${X}) vs **${opponent.username}** (${O})\n\n${X} **${interaction.user.username}**'s turn!`)
    .setFooter({ text: 'Click a square to place your mark!' });
  
  const rows = createBoardButtons(game.board);
  
  const message = await interaction.reply({ 
    content: `<@${opponentId}> You've been challenged to Tic Tac Toe!`,
    embeds: [embed], 
    components: rows,
    fetchReply: true 
  });
  
  setupCollector(message, game, gameKey, interaction.channel);
}

// Play against AI
export async function playTTTvsAI(interaction) {
  const odId = interaction.user.id;
  const gameKey = `${interaction.channelId}_ttt`;
  
  if (activeGames.has(gameKey)) {
    await interaction.reply({ content: '⚠️ A Tic Tac Toe game is already active in this channel!', ephemeral: true });
    return;
  }
  
  const game = {
    board: Array(9).fill(EMPTY),
    players: {
      [odId]: { symbol: X, name: interaction.user.username },
      'ai': { symbol: O, name: 'Bot' }
    },
    currentTurn: odId,
    odId,
    vsAI: true
  };
  
  activeGames.set(gameKey, game);
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('⭕ Tic Tac Toe vs Bot ❌')
    .setDescription(`**${interaction.user.username}** (${X}) vs **Bot** (${O})\n\n${X} Your turn!`)
    .setFooter({ text: 'Click a square to place your mark!' });
  
  const rows = createBoardButtons(game.board);
  
  const message = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });
  
  setupCollector(message, game, gameKey, interaction.channel);
}

// Set up button collector
function setupCollector(message, game, gameKey, channel) {
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 300000 // 5 minutes
  });
  
  collector.on('collect', async (buttonInteraction) => {
    const odId = buttonInteraction.user.id;
    
    // Check if it's this player's turn
    if (game.currentTurn !== odId) {
      await buttonInteraction.reply({ content: "❌ It's not your turn!", ephemeral: true });
      return;
    }
    
    // Check if player is in game
    if (!game.players[odId]) {
      await buttonInteraction.reply({ content: "❌ You're not in this game!", ephemeral: true });
      return;
    }
    
    const index = parseInt(buttonInteraction.customId.replace('ttt_', ''));
    const player = game.players[odId];
    
    // Make move
    game.board[index] = player.symbol;
    
    // Check for winner
    const result = checkWinner(game.board);
    
    if (result) {
      collector.stop('game_over');
      await showGameOver(buttonInteraction, game, result, gameKey);
      return;
    }
    
    // Switch turn
    if (game.vsAI) {
      // AI's turn
      const aiMove = getAIMove(game.board, O);
      game.board[aiMove] = O;
      
      const aiResult = checkWinner(game.board);
      if (aiResult) {
        collector.stop('game_over');
        await showGameOver(buttonInteraction, game, aiResult, gameKey);
        return;
      }
      
      // Still player's turn after AI moves
      const embed = new EmbedBuilder()
        .setColor('#667eea')
        .setTitle('⭕ Tic Tac Toe vs Bot ❌')
        .setDescription(`${X} Your turn!`)
        .setFooter({ text: 'Click a square to place your mark!' });
      
      const rows = createBoardButtons(game.board);
      await buttonInteraction.update({ embeds: [embed], components: rows });
    } else {
      // Switch to other player
      game.currentTurn = game.currentTurn === game.challengerId ? game.opponentId : game.challengerId;
      const nextPlayer = game.players[game.currentTurn];
      
      const embed = new EmbedBuilder()
        .setColor('#667eea')
        .setTitle('⭕ Tic Tac Toe ❌')
        .setDescription(`${nextPlayer.symbol} **${nextPlayer.name}**'s turn!`)
        .setFooter({ text: 'Click a square to place your mark!' });
      
      const rows = createBoardButtons(game.board);
      await buttonInteraction.update({ embeds: [embed], components: rows });
    }
  });
  
  collector.on('end', async (collected, reason) => {
    if (reason === 'time') {
      activeGames.delete(gameKey);
      
      const embed = new EmbedBuilder()
        .setColor('#ef4444')
        .setTitle('⏰ Game Timed Out')
        .setDescription('The game was abandoned due to inactivity.');
      
      const rows = createBoardButtons(game.board, true);
      await message.edit({ embeds: [embed], components: rows });
    }
  });
}

// Show game over
async function showGameOver(interaction, game, result, gameKey) {
  activeGames.delete(gameKey);
  
  let title, description, color;
  
  if (result.winner === 'draw') {
    title = "🤝 It's a Draw!";
    description = 'No one wins this time!';
    color = '#f59e0b';
    
    // Give both players some points
    for (const odId of Object.keys(game.players)) {
      if (odId !== 'ai') {
        updateGameStats(odId, 'tictactoe', false, 10);
      }
    }
  } else {
    const winnerId = Object.entries(game.players).find(([id, p]) => p.symbol === result.winner)?.[0];
    const winnerName = game.players[winnerId]?.name || 'Unknown';
    
    title = '🎉 Game Over!';
    description = `**${winnerName}** wins!`;
    color = '#10b981';
    
    if (winnerId !== 'ai') {
      updateGameStats(winnerId, 'tictactoe', true, 50);
    }
    
    // Loser gets participation points
    for (const odId of Object.keys(game.players)) {
      if (odId !== 'ai' && odId !== winnerId) {
        updateGameStats(odId, 'tictactoe', false, 5);
      }
    }
  }
  
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: 'Use /tictactoe to play again!' });
  
  const rows = createBoardButtons(game.board, true);
  await interaction.update({ embeds: [embed], components: rows });
}

// Stop game
export function stopTTT(channelId) {
  const gameKey = `${channelId}_ttt`;
  if (activeGames.has(gameKey)) {
    activeGames.delete(gameKey);
    return true;
  }
  return false;
}
