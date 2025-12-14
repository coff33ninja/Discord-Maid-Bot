/**
 * Fix Game Plugin Imports
 * 
 * Removes direct imports from src/config/gemini-keys.js
 * Games will use the plugin's requestFromCore() method instead
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GAMES_DIR = path.join(__dirname, '../plugins/games');

async function fixGameFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    
    // Check if file imports gemini-keys
    if (!content.includes("from '../../src/config/gemini-keys.js'")) {
      return { fixed: false, reason: 'No gemini-keys import found' };
    }
    
    // Remove the import line
    content = content.replace(
      /import \{ generateWithRotation \} from '\.\.\/\.\.\/src\/config\/gemini-keys\.js';\n/g,
      ''
    );
    
    // Find all uses of generateWithRotation and add a comment
    const usageCount = (content.match(/generateWithRotation/g) || []).length;
    
    if (usageCount > 0) {
      // Add a note at the top of the file
      const lines = content.split('\n');
      const importEndIndex = lines.findIndex(line => line.trim() === '' && lines.indexOf(line) > 5);
      
      if (importEndIndex > 0) {
        lines.splice(importEndIndex, 0, 
          '',
          '// Note: This game uses generateWithRotation which should be accessed through',
          '// the games plugin\'s requestFromCore(\'gemini-generate\', { prompt }) method.',
          '// TODO: Refactor to use plugin.requestFromCore() instead of direct import'
        );
        content = lines.join('\n');
      }
    }
    
    await fs.writeFile(filePath, content, 'utf8');
    
    return { 
      fixed: true, 
      usageCount,
      message: `Removed import, ${usageCount} usage(s) need refactoring`
    };
    
  } catch (error) {
    return { fixed: false, error: error.message };
  }
}

async function main() {
  console.log('🔧 Fixing game plugin imports...\n');
  
  const files = await fs.readdir(GAMES_DIR);
  const gameFiles = files.filter(f => f.endsWith('.js') && f !== 'plugin.js' && f !== 'game-manager.js');
  
  console.log(`Found ${gameFiles.length} game files\n`);
  
  let fixed = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const file of gameFiles) {
    const filePath = path.join(GAMES_DIR, file);
    const result = await fixGameFile(filePath);
    
    if (result.fixed) {
      console.log(`✅ ${file}: ${result.message}`);
      fixed++;
    } else if (result.error) {
      console.log(`❌ ${file}: ${result.error}`);
      errors++;
    } else {
      console.log(`⏭️  ${file}: ${result.reason}`);
      skipped++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ Fixed: ${fixed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log('\nNote: Game files still use generateWithRotation directly.');
  console.log('They should be refactored to use the games plugin\'s requestFromCore() method.');
}

main();
