import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, '../../database.db'));

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize database schema
export function initDatabase() {
  // Devices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      mac TEXT NOT NULL UNIQUE,
      hostname TEXT,
      first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      online BOOLEAN DEFAULT 1,
      device_type TEXT,
      notes TEXT,
      emoji TEXT,
      device_group TEXT
    )
  `);

  // Device history (track online/offline changes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS device_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id)
    )
  `);

  // Speed tests
  db.exec(`
    CREATE TABLE IF NOT EXISTS speed_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      download REAL NOT NULL,
      upload REAL NOT NULL,
      ping REAL NOT NULL,
      server TEXT,
      isp TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id TEXT
    )
  `);

  // Research logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS research_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      result TEXT,
      filename TEXT,
      saved_to_smb BOOLEAN DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id TEXT
    )
  `);

  // Chat history
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      username TEXT,
      message TEXT NOT NULL,
      response TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Scheduled tasks
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      cron_expression TEXT NOT NULL,
      command TEXT NOT NULL,
      enabled BOOLEAN DEFAULT 1,
      last_run DATETIME,
      next_run DATETIME,
      channel_id TEXT
    )
  `);

  // Bot configuration
  db.exec(`
    CREATE TABLE IF NOT EXISTS bot_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Full-text search virtual table for research logs
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS research_fts USING fts5(
      query,
      result,
      content='research_logs',
      content_rowid='id'
    )
  `);

  // Triggers to keep FTS index in sync
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS research_ai AFTER INSERT ON research_logs BEGIN
      INSERT INTO research_fts(rowid, query, result) VALUES (new.id, new.query, new.result);
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS research_ad AFTER DELETE ON research_logs BEGIN
      INSERT INTO research_fts(research_fts, rowid, query, result) VALUES('delete', old.id, old.query, old.result);
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS research_au AFTER UPDATE ON research_logs BEGIN
      INSERT INTO research_fts(research_fts, rowid, query, result) VALUES('delete', old.id, old.query, old.result);
      INSERT INTO research_fts(rowid, query, result) VALUES (new.id, new.query, new.result);
    END
  `);

  // Rebuild FTS index if needed (populate from existing data)
  try {
    const ftsCount = db.prepare('SELECT COUNT(*) as count FROM research_fts').get();
    const researchCount = db.prepare('SELECT COUNT(*) as count FROM research_logs').get();
    if (ftsCount.count === 0 && researchCount.count > 0) {
      console.log('📚 Rebuilding research full-text search index...');
      db.exec(`INSERT INTO research_fts(rowid, query, result) SELECT id, query, result FROM research_logs`);
      console.log('✅ FTS index rebuilt');
    }
  } catch (e) {
    // FTS table might not exist yet on first run
  }

  console.log('✅ Database initialized');
}

// Device operations
export const deviceOps = {
  upsert: (device) => {
    const stmt = db.prepare(`
      INSERT INTO devices (ip, mac, hostname, last_seen, online)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)
      ON CONFLICT(mac) DO UPDATE SET
        ip = excluded.ip,
        hostname = excluded.hostname,
        last_seen = CURRENT_TIMESTAMP,
        online = 1
    `);
    return stmt.run(device.ip, device.mac, device.hostname);
  },

  getAll: () => {
    return db.prepare('SELECT * FROM devices ORDER BY last_seen DESC').all();
  },

  getOnline: () => {
    return db.prepare('SELECT * FROM devices WHERE online = 1 ORDER BY hostname').all();
  },

  getById: (id) => {
    return db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
  },

  getByMac: (mac) => {
    return db.prepare('SELECT * FROM devices WHERE mac = ?').get(mac);
  },

  setOffline: (mac) => {
    return db.prepare('UPDATE devices SET online = 0 WHERE mac = ?').run(mac);
  },

  updateNotes: (id, notes) => {
    return db.prepare('UPDATE devices SET notes = ? WHERE id = ?').run(notes, id);
  },

  updateEmoji: (id, emoji) => {
    return db.prepare('UPDATE devices SET emoji = ? WHERE id = ?').run(emoji, id);
  },

  updateGroup: (id, group) => {
    return db.prepare('UPDATE devices SET device_group = ? WHERE id = ?').run(group, id);
  },

  getByGroup: (group) => {
    return db.prepare('SELECT * FROM devices WHERE device_group = ? ORDER BY last_seen DESC').all(group);
  },

  getAllGroups: () => {
    return db.prepare('SELECT DISTINCT device_group FROM devices WHERE device_group IS NOT NULL ORDER BY device_group').all();
  },

  getHistory: (deviceId, limit = 100) => {
    return db.prepare(`
      SELECT * FROM device_history 
      WHERE device_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(deviceId, limit);
  },

  addHistory: (deviceId, status) => {
    return db.prepare(`
      INSERT INTO device_history (device_id, status) VALUES (?, ?)
    `).run(deviceId, status);
  }
};

