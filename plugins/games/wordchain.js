import { EmbedBuilder } from 'discord.js';
import { createRequire } from 'module';
import axios from 'axios';
import { getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats } from './game-manager.js';
import { generateWithRotation } from '../config/gemini-keys.js';

// Create require for JSON import
const require = createRequire(import.meta.url);

// Word dictionary - loaded once
let wordSet = null;
let wordArray = null;
let dictionaryReady = false;

// Themed word lists (generated/cached)
const themedWords = {
  animals: null,
  food: null,
  places: null,
  science: null,
  entertainment: null
};

// Difficulty settings
const DIFFICULTY_SETTINGS = {
  easy: { turnTime: 30, minLength: 3, showHints: true, useAIFallback: true, hintsPerTurn: 5 },
  normal: { turnTime: 20, minLength: 3, showHints: true, useAIFallback: true, hintsPerTurn: 3 },
  hard: { turnTime: 15, minLength: 4, showHints: false, useAIFallback: false, hintsPerTurn: 0 },
  expert: { turnTime: 10, minLength: 5, showHints: false, useAIFallback: false, hintsPerTurn: 0 }
};

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

// Initialize themed word lists using AI
async function initThemedWords(theme) {
  if (themedWords[theme]) return themedWords[theme];
  
  const themePrompts = {
    animals: 'List 200 common animal names (mammals, birds, fish, insects, reptiles). One word per line, lowercase only.',
    food: 'List 200 food and drink items (fruits, vegetables, dishes, beverages). One word per line, lowercase only.',
    places: 'List 200 countries, cities, and geographical places. One word per line, lowercase only.',
    science: 'List 200 science terms (biology, chemistry, physics, nature). One word per line, lowercase only.',
    entertainment: 'List 200 entertainment terms (movies, music, games, TV). One word per line, lowercase only.'
  };
  
  try {
    const { result } = await generateWithRotation(themePrompts[theme]);
    const words = result.response.text()
      .split('\n')
      .map(w => w.trim().toLowerCase().replace(/[^a-z]/g, ''))
      .filter(w => w.length >= 3);
    
    themedWords[theme] = new Set(words);
    console.log(`📚 Loaded ${themedWords[theme].size} ${theme} words`);
    return themedWords[theme];
  } catch (error) {
    console.error(`Failed to load ${theme} words:`, error.message);
    return null;
  }
}

// Initialize on module load
initDictionary();

// Validate if a word is real using dictionary
async function validateWord(word, useAIFallback = false, theme = 'any', minLength = 3) {
  const lowerWord = word.toLowerCase();
  
  // Check minimum length
  if (lowerWord.length < minLength) {
    return { valid: false, reason: `Word must be at least ${minLength} letters` };
  }
  
  // Check themed validation first
  if (theme !== 'any' && themedWords[theme]) {
    if (!themedWords[theme].has(lowerWord)) {
      // Also check if it's in the general dictionary but not themed
      if (dictionaryReady && wordSet && wordSet.has(lowerWord)) {
        return { valid: false, reason: `"${word}" is valid but doesn't fit the ${theme} theme` };
      }
      return { valid: false, reason: `"${word}" is not a valid ${theme} word` };
    }
    return { valid: true };
  }
  
  // Check dictionary
  if (dictionaryReady && wordSet) {
    if (wordSet.has(lowerWord)) {
      return { valid: true };
    }
  }
  
  // Fallback to AI if dictionary doesn't have the word
  if (useAIFallback) {
    const prompt = `Is "${word}" a valid English word? Reply with ONLY "YES" or "NO".`;
    
    try {
      const { result } = await generateWithRotation(prompt);
      const response = result.response.text().trim().toUpperCase();
      return { valid: response.includes('YES') };
    } catch {
      return { valid: false, reason: 'Could not validate word' };
    }
  }
  
  return { valid: false, reason: 'Word not found in dictionary' };
}

// Get word definition from free dictionary API
async function getWordDefinition(word) {
  try {
    const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, {
      timeout: 3000
    });
    
    if (response.data && response.data[0]) {
      const entry = response.data[0];
      const meaning = entry.meanings[0];
      const definition = meaning?.definitions[0]?.definition || null;
      const partOfSpeech = meaning?.partOfSpeech || null;
      const phonetic = entry.phonetic || entry.phonetics?.[0]?.text || null;
      
      return { definition, partOfSpeech, phonetic };
    }
  } catch {
    // Silently fail - definitions are optional
  }
  return null;
}

