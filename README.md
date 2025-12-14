# Discord Maid Bot 🌸

An AI-powered Discord bot with network management, home automation, interactive games, and a web dashboard.

> **🧪 Experimental AI Project**
> This project is my playground for exploring unconventional ways to use AI. I believe the best way to demystify AI and prove it's not the world-ending threat some fear is to build silly, helpful, and creative things with it. If an AI apocalypse ever happens, it definitely won't start with a maid bot that plays trivia games and turns on your lights. 😄

---

## 🚧 Active Development: Plugin-First Refactor

> **Branch:** `dev-plugin-first-refactor`
> 
> We're currently refactoring the entire codebase from a monolithic architecture to a modular, plugin-first design. This will make the bot more maintainable, testable, and extensible.
>
> **Key Changes:**
> - Core reduced from 3,553 to ~700 lines (80% reduction)
> - All features moved to independent plugins
> - Hot-reloadable plugin system
> - Better error isolation
> - Easier to contribute and extend
>
> **Documentation:**
> - 📋 [Refactor Status](./REFACTOR_STATUS.md) - Current progress and next steps
> - 🗺️ [Code Split Mapping](./docs/CODE_SPLIT_MAPPING.md) - Exact line-by-line implementation plan
> - 📐 [Core Refactor Plan](./docs/CORE_REFACTOR_PLAN.md) - Architecture and philosophy
> - 🎨 [Visual Guide](./docs/REFACTOR_VISUAL.md) - Diagrams and comparisons
>
> **Timeline:** 10-week phased implementation (currently in planning phase)
>
> The `main` branch remains stable. All refactor work happens on `dev-plugin-first-refactor`.

---

## Features

- 🤖 **AI Chat** - Powered by Google Gemini with 10 unique personalities
- 🎮 **18 Games** - Trivia, Word Chain, Hangman, Connect Four, Mafia, and more
- 🌐 **Network Tools** - Device scanning, Wake-on-LAN, Tailscale integration
- 🚀 **Speed Tests** - Automated internet speed monitoring
- 🔍 **Web Research** - AI-powered web scraping and summarization
- 🏠 **Home Assistant** - Control lights, switches, sensors, and automations
- 📊 **Web Dashboard** - Real-time monitoring with role-based access
- 🔌 **Plugin System** - Hot-reloadable custom plugins
- ⏰ **Task Scheduler** - Cron-based automated tasks

## Quick Start

```bash
# Clone repository
git clone https://github.com/coff33ninja/discord-maid-bot.git
cd discord-maid-bot

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your tokens

# Start bot
npm start
```

## Requirements

- Node.js 18+
- Discord Bot Token ([Get one here](https://discord.com/developers/applications))
- Gemini API Key ([Get one here](https://makersuite.google.com/app/apikey))

### Platform Support

- ✅ **Windows** - Fully supported
- ✅ **Linux** - Fully supported (Ubuntu, Debian, etc.)
  - For SMB features: `sudo apt-get install smbclient`
- ✅ **macOS** - Should work (untested)

Network scanning and SMB features automatically detect the platform and use appropriate commands.

## Configuration

Create `.env` file:

```env
DISCORD_TOKEN=your_discord_bot_token
GEMINI_API_KEY=your_gemini_api_key

# Optional
DASHBOARD_PORT=3000
JWT_SECRET=your_secure_secret
```

See [docs/CONFIGURATION.md](./docs/CONFIGURATION.md) for full options.

## Commands

| Command | Description |
|---------|-------------|
| `/chat` | Talk to the AI maid |
| `/personality` | Change bot personality |
| `/scan` | Scan network for devices |
| `/wake` | Send Wake-on-LAN packet |
| `/speedtest` | Run internet speed test |
| `/research` | AI web research |
| `/trivia` | Start trivia game |
| `/wordchain` | Word chain game |
| `/help` | Show all commands |

## Dashboard

Access at `http://localhost:3000` after starting the bot.

Default login: `admin` / `admin123`

**⚠️ Change the default password immediately!**

## Documentation

### User Documentation
- [Configuration](./docs/CONFIGURATION.md) - Setup guide
- [Commands](./docs/COMMANDS.md) - Command reference
- [Games](./docs/GAMES.md) - Game documentation
- [API Reference](./docs/API.md) - REST API docs

### Developer Documentation
- [Architecture](./docs/ARCHITECTURE.md) - System overview
- [Dependencies](./docs/DEPENDENCIES.md) - Package documentation
- [Source Modules](./docs/SOURCE_MODULES.md) - Code documentation
- [Future Plans](./docs/FUTURE_PLANS.md) - Roadmap

### Refactor Documentation (Active Development)
- [Refactor Status](./REFACTOR_STATUS.md) - Current progress ⭐
- [Code Split Mapping](./docs/CODE_SPLIT_MAPPING.md) - Line-by-line plan ⭐
- [Core Refactor Plan](./docs/CORE_REFACTOR_PLAN.md) - Architecture design ⭐
- [Visual Guide](./docs/REFACTOR_VISUAL.md) - Diagrams and comparisons ⭐
- [Conversational AI Architecture](./docs/CONVERSATIONAL_AI_ARCHITECTURE.md) - AI design
- [AI Sysadmin Design](./docs/AI_SYSADMIN_DESIGN.md) - Sysadmin plugin design

## Project Structure

```
├── index.js           # Main entry point
├── src/
│   ├── auth/          # Authentication
│   ├── commands/      # Slash commands
│   ├── config/        # Configuration
│   ├── dashboard/     # Web server
│   ├── database/      # SQLite operations
│   ├── games/         # Discord games
│   ├── integrations/  # Home Assistant
│   ├── network/       # Tailscale, ping
│   ├── plugins/       # Plugin system
│   └── scheduler/     # Cron tasks
├── public/            # Dashboard frontend
├── plugins/           # Custom plugins
└── docs/              # Documentation
```

## Tech Stack

- **Runtime:** Node.js 18+
- **Discord:** discord.js v14
- **AI:** Google Gemini
- **Database:** SQLite (better-sqlite3)
- **Web:** Express.js, Socket.io
- **Auth:** JWT, bcrypt

## Personalities

The bot supports 10 unique AI personalities:

| Personality | Style |
|-------------|-------|
| 🌸 Maid | Polite, devoted, uses honorifics |
| 💢 Tsundere | Acts cold but secretly cares |
| ❄️ Kuudere | Cool, calm, emotionally reserved |
| 🥺 Dandere | Shy and quiet, warms up over time |
| 🖤 Yandere | Obsessively devoted (playfully) |
| ⭐ Genki | Energetic and always positive |
| 💋 Onee-san | Mature, caring big sister type |
| 🔮 Chuunibyou | Dramatic with delusions of grandeur |
| 🎩 Butler | Refined and impeccably proper |
| 🐱 Catgirl | Playful and cat-like, nya~ |

## Screenshots

*Coming soon*

## Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- 🐛 [Report bugs](https://github.com/coff33ninja/Discord-Maid-Bot/issues)
- 💡 [Request features](https://github.com/coff33ninja/Discord-Maid-Bot/issues)
- ⭐ Star the repo if you find it useful!

## Acknowledgments

- [discord.js](https://discord.js.org/) - Discord API wrapper
- [Google Gemini](https://ai.google.dev/) - AI capabilities
- [Home Assistant](https://www.home-assistant.io/) - Home automation platform

## License

MIT - See [LICENSE](./LICENSE) for details
