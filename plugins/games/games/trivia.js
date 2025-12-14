import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { generateWithRotation } from './ai-helper.js';
import { getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats } from './game-manager.js';

// Helper to get configOps
async function getConfigOps() {
  try {
    const { configOps } = await import('../../../src/database/db.js');
    return configOps;
  } catch { return null; }
}

// Active trivia sessions
const activeSessions = new Map();

// Note: Trivia uses its own session tracking for complex state, but integrates with game-manager for stats

// Trivia categories
export const TRIVIA_CATEGORIES = {
  general: { name: 'General Knowledge', emoji: '🧠' },
  science: { name: 'Science & Nature', emoji: '🔬' },
  history: { name: 'History', emoji: '📜' },
  geography: { name: 'Geography', emoji: '🌍' },
  anime: { name: 'Anime & Manga', emoji: '🎌' },
  gaming: { name: 'Video Games', emoji: '🎮' },
  tech: { name: 'Technology', emoji: '💻' },
  movies: { name: 'Movies & TV', emoji: '🎬' },
  music: { name: 'Music', emoji: '🎵' },
  sports: { name: 'Sports', emoji: '⚽' },
  food: { name: 'Food & Drink', emoji: '🍕' },
  literature: { name: 'Literature', emoji: '📚' }
};

// Difficulty levels
export const DIFFICULTY_LEVELS = {
  easy: { name: 'Easy', emoji: '🟢', timeBonus: 1.5 },
  medium: { name: 'Medium', emoji: '🟡', timeBonus: 1.0 },
  hard: { name: 'Hard', emoji: '🔴', timeBonus: 0.75 }
};

// Default settings
const DEFAULT_SETTINGS = {
  questionTime: 30, // seconds
  readingTime: 60, // seconds for research mode
  questionsPerRound: 5,
  difficulty: 'medium'
};

// Get user's trivia settings
export async function getTriviaSettings(userId) {
  const configOps = await getConfigOps();
  if (!configOps) return { ...DEFAULT_SETTINGS };
  const saved = configOps.get(`trivia_settings_${userId}`);
  return saved ? JSON.parse(saved) : { ...DEFAULT_SETTINGS };
}

// Save user's trivia settings
export async function saveTriviaSettings(userId, settings) {
  const configOps = await getConfigOps();
  if (configOps) configOps.set(`trivia_settings_${userId}`, JSON.stringify(settings));
}

// Get user's trivia stats
export async function getTriviaStats(userId) {
  const configOps = await getConfigOps();
  if (!configOps) return { gamesPlayed: 0, questionsAnswered: 0, correctAnswers: 0, streak: 0, bestStreak: 0, totalPoints: 0 };
  const saved = configOps.get(`trivia_stats_${userId}`);
  return saved ? JSON.parse(saved) : {
    gamesPlayed: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    streak: 0,
    bestStreak: 0,
    totalPoints: 0
  };
}

// Update user's trivia stats
export async function updateTriviaStats(userId, correct, points = 0) {
  const configOps = await getConfigOps();
  const stats = await getTriviaStats(userId);
  stats.questionsAnswered++;
  if (correct) {
    stats.correctAnswers++;
    stats.streak++;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
    stats.totalPoints += points;
  } else {
    stats.streak = 0;
  }
  if (configOps) configOps.set(`trivia_stats_${userId}`, JSON.stringify(stats));
  return stats;
}

// Generate AI trivia question
async function generateAIQuestion(category, difficulty) {
  const categoryInfo = TRIVIA_CATEGORIES[category] || TRIVIA_CATEGORIES.general;
  const difficultyInfo = DIFFICULTY_LEVELS[difficulty] || DIFFICULTY_LEVELS.medium;
  
  const prompt = `Generate a ${difficultyInfo.name.toLowerCase()} difficulty trivia question about ${categoryInfo.name}.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, just the JSON object.

Format:
{
  "question": "The trivia question here?",
  "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
  "correctAnswer": "A",
  "explanation": "Brief explanation of why this is correct",
  "funFact": "An interesting related fact"
}

Make sure:
- Question is clear and unambiguous
- Only ONE answer is correct
- Options are plausible but distinct
- correctAnswer is just the letter (A, B, C, or D)`;

  try {
    const { result } = await generateWithRotation(prompt);
    
    if (!result || !result.response) {
      throw new Error('No response from AI');
    }
    
    const text = result.response.text();
    
    if (!text) {
      throw new Error('Empty response from AI');
    }
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to parse JSON from:', text.substring(0, 200));
      throw new Error('Failed to parse trivia question from AI response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (!parsed.question || !parsed.options || !parsed.correctAnswer) {
      throw new Error('Invalid question format from AI');
    }
    
    return parsed;
  } catch (error) {
    console.error('generateAIQuestion error:', error);
    throw new Error(error?.message || 'Failed to generate question');
  }
}

