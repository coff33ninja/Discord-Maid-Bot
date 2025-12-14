import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats } from './game-manager.js';

const ROWS = 6;
const COLS = 7;
const EMPTY = '⚫';
const PLAYER1 = '🔴';
const PLAYER2 = '🟡';

// Create empty board
function createBoard() {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY));
}

// Render board as string
function renderBoard(board) {
  let display = '';
  for (let row = 0; row < ROWS; row++) {
    display += board[row].join('') + '\n';
  }
  display += '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣';
  return display;
}

// Drop piece in column
function dropPiece(board, col, piece) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === EMPTY) {
      board[row][col] = piece;
      return row;
    }
  }
  return -1; // Column full
}

// Check for win
function checkWin(board, piece) {
  // Horizontal
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      if (board[row][col] === piece && 
          board[row][col + 1] === piece && 
          board[row][col + 2] === piece && 
          board[row][col + 3] === piece) {
        return true;
      }
    }
  }
  
  // Vertical
  for (let row = 0; row <= ROWS - 4; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] === piece && 
          board[row + 1][col] === piece && 
          board[row + 2][col] === piece && 
          board[row + 3][col] === piece) {
        return true;
      }
    }
  }
  
  // Diagonal (down-right)
  for (let row = 0; row <= ROWS - 4; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      if (board[row][col] === piece && 
          board[row + 1][col + 1] === piece && 
          board[row + 2][col + 2] === piece && 
          board[row + 3][col + 3] === piece) {
        return true;
      }
    }
  }
  
  // Diagonal (up-right)
  for (let row = 3; row < ROWS; row++) {
    for (let col = 0; col <= COLS - 4; col++) {
      if (board[row][col] === piece && 
          board[row - 1][col + 1] === piece && 
          board[row - 2][col + 2] === piece && 
          board[row - 3][col + 3] === piece) {
        return true;
      }
    }
  }
  
  return false;
}

// Check for draw
function checkDraw(board) {
  return board[0].every(cell => cell !== EMPTY);
}

// Simple AI move
function getAIMove(board, aiPiece, playerPiece) {
  // Check for winning move
  for (let col = 0; col < COLS; col++) {
    if (board[0][col] === EMPTY) {
      const testBoard = board.map(row => [...row]);
      dropPiece(testBoard, col, aiPiece);
      if (checkWin(testBoard, aiPiece)) return col;
    }
  }
  
  // Block player's winning move
  for (let col = 0; col < COLS; col++) {
    if (board[0][col] === EMPTY) {
      const testBoard = board.map(row => [...row]);
      dropPiece(testBoard, col, playerPiece);
      if (checkWin(testBoard, playerPiece)) return col;
    }
  }
  
  // Prefer center
  if (board[0][3] === EMPTY) return 3;
  
  // Random valid column
  const validCols = [];
  for (let col = 0; col < COLS; col++) {
    if (board[0][col] === EMPTY) validCols.push(col);
  }
  return validCols[Math.floor(Math.random() * validCols.length)];
}

// Challenge another player
export async function challengeConnect4(interaction, opponent) {
  const channelId = interaction.channelId;
  
  if (hasActiveGame(channelId)) {
    await interaction.reply({ content: '⚠️ A game is already active in this channel!', ephemeral: true });
    return;
  }
  
  if (opponent.bot) {
    await interaction.reply({ content: '❌ You can\'t challenge a bot! Use `/connect4 ai` instead.', ephemeral: true });
    return;
  }
  
  if (opponent.id === interaction.user.id) {
    await interaction.reply({ content: '❌ You can\'t challenge yourself!', ephemeral: true });
    return;
  }
  
  const game = {
    type: 'connect4',
    board: createBoard(),
    player1: { id: interaction.user.id, username: interaction.user.username, piece: PLAYER1 },
    player2: { id: opponent.id, username: opponent.username, piece: PLAYER2 },
    currentPlayer: 1,
    vsAI: false,
    startedBy: interaction.user.id,
    ended: false
  };
  
  setActiveGame(channelId, game);
  
  const embed = new EmbedBuilder()
    .setColor('#ffc107')
    .setTitle('🔴🟡 Connect Four Challenge!')
    .setDescription(`${interaction.user.username} vs ${opponent.username}\n\n${renderBoard(game.board)}`)
    .addFields({ name: '🎮 Current Turn', value: `${PLAYER1} ${interaction.user.username}`, inline: true })
    .setFooter({ text: 'Click a column button to drop your piece!' });
  
  const row = createColumnButtons();
  
  const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
  
  setupConnect4Collector(msg, interaction.channel, channelId);
}

