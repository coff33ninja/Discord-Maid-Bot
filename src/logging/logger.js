import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, '../../database.db'));

// Log levels
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Initialize logs table
db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    level TEXT NOT NULL,
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT,
    source TEXT,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
  CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category);
`);

// Core logger class
class Logger {
  constructor(category = 'general') {
    this.category = category;
  }
  
  // Log a message
  log(level, message, metadata = null, source = null, userId = null) {
    try {
      const stmt = db.prepare(`
        INSERT INTO logs (timestamp, level, category, message, metadata, source, userId)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        Date.now(),
        level,
        this.category,
        message,
        metadata ? JSON.stringify(metadata) : null,
        source,
        userId
      );
      
      // Also log to console with color coding
      const colors = {
        debug: '\x1b[36m',    // Cyan
        info: '\x1b[32m',     // Green
        warn: '\x1b[33m',     // Yellow
        error: '\x1b[31m',    // Red
        critical: '\x1b[35m'  // Magenta
      };
      
      const reset = '\x1b[0m';
      const color = colors[level] || '';
      const timestamp = new Date().toISOString();
      
      console.log(`${color}[${timestamp}] [${level.toUpperCase()}] [${this.category}]${reset} ${message}`);
      
      if (metadata) {
        console.log(`${color}  Metadata:${reset}`, metadata);
      }
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }
  
  // Convenience methods
  debug(message, metadata = null, source = null, userId = null) {
    this.log(LOG_LEVELS.DEBUG, message, metadata, source, userId);
  }
  
  info(message, metadata = null, source = null, userId = null) {
    this.log(LOG_LEVELS.INFO, message, metadata, source, userId);
  }
  
  warn(message, metadata = null, source = null, userId = null) {
    this.log(LOG_LEVELS.WARN, message, metadata, source, userId);
  }
  
  error(message, metadata = null, source = null, userId = null) {
    this.log(LOG_LEVELS.ERROR, message, metadata, source, userId);
  }
  
  critical(message, metadata = null, source = null, userId = null) {
    this.log(LOG_LEVELS.CRITICAL, message, metadata, source, userId);
  }
}

// Log operations
export const logOps = {
  // Get recent logs
  getRecent(limit = 100, level = null, category = null) {
    let query = 'SELECT * FROM logs WHERE 1=1';
    const params = [];
    
    if (level) {
      query += ' AND level = ?';
      params.push(level);
    }
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    
    const stmt = db.prepare(query);
    const logs = stmt.all(...params);
    
    return logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    }));
  },
  
  // Get logs by time range
  getByTimeRange(startTime, endTime, level = null, category = null) {
    let query = 'SELECT * FROM logs WHERE timestamp >= ? AND timestamp <= ?';
    const params = [startTime, endTime];
    
    if (level) {
      query += ' AND level = ?';
      params.push(level);
    }
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    const stmt = db.prepare(query);
    const logs = stmt.all(...params);
    
    return logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    }));
  },
  
  // Get logs by user
  getByUser(userId, limit = 50) {
    const stmt = db.prepare(`
      SELECT * FROM logs 
      WHERE userId = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    
    const logs = stmt.all(userId, limit);
    
    return logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    }));
  },
  
  // Search logs
  search(query, limit = 100) {
    const stmt = db.prepare(`
      SELECT * FROM logs 
      WHERE message LIKE ? OR category LIKE ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    
    const searchPattern = `%${query}%`;
    const logs = stmt.all(searchPattern, searchPattern, limit);
    
    return logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    }));
  },
  
  // Get log statistics
  getStats() {
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM logs');
    const total = totalStmt.get().count;
    
    const byLevelStmt = db.prepare(`
      SELECT level, COUNT(*) as count 
      FROM logs 
      GROUP BY level
    `);
    const byLevel = byLevelStmt.all();
    
    const byCategoryStmt = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM logs 
      GROUP BY category 
      ORDER BY count DESC 
      LIMIT 10
    `);
    const byCategory = byCategoryStmt.all();
    
    const recentErrorsStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM logs 
      WHERE level IN ('error', 'critical') 
      AND timestamp > ?
    `);
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentErrors = recentErrorsStmt.get(oneDayAgo).count;
    
    return {
      total,
      byLevel: byLevel.reduce((acc, item) => {
        acc[item.level] = item.count;
        return acc;
      }, {}),
      topCategories: byCategory,
      recentErrors
    };
  },
  
  // Clean old logs (older than 3 days)
  cleanOldLogs() {
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
    const stmt = db.prepare('DELETE FROM logs WHERE timestamp < ?');
    const result = stmt.run(threeDaysAgo);
    
    return result.changes;
  },
  
  // Get all categories
  getCategories() {
    const stmt = db.prepare(`
      SELECT DISTINCT category 
      FROM logs 
      ORDER BY category
    `);
    
    return stmt.all().map(row => row.category);
  }
};

// Create logger instance
export function createLogger(category) {
  return new Logger(category);
}

// Default logger
export const logger = new Logger('general');

// Auto-cleanup old logs every hour
setInterval(() => {
  const deleted = logOps.cleanOldLogs();
  if (deleted > 0) {
    logger.info(`Cleaned ${deleted} old log entries (>3 days)`);
  }
}, 60 * 60 * 1000); // Every hour

// Initial cleanup on startup
setTimeout(() => {
  const deleted = logOps.cleanOldLogs();
  if (deleted > 0) {
    logger.info(`Initial cleanup: removed ${deleted} old log entries`);
  }
}, 5000); // 5 seconds after startup

export default logger;
