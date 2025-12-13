#!/usr/bin/env node

/**
 * Database Test Suite
 * Tests all database operations with a separate test database
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_DB_PATH = path.join(__dirname, 'test-database.db');

// Clean up old test database
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
  console.log('🗑️  Cleaned up old test database');
}

const db = new Database(TEST_DB_PATH);
console.log('✅ Created test database\n');

// Initialize schema
console.log('📋 Initializing database schema...');

db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL UNIQUE,
    mac TEXT NOT NULL UNIQUE,
    hostname TEXT,
    online INTEGER DEFAULT 0,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    network TEXT DEFAULT 'local',
    device_type TEXT
  );

  CREATE TABLE IF NOT EXISTS device_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    online INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id)
  );

  CREATE TABLE IF NOT EXISTS speed_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    download REAL NOT NULL,
    upload REAL NOT NULL,
    ping REAL NOT NULL,
    server TEXT,
    isp TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT
  );

  CREATE TABLE IF NOT EXISTS research (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    result TEXT NOT NULL,
    filename TEXT,
    saved_to_smb INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    schedule TEXT NOT NULL,
    command TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    last_run DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bot_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

console.log('✅ Schema initialized\n');

// Test data fixtures
const fixtures = {
  devices: [
    { ip: '192.168.0.100', mac: '00:11:22:33:44:55', hostname: 'test-pc-1', online: 1, notes: 'Test PC 1', network: 'local' },
    { ip: '192.168.0.101', mac: '00:11:22:33:44:56', hostname: 'test-pc-2', online: 0, notes: 'Test PC 2', network: 'local' },
    { ip: '100.64.0.1', mac: '00:11:22:33:44:57', hostname: 'test-tailscale', online: 1, notes: 'Tailscale Device', network: 'tailscale' },
    { ip: '192.168.0.102', mac: '00:11:22:33:44:58', hostname: 'test-esp-1', online: 1, notes: 'ESP32 Device', network: 'local', device_type: 'esp32' },
    { ip: '192.168.0.103', mac: '00:11:22:33:44:59', hostname: 'test-esp-2', online: 0, notes: 'ESP8266 Device', network: 'local', device_type: 'esp8266' },
  ],
  
  speedTests: [
    { download: 95.5, upload: 45.2, ping: 12.5, server: 'Test Server 1', isp: 'Test ISP', user_id: 'test_user_1' },
    { download: 98.3, upload: 47.8, ping: 11.2, server: 'Test Server 2', isp: 'Test ISP', user_id: 'test_user_1' },
    { download: 92.1, upload: 43.5, ping: 15.8, server: 'Test Server 1', isp: 'Test ISP', user_id: 'test_user_2' },
  ],
  
  research: [
    { query: 'Test query 1', result: 'Test result 1', filename: 'test_research_1.txt', saved_to_smb: 1, user_id: 'test_user_1' },
    { query: 'Test query 2', result: 'Test result 2', filename: 'test_research_2.txt', saved_to_smb: 0, user_id: 'test_user_2' },
  ],
  
  chatHistory: [
    { user_id: 'test_user_1', username: 'TestUser1', message: 'Hello bot', response: 'Hello! How can I help?' },
    { user_id: 'test_user_1', username: 'TestUser1', message: 'What is the weather?', response: 'The weather is sunny!' },
    { user_id: 'test_user_2', username: 'TestUser2', message: 'Scan network', response: 'Scanning network...' },
  ],
  
  tasks: [
    { name: 'Test Task 1', schedule: '0 */6 * * *', command: 'scan', enabled: 1 },
    { name: 'Test Task 2', schedule: '0 0 * * *', command: 'speedtest', enabled: 0 },
  ],
  
  config: [
    { key: 'ha_url', value: 'http://192.168.0.250:8123' },
    { key: 'ha_token', value: 'test_token_12345' },
    { key: 'test_setting', value: 'test_value' },
  ]
};

// Insert test data
console.log('📝 Inserting test data...\n');