// Play vs AI
export async function playConnect4AI(interaction) {
  const channelId = interaction.channelId;
  
  if (hasActiveGame(channelId)) {
    await interaction.reply({ content: '⚠️ A game is already active in this channel!', ephemeral: true });
    return;
  }
  
  const game = {
    type: 'connect4',
    board: createBoard(),
    player1: { id: interaction.user.id, username: interaction.user.username, piece: PLAYER1 },
    player2: { id: 'ai', username: 'AI', piece: PLAYER2 },
    currentPlayer: 1,
    vsAI: true,
    startedBy: interaction.user.id,
    ended: false
  };
  
  setActiveGame(channelId, game);
  
  const embed = new EmbedBuilder()
    .setColor('#ffc107')
    .setTitle('🔴🟡 Connect Four vs AI')
    .setDescription(`${interaction.user.username} vs 🤖 AI\n\n${renderBoard(game.board)}`)
    .addFields({ name: '🎮 Your Turn', value: `${PLAYER1} ${interaction.user.username}`, inline: true })
    .setFooter({ text: 'Click a column button to drop your piece!' });
  
  const row = createColumnButtons();
  
  const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
  
  setupConnect4Collector(msg, interaction.channel, channelId);
}

// Create column buttons
function createColumnButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('c4_0').setLabel('1').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('c4_1').setLabel('2').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('c4_2').setLabel('3').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('c4_3').setLabel('4').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('c4_4').setLabel('5').setStyle(ButtonStyle.Secondary)
  );
}

function createColumnButtons2() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('c4_5').setLabel('6').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('c4_6').setLabel('7').setStyle(ButtonStyle.Secondary)
  );
}