// Generate research content and questions
async function generateResearchTrivia(topic, questionCount = 5) {
  const prompt = `Create educational content about "${topic}" followed by quiz questions.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks.

Format:
{
  "title": "Topic title",
  "content": "Detailed educational content about the topic (3-4 paragraphs, informative and engaging)",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4", "Key point 5"],
  "questions": [
    {
      "question": "Question based on the content above?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "A",
      "explanation": "Why this is correct"
    }
  ]
}

Generate exactly ${questionCount} questions that test understanding of the content.
Questions should be answerable ONLY if the person read the content carefully.`;

  const { result } = await generateWithRotation(prompt);
  const text = result.response.text();
  
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to generate research content');
  }
  
  return JSON.parse(jsonMatch[0]);
}

// Generate speed round questions
async function generateSpeedQuestions(count = 10) {
  const prompt = `Generate ${count} quick trivia questions with short answers.

IMPORTANT: Return ONLY valid JSON array, no markdown.

Format:
[
  {
    "question": "Quick question?",
    "options": ["A) Short", "B) Short", "C) Short", "D) Short"],
    "correctAnswer": "A",
    "category": "general"
  }
]

Make questions quick to read and answer. Mix categories.`;

  const { result } = await generateWithRotation(prompt);
  const text = result.response.text();
  
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to generate speed questions');
  }
  
  return JSON.parse(jsonMatch[0]);
}

// Create question embed with buttons
function createQuestionEmbed(questionData, questionNum, totalQuestions, timeLimit, mode = 'ai') {
  const embed = new EmbedBuilder()
    .setColor(mode === 'research' ? '#9370DB' : '#667eea')
    .setTitle(`${mode === 'speed' ? '⚡' : '❓'} Question ${questionNum}/${totalQuestions}`)
    .setDescription(`**${questionData.question}**`)
    .addFields(
      { name: '\u200B', value: questionData.options.join('\n'), inline: false }
    )
    .setFooter({ text: `⏱️ ${timeLimit} seconds to answer` })
    .setTimestamp();
  
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('trivia_A')
        .setLabel('A')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('trivia_B')
        .setLabel('B')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('trivia_C')
        .setLabel('C')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('trivia_D')
        .setLabel('D')
        .setStyle(ButtonStyle.Primary)
    );
  
  return { embed, row };
}

// Create result embed
function createResultEmbed(correct, questionData, userAnswer, points, stats) {
  const embed = new EmbedBuilder()
    .setColor(correct ? '#10b981' : '#ef4444')
    .setTitle(correct ? '✅ Correct!' : '❌ Incorrect!')
    .setDescription(correct 
      ? `Great job! The answer was **${questionData.correctAnswer}**`
      : `The correct answer was **${questionData.correctAnswer}**\nYou answered: **${userAnswer}**`)
    .addFields(
      { name: '📖 Explanation', value: questionData.explanation || 'No explanation available', inline: false }
    );
  
  if (questionData.funFact) {
    embed.addFields({ name: '💡 Fun Fact', value: questionData.funFact, inline: false });
  }
  
  if (points > 0) {
    embed.addFields(
      { name: '🏆 Points', value: `+${points}`, inline: true },
      { name: '🔥 Streak', value: `${stats.streak}`, inline: true },
      { name: '📊 Accuracy', value: `${Math.round((stats.correctAnswers / stats.questionsAnswered) * 100)}%`, inline: true }
    );
  }
  
  return embed;
}

// Start AI Trivia mode
export async function startAITrivia(interaction, category, difficulty, questionCount) {
  const channelId = interaction.channelId;
  const userId = interaction.user.id;
  
  if (activeSessions.has(channelId)) {
    await interaction.reply({ content: '⚠️ A trivia game is already active in this channel!', ephemeral: true });
    return;
  }
  
  await interaction.deferReply();
  
  const settings = await getTriviaSettings(userId);
  const timeLimit = settings.questionTime || 30;
  const count = questionCount || settings.questionsPerRound || 5;
  
  const session = {
    mode: 'ai',
    category,
    difficulty,
    currentQuestion: 0,
    totalQuestions: count,
    scores: new Map(),
    startedBy: userId
  };
  
  activeSessions.set(channelId, session);
  
  const categoryInfo = TRIVIA_CATEGORIES[category] || TRIVIA_CATEGORIES.general;
  const difficultyInfo = DIFFICULTY_LEVELS[difficulty] || DIFFICULTY_LEVELS.medium;
  
  const startEmbed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('🎮 Trivia Game Starting!')
    .setDescription(`Get ready for **${count} questions** about **${categoryInfo.emoji} ${categoryInfo.name}**!`)
    .addFields(
      { name: 'Difficulty', value: `${difficultyInfo.emoji} ${difficultyInfo.name}`, inline: true },
      { name: 'Time per Question', value: `${timeLimit} seconds`, inline: true },
      { name: 'How to Play', value: 'Click A, B, C, or D buttons OR type the letter in chat!', inline: false }
    )
    .setFooter({ text: 'First question coming in 3 seconds...' });
  
  await interaction.editReply({ embeds: [startEmbed] });
  
  // Start first question after delay
  setTimeout(() => askQuestion(interaction.channel, channelId), 3000);
}

