import { EmbedBuilder } from 'discord.js';
import { getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats } from './game-manager.js';
import { generateWithRotation } from '../config/gemini-keys.js';

// Categories for 20 questions
const CATEGORIES = {
  anything: { name: 'Anything', emoji: '🎲' },
  person: { name: 'Famous Person', emoji: '👤' },
  place: { name: 'Place', emoji: '🌍' },
  animal: { name: 'Animal', emoji: '🐾' },
  object: { name: 'Object', emoji: '📦' },
  food: { name: 'Food', emoji: '🍕' },
  movie: { name: 'Movie/Show', emoji: '🎬' },
  anime: { name: 'Anime Character', emoji: '🎌' }
};

// Generate a secret thing for AI to think of
async function generateSecret(category) {
  const cat = CATEGORIES[category] || CATEGORIES.anything;
  
  const prompt = `You are playing 20 Questions. Think of a ${cat.name === 'Anything' ? 'person, place, thing, or concept' : cat.name.toLowerCase()}.

Rules:
- Pick something well-known that most people would recognize
- Not too obscure, not too obvious
- Should be guessable with yes/no questions

Reply with ONLY a JSON object:
{
  "secret": "the thing you're thinking of",
  "category": "${cat.name}",
  "hints": ["hint 1 if they're stuck", "hint 2", "hint 3"]
}`;

  const { result } = await generateWithRotation(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) throw new Error('Failed to generate secret');
  return JSON.parse(jsonMatch[0]);
}

// AI answers a yes/no question
async function answerQuestion(secret, question, previousQA) {
  const context = previousQA.length > 0 
    ? `\nPrevious Q&A:\n${previousQA.map(qa => `Q: ${qa.q}\nA: ${qa.a}`).join('\n')}`
    : '';

  const prompt = `You are playing 20 Questions. You are thinking of: "${secret}"

The player asks: "${question}"
${context}

Answer with ONLY one of these:
- "Yes" - if the answer is clearly yes
- "No" - if the answer is clearly no  
- "Sometimes" or "Partially" - if it depends
- "I can't answer that" - if it's not a yes/no question

Then add a brief clarification if helpful. Keep response under 100 characters.`;

  const { result } = await generateWithRotation(prompt);
  return result.response.text().trim();
}

// Check if a guess is correct
async function checkGuess(secret, guess) {
  const prompt = `The secret answer is: "${secret}"
The player guesses: "${guess}"

Is this correct or close enough to count as correct? Consider alternate names, spellings, or if they clearly mean the same thing.

Reply with ONLY: "CORRECT" or "INCORRECT"`;

  const { result } = await generateWithRotation(prompt);
  const response = result.response.text().trim().toUpperCase();
  return response.includes('CORRECT') && !response.includes('INCORRECT');
}

// Start 20 Questions game
export async function start20Questions(interaction, category = 'anything') {
  const channelId = interaction.channelId;
  
  if (hasActiveGame(channelId)) {
    await interaction.reply({ content: '⚠️ A game is already active in this channel!', ephemeral: true });
    return;
  }
  
  await interaction.deferReply();
  
  try {
    const secretData = await generateSecret(category);
    
    const game = {
      type: '20questions',
      secret: secretData.secret,
      category: secretData.category,
      hints: secretData.hints,
      questionsAsked: 0,
      maxQuestions: 20,
      hintsUsed: 0,
      qa: [],
      players: new Map(),
      startedBy: interaction.user.id,
      won: false,
      ended: false
    };
    
    setActiveGame(channelId, game);
    
    const cat = CATEGORIES[category] || CATEGORIES.anything;
    
    const embed = new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle('🤔 20 Questions')
      .setDescription(`I'm thinking of a **${cat.emoji} ${cat.name}**...\n\nAsk yes/no questions to figure out what it is!\nType your question or guess directly.`)
      .addFields(
        { name: '❓ Questions Left', value: '20', inline: true },
        { name: '💡 Hints Available', value: '3', inline: true }
      )
      .setFooter({ text: 'Type "hint" for a hint, or "guess: [answer]" to make a guess!' });
    
    await interaction.editReply({ embeds: [embed] });
    
    // Set up collector
    setup20QCollector(interaction.channel, channelId);
    
  } catch (error) {
    clearActiveGame(channelId);
    await interaction.editReply(`❌ Failed to start game: ${error.message}`);
  }
}

