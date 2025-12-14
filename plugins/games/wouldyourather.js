import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { generateWithRotation } from './plugin.js';
import { getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats } from './game-manager.js';
import { generateWithRotation } from '../../src/config/gemini-keys.js';

// Generate a Would You Rather scenario
async function generateScenario(theme = 'random') {
  const themePrompt = theme === 'random' ? 'any creative theme' : theme;

// Note: This game uses generateWithRotation which should be accessed through
// the games plugin's requestFromCore('gemini-generate', { prompt }) method.
// TODO: Refactor to use plugin.requestFromCore() instead of direct import
  
  const prompt = `Generate a creative "Would You Rather" scenario about ${themePrompt}.

Rules:
- Both options should be interesting and make people think
- Options should be roughly equal in appeal/difficulty
- Keep it fun and appropriate

Reply with ONLY valid JSON:
{
  "optionA": "first option",
  "optionB": "second option",
  "explanation": "brief interesting fact or implication about each choice"
}`;

  const { result } = await generateWithRotation(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) throw new Error('Failed to generate scenario');
  return JSON.parse(jsonMatch[0]);
}

// Start Would You Rather game
export async function startWouldYouRather(interaction, rounds = 5, theme = 'random') {
  const channelId = interaction.channelId;
  
  if (hasActiveGame(channelId)) {
    await interaction.reply({ content: '⚠️ A game is already active in this channel!', ephemeral: true });
    return;
  }
  
  await interaction.deferReply();
  
  const game = {
    type: 'wouldyourather',
    currentRound: 0,
    totalRounds: rounds,
    theme,
    currentScenario: null,
    votes: { a: new Set(), b: new Set() },
    players: new Map(),
    startedBy: interaction.user.id,
    ended: false,
    customQueue: [] // Queue for user-submitted scenarios
  };
  
  setActiveGame(channelId, game);
  
  const embed = new EmbedBuilder()
    .setColor('#e91e63')
    .setTitle('🤔 Would You Rather?')
    .setDescription(`**${rounds} rounds** of tough choices!\n\nTheme: ${theme === 'random' ? '🎲 Random' : theme}`)
    .setFooter({ text: 'First scenario coming up...' });
  
  await interaction.editReply({ embeds: [embed] });
  
  setTimeout(() => showScenario(interaction.channel, channelId), 2000);
}

// Start custom Would You Rather (single user-provided scenario)
export async function customWouldYouRather(interaction, optionA, optionB) {
  const channelId = interaction.channelId;
  
  // If game is active, add to queue
  const existingGame = getActiveGame(channelId);
  if (existingGame && existingGame.type === 'wouldyourather') {
    existingGame.customQueue.push({
      optionA,
      optionB,
      submittedBy: interaction.user.username
    });
    await interaction.reply({ content: `✅ Your scenario was added to the queue! (${existingGame.customQueue.length} custom scenarios pending)`, ephemeral: true });
    return;
  }
  
  // Start new single-round game with custom scenario
  const game = {
    type: 'wouldyourather',
    currentRound: 0,
    totalRounds: 1,
    theme: 'custom',
    currentScenario: null,
    votes: { a: new Set(), b: new Set() },
    players: new Map(),
    startedBy: interaction.user.id,
    ended: false,
    customQueue: [{ optionA, optionB, submittedBy: interaction.user.username }]
  };
  
  setActiveGame(channelId, game);
  
  await interaction.reply('🤔 Starting custom Would You Rather...');
  
  setTimeout(() => showScenario(interaction.channel, channelId), 1000);
}


// Show scenario
async function showScenario(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game || game.type !== 'wouldyourather' || game.ended) return;
  
  game.currentRound++;
  game.votes = { a: new Set(), b: new Set() };
  
  try {
    let scenario;
    let isCustom = false;
    
    // Check for custom scenarios in queue first
    if (game.customQueue && game.customQueue.length > 0) {
      const custom = game.customQueue.shift();
      scenario = {
        optionA: custom.optionA,
        optionB: custom.optionB,
        explanation: `Submitted by ${custom.submittedBy}`
      };
      isCustom = true;
    } else {
      scenario = await generateScenario(game.theme);
    }
    
    game.currentScenario = scenario;
    game.currentScenario.isCustom = isCustom;
    
    const embed = new EmbedBuilder()
      .setColor('#e91e63')
      .setTitle(`🤔 Round ${game.currentRound}/${game.totalRounds}`)
      .setDescription('**Would you rather...**')
      .addFields(
        { name: '🅰️ Option A', value: scenario.optionA, inline: false },
        { name: '🅱️ Option B', value: scenario.optionB, inline: false }
      )
      .setFooter({ text: 'Click a button to vote! 30 seconds...' });
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('wyr_a')
        .setLabel('Option A')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🅰️'),
      new ButtonBuilder()
        .setCustomId('wyr_b')
        .setLabel('Option B')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🅱️')
    );
    
    const msg = await channel.send({ embeds: [embed], components: [row] });
    
    setupWYRCollector(msg, channel, channelId);
    
  } catch (error) {
    await channel.send(`❌ Failed to generate scenario: ${error.message}`);
    endWYRGame(channel, channelId);
  }
}