// Start Research Trivia mode
export async function startResearchTrivia(interaction, topic, readingTime, questionCount) {
  const channelId = interaction.channelId;
  const userId = interaction.user.id;
  
  if (activeSessions.has(channelId)) {
    await interaction.reply({ content: '⚠️ A trivia game is already active in this channel!', ephemeral: true });
    return;
  }
  
  await interaction.deferReply();
  
  try {
    // Generate research content
    const researchData = await generateResearchTrivia(topic, questionCount || 5);
    
    const session = {
      mode: 'research',
      topic,
      researchData,
      currentQuestion: 0,
      totalQuestions: researchData.questions.length,
      scores: new Map(),
      startedBy: userId,
      readingTime: readingTime || 60
    };
    
    activeSessions.set(channelId, session);
    
    // Show research content
    const contentEmbed = new EmbedBuilder()
      .setColor('#9370DB')
      .setTitle(`📚 Research Topic: ${researchData.title}`)
      .setDescription(researchData.content.substring(0, 4000))
      .addFields(
        { name: '🔑 Key Points', value: researchData.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n'), inline: false }
      )
      .setFooter({ text: `⏱️ You have ${session.readingTime} seconds to read! Quiz starts after...` })
      .setTimestamp();
    
    const readingMessage = await interaction.editReply({ embeds: [contentEmbed] });
    
    // Countdown updates
    let remaining = session.readingTime;
    const countdownInterval = setInterval(async () => {
      remaining -= 10;
      if (remaining > 0 && remaining <= 30) {
        await interaction.channel.send(`⏰ **${remaining} seconds** remaining to read!`);
      }
    }, 10000);
    
    // Start quiz after reading time
    setTimeout(async () => {
      clearInterval(countdownInterval);
      
      // Delete or edit the content message to hide answers
      try {
        await readingMessage.edit({ 
          embeds: [new EmbedBuilder()
            .setColor('#9370DB')
            .setTitle('📝 Quiz Time!')
            .setDescription(`The reading material has been hidden.\nLet's see what you remember about **${topic}**!`)
          ]
        });
      } catch (e) {
        // Message might be deleted
      }
      
      await interaction.channel.send('🎯 **Quiz starting now!** Answer based on what you just read.');
      
      setTimeout(() => askQuestion(interaction.channel, channelId), 2000);
    }, session.readingTime * 1000);
    
  } catch (error) {
    activeSessions.delete(channelId);
    await interaction.editReply(`❌ Failed to generate research content: ${error.message}`);
  }
}

// Start Speed Round mode
export async function startSpeedTrivia(interaction, questionCount) {
  const channelId = interaction.channelId;
  const userId = interaction.user.id;
  
  if (activeSessions.has(channelId)) {
    await interaction.reply({ content: '⚠️ A trivia game is already active in this channel!', ephemeral: true });
    return;
  }
  
  await interaction.deferReply();
  
  try {
    const count = questionCount || 10;
    const questions = await generateSpeedQuestions(count);
    
    const session = {
      mode: 'speed',
      questions,
      currentQuestion: 0,
      totalQuestions: questions.length,
      scores: new Map(),
      startedBy: userId,
      timeLimit: 15 // Shorter time for speed round
    };
    
    activeSessions.set(channelId, session);
    
    const startEmbed = new EmbedBuilder()
      .setColor('#f59e0b')
      .setTitle('⚡ Speed Round Starting!')
      .setDescription(`**${count} rapid-fire questions!**\nYou only have **15 seconds** per question!`)
      .addFields(
        { name: 'Tips', value: '• Be quick!\n• First correct answer gets bonus points\n• Wrong answers lose streak', inline: false }
      )
      .setFooter({ text: 'Get ready... First question in 3 seconds!' });
    
    await interaction.editReply({ embeds: [startEmbed] });
    
    setTimeout(() => askQuestion(interaction.channel, channelId), 3000);
    
  } catch (error) {
    activeSessions.delete(channelId);
    await interaction.editReply(`❌ Failed to start speed round: ${error.message}`);
  }
}

// Ask the next question
async function askQuestion(channel, channelId) {
  const session = activeSessions.get(channelId);
  if (!session) return;
  
  let questionData;
  let timeLimit;
  
  if (session.mode === 'research') {
    questionData = session.researchData.questions[session.currentQuestion];
    timeLimit = 30;
  } else if (session.mode === 'speed') {
    questionData = session.questions[session.currentQuestion];
    timeLimit = session.timeLimit;
  } else {
    // AI mode - generate question
    try {
      questionData = await generateAIQuestion(session.category, session.difficulty);
      const settings = await getTriviaSettings(session.startedBy);
      timeLimit = settings.questionTime || 30;
    } catch (error) {
      const errorMsg = error?.message || 'Unknown error generating question';
      await channel.send(`❌ Failed to generate question: ${errorMsg}`);
      endGame(channel, channelId);
      return;
    }
  }
  
  // Validate questionData
  if (!questionData || !questionData.question || !questionData.options || !questionData.correctAnswer) {
    await channel.send('❌ Failed to generate valid question data. Ending game.');
    endGame(channel, channelId);
    return;
  }
  
  session.currentQuestionData = questionData;
  session.questionStartTime = Date.now();
  session.answeredUsers = new Set();
  
  const { embed, row } = createQuestionEmbed(
    questionData,
    session.currentQuestion + 1,
    session.totalQuestions,
    timeLimit,
    session.mode
  );
  
  const questionMessage = await channel.send({ embeds: [embed], components: [row] });
  session.questionMessageId = questionMessage.id;
  
  // Set up button collector
  const collector = questionMessage.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: timeLimit * 1000
  });
  
  collector.on('collect', async (buttonInteraction) => {
    const answer = buttonInteraction.customId.replace('trivia_', '');
    await handleAnswer(buttonInteraction, channelId, answer, true);
  });
  
  // Set up message collector for typed answers
  const messageCollector = channel.createMessageCollector({
    filter: (m) => ['a', 'b', 'c', 'd'].includes(m.content.toLowerCase().trim()),
    time: timeLimit * 1000
  });
  
  messageCollector.on('collect', async (message) => {
    const answer = message.content.toUpperCase().trim();
    await handleTypedAnswer(message, channelId, answer);
  });
  
  // Timeout
  session.timeout = setTimeout(async () => {
    collector.stop();
    messageCollector.stop();
    
    // Show timeout result
    const timeoutEmbed = new EmbedBuilder()
      .setColor('#f59e0b')
      .setTitle('⏰ Time\'s Up!')
      .setDescription(`The correct answer was **${questionData.correctAnswer}**`)
      .addFields(
        { name: '📖 Explanation', value: questionData.explanation || 'No explanation available', inline: false }
      );
    
    await channel.send({ embeds: [timeoutEmbed] });
    
    // Disable buttons
    try {
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder().setCustomId('trivia_A').setLabel('A').setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId('trivia_B').setLabel('B').setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId('trivia_C').setLabel('C').setStyle(ButtonStyle.Secondary).setDisabled(true),
          new ButtonBuilder().setCustomId('trivia_D').setLabel('D').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
      await questionMessage.edit({ components: [disabledRow] });
    } catch (e) {}
    
    // Next question or end
    session.currentQuestion++;
    if (session.currentQuestion < session.totalQuestions) {
      setTimeout(() => askQuestion(channel, channelId), 3000);
    } else {
      endGame(channel, channelId);
    }
  }, timeLimit * 1000);
}

