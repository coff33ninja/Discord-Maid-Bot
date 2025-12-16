# trivia.js

**Path:** `plugins\games\games\trivia.js`

## Dependencies
- `discord.js` → EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType (L1)
- `./ai-helper.js` → generateWithRotation (L2)
- `./game-manager.js` → getActiveGame, setActiveGame, clearActiveGame, hasActiveGame, updateGameStats (L3)
- `../../../src/database/db.js` (dynamic, L8)

## Exports
- **TRIVIA_CATEGORIES** [const] (L19)
- **DIFFICULTY_LEVELS** [const] (L35)
- **getTriviaSettings** [function] (L50)
- **saveTriviaSettings** [function] (L58)
- **getTriviaStats** [function] (L64)
- **updateTriviaStats** [function] (L79)
- **startAITrivia** [function] (L280)
- **startResearchTrivia** [function] (L328)
- **startSpeedTrivia** [function] (L407)
- **stopTrivia** [function] (L704)
- **isGameActive** [function] (L715)
- **getLeaderboard** [function] (L720)

## Functions
- `async getConfigOps()` (L6)
- ✓ `async getTriviaSettings(userId)` (L50)
- ✓ `async saveTriviaSettings(userId, settings)` (L58)
- ✓ `async getTriviaStats(userId)` (L64)
- ✓ `async updateTriviaStats(userId, correct, points = 0)` (L79)
- `async generateAIQuestion(category, difficulty)` (L96)
- `async generateResearchTrivia(topic, questionCount = 5)` (L154)
- `async generateSpeedQuestions(count = 10)` (L189)
- `createQuestionEmbed(questionData, questionNum, totalQuestions, timeLimit, mode = 'ai')` (L218)
- `createResultEmbed(correct, questionData, userAnswer, points, stats)` (L253)
- ✓ `async startAITrivia(interaction, category, difficulty, questionCount)` (L280)
- ✓ `async startResearchTrivia(interaction, topic, readingTime, questionCount)` (L328)
- ✓ `async startSpeedTrivia(interaction, questionCount)` (L407)
- `async askQuestion(channel, channelId)` (L454)
- `async handleAnswer(interaction, channelId, answer, isButton = false)` (L564)
- `async handleTypedAnswer(message, channelId, answer)` (L615)
- `async endGame(channel, channelId)` (L655)
- ✓ `stopTrivia(channelId)` (L704)
- ✓ `isGameActive(channelId)` (L715)
- ✓ `async getLeaderboard(limit = 10)` (L720)

## Constants
- **activeSessions** [value] (L14)
- ✓ **TRIVIA_CATEGORIES** [object] (L19)
- ✓ **DIFFICULTY_LEVELS** [object] (L35)
- **DEFAULT_SETTINGS** [object] (L42)

