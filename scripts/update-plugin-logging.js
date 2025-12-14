/**
 * Update Plugin Logging Script
 * 
 * Updates all plugins to use the proper logging system instead of console.log
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pluginsDir = path.join(__dirname, '..', 'plugins');

// Plugins to update
const pluginsToUpdate = [
  'speed-alerts',
  'smart-reminders',
  'research',
  'power-management',
  'personality',
  'network-management',
  'conversational-ai',
  'core-commands',
  'automation',
  'games',
  'device-health',
  'device-triggers',
  'network-insights',
  'device-bulk-ops'
];

console.log('🔧 Updating plugin logging system\n');
console.log('='.repeat(60));

let totalUpdated = 0;

for (const pluginName of pluginsToUpdate) {
  const pluginFile = path.join(pluginsDir, pluginName, 'plugin.js');
  
  if (!fs.existsSync(pluginFile)) {
    console.log(`⏭️  Skipping ${pluginName} (no plugin.js)`);
    continue;
  }
  
  let content = fs.readFileSync(pluginFile, 'utf8');
  let updated = false;
  
  // Check if already has logger import
  if (!content.includes('createLogger')) {
    // Add logger import after Plugin import
    content = content.replace(
      /(import { Plugin } from ['"]\.\.\/\.\.\/src\/core\/plugin-system\.js['"];)/,
      `$1\nimport { createLogger } from '../../src/logging/logger.js';`
    );
    updated = true;
  }
  
  // Check if logger is initialized in constructor
  if (!content.includes('this.logger')) {
    // Add logger initialization in constructor
    content = content.replace(
      /(constructor\(\) {[\s\S]*?super\([^)]+\);)/,
      `$1\n    this.logger = createLogger('${pluginName}');`
    );
    updated = true;
  }
  
  // Replace console.log with this.logger.info
  if (content.includes('console.log')) {
    content = content.replace(/console\.log\(/g, 'this.logger.info(');
    updated = true;
  }
  
  // Replace console.error with this.logger.error
  if (content.includes('console.error')) {
    content = content.replace(/console\.error\(/g, 'this.logger.error(');
    updated = true;
  }
  
  // Replace console.warn with this.logger.warn
  if (content.includes('console.warn')) {
    content = content.replace(/console\.warn\(/g, 'this.logger.warn(');
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(pluginFile, content);
    console.log(`✅ Updated ${pluginName}`);
    totalUpdated++;
  } else {
    console.log(`✓  ${pluginName} already using logger`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`\n✅ Updated ${totalUpdated} plugin(s) to use logging system`);
console.log('\nAll plugins now use:');
console.log('  - this.logger.info() for info messages');
console.log('  - this.logger.error() for errors');
console.log('  - this.logger.warn() for warnings');
console.log('  - this.logger.debug() for debug messages');
