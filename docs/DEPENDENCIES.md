# Dependencies Documentation

## Core Dependencies

### Discord & Bot Framework

| Package | Version | Purpose |
|---------|---------|---------|
| `discord.js` | ^14.14.1 | Discord API wrapper - handles all bot interactions, slash commands, embeds, message collectors |

### AI & Language

| Package | Version | Purpose |
|---------|---------|---------|
| `@google/generative-ai` | ^0.21.0 | Google Gemini AI - powers chat, research, game content generation |
| `an-array-of-english-words` | ^2.0.0 | 275k English word dictionary - used for Word Chain game validation |

### Web Server & API

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.2.1 | Web framework for dashboard REST API |
| `socket.io` | ^4.8.1 | Real-time WebSocket communication for live dashboard updates |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing middleware |
| `express-session` | ^1.18.2 | Session management for dashboard |

### Authentication

| Package | Version | Purpose |
|---------|---------|---------|
| `bcrypt` | ^6.0.0 | Password hashing for secure user authentication |
| `jsonwebtoken` | ^9.0.3 | JWT tokens for API authentication |
| `passport` | ^0.7.0 | Authentication middleware framework |
| `passport-local` | ^1.0.0 | Local username/password authentication strategy |

### Database

| Package | Version | Purpose |
|---------|---------|---------|
| `better-sqlite3` | ^12.5.0 | SQLite database - fast, synchronous, native bindings |

### Network & System

| Package | Version | Purpose |
|---------|---------|---------|
| `ping` | ^0.4.4 | ICMP ping for device connectivity checks |
| `node-arp` | ^1.0.6 | ARP table lookup for MAC address discovery |
| `wake_on_lan` | ^1.0.0 | Send Wake-on-LAN magic packets |
| `speedtest-net` | ^2.2.0 | Internet speed testing via Ookla |

### HTTP & Web Scraping

| Package | Version | Purpose |
|---------|---------|---------|
| `axios` | ^1.13.2 | HTTP client for API calls (Home Assistant, external services) |
| `cheerio` | ^1.0.0 | HTML parsing for web research feature |

### Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| `dotenv` | ^16.4.5 | Load environment variables from .env file |
| `node-cron` | ^4.2.1 | Cron-based task scheduling |
| `chokidar` | ^5.0.0 | File system watcher for plugin hot-reload |
| `chart.js` | ^4.5.1 | Chart generation (available for dashboard) |

---

## Potential Improvements

### Recommended Additions

| Package | Purpose | Why Add It |
|---------|---------|------------|
| `winston` | Logging | Better structured logging with levels, file output |
| `helmet` | Security | HTTP security headers for dashboard |
| `rate-limiter-flexible` | Rate limiting | Prevent API abuse |
| `zod` | Validation | Runtime type validation for API inputs |
| `prisma` | ORM | Type-safe database queries (replace raw SQL) |
| `bullmq` | Job queue | Better task queue than simple cron |
| `ioredis` | Caching | Redis for session storage and caching |

### Performance Improvements

| Package | Purpose | Benefit |
|---------|---------|---------|
| `pino` | Fast logging | 5x faster than winston |
| `fastify` | Web framework | 2x faster than Express |
| `undici` | HTTP client | Faster than axios for Node.js |

### Developer Experience

| Package | Purpose | Benefit |
|---------|---------|---------|
| `typescript` | Type safety | Catch errors at compile time |
| `vitest` | Testing | Fast unit testing |
| `eslint` | Linting | Code quality enforcement |
| `prettier` | Formatting | Consistent code style |

---

## Dependency Tree (Key Packages)

```
discord.js
├── @discordjs/builders    # Slash command builders
├── @discordjs/collection  # Enhanced Map/Set
├── @discordjs/rest        # REST API client
├── @discordjs/ws          # WebSocket gateway
└── discord-api-types      # TypeScript types

better-sqlite3
├── node-addon-api         # Native addon support
├── prebuild-install       # Pre-built binaries
└── node-gyp-build         # Build tools

express
├── body-parser            # Request body parsing
├── cookie                 # Cookie handling
├── router                 # URL routing
└── serve-static           # Static file serving
```