// Handle button answer
async function handleAnswer(interaction, channelId, answer, isButton = false) {
  const session = activeSessions.get(channelId);
  if (!session || !session.currentQuestionData) {
    if (isButton) await interaction.reply({ content: 'No active question!', ephemeral: true });
    return;
  }
  
  const userId = interaction.user.id;
  
  if (session.answeredUsers.has(userId)) {
    if (isButton) await interaction.reply({ content: 'You already answered this question!', ephemeral: true });
    return;
  }
  
  session.answeredUsers.add(userId);
  
  const correct = answer === session.currentQuestionData.correctAnswer;
  const responseTime = (Date.now() - session.questionStartTime) / 1000;
  
  // Calculate points (faster = more points)
  let points = 0;
  if (correct) {
    const timeLimit = session.mode === 'speed' ? 15 : 30;
    const timeBonus = Math.max(0, (timeLimit - responseTime) / timeLimit);
    points = Math.round(100 * (1 + timeBonus));
    
    // Streak bonus
    const prevStats = await getTriviaStats(userId);
    if (prevStats.streak >= 3) points += 50;
    if (prevStats.streak >= 5) points += 100;
  }
  
  // Update stats
  const stats = await updateTriviaStats(userId, correct, points);
  
  // Update session scores
  const currentScore = session.scores.get(userId) || { correct: 0, total: 0, points: 0 };
  currentScore.total++;
  if (correct) currentScore.correct++;
  currentScore.points += points;
  session.scores.set(userId, currentScore);
  
  // Reply
  const resultEmbed = createResultEmbed(correct, session.currentQuestionData, answer, points, stats);
  
  if (isButton) {
    await interaction.reply({ embeds: [resultEmbed], ephemeral: true });
  }
}

