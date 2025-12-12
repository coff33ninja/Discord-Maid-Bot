import { EmbedBuilder } from 'discord.js';
import { createRequire } from 'module';
import { getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats } from './game-manager.js';
import { generateWithRotation } from '../config/gemini-keys.js';

// Create require for JSON import
const require = createRequire(import.meta.url);

// Word dictionary - loaded once
let wordSet = null;
let wordArray = null;
let dictionaryReady = false;

// Initialize dictionary
function initDictionary() {
  if (dictionaryReady) return true;
  
  try {
    const words = require('an-array-of-english-words');
    wordArray = words.filter(w => w.length >= 3 && /^[a-z]+$/.test(w));
    wordSet = new Set(wordArray);
    dictionaryReady = true;
    console.log(`📚 Word chain dictionary loaded: ${wordSet.size} words`);
    return true;
  } catch (error) {
    console.error('Failed to load dictionary:', error.message);
    return false;
  }
}

// Initialize on module load
initDictionary();

// Validate if a word is real using dictionary
async function validateWord(word, useAIFallback = false) {
  const lowerWord = word.toLowerCase();
  
  // Check dictionary first
  if (dictionaryReady && wordSet) {
    if (wordSet.has(lowerWord)) {
      return true;
    }
  }
  
  // Fallback to AI if dictionary doesn't have the word
  if (useAIFallback) {
    const prompt = `Is "${word}" a valid English word? Reply with ONLY "YES" or "NO".`;
    
    try {
      const { result } = await generateWithRotation(prompt);
      const response = result.response.text().trim().toUpperCase();
      return response.includes('YES');
    } catch {
      return false;
    }
  }
  
  return false;
}

// Get a random starting word from dictionary
function getRandomStartWord() {
  if (dictionaryReady && wordArray) {
    // Filter for good starting words (5-8 chars)
    const goodWords = wordArray.filter(w => w.length >= 5 && w.length <= 8);
    if (goodWords.length > 0) {
      return goodWords[Math.floor(Math.random() * goodWords.length)];
    }
  }
  
  // Fallback words
  const defaultWords = ['elephant', 'dragon', 'castle', 'rainbow', 'thunder', 'crystal', 'garden', 'mountain'];
  return defaultWords[Math.floor(Math.random() * defaultWords.length)];
}

// Get words starting with a letter (for hints)
function getWordsStartingWith(letter) {
  if (!dictionaryReady || !wordArray) return [];
  return wordArray.filter(w => w.startsWith(letter.toLowerCase()) && w.length >= 3).slice(0, 10);
}

// Start word chain game
export async function startWordChain(interaction, startWord = null, useAIFallback = true) {
  const channelId = interaction.channelId;
  
  if (hasActiveGame(channelId)) {
    await interaction.reply({ content: '⚠️ A game is already active in this channel!', flags: 64 });
    return;
  }
  
  // Ensure dictionary is ready
  initDictionary();
  
  // Generate starting word if not provided
  if (!startWord) {
    startWord = getRandomStartWord();
  }
  
  const game = {
    type: 'wordchain',
    words: [startWord],
    usedWords: new Set([startWord.toLowerCase()]),
    currentLetter: startWord.slice(-1).toLowerCase(),
    players: new Map(),
    turnOrder: [],
    currentTurnIndex: 0,
    consecutiveFails: 0,
    startedBy: interaction.user.id,
    ended: false,
    turnTime: 20,
    useAIFallback
  };
  
  setActiveGame(channelId, game);
  
  const dictStatus = dictionaryReady ? `📚 Dictionary (${wordSet.size.toLocaleString()} words)` : '🤖 AI validation';
  
  const embed = new EmbedBuilder()
    .setColor('#10b981')
    .setTitle('🔗 Word Chain Started!')
    .setDescription(`Starting word: **${startWord.toUpperCase()}**\n\nType a word that starts with **"${game.currentLetter.toUpperCase()}"**!`)
    .addFields(
      { name: '📜 Rules', value: `• Word must start with the last letter of previous word\n• No repeating words\n• Must be a real English word\n• 20 seconds per turn`, inline: false },
      { name: '⚙️ Mode', value: dictStatus, inline: true }
    )
    .setFooter({ text: 'Anyone can join by typing a valid word!' });
  
  await interaction.reply({ embeds: [embed] });
  
  setupWordChainCollector(interaction.channel, channelId);
}

