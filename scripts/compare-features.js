/**
 * Feature Comparison Script
 * 
 * Compares current implementation with backup to ensure all features are preserved
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Feature Comparison: Current vs Backup\n');
console.log('='.repeat(70));

// Read backup index.js to extract all command handlers
const backupIndexPath = path.join(__dirname, '..', '.backup', 'index.js');
const backupIndex = fs.readFileSync(backupIndexPath, 'utf8');

// Extract all command names from backup
const commandPattern = /(?:commandName === |routedCommandName === )['"]([^'"]+)['"]/g;
const backupCommands = new Set();
let match;
while ((match = commandPattern.exec(backupIndex)) !== null) {
  backupCommands.add(match[1]);
}

console.log(`\n📋 Commands found in backup: ${backupCommands.size}`);
console.log('Commands:', Array.from(backupCommands).sort().join(', '));

// Check current slash commands
const slashCommandsPath = path.join(__dirname, '..', 'src', 'commands', 'slash-commands.js');
const slashCommands = fs.readFileSync(slashCommandsPath, 'utf8');

// Extract command names from slash commands
const slashCommandPattern = /\.setName\(['"]([^'"]+)['"]\)/g;
const currentCommands = new Set();
while ((match = slashCommandPattern.exec(slashCommands)) !== null) {
  currentCommands.add(match[1]);
}

console.log(`\n📋 Commands in current slash-commands.js: ${currentCommands.size}`);
console.log('Commands:', Array.from(currentCommands).sort().join(', '));

// Find missing commands
const missingCommands = Array.from(backupCommands).filter(cmd => !currentCommands.has(cmd));
const newCommands = Array.from(currentCommands).filter(cmd => !backupCommands.has(cmd));

console.log('\n' + '='.repeat(70));
console.log('\n📊 Comparison Results:\n');

if (missingCommands.length > 0) {
  console.log(`❌ Commands in backup but NOT in current (${missingCommands.length}):`);
  missingCommands.forEach(cmd => console.log(`   - ${cmd}`));
} else {
  console.log('✅ All backup commands are present in current implementation');
}

if (newCommands.length > 0) {
  console.log(`\n✨ New commands added (${newCommands.length}):`);
  newCommands.forEach(cmd => console.log(`   + ${cmd}`));
}

// Check for key functionality patterns
console.log('\n' + '='.repeat(70));
console.log('\n🔍 Checking Key Functionality:\n');

const functionalityChecks = [
  { name: 'Network Scanning', pattern: /scanNetwork/g, file: 'backup' },
  { name: 'Wake-on-LAN', pattern: /wakeDevice|wol/gi, file: 'backup' },
  { name: 'Speed Test', pattern: /speedtest|runSpeedtest/gi, file: 'backup' },
  { name: 'AI Chat', pattern: /chatWithMaid|gemini/gi, file: 'backup' },
  { name: 'Research', pattern: /webResearch/g, file: 'backup' },
  { name: 'Home Assistant', pattern: /homeassistant|callHomeAssistantService/gi, file: 'backup' },
  { name: 'Weather', pattern: /weather|getWeather/gi, file: 'backup' },
  { name: 'Games', pattern: /trivia|hangman|rps/gi, file: 'backup' },
  { name: 'Device Management', pattern: /deviceOps|device management/gi, file: 'backup' },
  { name: 'Personality System', pattern: /personality|PERSONALITIES/gi, file: 'backup' },
  { name: 'Permissions', pattern: /checkUserPermission|PERMISSIONS/g, file: 'backup' },
  { name: 'Dashboard', pattern: /dashboard|broadcastUpdate/gi, file: 'backup' },
  { name: 'Scheduler', pattern: /scheduler|schedule/gi, file: 'backup' },
  { name: 'Plugin System', pattern: /plugin-system|Plugin class/gi, file: 'current' }
];

for (const check of functionalityChecks) {
  const matches = backupIndex.match(check.pattern);
  const count = matches ? matches.length : 0;
  const status = count > 0 ? '✅' : '❌';
  console.log(`${status} ${check.name}: ${count} references`);
}

// Check plugin files exist
console.log('\n' + '='.repeat(70));
console.log('\n📦 Plugin Files Check:\n');

const expectedPlugins = [
  'conversational-ai',
  'personality',
  'network-management',
  'core-commands',
  'automation',
  'games',
  'research',
  'integrations',
  'power-management'
];

for (const plugin of expectedPlugins) {
  const pluginPath = path.join(__dirname, '..', 'plugins', plugin);
  const pluginFile = path.join(pluginPath, 'plugin.js');
  const commandsFile = path.join(pluginPath, 'commands.js');
  
  const hasPlugin = fs.existsSync(pluginFile);
  const hasCommands = fs.existsSync(commandsFile);
  
  const status = hasPlugin ? '✅' : '❌';
  const commandsStatus = hasCommands ? '(+commands)' : '';
  
  console.log(`${status} ${plugin} ${commandsStatus}`);
}

console.log('\n' + '='.repeat(70));
console.log('\n✅ Feature comparison complete!\n');