// Get a random starting word from dictionary (optionally themed)
function getRandomStartWord(theme = 'any', minLength = 3) {
  // Try themed words first
  if (theme !== 'any' && themedWords[theme]) {
    const themeArray = Array.from(themedWords[theme]).filter(w => w.length >= minLength && w.length <= 8);
    if (themeArray.length > 0) {
      return themeArray[Math.floor(Math.random() * themeArray.length)];
    }
  }
  
  if (dictionaryReady && wordArray) {
    // Filter for good starting words
    const goodWords = wordArray.filter(w => w.length >= Math.max(5, minLength) && w.length <= 8);
    if (goodWords.length > 0) {
      return goodWords[Math.floor(Math.random() * goodWords.length)];
    }
  }
  
  // Fallback words
  const defaultWords = ['elephant', 'dragon', 'castle', 'rainbow', 'thunder', 'crystal', 'garden', 'mountain'];
  return defaultWords[Math.floor(Math.random() * defaultWords.length)];
}

// Get words starting with a letter (for hints)
function getWordsStartingWith(letter, theme = 'any', minLength = 3, limit = 10) {
  const lowerLetter = letter.toLowerCase();
  let sourceWords = [];
  
  // Use themed words if available
  if (theme !== 'any' && themedWords[theme]) {
    sourceWords = Array.from(themedWords[theme]);
  } else if (dictionaryReady && wordArray) {
    sourceWords = wordArray;
  }
  
  return sourceWords
    .filter(w => w.startsWith(lowerLetter) && w.length >= minLength)
    .slice(0, limit);
}

