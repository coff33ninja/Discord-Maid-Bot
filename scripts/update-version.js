/**
 * Update Version Script
 * 
 * Updates version to 1.0.0.0-beta across all files:
 * - package.json
 * - All plugin files
 * - Documentation files
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NEW_VERSION = '1.0.0.0-beta';

async function updatePackageJson() {
  console.log('📦 Updating package.json...');
  const packagePath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
  packageJson.version = NEW_VERSION;
  await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`   ✅ Updated to ${NEW_VERSION}`);
}

async function updatePluginVersions() {
  console.log('\n🔌 Updating plugin versions...');
  const pluginsDir = path.join(__dirname, 'plugins');
  const entries = await fs.readdir(pluginsDir, { withFileTypes: true });
  
  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const pluginPath = path.join(pluginsDir, entry.name, 'plugin.js');
    try {
      let content = await fs.readFile(pluginPath, 'utf8');
      
      // Update version in super() call
      content = content.replace(
        /super\([^,]+,\s*['"][^'"]+['"]/,
        (match) => match.replace(/['"][^'"]+['"]/, `'${NEW_VERSION}'`)
      );
      
      // Update @version JSDoc
      content = content.replace(
        /@version\s+[^\n]+/,
        `@version ${NEW_VERSION}`
      );
      
      await fs.writeFile(pluginPath, content);
      console.log(`   ✅ Updated ${entry.name}`);
      count++;
    } catch (error) {
      // Plugin file doesn't exist or error reading
    }
  }
  console.log(`   📊 Updated ${count} plugins`);
}

async function updateDocVersions() {
  console.log('\n📚 Updating documentation versions...');
  
  const docsToUpdate = [
    'README.md',
    'DOCUMENTATION.md',
    'docs/README.md',
    'docs/developer/plugin-development.md'
  ];
  
  for (const docPath of docsToUpdate) {
    try {
      const fullPath = path.join(__dirname, docPath);
      let content = await fs.readFile(fullPath, 'utf8');
      
      // Update version references
      content = content.replace(
        /\*\*Version:\*\*\s+[^\n]+/g,
        `**Version:** ${NEW_VERSION}`
      );
      content = content.replace(
        /Version:\s+[^\n]+/g,
        `Version: ${NEW_VERSION}`
      );
      
      await fs.writeFile(fullPath, content);
      console.log(`   ✅ Updated ${docPath}`);
    } catch (error) {
      console.log(`   ⚠️  Skipped ${docPath} (not found)`);
    }
  }
}

async function main() {
  console.log(`🚀 Updating project to version ${NEW_VERSION}\n`);
  console.log('=' .repeat(50));
  
  try {
    await updatePackageJson();
    await updatePluginVersions();
    await updateDocVersions();
    
    console.log('\n' + '='.repeat(50));
    console.log(`\n✅ Version update complete!`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Review changes: git diff`);
    console.log(`   2. Test the bot: node index.js`);
    console.log(`   3. Commit changes: git add . && git commit -m "chore: update to v${NEW_VERSION}"`);
    console.log(`   4. Push to GitHub: git push`);
    
  } catch (error) {
    console.error('\n❌ Error updating version:', error);
    process.exit(1);
  }
}

main();