// Handle typed answer
async function handleTypedAnswer(message, channelId, answer) {
  const session = activeSessions.get(channelId);
  if (!session || !session.currentQuestionData) return;
  
  const userId = message.author.id;
  
  if (session.answeredUsers.has(userId)) return;
  
  session.answeredUsers.add(userId);
  
  const correct = answer === session.currentQuestionData.correctAnswer;
  const responseTime = (Date.now() - session.questionStartTime) / 1000;
  
  // Calculate points
  let points = 0;
  if (correct) {
    const timeLimit = session.mode === 'speed' ? 15 : 30;
    const timeBonus = Math.max(0, (timeLimit - responseTime) / timeLimit);
    points = Math.round(100 * (1 + timeBonus));
    
    const prevStats = await getTriviaStats(userId);
    if (prevStats.streak >= 3) points += 50;
    if (prevStats.streak >= 5) points += 100;
  }
  
  // Update stats
  await updateTriviaStats(userId, correct, points);
  
  // Update session scores
  const currentScore = session.scores.get(userId) || { correct: 0, total: 0, points: 0 };
  currentScore.total++;
  if (correct) currentScore.correct++;
  currentScore.points += points;
  session.scores.set(userId, currentScore);
  
  // React to message
  await message.react(correct ? '✅' : '❌');
}

// End the game and show results
async function endGame(channel, channelId) {
  const session = activeSessions.get(channelId);
  if (!session) return;
  
  // Clear timeout
  if (session.timeout) clearTimeout(session.timeout);
  
  // Build leaderboard
  const scores = Array.from(session.scores.entries())
    .map(([odId, score]) => ({ odId, ...score }))
    .sort((a, b) => b.points - a.points);
  
  let leaderboard = '';
  const medals = ['🥇', '🥈', '🥉'];
  
  for (let i = 0; i < Math.min(scores.length, 10); i++) {
    const score = scores[i];
    const medal = medals[i] || `${i + 1}.`;
    leaderboard += `${medal} <@${score.odId}> - **${score.points}** pts (${score.correct}/${score.total})\n`;
  }
  
  if (!leaderboard) {
    leaderboard = 'No one answered any questions!';
  }
  
  const endEmbed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('🏆 Game Over!')
    .setDescription(`Thanks for playing **${session.mode === 'research' ? 'Research' : session.mode === 'speed' ? 'Speed' : 'AI'} Trivia**!`)
    .addFields(
      { name: '📊 Final Scores', value: leaderboard, inline: false }
    )
    .setFooter({ text: 'Use /trivia to play again!' })
    .setTimestamp();
  
  await channel.send({ embeds: [endEmbed] });
  
  // Update games played for all participants
  for (const odId of session.scores.keys()) {
    const stats = await getTriviaStats(odId);
    stats.gamesPlayed++;
    const configOps = await getConfigOps();
    if (configOps) configOps.set(`trivia_stats_${odId}`, JSON.stringify(stats));
  }
  
  activeSessions.delete(channelId);
}

// Stop current game
export function stopTrivia(channelId) {
  const session = activeSessions.get(channelId);
  if (session) {
    if (session.timeout) clearTimeout(session.timeout);
    activeSessions.delete(channelId);
    return true;
  }
  return false;
}

// Check if game is active
export function isGameActive(channelId) {
  return activeSessions.has(channelId);
}

// Get leaderboard
export async function getLeaderboard(limit = 10) {
  const configOps = await getConfigOps();
  if (!configOps) return [];
  const allConfigs = configOps.getAll();
  const stats = [];
  
  for (const config of allConfigs) {
    if (config.key.startsWith('trivia_stats_')) {
      const odId = config.key.replace('trivia_stats_', '');
      const data = JSON.parse(config.value);
      stats.push({ odId, ...data });
    }
  }
  
  return stats
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, limit);
}