// Set up collector
function setupWordChainCollector(channel, channelId) {
  const collector = channel.createMessageCollector({
    filter: (m) => !m.author.bot && /^[a-zA-Z]+$/.test(m.content.trim()),
    time: 300000
  });
  
  let turnTimeout = null;
  
  const resetTurnTimer = () => {
    if (turnTimeout) clearTimeout(turnTimeout);
    turnTimeout = setTimeout(async () => {
      const game = getActiveGame(channelId);
      if (!game || game.ended) return;
      
      game.consecutiveFails++;
      
      if (game.consecutiveFails >= 3) {
        await channel.send('⏰ Game ended due to inactivity!');
        endWordChain(channel, channelId);
        collector.stop();
      } else {
        // Give a hint
        const hints = getWordsStartingWith(game.currentLetter);
        const hintText = hints.length > 0 ? `\n💡 Hint: try words like *${hints.slice(0, 3).join(', ')}*...` : '';
        await channel.send(`⏰ Time's up! Still waiting for a word starting with **"${game.currentLetter.toUpperCase()}"**...${hintText}`);
        resetTurnTimer();
      }
    }, 20000);
  };
  
  resetTurnTimer();
  
  collector.on('collect', async (message) => {
    const game = getActiveGame(channelId);
    if (!game || game.type !== 'wordchain' || game.ended) {
      collector.stop();
      return;
    }
    
    const word = message.content.trim().toLowerCase();
    const odId = message.author.id;
    
    // Check if word starts with correct letter
    if (word[0] !== game.currentLetter) {
      await message.react('❌');
      await message.reply({ content: `Word must start with **"${game.currentLetter.toUpperCase()}"**!`, allowedMentions: { repliedUser: false } });
      return;
    }
    
    // Check if word was already used
    if (game.usedWords.has(word)) {
      await message.react('🔄');
      await message.reply({ content: `**${word}** was already used!`, allowedMentions: { repliedUser: false } });
      return;
    }
    
    // Validate word using dictionary (with optional AI fallback)
    const isValid = await validateWord(word, game.useAIFallback);
    if (!isValid) {
      await message.react('❓');
      await message.reply({ content: `**${word}** doesn't seem to be a valid word!`, allowedMentions: { repliedUser: false } });
      return;
    }
    
    // Valid word!
    game.words.push(word);
    game.usedWords.add(word);
    game.currentLetter = word.slice(-1);
    game.consecutiveFails = 0;
    
    // Track player
    if (!game.players.has(odId)) {
      game.players.set(odId, { odId, words: 0, odName: message.author.username });
    }
    game.players.get(odId).words++;
    
    await message.react('✅');
    
    // Show chain progress every 5 words
    if (game.words.length % 5 === 0) {
      const embed = new EmbedBuilder()
        .setColor('#10b981')
        .setTitle(`🔗 Chain Length: ${game.words.length}!`)
        .setDescription(`Last 5 words: ${game.words.slice(-5).join(' → ')}\n\nNext word must start with **"${game.currentLetter.toUpperCase()}"**`);
      
      await channel.send({ embeds: [embed] });
    }
    
    resetTurnTimer();
  });
  
  collector.on('end', () => {
    if (turnTimeout) clearTimeout(turnTimeout);
    const game = getActiveGame(channelId);
    if (game && !game.ended) {
      endWordChain(channel, channelId);
    }
  });
}

// End word chain game
function endWordChain(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  game.ended = true;
  
  // Build leaderboard
  const scores = Array.from(game.players.values())
    .sort((a, b) => b.words - a.words);
  
  let leaderboard = '';
  const medals = ['🥇', '🥈', '🥉'];
  
  for (let i = 0; i < Math.min(scores.length, 10); i++) {
    const score = scores[i];
    const medal = medals[i] || `${i + 1}.`;
    const points = score.words * 10;
    leaderboard += `${medal} **${score.odName}** - ${score.words} words (+${points} pts)\n`;
    
    updateGameStats(score.odId, 'wordchain', score.words > 0, points);
  }
  
  if (!leaderboard) leaderboard = 'No one played!';
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('🔗 Word Chain Complete!')
    .setDescription(`**Chain length: ${game.words.length} words!**`)
    .addFields(
      { name: '📊 Player Stats', value: leaderboard, inline: false },
      { name: '📜 Full Chain', value: game.words.length <= 20 ? game.words.join(' → ') : `${game.words.slice(0, 10).join(' → ')} ... ${game.words.slice(-5).join(' → ')}`, inline: false }
    )
    .setFooter({ text: 'Use /wordchain to play again!' });
  
  channel.send({ embeds: [embed] });
  clearActiveGame(channelId);
}

// Stop game
export function stopWordChain(channelId) {
  const game = getActiveGame(channelId);
  if (game && game.type === 'wordchain') {
    clearActiveGame(channelId);
    return true;
  }
  return false;
}

// Export dictionary status check
export function isDictionaryReady() {
  return dictionaryReady;
}
