# Architecture Overview

## Project Structure

```
discord-maid-bot/
├── index.js              # Main entry point, Discord client, command handlers
├── package.json          # Dependencies and scripts
├── database.db           # SQLite database (auto-created)
├── .env                  # Environment configuration
│
├── src/                  # Source modules
│   ├── auth/             # Authentication & authorization
│   ├── commands/         # Slash command definitions
│   ├── config/           # Configuration managers
│   ├── dashboard/        # Web dashboard server
│   ├── database/         # Database operations
│   ├── games/            # Interactive Discord games
│   ├── integrations/     # External service integrations
│   ├── network/          # Network utilities
│   ├── plugins/          # Plugin system
│   └── scheduler/        # Cron-based task scheduler
│
├── public/               # Dashboard frontend files
│   ├── index.html        # Dashboard UI
│   └── dashboard.js      # Frontend JavaScript
│
├── plugins/              # User plugins (hot-reloadable)
│   └── example-plugin.js # Example plugin template
│
├── temp/                 # Temporary files (research outputs)
└── docs/                 # Documentation
```

## Data Flow

```
Discord User → Discord.js Client → Command Handler → Module
                                                      ↓
                                              Database (SQLite)
                                                      ↓
                                              Dashboard API ← Web Browser
```

## Key Components

### 1. Discord Client (index.js)
- Handles all Discord events
- Routes slash commands to appropriate handlers
- Manages AI chat with personality system
- Coordinates between all modules

### 2. Database Layer (src/database/)
- SQLite with WAL mode for concurrency
- Tables: devices, speed_tests, research_logs, chat_history, scheduled_tasks, bot_config
- Provides CRUD operations for all data

### 3. Web Dashboard (src/dashboard/)
- Express.js REST API
- Socket.io for real-time updates
- JWT authentication with role-based access
- Serves static frontend from /public

### 4. Plugin System (src/plugins/)
- Hot-reloadable JavaScript plugins
- Lifecycle hooks (onLoad, onUnload, onEnable, onDisable)
- Event system for extending functionality
