# Configuration Guide

## Environment Variables

Create a `.env` file in the project root:

```env
# Required
DISCORD_TOKEN=your_discord_bot_token
GEMINI_API_KEY=your_gemini_api_key

# Optional - Additional Gemini Keys (for rotation)
GEMINI_API_KEY_2=second_key
GEMINI_API_KEY_3=third_key

# Optional - Dashboard
DASHBOARD_PORT=3000
JWT_SECRET=your_secure_jwt_secret
ADMIN_PASSWORD=initial_admin_password

# Optional - SMB Storage
SMB_HOST=192.168.1.100
SMB_USERNAME=user
SMB_PASSWORD=password
SMB_SHARE=share

# Optional - Home Assistant
HA_URL=http://homeassistant.local:8123
HA_TOKEN=your_long_lived_access_token
```

---

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create New Application
3. Go to Bot section, create bot
4. Enable these Privileged Gateway Intents:
   - Message Content Intent
   - Server Members Intent
5. Copy token to `DISCORD_TOKEN`
6. Generate invite URL with these permissions:
   - Send Messages
   - Embed Links
   - Add Reactions
   - Use Slash Commands
   - Read Message History

---

## Gemini API Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Copy to `GEMINI_API_KEY`
4. For high usage, create multiple keys and add as `GEMINI_API_KEY_2`, etc.

---

## Home Assistant Setup

1. In Home Assistant, go to Profile → Long-Lived Access Tokens
2. Create new token
3. Set `HA_URL` to your Home Assistant URL
4. Set `HA_TOKEN` to the generated token

Or configure via dashboard after bot starts.

---

## SMB Storage Setup

For saving research outputs to a network share:

1. Ensure SMB share is accessible from bot machine
2. Set credentials in `.env` or via dashboard
3. Test connection via `/config smb test` command

---

## Database Configuration

SQLite database is auto-created at `database.db`.

**Location:** Project root
**Mode:** WAL (Write-Ahead Logging) for better concurrency

To reset database, delete `database.db`, `database.db-shm`, and `database.db-wal`.

---

## Dashboard Users

Default admin credentials:
- Username: `admin`
- Password: `admin123` (or `ADMIN_PASSWORD` env var)

**⚠️ Change this immediately after first login!**

---

## Scheduled Tasks

Tasks use cron expressions:

| Expression | Description |
|------------|-------------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour |
| `0 9 * * *` | Daily at 9 AM |
| `0 0 * * 1` | Weekly on Monday |
| `0 0 1 * *` | Monthly on 1st |

---

## Plugin Configuration

Plugins are loaded from `./plugins/` directory.

To create a plugin:
1. Create `.js` file in `plugins/`
2. Export default class extending `Plugin`
3. Plugin auto-loads on file save (hot-reload)

---

## Security Recommendations

1. **Change default admin password** immediately
2. **Use strong JWT_SECRET** (32+ random characters)
3. **Don't expose dashboard** to public internet without HTTPS
4. **Rotate Gemini API keys** if compromised
5. **Use environment variables** for all secrets, never commit `.env`
6. **Enable Discord 2FA** on bot owner account
