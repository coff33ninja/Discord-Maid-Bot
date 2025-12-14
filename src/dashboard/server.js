import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { deviceOps, speedTestOps, researchOps, chatOps, taskOps, configOps } from '../database/db.js';
import { 
  requireAuth, 
  requirePermission, 
  PERMISSIONS, 
  authenticateUser, 
  createUser, 
  getAllUsers,
  updateUserRole,
  deleteUser,
  changePassword,
  ROLES
} from '../auth/auth.js';
import { getSMBConfig, setSMBConfig, testSMBConnection, toggleSMB, listSMBFiles } from '../config/smb-config.js';
import { geminiKeys } from '../config/gemini-keys.js';
import { getLoadedPlugins, enablePlugin, disablePlugin, reloadPlugin, getPluginStats, getPlugin } from '../core/plugin-system.js';
import { 
  getEntities, 
  getESPDevices, 
  controlLight, 
  controlSwitch, 
  getSensorData,
  getAllLights,
  getAllSwitches,
  getAllSensors,
  checkConnection as checkHAConnection,
  configureHomeAssistant
} from '../../plugins/integrations/homeassistant/plugin.js';
import { logOps, LOG_LEVELS } from '../logging/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let io;

export function startDashboard(port = 3000) {
  const app = express();
  const httpServer = createServer(app);
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../../public')));
  
  // Public routes (no auth required)
  
  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const result = await authenticateUser(username, password);
      
      if (!result) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Protected routes (auth required)

  // API Routes
  
  // User Management (Dashboard Users)
  app.get('/api/users', requireAuth, requirePermission(PERMISSIONS.MANAGE_USERS), (req, res) => {
    const users = getAllUsers();
    res.json(users);
  });
  
  app.post('/api/users', requireAuth, requirePermission(PERMISSIONS.MANAGE_USERS), async (req, res) => {
    try {
      const { username, password, role } = req.body;
      const user = await createUser(username, password, role);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.put('/api/users/:username/role', requireAuth, requirePermission(PERMISSIONS.MANAGE_USERS), (req, res) => {
    try {
      const { role } = req.body;
      const user = updateUserRole(req.params.username, role);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.delete('/api/users/:username', requireAuth, requirePermission(PERMISSIONS.MANAGE_USERS), (req, res) => {
    try {
      deleteUser(req.params.username);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.post('/api/users/change-password', requireAuth, async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      await changePassword(req.user.username, oldPassword, newPassword);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Discord User Management
  app.get('/api/discord-users', requireAuth, requirePermission(PERMISSIONS.MANAGE_USERS), (req, res) => {
    try {
      const allConfig = configOps.getAll();
      const discordUsers = [];
      
      for (const config of allConfig) {
        if (config.key.startsWith('discord_user_')) {
          const userData = JSON.parse(config.value);
          // Skip deleted users
          if (!userData.deleted) {
            discordUsers.push({
              userId: userData.userId,
              username: userData.username,
              role: userData.role,
              updated: userData.updated
            });
          }
        }
      }
      
      res.json(discordUsers);
    } catch (error) {
      console.error('Error loading Discord users:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/discord-users', requireAuth, requirePermission(PERMISSIONS.MANAGE_USERS), (req, res) => {
    try {
      const { userId, username, role } = req.body;
      
      if (!userId || !username || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      if (!['admin', 'operator', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      
      configOps.set(`discord_user_${userId}`, JSON.stringify({
        userId,
        username,
        role,
        updated: new Date().toISOString()
      }));
      
      res.json({ success: true, userId, username, role });
    } catch (error) {
      console.error('Error adding Discord user:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.put('/api/discord-users/:userId/role', requireAuth, requirePermission(PERMISSIONS.MANAGE_USERS), (req, res) => {
    try {
      const { role } = req.body;
      const { userId } = req.params;
      
      if (!['admin', 'operator', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      
      const userJson = configOps.get(`discord_user_${userId}`);
      
      if (!userJson) {
        return res.status(404).json({ error: 'Discord user not found' });
      }
      
      const userData = JSON.parse(userJson);
      userData.role = role;
      userData.updated = new Date().toISOString();
      
      configOps.set(`discord_user_${userId}`, JSON.stringify(userData));
      
      res.json({ success: true, userId, role });
    } catch (error) {
      console.error('Error changing Discord user role:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.delete('/api/discord-users/:userId', requireAuth, requirePermission(PERMISSIONS.MANAGE_USERS), (req, res) => {
    try {
      const { userId } = req.params;
      
      const userJson = configOps.get(`discord_user_${userId}`);
      if (!userJson) {
        return res.status(404).json({ error: 'Discord user not found' });
      }
      
      // Mark as deleted
      const userData = JSON.parse(userJson);
      userData.deleted = true;
      userData.deletedAt = new Date().toISOString();
      configOps.set(`discord_user_${userId}`, JSON.stringify(userData));
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting Discord user:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // SMB Configuration
  app.get('/api/config/smb', requireAuth, requirePermission(PERMISSIONS.VIEW_CONFIG), (req, res) => {
    const config = getSMBConfig();
    res.json(config);
  });
  
  app.post('/api/config/smb', requireAuth, requirePermission(PERMISSIONS.MODIFY_CONFIG), (req, res) => {
    try {
      const { host, username, password, share } = req.body;
      const result = setSMBConfig(host, username, password, share);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.post('/api/config/smb/test', requireAuth, requirePermission(PERMISSIONS.MODIFY_CONFIG), async (req, res) => {
    const result = await testSMBConnection();
    res.json(result);
  });
  
  app.post('/api/config/smb/toggle', requireAuth, requirePermission(PERMISSIONS.MODIFY_CONFIG), (req, res) => {
    const { enabled } = req.body;
    const result = toggleSMB(enabled);
    res.json(result);
  });
  
  app.get('/api/config/smb/files', requireAuth, requirePermission(PERMISSIONS.VIEW_CONFIG), async (req, res) => {
    const result = await listSMBFiles();
    res.json(result);
  });
  
  // Home Assistant Configuration
  app.post('/api/config/homeassistant', requireAuth, requirePermission(PERMISSIONS.MODIFY_CONFIG), (req, res) => {
    try {
      const { url, token } = req.body;
      const result = configureHomeAssistant(url, token);
      res.json({ success: result });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.get('/api/config/homeassistant/status', requireAuth, async (req, res) => {
    const connected = await checkHAConnection();
    res.json({ connected });
  });
  
  // Quick ping check (only pings registered devices - fast)
  app.get('/api/network/quick-ping', requireAuth, async (req, res) => {
    try {
      const { quickPingCheck } = await import('../../plugins/network-management/scanner.js');
      const result = await quickPingCheck();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Unified network scan (local + Tailscale - full discovery)
  app.get('/api/network/unified', requireAuth, async (req, res) => {
    try {
      const { scanUnifiedNetwork } = await import('../../plugins/network-management/scanner.js');
      const subnet = process.env.NETWORK_SUBNET || '192.168.0.0/24';
      const result = await scanUnifiedNetwork(subnet);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Legacy Tailscale endpoint (now returns Tailscale portion of unified scan)
  app.get('/api/tailscale/devices', requireAuth, async (req, res) => {
    try {
      const { scanUnifiedNetwork } = await import('../../plugins/network-management/scanner.js');
      const subnet = process.env.NETWORK_SUBNET || '192.168.0.0/24';
      const result = await scanUnifiedNetwork(subnet);
      res.json(result.tailscale);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/tailscale/status', requireAuth, async (req, res) => {
    try {
      const { isTailscaleAvailable, getTailscaleStatus } = await import('../../plugins/network-management/scanner.js');
      const available = await isTailscaleAvailable();
      const status = available ? await getTailscaleStatus() : null;
      res.json({ available, status });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Home Assistant / ESP Devices
  app.get('/api/homeassistant/entities', requireAuth, async (req, res) => {
    try {
      const entities = await getEntities();
      res.json(entities);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/homeassistant/esp-devices', requireAuth, async (req, res) => {
    try {
      const devices = await getESPDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/homeassistant/lights', requireAuth, async (req, res) => {
    try {
      const lights = await getAllLights();
      res.json(lights);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/homeassistant/switches', requireAuth, async (req, res) => {
    try {
      const switches = await getAllSwitches();
      res.json(switches);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/homeassistant/sensors', requireAuth, async (req, res) => {
    try {
      const sensors = await getAllSensors();
      res.json(sensors);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/homeassistant/light/:entityId', requireAuth, requirePermission(PERMISSIONS.WAKE_DEVICE), async (req, res) => {
    try {
      const { state, brightness } = req.body;
      await controlLight(req.params.entityId, state, brightness);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/homeassistant/switch/:entityId', requireAuth, requirePermission(PERMISSIONS.WAKE_DEVICE), async (req, res) => {
    try {
      const { state } = req.body;
      await controlSwitch(req.params.entityId, state);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/homeassistant/sensor/:entityId', requireAuth, async (req, res) => {
    try {
      const data = await getSensorData(req.params.entityId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Plugins
  app.get('/api/plugins', requireAuth, (req, res) => {
    const plugins = getLoadedPlugins();
    res.json(plugins);
  });
  
  app.get('/api/plugins/stats', requireAuth, (req, res) => {
    const stats = getPluginStats();
    res.json(stats);
  });
  
  app.post('/api/plugins/:name/enable', requireAuth, requirePermission(PERMISSIONS.MODIFY_CONFIG), async (req, res) => {
    try {
      const result = await enablePlugin(req.params.name);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/plugins/:name/disable', requireAuth, requirePermission(PERMISSIONS.MODIFY_CONFIG), async (req, res) => {
    try {
      const result = await disablePlugin(req.params.name);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/plugins/:name/reload', requireAuth, requirePermission(PERMISSIONS.MODIFY_CONFIG), async (req, res) => {
    try {
      const result = await reloadPlugin(req.params.name);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Devices
  app.get('/api/devices', requireAuth, (req, res) => {
    const devices = deviceOps.getAll();
    res.json(devices);
  });

  app.get('/api/devices/online', requireAuth, (req, res) => {
    const devices = deviceOps.getOnline();
    res.json(devices);
  });

  app.get('/api/devices/:id', requireAuth, (req, res) => {
    const device = deviceOps.getById(req.params.id);
    if (device) {
      const history = deviceOps.getHistory(req.params.id);
      res.json({ ...device, history });
    } else {
      res.status(404).json({ error: 'Device not found' });
    }
  });

  app.post('/api/devices/:id/notes', requireAuth, requirePermission(PERMISSIONS.MODIFY_CONFIG), (req, res) => {
    const { notes } = req.body;
    deviceOps.updateNotes(req.params.id, notes);
    res.json({ success: true });
  });

  // Wake-on-LAN
  app.post('/api/devices/:id/wake', requireAuth, requirePermission(PERMISSIONS.WAKE_DEVICE), async (req, res) => {
    try {
      const device = deviceOps.getById(req.params.id);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      
      // Import WOL function
      const wol = (await import('wake_on_lan')).default;
      
      // Send magic packet
      await new Promise((resolve, reject) => {
        wol.wake(device.mac, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      
      // Update device in database
      deviceOps.upsert({
        ip: device.ip,
        mac: device.mac,
        hostname: device.hostname
      });
      
      // Broadcast update
      broadcastUpdate('wol-sent', { 
        device, 
        userId: req.user.username, 
        timestamp: new Date() 
      });
      
      res.json({ 
        success: true, 
        message: `Magic packet sent to ${device.hostname || device.ip}` 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Speed Tests
  app.get('/api/speedtests', requireAuth, (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const tests = speedTestOps.getRecent(limit);
    res.json(tests);
  });

  app.get('/api/speedtests/stats', requireAuth, (req, res) => {
    const stats = speedTestOps.getStats();
    res.json(stats);
  });

  app.get('/api/speedtests/history', requireAuth, (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const history = speedTestOps.getHistory(days);
    res.json(history);
  });

  // Run speed test on demand
  app.post('/api/speedtests/run', requireAuth, async (req, res) => {
    try {
      // Import speedtest dynamically
      const speedtest = (await import('speedtest-net')).default;
      
      console.log('🚀 Running speedtest from dashboard...');
      const result = await speedtest({ acceptLicense: true, acceptGdpr: true });
      
      const testResult = {
        download: (result.download.bandwidth * 8 / 1000000).toFixed(2),
        upload: (result.upload.bandwidth * 8 / 1000000).toFixed(2),
        ping: result.ping.latency.toFixed(2),
        server: result.server.name,
        isp: result.isp,
        userId: null // Dashboard user
      };
      
      // Save to database
      speedTestOps.add(testResult);
      
      // Broadcast update to all connected clients
      broadcastUpdate('speedtest-complete', testResult);
      
      res.json(testResult);
    } catch (error) {
      console.error('Speed test error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Research
  app.get('/api/research', requireAuth, (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    const research = researchOps.getRecent(limit);
    res.json(research);
  });

  app.get('/api/research/:id', requireAuth, (req, res) => {
    const research = researchOps.getById(req.params.id);
    if (research) {
      res.json(research);
    } else {
      res.status(404).json({ error: 'Research not found' });
    }
  });

  app.get('/api/research/search', requireAuth, (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter required' });
    }
    const results = researchOps.search(q);
    res.json(results);
  });

  // Chat History
  app.get('/api/chat', requireAuth, (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const chats = chatOps.getRecent(limit);
    res.json(chats);
  });

  // Personality Settings
  app.get('/api/personalities', requireAuth, (req, res) => {
    const personalityPlugin = getPlugin('personality');
    if (!personalityPlugin) {
      return res.status(503).json({ error: 'Personality plugin not available' });
    }
    const options = personalityPlugin.getPersonalityOptions();
    res.json(options);
  });
  
  app.get('/api/personality/:discordUserId', requireAuth, (req, res) => {
    const personalityPlugin = getPlugin('personality');
    if (!personalityPlugin) {
      return res.status(503).json({ error: 'Personality plugin not available' });
    }
    
    const { discordUserId } = req.params;
    const personalityKey = personalityPlugin.getUserPersonality(discordUserId);
    const personality = personalityPlugin.getPersonality(personalityKey);
    res.json({ 
      key: personalityKey, 
      ...personality 
    });
  });
  
  app.post('/api/personality/:discordUserId', requireAuth, (req, res) => {
    try {
      const personalityPlugin = getPlugin('personality');
      if (!personalityPlugin) {
        return res.status(503).json({ error: 'Personality plugin not available' });
      }
      
      const { discordUserId } = req.params;
      const { personality } = req.body;
      
      // Validate personality exists
      const personalityData = personalityPlugin.getPersonality(personality);
      if (!personalityData) {
        return res.status(400).json({ error: 'Invalid personality' });
      }
      
      configOps.set(`personality_${discordUserId}`, personality);
      res.json({ 
        success: true, 
        key: personality,
        ...personalityData 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Gemini API Key Stats
  app.get('/api/gemini/stats', requireAuth, (req, res) => {
    const stats = geminiKeys.getStats();
    const keyCount = geminiKeys.getKeyCount();
    res.json({ keyCount, keys: stats });
  });

  // Scheduled Tasks
  app.get('/api/tasks', requireAuth, (req, res) => {
    const tasks = taskOps.getAll();
    res.json(tasks);
  });

  app.post('/api/tasks', requireAuth, requirePermission(PERMISSIONS.CREATE_TASK), (req, res) => {
    try {
      const result = taskOps.add(req.body);
      res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/tasks/:id/toggle', requireAuth, requirePermission(PERMISSIONS.MODIFY_TASK), (req, res) => {
    taskOps.toggle(req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/tasks/:id', requireAuth, requirePermission(PERMISSIONS.DELETE_TASK), (req, res) => {
    taskOps.delete(req.params.id);
    res.json({ success: true });
  });

  // Dashboard stats
  app.get('/api/stats', requireAuth, (req, res) => {
    const devices = deviceOps.getAll();
    const onlineDevices = devices.filter(d => d.online);
    const speedStats = speedTestOps.getStats();
    const recentTests = speedTestOps.getRecent(1);
    const tasks = taskOps.getAll();
    const enabledTasks = tasks.filter(t => t.enabled);

    res.json({
      devices: {
        total: devices.length,
        online: onlineDevices.length,
        offline: devices.length - onlineDevices.length
      },
      speedTest: {
        ...speedStats,
        lastTest: recentTests[0] || null
      },
      tasks: {
        total: tasks.length,
        enabled: enabledTasks.length
      }
    });
  });
  
  // Logs (Admin only)
  app.get('/api/logs', requireAuth, requirePermission(PERMISSIONS.VIEW_LOGS), (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const level = req.query.level || null;
      const category = req.query.category || null;
      
      const logs = logOps.getRecent(limit, level, category);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/logs/search', requireAuth, requirePermission(PERMISSIONS.VIEW_LOGS), (req, res) => {
    try {
      const query = req.query.q;
      const limit = parseInt(req.query.limit) || 100;
      
      if (!query) {
        return res.status(400).json({ error: 'Query parameter required' });
      }
      
      const logs = logOps.search(query, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/logs/stats', requireAuth, requirePermission(PERMISSIONS.VIEW_LOGS), (req, res) => {
    try {
      const stats = logOps.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/logs/categories', requireAuth, requirePermission(PERMISSIONS.VIEW_LOGS), (req, res) => {
    try {
      const categories = logOps.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/logs/levels', requireAuth, requirePermission(PERMISSIONS.VIEW_LOGS), (req, res) => {
    res.json(Object.values(LOG_LEVELS));
  });
  
  app.post('/api/logs/cleanup', requireAuth, requirePermission(PERMISSIONS.VIEW_LOGS), (req, res) => {
    try {
      const deleted = logOps.cleanOldLogs();
      res.json({ success: true, deleted });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Quick Actions
  app.post('/api/quick-actions/wake-all-pcs', requireAuth, requirePermission(PERMISSIONS.WAKE_DEVICE), async (req, res) => {
    try {
      const devices = deviceOps.getAll();
      const wol = (await import('wake_on_lan')).default;
      
      // Filter for PC-like devices (based on hostname patterns)
      const pcs = devices.filter(d => {
        const name = (d.hostname || d.notes || '').toLowerCase();
        return name.includes('pc') || name.includes('desktop') || name.includes('laptop') || name.includes('computer');
      });
      
      if (pcs.length === 0) {
        return res.json({ success: true, message: 'No PCs found', count: 0 });
      }
      
      const results = [];
      for (const pc of pcs) {
        try {
          await new Promise((resolve, reject) => {
            wol.wake(pc.mac, (error) => {
              if (error) reject(error);
              else resolve();
            });
          });
          results.push({ device: pc.hostname || pc.ip, success: true });
        } catch (error) {
          results.push({ device: pc.hostname || pc.ip, success: false, error: error.message });
        }
      }
      
      broadcastUpdate('wake-all-pcs', { results, timestamp: new Date() });
      
      res.json({ 
        success: true, 
        message: `Sent wake packets to ${pcs.length} PC(s)`,
        count: pcs.length,
        results 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/quick-actions/scan-network', requireAuth, async (req, res) => {
    try {
      const { scanUnifiedNetwork } = await import('../../plugins/network-management/scanner.js');
      const subnet = process.env.NETWORK_SUBNET || '192.168.0.0/24';
      const result = await scanUnifiedNetwork(subnet);
      
      broadcastUpdate('network-scan-complete', { 
        stats: result.stats, 
        timestamp: new Date() 
      });
      
      res.json({ 
        success: true, 
        message: `Found ${result.stats.total} devices`,
        stats: result.stats 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Socket.io for real-time updates
  io.on('connection', (socket) => {
    console.log('📱 Dashboard client connected');

    socket.on('disconnect', () => {
      console.log('📱 Dashboard client disconnected');
    });
  });

  // Start server
  httpServer.listen(port, () => {
    console.log(`🌐 Dashboard running at http://localhost:${port}`);
  });

  return { app, io };
}

// Broadcast updates to all connected clients
export function broadcastUpdate(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

export { io };