// Set up button collector
function setupWYRCollector(message, channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  const collector = message.createMessageComponentCollector({
    filter: (i) => i.customId.startsWith('wyr_'),
    time: 30000
  });
  
  collector.on('collect', async (i) => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.ended) return;
    
    const odId = i.user.id;
    const choice = i.customId === 'wyr_a' ? 'a' : 'b';
    
    // Remove from other option if they changed vote
    currentGame.votes.a.delete(odId);
    currentGame.votes.b.delete(odId);
    
    // Add vote
    currentGame.votes[choice].add(odId);
    
    // Track player
    if (!currentGame.players.has(odId)) {
      currentGame.players.set(odId, { odId, username: i.user.username, votes: 0 });
    }
    currentGame.players.get(odId).votes++;
    
    await i.reply({ content: `You voted for Option ${choice.toUpperCase()}!`, ephemeral: true });
  });
  
  collector.on('end', async () => {
    const currentGame = getActiveGame(channelId);
    if (!currentGame || currentGame.ended) return;
    
    const totalVotes = currentGame.votes.a.size + currentGame.votes.b.size;
    const percentA = totalVotes > 0 ? Math.round((currentGame.votes.a.size / totalVotes) * 100) : 0;
    const percentB = totalVotes > 0 ? Math.round((currentGame.votes.b.size / totalVotes) * 100) : 0;
    
    const barA = '█'.repeat(Math.floor(percentA / 10)) + '░'.repeat(10 - Math.floor(percentA / 10));
    const barB = '█'.repeat(Math.floor(percentB / 10)) + '░'.repeat(10 - Math.floor(percentB / 10));
    
    const embed = new EmbedBuilder()
      .setColor('#e91e63')
      .setTitle('📊 Results!')
      .addFields(
        { name: `🅰️ ${currentGame.currentScenario.optionA}`, value: `${barA} ${percentA}% (${currentGame.votes.a.size} votes)`, inline: false },
        { name: `🅱️ ${currentGame.currentScenario.optionB}`, value: `${barB} ${percentB}% (${currentGame.votes.b.size} votes)`, inline: false }
      );
    
    if (currentGame.currentScenario.explanation) {
      embed.addFields({ name: '💡 Fun Fact', value: currentGame.currentScenario.explanation, inline: false });
    }
    
    await message.edit({ embeds: [embed], components: [] });
    
    // Next round or end
    if (currentGame.currentRound < currentGame.totalRounds) {
      setTimeout(() => showScenario(channel, channelId), 3000);
    } else {
      endWYRGame(channel, channelId);
    }
  });
}

// End game
function endWYRGame(channel, channelId) {
  const game = getActiveGame(channelId);
  if (!game) return;
  
  game.ended = true;
  
  const players = Array.from(game.players.values()).sort((a, b) => b.votes - a.votes);
  
  let participation = '';
  for (let i = 0; i < Math.min(players.length, 10); i++) {
    const player = players[i];
    participation += `• **${player.username}** - ${player.votes} votes cast\n`;
    updateGameStats(player.odId, 'wouldyourather', true, player.votes * 10);
  }
  
  if (!participation) participation = 'No one voted!';
  
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('🤔 Would You Rather - Complete!')
    .setDescription(`**${game.totalRounds} scenarios completed!**`)
    .addFields({ name: '👥 Participants', value: participation, inline: false })
    .setFooter({ text: 'Use /wouldyourather to play again!' });
  
  channel.send({ embeds: [embed] });
  clearActiveGame(channelId);
}

// Stop game
export function stopWouldYouRather(channelId) {
  const game = getActiveGame(channelId);
  if (game && game.type === 'wouldyourather') {
    clearActiveGame(channelId);
    return true;
  }
  return false;
}

