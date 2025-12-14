import { EmbedBuilder } from 'discord.js';
import { getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats } from './game-manager.js';
import { generateWithRotation } from '../config/gemini-keys.js';

// Generate story starter
async function generateStoryStarter(theme) {
  const prompt = `Generate an engaging story opening (2-3 sentences) for a collaborative story game.
Theme: ${theme || 'random adventure'}

The opening should:
- Set an interesting scene
- Leave room for players to continue
- Be engaging and creative

Reply with ONLY the story opening text, nothing else.`;

  const { result } = await generateWithRotation(prompt);
  return result.response.text().trim();
}

// AI continues or adds twist
async function aiContinueStory(story, action = 'continue') {
  const prompt = action === 'twist' 
    ? `Add an unexpected twist to this story (1-2 sentences):\n\n${story}\n\nReply with ONLY the twist continuation.`
    : `Continue this story naturally (1-2 sentences):\n\n${story}\n\nReply with ONLY the continuation.`;

  const { result } = await generateWithRotation(prompt);
  return result.response.text().trim();
}

// Start Story Builder
export async function startStoryBuilder(interaction, theme = 'adventure', maxTurns = 10) {
  const channelId = interaction.channelId;
  
  if (hasActiveGame(channelId)) {
    await interaction.reply({ content: '⚠️ A game is already active in this channel!', ephemeral: true });
    return;
  }
  
  await interaction.deferReply();
  
  try {
    const starter = await generateStoryStarter(theme);
    
    const game = {
      type: 'storybuilder',
      theme,
      story: [{ text: starter, author: 'AI', authorId: 'ai' }],
      currentTurn: 1,
      maxTurns,
      contributors: new Map(),
      lastContributor: 'ai',
      startedBy: interaction.user.id,
      ended: false,
      turnTime: 60
    };
    
    setActiveGame(channelId, game);
    
    const embed = new EmbedBuilder()
      .setColor('#673ab7')
      .setTitle('📖 Story Builder')
      .setDescription(`**Theme:** ${theme}\n\n*${starter}*`)
      .addFields(
        { name: '📝 How to Play', value: 'Add 1-2 sentences to continue the story!\nType "twist" to let AI add a twist.', inline: false },
        { name: '📊 Progress', value: `Turn 1/${maxTurns}`, inline: true }
      )
      .setFooter({ text: 'Type your continuation in chat!' });
    
    await interaction.editReply({ embeds: [embed] });
    
    setupStoryCollector(interaction.channel, channelId);
    
  } catch (error) {
    await interaction.editReply(`❌ Failed to start story: ${error.message}`);
    clearActiveGame(channelId);
  }
}

// Set up collector
function setupStoryCollector(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  const collector = channel.createMessageCollector({
    filter: (m) => !m.author.bot,
    time: 600000 // 10 minute total timeout
  });
  
  let turnTimeout = null;
  
  const resetTurnTimer = () => {
    if (turnTimeout) clearTimeout(turnTimeout);
    turnTimeout = setTimeout(async () => {
      const currentGame = getActiveGame(channelId);
      if (!currentGame || currentGame.ended) return;
      
      // AI continues if no one adds
      try {
        const continuation = await aiContinueStory(
          currentGame.story.map(s => s.text).join(' '),
          'continue'
        );
        
        currentGame.story.push({ text: continuation, author: 'AI', authorId: 'ai' });
        currentGame.currentTurn++;
        currentGame.lastContributor = 'ai';
        
        await channel.send(`📖 *AI continues:* ${continuation}`);
        
        if (currentGame.currentTurn >= currentGame.maxTurns) {
          endStoryBuilder(channel, channelId);
          collector.stop();
        } else {
          resetTurnTimer();
        }
      } catch (e) {
        await channel.send('⏰ Waiting for someone to continue the story...');
        resetTurnTimer();
      }
    }, game.turnTime * 1000);
  };
  
  resetTurnTimer();
  
  collector.on('collect', async (message) => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.ended) {
      collector.stop();
      return;
    }
    
    const content = message.content.trim();
    const odId = message.author.id;
    
    // Handle twist request
    if (content.toLowerCase() === 'twist') {
      try {
        const twist = await aiContinueStory(
          currentGame.story.map(s => s.text).join(' '),
          'twist'
        );
        
        currentGame.story.push({ text: twist, author: 'AI (Twist!)', authorId: 'ai' });
        currentGame.currentTurn++;
        
        await message.react('🌀');
        await channel.send(`🌀 *Plot twist!* ${twist}`);
        
        if (currentGame.currentTurn >= currentGame.maxTurns) {
          endStoryBuilder(channel, channelId);
          collector.stop();
          return;
        }
        
        resetTurnTimer();
        return;
      } catch (e) {
        await message.reply('❌ Failed to generate twist!');
        return;
      }
    }
    
    // Validate contribution length
    const words = content.split(/\s+/).length;
    if (words < 3 || words > 50) {
      await message.react('❌');
      return;
    }
    
    // Don't allow same person twice in a row
    if (currentGame.lastContributor === odId) {
      await message.react('⏳');
      return;
    }
    
    // Add to story
    currentGame.story.push({ text: content, author: message.author.username, authorId: odId });
    currentGame.currentTurn++;
    currentGame.lastContributor = odId;
    
    // Track contributor
    if (!currentGame.contributors.has(odId)) {
      currentGame.contributors.set(odId, { odId, username: message.author.username, contributions: 0 });
    }
    currentGame.contributors.get(odId).contributions++;
    
    await message.react('✅');
    
    // Show progress
    if (currentGame.currentTurn % 3 === 0) {
      const embed = new EmbedBuilder()
        .setColor('#673ab7')
        .setDescription(`📊 Story progress: ${currentGame.currentTurn}/${currentGame.maxTurns} turns`);
      await channel.send({ embeds: [embed] });
    }
    
    if (currentGame.currentTurn >= currentGame.maxTurns) {
      endStoryBuilder(channel, channelId);
      collector.stop();
      return;
    }
    
    resetTurnTimer();
  });
  
  collector.on('end', () => {
    if (turnTimeout) clearTimeout(turnTimeout);
    const currentGame = getActiveGame(channelId);
    if (currentGame && !currentGame.ended) {
      endStoryBuilder(channel, channelId);
    }
  });
}

// End game
function endStoryBuilder(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  game.ended = true;
  
  const fullStory = game.story.map(s => s.text).join(' ');
  const contributors = Array.from(game.contributors.values()).sort((a, b) => b.contributions - a.contributions);
  
  let contributorList = '';
  for (const c of contributors) {
    contributorList += `• **${c.username}** - ${c.contributions} contributions\n`;
    updateGameStats(c.odId, 'storybuilder', true, c.contributions * 20);
  }
  
  if (!contributorList) contributorList = 'No human contributors!';
  
  // Truncate story if too long
  const displayStory = fullStory.length > 1800 
    ? fullStory.substring(0, 1800) + '...' 
    : fullStory;
  
  const embed = new EmbedBuilder()
    .setColor('#673ab7')
    .setTitle('📖 Story Complete!')
    .setDescription(`**Theme:** ${game.theme}\n\n*${displayStory}*`)
    .addFields({ name: '✍️ Contributors', value: contributorList, inline: false })
    .setFooter({ text: 'Use /story to start a new story!' });
  
  channel.send({ embeds: [embed] });
  clearActiveGame(channelId);
}

// Stop game
export function stopStoryBuilder(channelId) {
  const game = getActiveGame(channelId);
  if (game && game.type === 'storybuilder') {
    clearActiveGame(channelId);
    return true;
  }
  return false;
}
