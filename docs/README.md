# Discord Maid Bot - Documentation

A feature-rich Discord bot with AI chat, network management, games, home automation, and a web dashboard.

## 📚 Documentation Index

### Getting Started
| Document | Description |
|----------|-------------|
| [Configuration](./CONFIGURATION.md) | Environment setup and settings |
| [Commands](./COMMANDS.md) | All Discord slash commands |
| [Troubleshooting](./TROUBLESHOOTING.md) | Common issues and solutions |

### Technical Reference
| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | System overview and folder structure |
| [Source Modules](./SOURCE_MODULES.md) | Detailed src/ folder documentation |
| [API Reference](./API.md) | Dashboard REST API endpoints |
| [Dependencies](./DEPENDENCIES.md) | All npm packages explained |

### Features
| Document | Description |
|----------|-------------|
| [Games](./GAMES.md) | All 18 games and how they work |
| [Plugins](./PLUGINS.md) | Plugin development guide |

### Planning
| Document | Description |
|----------|-------------|
| [Future Plans](./FUTURE_PLANS.md) | Roadmap and improvement ideas |

---

## 🚀 Quick Start

```bash
# 1. Clone repository
git clone https://github.com/coff33ninja/Discord-Maid-Bot.git
cd Discord-Maid-Bot

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your tokens

# 4. Start bot
npm start
```

## 📋 Requirements

| Requirement | Required | Notes |
|-------------|----------|-------|
| Node.js 18+ | ✅ Yes | LTS recommended |
| Discord Bot Token | ✅ Yes | [Get one here](https://discord.com/developers/applications) |
| Gemini API Key | ✅ Yes | [Get one here](https://makersuite.google.com/app/apikey) |
| Home Assistant | ❌ Optional | For smart home control |
| Tailscale | ❌ Optional | For VPN network scanning |
| SMB Share | ❌ Optional | For research file storage |

## 🔗 Quick Links

- [Main README](../README.md)
- [GitHub Repository](https://github.com/coff33ninja/Discord-Maid-Bot)
- [Report Issues](https://github.com/coff33ninja/Discord-Maid-Bot/issues)
