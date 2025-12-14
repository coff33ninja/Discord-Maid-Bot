/**
 * Documentation Reorganization Script
 * 
 * Properly organizes ALL documentation into the correct structure:
 * - User docs → docs/user/
 * - Developer docs → docs/developer/
 * - Plugin docs → docs/plugins/
 * - Future/planning docs → docs/planning/
 * - Archive old docs → docs/archive/
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Documentation organization map
const DOC_MAP = {
  // User Documentation
  'docs/user/': [
    { from: 'docs/COMMANDS.md', to: 'commands.md' },
    { from: 'docs/CONFIGURATION.md', to: 'configuration.md' },
    { from: 'docs/TROUBLESHOOTING.md', to: 'troubleshooting.md' },
    { from: 'docs/CROSS_PLATFORM.md', to: 'cross-platform.md' },
    { from: 'docs/SMB_SETUP.md', to: 'smb-setup.md' },
  ],
  
  // Developer Documentation
  'docs/developer/': [
    { from: 'docs/ARCHITECTURE.md', to: 'architecture.md' },
    { from: 'docs/API.md', to: 'api-reference.md' },
    { from: 'docs/PLUGIN_DEPENDENCIES.md', to: 'plugin-dependencies.md' },
    { from: 'docs/DEPENDENCIES.md', to: 'dependencies.md' },
    { from: 'docs/guides/CONTRIBUTING.md', to: 'contributing.md' },
    { from: 'docs/guides/TESTING_GUIDE.md', to: 'testing.md' },
  ],
  
  // Plugin Documentation
  'docs/plugins/': [
    { from: 'docs/PLUGINS.md', to: 'README.md' },
    { from: 'docs/GAMES.md', to: 'game-plugins.md' },
    { from: 'docs/NETWORK_SCANNING.md', to: 'network-plugins.md' },
    { from: 'docs/CONVERSATIONAL_AI_ARCHITECTURE.md', to: 'ai-plugins.md' },
  ],
  
  // Planning/Future Documentation
  'docs/planning/': [
    { from: 'docs/FUTURE_PLANS.md', to: 'future-plans.md' },
    { from: 'docs/AI_SYSADMIN_DESIGN.md', to: 'ai-sysadmin-design.md' },
    { from: 'docs/NETWORK_OPTIMIZATION.md', to: 'network-optimization.md' },
    { from: 'NEXT_STEPS.md', to: 'next-steps.md' },
    { from: 'TODO.md', to: 'todo.md' },
  ],
};

async function ensureDirectory(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

async function moveFile(from, to) {
  try {
    const fromPath = path.join(__dirname, from);
    const toPath = path.join(__dirname, to);
    
    // Check if source exists
    try {
      await fs.access(fromPath);
    } catch {
      console.log(`   ⚠️  Skipped ${from} (not found)`);
      return false;
    }
    
    // Ensure target directory exists
    await ensureDirectory(path.dirname(toPath));
    
    // Move file
    await fs.rename(fromPath, toPath);
    console.log(`   ✅ Moved ${from} → ${to}`);
    return true;
  } catch (error) {
    console.log(`   ❌ Error moving ${from}: ${error.message}`);
    return false;
  }
}

async function cleanupEmptyDirs() {
  console.log('\n🧹 Cleaning up empty directories...');
  
  const dirsToCheck = [
    'docs/guides',
  ];
  
  for (const dir of dirsToCheck) {
    try {
      const dirPath = path.join(__dirname, dir);
      const entries = await fs.readdir(dirPath);
      
      if (entries.length === 0) {
        await fs.rmdir(dirPath);
        console.log(`   ✅ Removed empty directory: ${dir}`);
      }
    } catch (error) {
      // Directory doesn't exist or not empty
    }
  }
}

async function createUserDocs() {
  console.log('\n📝 Creating user documentation...');
  
  // Create getting-started.md
  const gettingStarted = `# Getting Started

**Version:** 1.0.0.0-beta

Welcome to Discord Maid Bot! This guide will help you get started.

## Quick Start

### Prerequisites
- Node.js v20 or higher
- Discord Bot Token
- Google Gemini API Key (optional)

### Installation

1. Clone the repository:
\`\`\`bash
git clone https://github.com/coff33ninja/Discord-Maid-Bot.git
cd Discord-Maid-Bot
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Configure environment:
\`\`\`bash
cp .env.example .env
# Edit .env with your tokens
\`\`\`

4. Start the bot:
\`\`\`bash
npm start
\`\`\`

## Next Steps

- [Commands Reference](commands.md) - Learn available commands
- [Configuration Guide](configuration.md) - Customize the bot
- [Troubleshooting](troubleshooting.md) - Fix common issues

## Support

Need help? Check the [troubleshooting guide](troubleshooting.md) or open an issue on GitHub.
`;
  
  await fs.writeFile(
    path.join(__dirname, 'docs/user/getting-started.md'),
    gettingStarted
  );
  console.log('   ✅ Created getting-started.md');
}

async function createPluginCatalog() {
  console.log('\n📦 Creating plugin catalog...');
  
  const corePlugins = `# Core Plugins

**Version:** 1.0.0.0-beta

Essential plugins that provide core bot functionality.

## Plugin List

### automation
**Category:** Core  
**Author:** Discord Maid Bot Team  
**Description:** Scheduler, triggers, and automation system

[Documentation](../../plugins/automation/docs/)

### conversational-ai
**Category:** AI  
**Author:** Discord Maid Bot Team  
**Description:** AI-powered chat with personality support

[Documentation](../../plugins/conversational-ai/docs/)

### core-commands
**Category:** Core  
**Author:** Discord Maid Bot Team  
**Description:** Essential bot commands and utilities

[Documentation](../../plugins/core-commands/docs/)

### network-management
**Category:** Network  
**Author:** Discord Maid Bot Team  
**Description:** Network scanning, device management, and WOL

[Documentation](../../plugins/network-management/docs/)

### personality
**Category:** AI  
**Author:** Discord Maid Bot Team  
**Description:** AI personality system with 10+ personalities

[Documentation](../../plugins/personality/docs/)

## See Also

- [Integration Plugins](integration-plugins.md)
- [Game Plugins](game-plugins.md)
- [All Plugins](README.md)
`;

  const integrationPlugins = `# Integration Plugins

**Version:** 1.0.0.0-beta

Plugins that integrate with third-party services.

## Plugin List

### integrations/homeassistant
**Category:** Integration  
**Author:** Discord Maid Bot Team  
**Description:** Control Home Assistant devices from Discord

[Documentation](../../plugins/integrations/homeassistant/docs/)

### integrations/speedtest
**Category:** Integration  
**Author:** Discord Maid Bot Team  
**Description:** Internet speed testing and monitoring

[Documentation](../../plugins/integrations/speedtest/docs/)

### integrations/weather
**Category:** Integration  
**Author:** Discord Maid Bot Team  
**Description:** Weather information and forecasts

[Documentation](../../plugins/integrations/weather/docs/)

## See Also

- [Core Plugins](core-plugins.md)
- [Game Plugins](game-plugins.md)
- [All Plugins](README.md)
`;

  await fs.writeFile(
    path.join(__dirname, 'docs/plugins/core-plugins.md'),
    corePlugins
  );
  console.log('   ✅ Created core-plugins.md');
  
  await fs.writeFile(
    path.join(__dirname, 'docs/plugins/integration-plugins.md'),
    integrationPlugins
  );
  console.log('   ✅ Created integration-plugins.md');
}

async function main() {
  console.log('🚀 Starting documentation reorganization\n');
  console.log('='.repeat(60));
  
  try {
    // Ensure all directories exist
    console.log('\n📁 Creating directory structure...');
    await ensureDirectory(path.join(__dirname, 'docs/user'));
    await ensureDirectory(path.join(__dirname, 'docs/developer'));
    await ensureDirectory(path.join(__dirname, 'docs/plugins'));
    await ensureDirectory(path.join(__dirname, 'docs/planning'));
    console.log('   ✅ Directories created');
    
    // Move files according to map
    let totalMoved = 0;
    for (const [targetDir, files] of Object.entries(DOC_MAP)) {
      console.log(`\n📂 Moving files to ${targetDir}...`);
      for (const { from, to } of files) {
        const moved = await moveFile(from, path.join(targetDir, to));
        if (moved) totalMoved++;
      }
    }
    
    // Create new documentation files
    await createUserDocs();
    await createPluginCatalog();
    
    // Cleanup
    await cleanupEmptyDirs();
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Documentation reorganization complete!`);
    console.log(`   📊 Moved ${totalMoved} files`);
    console.log(`   📝 Created new documentation files`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Review changes: git status`);
    console.log(`   2. Check documentation: open docs/README.md`);
    console.log(`   3. Commit changes: git add . && git commit -m "docs: reorganize documentation structure"`);
    
  } catch (error) {
    console.error('\n❌ Error during reorganization:', error);
    process.exit(1);
  }
}

main();
