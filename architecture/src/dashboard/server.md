# server.js

**Path:** `src\dashboard\server.js`

## Dependencies
- `express` → express (L1)
- `http` → createServer (L2)
- `socket.io` → Server (L3)
- `cors` → cors (L4)
- `path` → path (L5)
- `url` → fileURLToPath (L6)
- `../database/db.js` → deviceOps, speedTestOps, researchOps, chatOps, taskOps, configOps (L7)
- `../config/smb-config.js` → getSMBConfig, setSMBConfig, testSMBConnection, toggleSMB, listSMBFiles (L20)
- `../config/gemini-keys.js` → geminiKeys (L21)
- `../core/plugin-system.js` → getLoadedPlugins, enablePlugin, disablePlugin, reloadPlugin, getPluginStats, getPlugin (L22)
- `../logging/logger.js` → logOps, LOG_LEVELS (L23)
- `../../plugins/integrations/homeassistant/plugin.js` (dynamic, L250)
- `../../plugins/integrations/homeassistant/plugin.js` (dynamic, L260)
- `../../plugins/network-management/scanner.js` (dynamic, L268)
- `../../plugins/network-management/scanner.js` (dynamic, L279)
- `../../plugins/network-management/scanner.js` (dynamic, L291)
- `../../plugins/network-management/scanner.js` (dynamic, L302)
- `../../plugins/integrations/homeassistant/plugin.js` (dynamic, L314)
- `../../plugins/integrations/homeassistant/plugin.js` (dynamic, L324)
- `../../plugins/integrations/homeassistant/plugin.js` (dynamic, L334)
- `../../plugins/integrations/homeassistant/plugin.js` (dynamic, L344)
- `../../plugins/integrations/homeassistant/plugin.js` (dynamic, L354)
- `../../plugins/integrations/homeassistant/plugin.js` (dynamic, L364)
- `../../plugins/integrations/homeassistant/plugin.js` (dynamic, L375)
- `../../plugins/integrations/homeassistant/plugin.js` (dynamic, L386)
- `wake_on_lan` (dynamic, L468)
- `speedtest-net` (dynamic, L523)
- `wake_on_lan` (dynamic, L757)
- `../../plugins/network-management/scanner.js` (dynamic, L799)

## Exports
- **startDashboard** [function] (L30)
- **broadcastUpdate** [function] (L836)
- **io** [reference] (L842)

## Functions
- ✓ `startDashboard(port = 3000)` (L30)
- ✓ `broadcastUpdate(event, data)` (L836)

