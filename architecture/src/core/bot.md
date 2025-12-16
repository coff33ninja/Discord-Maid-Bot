# bot.js

**Path:** `src\core\bot.js`

## Description
* Setup Discord event handlers

## Dependencies
- `discord.js` → Client, GatewayIntentBits (L1)
- `dotenv` → dotenv (L2)
- `../database/db.js` → initDatabase (L3)
- `../logging/logger.js` → createLogger (L4)
- `../auth/auth.js` → initializeAuth (L5)
- `./plugin-system.js` → initPluginSystem (L6)
- `../dashboard/server.js` → startDashboard (L7)
- `../commands/slash-commands.js` → registerCommands (L8)
- `./event-router.js` → EventRouter (L9)
- `../database/db.js` (dynamic, L44)
- `./plugin-system.js` (dynamic, L90)
- `./plugin-system.js` (dynamic, L150)
- `../database/db.js` (dynamic, L151)
- `../config/gemini-keys.js` (dynamic, L177)
- `../config/smb-config.js` (dynamic, L184)
- `../config/smb-config.js` (dynamic, L190)

## Exports
- **MaidBot** [class] (L18) - Main Bot Class