// Speed test operations
export const speedTestOps = {
  add: (test) => {
    const stmt = db.prepare(`
      INSERT INTO speed_tests (download, upload, ping, server, isp, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(test.download, test.upload, test.ping, test.server, test.isp, test.userId);
  },

  getRecent: (limit = 10) => {
    return db.prepare(`
      SELECT * FROM speed_tests ORDER BY timestamp DESC LIMIT ?
    `).all(limit);
  },

  getStats: () => {
    return db.prepare(`
      SELECT 
        AVG(download) as avg_download,
        AVG(upload) as avg_upload,
        AVG(ping) as avg_ping,
        MAX(download) as max_download,
        MIN(download) as min_download,
        COUNT(*) as total_tests
      FROM speed_tests
    `).get();
  },

  getHistory: (days = 7) => {
    return db.prepare(`
      SELECT * FROM speed_tests 
      WHERE timestamp >= datetime('now', '-' || ? || ' days')
      ORDER BY timestamp ASC
    `).all(days);
  }
};

// Research operations
export const researchOps = {
  add: (research) => {
    const stmt = db.prepare(`
      INSERT INTO research_logs (query, result, filename, saved_to_smb, user_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    // Convert boolean to integer for SQLite compatibility
    const savedToSmb = research.savedToSmb ? 1 : 0;
    return stmt.run(research.query, research.result, research.filename, savedToSmb, research.userId);
  },

  getRecent: (limit = 20) => {
    return db.prepare(`
      SELECT id, query, filename, saved_to_smb, timestamp, user_id
      FROM research_logs ORDER BY timestamp DESC LIMIT ?
    `).all(limit);
  },

  getById: (id) => {
    return db.prepare('SELECT * FROM research_logs WHERE id = ?').get(id);
  },

  search: (query) => {
    return db.prepare(`
      SELECT * FROM research_logs 
      WHERE query LIKE ? OR result LIKE ?
      ORDER BY timestamp DESC LIMIT 50
    `).all(`%${query}%`, `%${query}%`);
  },

  // Full-text search using FTS5
  fullTextSearch: (searchTerm) => {
    try {
      // Escape special FTS5 characters and create search query
      const escaped = searchTerm.replace(/['"*()]/g, ' ').trim();
      const terms = escaped.split(/\s+/).filter(t => t.length > 1);
      
      if (terms.length === 0) {
        return [];
      }
      
      // Use prefix matching for better results
      const ftsQuery = terms.map(t => `"${t}"*`).join(' OR ');
      
      return db.prepare(`
        SELECT r.*, 
               snippet(research_fts, 0, '<mark>', '</mark>', '...', 32) as query_snippet,
               snippet(research_fts, 1, '<mark>', '</mark>', '...', 64) as result_snippet,
               bm25(research_fts) as relevance
        FROM research_fts fts
        JOIN research_logs r ON fts.rowid = r.id
        WHERE research_fts MATCH ?
        ORDER BY relevance
        LIMIT 25
      `).all(ftsQuery);
    } catch (e) {
      console.error('FTS search error:', e.message);
      // Fallback to LIKE search
      return db.prepare(`
        SELECT * FROM research_logs 
        WHERE query LIKE ? OR result LIKE ?
        ORDER BY timestamp DESC LIMIT 25
      `).all(`%${searchTerm}%`, `%${searchTerm}%`);
    }
  }
};

// Chat operations
export const chatOps = {
  add: (chat) => {
    const stmt = db.prepare(`
      INSERT INTO chat_history (user_id, username, message, response)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(chat.userId, chat.username, chat.message, chat.response);
  },

  getRecent: (limit = 50) => {
    return db.prepare(`
      SELECT * FROM chat_history ORDER BY timestamp DESC LIMIT ?
    `).all(limit);
  },

  getByUser: (userId, limit = 20) => {
    return db.prepare(`
      SELECT * FROM chat_history 
      WHERE user_id = ? 
      ORDER BY timestamp DESC LIMIT ?
    `).all(userId, limit);
  }
};

// Scheduled task operations
export const taskOps = {
  add: (task) => {
    const stmt = db.prepare(`
      INSERT INTO scheduled_tasks (name, cron_expression, command, enabled, channel_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(task.name, task.cronExpression, task.command, task.enabled, task.channelId);
  },

  getAll: () => {
    return db.prepare('SELECT * FROM scheduled_tasks ORDER BY name').all();
  },

  getEnabled: () => {
    return db.prepare('SELECT * FROM scheduled_tasks WHERE enabled = 1').all();
  },

  update: (id, updates) => {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    return db.prepare(`UPDATE scheduled_tasks SET ${fields} WHERE id = ?`).run(...values, id);
  },

  updateLastRun: (id) => {
    return db.prepare(`
      UPDATE scheduled_tasks SET last_run = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);
  },

  toggle: (id) => {
    return db.prepare(`
      UPDATE scheduled_tasks SET enabled = NOT enabled WHERE id = ?
    `).run(id);
  },

  delete: (id) => {
    return db.prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id);
  }
};

// Config operations
export const configOps = {
  get: (key) => {
    const result = db.prepare('SELECT value FROM bot_config WHERE key = ?').get(key);
    return result ? result.value : null;
  },

  set: (key, value) => {
    return db.prepare(`
      INSERT INTO bot_config (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, value);
  },

  getAll: () => {
    return db.prepare('SELECT * FROM bot_config').all();
  },

  // Sync environment variable to database (only if database value is empty)
  syncFromEnv: (envKey, dbKey, envValue) => {
    if (envValue && envValue.trim() !== '') {
      const existing = db.prepare('SELECT value FROM bot_config WHERE key = ?').get(dbKey);
      // Only update if database value is empty or doesn't exist
      if (!existing || !existing.value || existing.value.trim() === '') {
        db.prepare(`
          INSERT INTO bot_config (key, value) VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `).run(dbKey, envValue);
        console.log(`✅ Synced ${envKey} to database (${dbKey})`);
        return true;
      }
    }
    return false;
  }
};

export default db;