// Set up collector
function setupConnect4Collector(message, channel, channelId) {
  const collector = message.createMessageComponentCollector({
    filter: (i) => i.customId.startsWith('c4_'),
    time: 300000 // 5 minute timeout
  });
  
  collector.on('collect', async (i) => {
    const game = getActiveGame(channelId);
    if (!game || game.type !== 'connect4' || game.ended) {
      collector.stop();
      return;
    }
    
    const currentPlayer = game.currentPlayer === 1 ? game.player1 : game.player2;
    
    // Check if it's this player's turn
    if (i.user.id !== currentPlayer.id) {
      await i.reply({ content: '❌ Not your turn!', ephemeral: true });
      return;
    }
    
    const col = parseInt(i.customId.split('_')[1]);
    const row = dropPiece(game.board, col, currentPlayer.piece);
    
    if (row === -1) {
      await i.reply({ content: '❌ Column is full!', ephemeral: true });
      return;
    }
    
    // Check for win
    if (checkWin(game.board, currentPlayer.piece)) {
      game.ended = true;
      
      await updateGameStats(currentPlayer.id, 'connect4', true, 100);
      if (!game.vsAI) {
        const loser = game.currentPlayer === 1 ? game.player2 : game.player1;
        await updateGameStats(loser.id, 'connect4', false, 10);
      }
      
      const embed = new EmbedBuilder()
        .setColor('#4caf50')
        .setTitle('🎉 Connect Four - Winner!')
        .setDescription(`${renderBoard(game.board)}\n\n**${currentPlayer.username}** wins!`)
        .setFooter({ text: 'Use /connect4 to play again!' });
      
      await i.update({ embeds: [embed], components: [] });
      collector.stop();
      clearActiveGame(channelId);
      return;
    }
    
    // Check for draw
    if (checkDraw(game.board)) {
      game.ended = true;
      
      await updateGameStats(game.player1.id, 'connect4', false, 25);
      if (!game.vsAI) await updateGameStats(game.player2.id, 'connect4', false, 25);
      
      const embed = new EmbedBuilder()
        .setColor('#9e9e9e')
        .setTitle('🤝 Connect Four - Draw!')
        .setDescription(`${renderBoard(game.board)}\n\nIt's a tie!`)
        .setFooter({ text: 'Use /connect4 to play again!' });
      
      await i.update({ embeds: [embed], components: [] });
      collector.stop();
      clearActiveGame(channelId);
      return;
    }
    
    // Switch turns
    game.currentPlayer = game.currentPlayer === 1 ? 2 : 1;
    const nextPlayer = game.currentPlayer === 1 ? game.player1 : game.player2;
    
    const embed = new EmbedBuilder()
      .setColor('#ffc107')
      .setTitle('🔴🟡 Connect Four')
      .setDescription(`${game.player1.username} vs ${game.player2.username}\n\n${renderBoard(game.board)}`)
      .addFields({ name: '🎮 Current Turn', value: `${nextPlayer.piece} ${nextPlayer.username}`, inline: true });
    
    await i.update({ embeds: [embed], components: [createColumnButtons(), createColumnButtons2()] });
    
    // AI move
    if (game.vsAI && game.currentPlayer === 2) {
      setTimeout(async () => {
        const currentGame = getActiveGame(channelId);
        if (!currentGame || currentGame.ended) return;
        
        const aiCol = getAIMove(currentGame.board, PLAYER2, PLAYER1);
        dropPiece(currentGame.board, aiCol, PLAYER2);
        
        // Check AI win
        if (checkWin(currentGame.board, PLAYER2)) {
          currentGame.ended = true;
          await updateGameStats(currentGame.player1.id, 'connect4', false, 10);
          
          const winEmbed = new EmbedBuilder()
            .setColor('#f44336')
            .setTitle('🤖 AI Wins!')
            .setDescription(`${renderBoard(currentGame.board)}\n\nBetter luck next time!`)
            .setFooter({ text: 'Use /connect4 to play again!' });
          
          await message.edit({ embeds: [winEmbed], components: [] });
          collector.stop();
          clearActiveGame(channelId);
          return;
        }
        
        // Check draw
        if (checkDraw(currentGame.board)) {
          currentGame.ended = true;
          await updateGameStats(currentGame.player1.id, 'connect4', false, 25);
          
          const drawEmbed = new EmbedBuilder()
            .setColor('#9e9e9e')
            .setTitle('🤝 Draw!')
            .setDescription(`${renderBoard(currentGame.board)}\n\nIt's a tie!`)
            .setFooter({ text: 'Use /connect4 to play again!' });
          
          await message.edit({ embeds: [drawEmbed], components: [] });
          collector.stop();
          clearActiveGame(channelId);
          return;
        }
        
        currentGame.currentPlayer = 1;
        
        const turnEmbed = new EmbedBuilder()
          .setColor('#ffc107')
          .setTitle('🔴🟡 Connect Four vs AI')
          .setDescription(`${currentGame.player1.username} vs 🤖 AI\n\n${renderBoard(currentGame.board)}`)
          .addFields({ name: '🎮 Your Turn', value: `${PLAYER1} ${currentGame.player1.username}`, inline: true });
        
        await message.edit({ embeds: [turnEmbed], components: [createColumnButtons(), createColumnButtons2()] });
      }, 1000);
    }
  });
  
  collector.on('end', (collected, reason) => {
    if (reason === 'time') {
      const game = getActiveGame(channelId);
      if (game && !game.ended) {
        channel.send('⏰ Connect Four timed out!');
        clearActiveGame(channelId);
      }
    }
  });
}

// Stop game
export function stopConnect4(channelId) {
  const game = getActiveGame(channelId);
  if (game && game.type === 'connect4') {
    clearActiveGame(channelId);
    return true;
  }
  return false;
}
