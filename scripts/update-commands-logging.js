/**
 * Update Commands Logging Script
 * 
 * Updates command files to use proper error logging
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pluginsDir = path.join(__dirname, '..', 'plugins');

// Find all commands.js files
function findCommandsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...findCommandsFiles(fullPath));
    } else if (item.name === 'commands.js') {
      files.push(fullPath);
    }
  }
  
  return files;
}

console.log('🔧 Updating commands logging system\n');
console.log('='.repeat(60));

const commandsFiles = findCommandsFiles(pluginsDir);
let totalUpdated = 0;

for (const file of commandsFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let updated = false;
  
  // Check if already has logger import
  if (!content.includes('createLogger') && content.includes('console.')) {
    // Add logger import at the top
    const firstImport = content.indexOf('import');
    if (firstImport !== -1) {
      const endOfFirstImport = content.indexOf(';', firstImport);
      content = content.slice(0, endOfFirstImport + 1) + 
                `\nimport { createLogger } from '../../src/logging/logger.js';` +
                content.slice(endOfFirstImport + 1);
      
      // Add logger instance
      const lastImport = content.lastIndexOf('import');
      const endOfLastImport = content.indexOf(';', lastImport);
      content = content.slice(0, endOfLastImport + 1) +
                `\n\nconst logger = createLogger('${path.basename(path.dirname(file))}');` +
                content.slice(endOfLastImport + 1);
      
      updated = true;
    }
  }
  
  // Replace console.error with logger.error
  if (content.includes('console.error')) {
    content = content.replace(/console\.error\(/g, 'logger.error(');
    updated = true;
  }
  
  // Replace console.warn with logger.warn
  if (content.includes('console.warn')) {
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    updated = true;
  }
  
  // Replace console.log with logger.info (only in error handlers)
  const errorBlocks = content.match(/catch\s*\([^)]*\)\s*{[^}]*console\.log[^}]*}/g);
  if (errorBlocks) {
    content = content.replace(/catch\s*\([^)]*\)\s*{([^}]*)console\.log\(/g, 
                              'catch ($1) {$1logger.info(');
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(file, content);
    const relativePath = path.relative(pluginsDir, file);
    console.log(`✅ Updated ${relativePath}`);
    totalUpdated++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`\n✅ Updated ${totalUpdated} commands file(s) to use logging system`);