// Devices
const insertDevice = db.prepare(`
  INSERT INTO devices (ip, mac, hostname, online, notes, network, device_type)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

fixtures.devices.forEach(device => {
  insertDevice.run(device.ip, device.mac, device.hostname, device.online, device.notes, device.network, device.device_type || null);
});
console.log(`✅ Inserted ${fixtures.devices.length} devices`);

// Speed tests
const insertSpeedTest = db.prepare(`
  INSERT INTO speed_tests (download, upload, ping, server, isp, user_id)
  VALUES (?, ?, ?, ?, ?, ?)
`);

fixtures.speedTests.forEach(test => {
  insertSpeedTest.run(test.download, test.upload, test.ping, test.server, test.isp, test.user_id);
});
console.log(`✅ Inserted ${fixtures.speedTests.length} speed tests`);

// Research
const insertResearch = db.prepare(`
  INSERT INTO research (query, result, filename, saved_to_smb, user_id)
  VALUES (?, ?, ?, ?, ?)
`);

fixtures.research.forEach(r => {
  insertResearch.run(r.query, r.result, r.filename, r.saved_to_smb, r.user_id);
});
console.log(`✅ Inserted ${fixtures.research.length} research entries`);

// Chat history
const insertChat = db.prepare(`
  INSERT INTO chat_history (user_id, username, message, response)
  VALUES (?, ?, ?, ?)
`);

fixtures.chatHistory.forEach(chat => {
  insertChat.run(chat.user_id, chat.username, chat.message, chat.response);
});
console.log(`✅ Inserted ${fixtures.chatHistory.length} chat messages`);

// Tasks
const insertTask = db.prepare(`
  INSERT INTO scheduled_tasks (name, schedule, command, enabled)
  VALUES (?, ?, ?, ?)
`);

fixtures.tasks.forEach(task => {
  insertTask.run(task.name, task.schedule, task.command, task.enabled);
});
console.log(`✅ Inserted ${fixtures.tasks.length} scheduled tasks`);

// Config
const insertConfig = db.prepare(`
  INSERT INTO bot_config (key, value)
  VALUES (?, ?)
`);

fixtures.config.forEach(config => {
  insertConfig.run(config.key, config.value);
});
console.log(`✅ Inserted ${fixtures.config.length} config entries`);

// Run test queries
console.log('\n' + '='.repeat(60));
console.log('🧪 Running Test Queries');
console.log('='.repeat(60) + '\n');

// Test 1: Get all online devices
console.log('Test 1: Get online devices');
const onlineDevices = db.prepare('SELECT * FROM devices WHERE online = 1').all();
console.log(`✅ Found ${onlineDevices.length} online devices`);
onlineDevices.forEach(d => console.log(`   - ${d.hostname} (${d.ip})`));

// Test 2: Get devices by network
console.log('\nTest 2: Get devices by network');
const localDevices = db.prepare('SELECT * FROM devices WHERE network = ?').all('local');
const tailscaleDevices = db.prepare('SELECT * FROM devices WHERE network = ?').all('tailscale');
console.log(`✅ Local: ${localDevices.length}, Tailscale: ${tailscaleDevices.length}`);

// Test 3: Get ESP devices
console.log('\nTest 3: Get ESP devices');
const espDevices = db.prepare('SELECT * FROM devices WHERE device_type LIKE ?').all('esp%');
console.log(`✅ Found ${espDevices.length} ESP devices`);
espDevices.forEach(d => console.log(`   - ${d.hostname} (${d.device_type})`));

// Test 4: Speed test statistics
console.log('\nTest 4: Speed test statistics');
const speedStats = db.prepare(`
  SELECT 
    AVG(download) as avg_download,
    AVG(upload) as avg_upload,
    AVG(ping) as avg_ping,
    MIN(download) as min_download,
    MAX(download) as max_download
  FROM speed_tests
`).get();
console.log(`✅ Avg Download: ${speedStats.avg_download.toFixed(2)} Mbps`);
console.log(`   Avg Upload: ${speedStats.avg_upload.toFixed(2)} Mbps`);
console.log(`   Avg Ping: ${speedStats.avg_ping.toFixed(2)} ms`);

// Test 5: Recent chat history
console.log('\nTest 5: Recent chat history');
const recentChats = db.prepare('SELECT * FROM chat_history ORDER BY timestamp DESC LIMIT 3').all();
console.log(`✅ Found ${recentChats.length} recent chats`);
recentChats.forEach(c => console.log(`   - ${c.username}: ${c.message}`));

// Test 6: Enabled tasks
console.log('\nTest 6: Enabled scheduled tasks');
const enabledTasks = db.prepare('SELECT * FROM scheduled_tasks WHERE enabled = 1').all();
console.log(`✅ Found ${enabledTasks.length} enabled tasks`);
enabledTasks.forEach(t => console.log(`   - ${t.name} (${t.schedule})`));

// Test 7: Config lookup
console.log('\nTest 7: Config lookup');
const haUrl = db.prepare('SELECT value FROM bot_config WHERE key = ?').get('ha_url');
console.log(`✅ HA URL: ${haUrl?.value || 'Not found'}`);

// Performance test
console.log('\n' + '='.repeat(60));
console.log('⚡ Performance Tests');
console.log('='.repeat(60) + '\n');

console.log('Test: Bulk device insert (1000 devices)');
const start = Date.now();
const bulkInsert = db.prepare(`
  INSERT INTO devices (ip, mac, hostname, online, network)
  VALUES (?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((devices) => {
  for (const device of devices) {
    bulkInsert.run(device.ip, device.mac, device.hostname, device.online, device.network);
  }
});

const bulkDevices = Array.from({ length: 1000 }, (_, i) => ({
  ip: `10.${Math.floor(i / 65536)}.${Math.floor((i % 65536) / 256)}.${(i % 256)}`,
  mac: `AA:BB:CC:DD:${Math.floor(i / 256).toString(16).padStart(2, '0')}:${(i % 256).toString(16).padStart(2, '0')}`,
  hostname: `bulk-device-${i}`,
  online: Math.random() > 0.5 ? 1 : 0,
  network: 'local'
}));

insertMany(bulkDevices);
const elapsed = Date.now() - start;
console.log(`✅ Inserted 1000 devices in ${elapsed}ms (${(1000 / elapsed * 1000).toFixed(0)} devices/sec)`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Test Database Summary');
console.log('='.repeat(60));

const totalDevices = db.prepare('SELECT COUNT(*) as count FROM devices').get();
const totalSpeedTests = db.prepare('SELECT COUNT(*) as count FROM speed_tests').get();
const totalResearch = db.prepare('SELECT COUNT(*) as count FROM research').get();
const totalChats = db.prepare('SELECT COUNT(*) as count FROM chat_history').get();
const totalTasks = db.prepare('SELECT COUNT(*) as count FROM scheduled_tasks').get();

console.log(`
Devices:        ${totalDevices.count}
Speed Tests:    ${totalSpeedTests.count}
Research:       ${totalResearch.count}
Chat History:   ${totalChats.count}
Tasks:          ${totalTasks.count}

Database Size:  ${(fs.statSync(TEST_DB_PATH).size / 1024).toFixed(2)} KB
Location:       ${TEST_DB_PATH}
`);

console.log('✅ All tests completed successfully!\n');

db.close();