// Start word chain game
export async function startWordChain(interaction, options = {}) {
  const channelId = interaction.channelId;
  
  if (hasActiveGame(channelId)) {
    await interaction.reply({ content: '⚠️ A game is already active in this channel!', flags: 64 });
    return;
  }
  
  // Parse options
  const startWord = options.start || null;
  const theme = options.theme || 'any';
  const difficulty = options.difficulty || 'normal';
  const showDefinitions = options.definitions || false;
  const trustMode = options.trust_mode || false;
  
  // Get difficulty settings
  const settings = DIFFICULTY_SETTINGS[difficulty];
  
  // Ensure dictionary is ready
  initDictionary();
  
  // Load themed words if needed
  if (theme !== 'any') {
    await interaction.deferReply();
    await initThemedWords(theme);
  }
  
  // Generate starting word if not provided
  const actualStartWord = startWord || getRandomStartWord(theme, settings.minLength);
  
  const game = {
    type: 'wordchain',
    words: [actualStartWord],
    usedWords: new Set([actualStartWord.toLowerCase()]),
    currentLetter: actualStartWord.slice(-1).toLowerCase(),
    players: new Map(),
    turnOrder: [],
    currentTurnIndex: 0,
    consecutiveFails: 0,
    startedBy: interaction.user.id,
    ended: false,
    // New options
    theme,
    difficulty,
    settings,
    showDefinitions,
    trustMode,
    turnTime: settings.turnTime,
    useAIFallback: trustMode ? false : settings.useAIFallback
  };
  
  setActiveGame(channelId, game);
  
  // Build status text
  const themeEmojis = { any: '🎲', animals: '🐾', food: '🍕', places: '🌍', science: '🔬', entertainment: '🎬' };
  const diffEmojis = { easy: '🟢', normal: '🟡', hard: '🔴', expert: '💀' };
  
  let modeText = dictionaryReady ? `📚 Dictionary (${wordSet.size.toLocaleString()} words)` : '🤖 AI validation';
  if (trustMode) modeText = '🤝 Trust Mode (no validation)';
  if (theme !== 'any') modeText += ` | ${themeEmojis[theme]} ${theme.charAt(0).toUpperCase() + theme.slice(1)} theme`;
  
  const rulesText = [
    `• Word must start with the last letter of previous word`,
    `• No repeating words`,
    trustMode ? '• Honor system - be honest!' : '• Must be a real English word',
    `• ${settings.turnTime} seconds per turn`,
    settings.minLength > 3 ? `• Minimum ${settings.minLength} letters` : null,
    showDefinitions ? '• 📖 Definitions shown for each word' : null
  ].filter(Boolean).join('\n');
  
  const embed = new EmbedBuilder()
    .setColor('#10b981')
    .setTitle('🔗 Word Chain Started!')
    .setDescription(`Starting word: **${actualStartWord.toUpperCase()}**\n\nType a word that starts with **"${game.currentLetter.toUpperCase()}"**!`)
    .addFields(
      { name: '📜 Rules', value: rulesText, inline: false },
      { name: '⚙️ Mode', value: modeText, inline: true },
      { name: '📊 Difficulty', value: `${diffEmojis[difficulty]} ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`, inline: true }
    )
    .setFooter({ text: 'Anyone can join by typing a valid word!' });
  
  if (interaction.deferred) {
    await interaction.editReply({ embeds: [embed] });
  } else {
    await interaction.reply({ embeds: [embed] });
  }
  
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
    const game = getActiveGame(channelId);
    if (!game) return;
    
    if (turnTimeout) clearTimeout(turnTimeout);
    turnTimeout = setTimeout(async () => {
      const currentGame = getActiveGame(channelId);
      if (!currentGame || currentGame.ended) return;
      
      currentGame.consecutiveFails++;
      
      if (currentGame.consecutiveFails >= 3) {
        await channel.send('⏰ Game ended due to inactivity!');
        endWordChain(channel, channelId);
        collector.stop();
      } else {
        // Give a hint if enabled
        let hintText = '';
        if (currentGame.settings.showHints) {
          const hints = getWordsStartingWith(
            currentGame.currentLetter, 
            currentGame.theme, 
            currentGame.settings.minLength,
            currentGame.settings.hintsPerTurn
          );
          if (hints.length > 0) {
            hintText = `\n💡 Hint: try words like *${hints.join(', ')}*...`;
          }
        }
        await channel.send(`⏰ Time's up! Still waiting for a word starting with **"${currentGame.currentLetter.toUpperCase()}"**...${hintText}`);
        resetTurnTimer();
      }
    }, game.turnTime * 1000);
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
    
    // Validate word (skip if trust mode)
    if (!game.trustMode) {
      const validation = await validateWord(word, game.useAIFallback, game.theme, game.settings.minLength);
      if (!validation.valid) {
        await message.react('❓');
        await message.reply({ 
          content: validation.reason || `**${word}** doesn't seem to be a valid word!`, 
          allowedMentions: { repliedUser: false } 
        });
        return;
      }
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
    
    // Show definition if enabled
    if (game.showDefinitions) {
      const def = await getWordDefinition(word);
      if (def && def.definition) {
        const defEmbed = new EmbedBuilder()
          .setColor('#3b82f6')
          .setTitle(`📖 ${word.charAt(0).toUpperCase() + word.slice(1)}`)
          .setDescription(`*${def.partOfSpeech || 'word'}*${def.phonetic ? ` ${def.phonetic}` : ''}\n\n${def.definition}`)
          .setFooter({ text: `Next: word starting with "${game.currentLetter.toUpperCase()}"` });
        
        await channel.send({ embeds: [defEmbed] });
      }
    }
    
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
  
  // Difficulty multipliers
  const diffMultipliers = { easy: 1, normal: 1.5, hard: 2, expert: 3 };
  const multiplier = diffMultipliers[game.difficulty] || 1;
  
  for (let i = 0; i < Math.min(scores.length, 10); i++) {
    const score = scores[i];
    const medal = medals[i] || `${i + 1}.`;
    const points = Math.round(score.words * 10 * multiplier);
    leaderboard += `${medal} **${score.odName}** - ${score.words} words (+${points} pts)\n`;
    
    updateGameStats(score.odId, 'wordchain', score.words > 0, points);
  }
  
  if (!leaderboard) leaderboard = 'No one played!';
  
  // Theme and difficulty info
  const themeEmojis = { any: '🎲', animals: '🐾', food: '🍕', places: '🌍', science: '🔬', entertainment: '🎬' };
  const diffEmojis = { easy: '🟢', normal: '🟡', hard: '🔴', expert: '💀' };
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('🔗 Word Chain Complete!')
    .setDescription(`**Chain length: ${game.words.length} words!**`)
    .addFields(
      { name: '📊 Player Stats', value: leaderboard, inline: false },
      { name: '⚙️ Settings', value: `${themeEmojis[game.theme]} ${game.theme} | ${diffEmojis[game.difficulty]} ${game.difficulty} | ${multiplier}x points`, inline: false },
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
