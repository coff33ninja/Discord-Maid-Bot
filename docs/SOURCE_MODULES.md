# Source Modules Documentation

## src/auth/ - Authentication System

### auth.js
Handles user authentication and authorization for the web dashboard.

**Features:**
- Password hashing with bcrypt (10 salt rounds)
- JWT token generation and verification (7-day expiry)
- Role-based access control (RBAC)
- Express middleware for protected routes

**Roles:**
| Role | Permissions |
|------|-------------|
| `admin` | Full access to all features |
| `operator` | Execute commands, view data, no user management |
| `viewer` | Read-only access to dashboard |

**Improvements:**
- Add refresh tokens for better security
- Implement OAuth2 for Discord login
- Add 2FA support
- Session invalidation on password change

---

## src/commands/ - Slash Commands

### slash-commands.js
Defines all Discord slash commands using discord.js SlashCommandBuilder.

**Command Categories:**
- Network: `/scan`, `/wake`, `/devices`
- Speed Test: `/speedtest`
- Research: `/research`
- Games: `/trivia`, `/wordchain`, `/hangman`, etc.
- Utility: `/help`, `/personality`, `/schedule`
- Admin: `/config`, `/users`

**Improvements:**
- Add command cooldowns
- Implement command permissions per Discord role
- Add autocomplete for device names
- Localization support (i18n)

---

## src/config/ - Configuration Managers

### gemini-keys.js
Manages multiple Gemini API keys with automatic rotation and rate limit handling.

**Features:**
- Round-robin key rotation
- Automatic cooldown on rate limits (60s)
- Usage statistics per key
- Retry with different key on failure

**Improvements:**
- Add key health monitoring
- Implement weighted rotation based on quota
- Add support for different models per key
- Persistent stats across restarts

### personalities.js
Defines bot personality configurations for AI chat.

**Available Personalities:**
- Maid (default), Tsundere, Kuudere, Dandere
- Yandere, Genki, Onee-san, Chuunibyou
- Butler, Catgirl

**Improvements:**
- Allow custom personality creation via dashboard
- Per-server personality settings
- Personality memory/context persistence

### smb-config.js
Manages SMB/Windows file share configuration for saving research outputs.

**Features:**
- Store credentials in database
- Test connection functionality
- Automatic fallback to local storage
- List files on share

**Improvements:**
- Add Linux/macOS SMB support (smbclient)
- Encrypt stored credentials
- Support multiple shares
- Add file upload/download from dashboard

---

## src/dashboard/ - Web Dashboard

### server.js
Express.js server providing REST API and real-time updates.

**API Endpoints:**
- `/api/auth/*` - Authentication
- `/api/users/*` - User management
- `/api/devices/*` - Network devices
- `/api/speedtests/*` - Speed test history
- `/api/research/*` - Research logs
- `/api/tasks/*` - Scheduled tasks
- `/api/config/*` - Bot configuration
- `/api/homeassistant/*` - Home Assistant control
- `/api/plugins/*` - Plugin management

**Improvements:**
- Add API rate limiting
- Implement request validation (Zod/Joi)
- Add OpenAPI/Swagger documentation
- WebSocket authentication
- HTTPS support

---

## src/database/ - Database Layer

### db.js
SQLite database operations using better-sqlite3.

**Tables:**
| Table | Purpose |
|-------|---------|
| `devices` | Network device inventory |
| `device_history` | Online/offline status changes |
| `speed_tests` | Speed test results |
| `research_logs` | AI research outputs |
| `chat_history` | Discord chat logs |
| `scheduled_tasks` | Cron job definitions |
| `bot_config` | Key-value configuration |

**Improvements:**
- Add database migrations system
- Implement data retention policies
- Add full-text search for research
- Database backup automation
- Consider PostgreSQL for scaling

---

## src/games/ - Discord Games

### game-manager.js
Central game state management and statistics tracking.

**Features:**
- Active game tracking per channel
- Player statistics persistence
- Leaderboards (per-game and global)
- Game type registry

**Improvements:**
- Add game achievements
- Implement tournaments
- Cross-server leaderboards
- Game replay/history

*See [GAMES.md](./GAMES.md) for individual game documentation.*

---

## src/integrations/ - External Services

### homeassistant.js
Home Assistant REST API integration.

**Features:**
- Entity state retrieval
- Light/switch control
- Sensor data reading
- Climate control
- Scene/automation triggering
- ESPHome device discovery

**Improvements:**
- WebSocket API for real-time updates
- Entity caching
- Batch operations
- Custom dashboard widgets
- Voice command integration

---

## src/network/ - Network Utilities

### tailscale.js
Tailscale VPN network integration.

**Features:**
- Device discovery via `tailscale status`
- Ping connectivity checks
- Subnet route information
- Cross-platform support

**Improvements:**
- Tailscale API integration (vs CLI)
- Exit node management
- ACL visualization
- Network topology mapping

---

## src/plugins/ - Plugin System

### plugin-manager.js
Hot-reloadable plugin architecture.

**Features:**
- Dynamic plugin loading
- File watcher for hot-reload
- Lifecycle hooks (load, unload, enable, disable)
- Event emission to plugins
- Plugin statistics

**Plugin Interface:**
```javascript
class MyPlugin extends Plugin {
  constructor() {
    super('name', 'version', 'description');
  }
  async onLoad() {}
  async onUnload() {}
  async onNetworkScan(devices) {}
  async onSpeedTest(results) {}
}
```

**Improvements:**
- Plugin dependencies
- Plugin marketplace/registry
- Sandboxed execution
- Plugin configuration UI
- TypeScript plugin support

---

## src/scheduler/ - Task Scheduler

### tasks.js
Cron-based scheduled task execution.

**Features:**
- Cron expression validation
- Task enable/disable
- Channel notification on completion
- Built-in commands: scan, speedtest, weather

**Improvements:**
- Task retry on failure
- Task dependencies
- Distributed task execution
- Task history/logs
- Visual cron builder in dashboard
