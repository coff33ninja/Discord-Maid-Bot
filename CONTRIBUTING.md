# Contributing to Discord Maid Bot

Thanks for your interest in contributing! 🌸

## Ways to Contribute

- 🐛 Report bugs
- 💡 Suggest features
- 📝 Improve documentation
- 🔧 Submit pull requests
- 🎮 Create new games
- 🔌 Build plugins

## Getting Started

### Prerequisites

- Node.js 18+
- Git
- Discord account
- Gemini API key

### Setup Development Environment

```bash
# Fork the repository on GitHub

# Clone your fork
git clone https://github.com/YOUR_USERNAME/Discord-Maid-Bot.git
cd Discord-Maid-Bot

# Add upstream remote
git remote add upstream https://github.com/coff33ninja/Discord-Maid-Bot.git

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your test bot token

# Start in development mode
npm run dev
```

## Development Workflow

### 1. Create a Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Write clean, readable code
- Follow existing code style
- Add comments for complex logic
- Update documentation if needed

### 3. Test Your Changes

```bash
# Start the bot
npm start

# Test your feature in Discord
```

### 4. Commit Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add awesome new feature"
```

**Commit Message Format:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

### 5. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub.

## Code Style Guidelines

### JavaScript

```javascript
// Use ES modules
import { something } from './module.js';

// Use async/await over callbacks
async function doSomething() {
  const result = await asyncOperation();
  return result;
}

// Use descriptive variable names
const userMessage = message.content;  // Good
const m = message.content;            // Bad

// Add JSDoc comments for functions
/**
 * Processes a user command
 * @param {Message} message - Discord message
 * @returns {Promise<void>}
 */
async function processCommand(message) {
  // ...
}
```

### File Organization

```
src/
├── feature/
│   └── feature.js      # One feature per file
├── utils/
│   └── helpers.js      # Shared utilities
```

## Adding New Games

1. Create file in `src/games/`
2. Follow existing game structure
3. Export start function
4. Register in `slash-commands.js`
5. Add handler in `index.js`
6. Document in `docs/GAMES.md`

**Game Template:**
```javascript
import { EmbedBuilder } from 'discord.js';
import { getActiveGame, setActiveGame, clearActiveGame } from './game-manager.js';

export async function startMyGame(interaction, options) {
  const channelId = interaction.channelId;
  
  // Check for existing game
  if (getActiveGame(channelId)) {
    return interaction.reply({ content: 'Game already active!', ephemeral: true });
  }
  
  // Initialize game state
  const game = {
    type: 'mygame',
    // ... game state
  };
  
  setActiveGame(channelId, game);
  
  // Send game embed
  const embed = new EmbedBuilder()
    .setTitle('🎮 My Game')
    .setDescription('Game started!');
  
  await interaction.reply({ embeds: [embed] });
  
  // Set up message collector for gameplay
  // ...
}
```

## Adding New Commands

1. Add command definition in `src/commands/slash-commands.js`
2. Add handler in `index.js`
3. Document in `docs/COMMANDS.md`

## Pull Request Guidelines

- One feature/fix per PR
- Include description of changes
- Reference related issues
- Update documentation
- Test before submitting
- Be responsive to feedback

## Questions?

- Open a [Discussion](https://github.com/coff33ninja/Discord-Maid-Bot/discussions)
- Check existing [Issues](https://github.com/coff33ninja/Discord-Maid-Bot/issues)

## Code of Conduct

Be respectful and inclusive. We're all here to learn and build cool things together.

---

Thank you for contributing! 🎉