// Set up message collector
function setup20QCollector(channel, channelId) {
  const collector = channel.createMessageCollector({
    filter: (m) => !m.author.bot && m.content.trim().length > 0,
    time: 600000 // 10 minute timeout
  });
  
  collector.on('collect', async (message) => {
    const game = getActiveGame(channelId);
    if (!game || game.type !== '20questions' || game.ended) {
      collector.stop();
      return;
    }
    
    const content = message.content.trim().toLowerCase();
    const odId = message.author.id;
    
    // Track player
    if (!game.players.has(odId)) {
      game.players.set(odId, { odId, questions: 0, odName: message.author.username });
    }
    const player = game.players.get(odId);
    
    // Handle hint request
    if (content === 'hint') {
      if (game.hintsUsed >= game.hints.length) {
        await message.reply('❌ No more hints available!');
        return;
      }
      
      const hint = game.hints[game.hintsUsed];
      game.hintsUsed++;
      
      await message.reply(`💡 **Hint ${game.hintsUsed}:** ${hint}`);
      return;
    }
    
    // Handle guess
    if (content.startsWith('guess:') || content.startsWith('guess ') || content.startsWith('is it ')) {
      const guess = content.replace(/^(guess:|guess |is it )/i, '').trim();
      
      if (!guess) {
        await message.reply('❌ Please provide a guess!');
        return;
      }
      
      player.questions++;
      game.questionsAsked++;
      
      try {
        const correct = await checkGuess(game.secret, guess);
        
        if (correct) {
          game.won = true;
          game.ended = true;
          game.winner = odId;
          
          const points = Math.max(10, (game.maxQuestions - game.questionsAsked + 1) * 10);
          updateGameStats(odId, '20questions', true, points);
          
          const embed = new EmbedBuilder()
            .setColor('#10b981')
            .setTitle('🎉 Correct!')
            .setDescription(`**${message.author.username}** guessed it!\n\nThe answer was: **${game.secret}**`)
            .addFields(
              { name: '❓ Questions Used', value: `${game.questionsAsked}`, inline: true },
              { name: '🏆 Points', value: `+${points}`, inline: true }
            )
            .setFooter({ text: 'Use /20questions to play again!' });
          
          await channel.send({ embeds: [embed] });
          collector.stop();
          clearActiveGame(channelId);
          return;
        } else {
          await message.react('❌');
          await message.reply(`Not quite! Keep guessing. (${game.maxQuestions - game.questionsAsked} questions left)`);
        }
      } catch (e) {
        await message.reply('❌ Error checking guess. Try again!');
      }
      
      // Check if out of questions
      if (game.questionsAsked >= game.maxQuestions) {
        game.ended = true;
        
        const embed = new EmbedBuilder()
          .setColor('#ef4444')
          .setTitle('💀 Game Over!')
          .setDescription(`No one guessed it!\n\nThe answer was: **${game.secret}**`)
          .setFooter({ text: 'Use /20questions to play again!' });
        
        await channel.send({ embeds: [embed] });
        collector.stop();
        clearActiveGame(channelId);
      }
      return;
    }
    
    // Regular yes/no question
    player.questions++;
    game.questionsAsked++;
    
    try {
      const answer = await answerQuestion(game.secret, message.content, game.qa);
      game.qa.push({ q: message.content, a: answer });
      
      const embed = new EmbedBuilder()
        .setColor('#667eea')
        .setDescription(`**Q:** ${message.content}\n**A:** ${answer}`)
        .setFooter({ text: `${game.maxQuestions - game.questionsAsked} questions left | Type "guess: [answer]" to guess!` });
      
      await message.reply({ embeds: [embed] });
      
      // Check if out of questions
      if (game.questionsAsked >= game.maxQuestions) {
        game.ended = true;
        
        const endEmbed = new EmbedBuilder()
          .setColor('#ef4444')
          .setTitle('💀 Game Over!')
          .setDescription(`You ran out of questions!\n\nThe answer was: **${game.secret}**`)
          .setFooter({ text: 'Use /20questions to play again!' });
        
        await channel.send({ embeds: [endEmbed] });
        collector.stop();
        clearActiveGame(channelId);
      }
    } catch (e) {
      await message.reply('❌ Error processing question. Try again!');
    }
  });
  
  collector.on('end', (collected, reason) => {
    if (reason === 'time') {
      const game = getActiveGame(channelId);
      if (game && !game.ended) {
        channel.send(`⏰ 20 Questions timed out! The answer was: **${game.secret}**`);
        clearActiveGame(channelId);
      }
    }
  });
}

// Stop game
export function stop20Questions(channelId) {
  const game = getActiveGame(channelId);
  if (game && game.type === '20questions') {
    clearActiveGame(channelId);
    return game.secret;
  }
  return null;
}

export { CATEGORIES as TWENTY_Q_CATEGORIES };
