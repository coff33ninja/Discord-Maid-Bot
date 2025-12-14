# Troubleshooting Guide

## Common Issues

### Bot Won't Start

#### "DISCORD_TOKEN is not defined"
```
Error: DISCORD_TOKEN is required
```
**Solution:** Create `.env` file with your Discord token:
```env
DISCORD_TOKEN=your_token_here
```

#### "Used disallowed intents"
```
Error [DisallowedIntents]: Privileged intent provided is not enabled
```
**Solution:** Enable intents in Discord Developer Portal:
1. Go to your application → Bot
2. Enable "Message Content Intent"
3. Enable "Server Members Intent"

#### "Invalid token"
```
Error [TokenInvalid]: An invalid token was provided
```
**Solution:** 
- Regenerate token in Discord Developer Portal
- Make sure no extra spaces in `.env` file
- Don't wrap token in quotes

---

### Database Issues

#### "Database is locked"
```
Error: SQLITE_BUSY: database is locked
```
**Solution:**
- Stop all bot instances (only run one)
- Delete `database.db-shm` and `database.db-wal` files
- Restart bot

#### "Cannot find module 'better-sqlite3'"
```
Error: Cannot find module 'better-sqlite3'
```
**Solution:**
```bash
npm rebuild better-sqlite3
# or
npm install better-sqlite3 --build-from-source
```

---

### Gemini AI Issues

#### "API key not valid"
```
Error: API key not valid. Please pass a valid API key.
```
**Solution:**
- Verify key at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Create new key if needed
- Check for extra spaces in `.env`

#### "Resource exhausted" / Rate Limited
```
Error: 429 Resource has been exhausted
```
**Solution:**
- Add multiple API keys for rotation:
  ```env
  GEMINI_API_KEY=key1
  GEMINI_API_KEY_2=key2
  GEMINI_API_KEY_3=key3
  ```
- Wait 60 seconds (auto-cooldown)
- Reduce request frequency

---

### Network/WoL Issues

#### "Wake-on-LAN not working"
**Checklist:**
1. Target device has WoL enabled in BIOS
2. Network adapter has WoL enabled in OS
3. Device is connected via Ethernet (not WiFi)
4. MAC address is correct
5. Bot and target on same network/subnet

#### "Network scan finds no devices"
**Solution:**
- Run bot with administrator privileges
- Check firewall allows ICMP (ping)
- Verify network connectivity
- Try scanning specific IP range

---

### Dashboard Issues

#### "Cannot access dashboard"
**Checklist:**
1. Check port isn't blocked: `http://localhost:3000`
2. Verify `DASHBOARD_PORT` in `.env`
3. Check firewall settings
4. Look for port conflicts

#### "Login fails with correct password"
**Solution:**
- Default: `admin` / `admin123`
- Check `ADMIN_PASSWORD` in `.env`
- Reset by deleting `admin_initialized` from database:
  ```sql
  DELETE FROM bot_config WHERE key = 'admin_initialized';
  DELETE FROM bot_config WHERE key = 'user_admin';
  ```

#### "JWT token invalid"
**Solution:**
- Clear browser cookies/localStorage
- Check `JWT_SECRET` hasn't changed
- Re-login to get new token

---

### Home Assistant Issues

#### "Home Assistant not configured"
**Solution:**
1. Get long-lived token from HA Profile
2. Configure via dashboard or `.env`:
   ```env
   HA_URL=http://homeassistant.local:8123
   HA_TOKEN=your_token
   ```

#### "Cannot connect to Home Assistant"
**Checklist:**
- Verify URL is accessible from bot machine
- Check token hasn't expired
- Ensure HA is running
- Try IP address instead of hostname

---

### Plugin Issues

#### "Plugin not loading"
**Checklist:**
1. File is in `plugins/` directory
2. File has `.js` extension
3. Has valid `export default` class
4. Class extends `Plugin`
5. Check console for error messages

#### "Plugin hot-reload not working"
**Solution:**
- Ensure `chokidar` is installed
- Check file permissions
- Restart bot to reinitialize watcher

---

## Debug Mode

Enable verbose logging:
```bash
# Windows
set DEBUG=* && npm start

# Linux/Mac
DEBUG=* npm start
```

## Getting Help

1. Check this troubleshooting guide
2. Search [existing issues](https://github.com/coff33ninja/Discord-Maid-Bot/issues)
3. Create new issue with:
   - Error message (full stack trace)
   - Node.js version (`node -v`)
   - OS and version
   - Steps to reproduce

## Reset Everything

Nuclear option - start fresh:
```bash
# Stop bot
# Delete database
rm database.db database.db-shm database.db-wal

# Reinstall dependencies
rm -rf node_modules
npm install

# Start fresh
npm start
```
