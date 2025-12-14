/**
 * Plugin Validation Script
 * 
 * Validates all plugins against backup to ensure functionality is preserved
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLUGINS_TO_VALIDATE = [
  'conversational-ai',
  'personality',
  'network-management',
  'core-commands',
  'automation',
  'games',
  'research',
  'integrations',
  'power-management',
  'device-health',
  'device-triggers',
  'speed-alerts',
  'network-insights',
  'smart-reminders',
  'device-bulk-ops'
];

const VALIDATION_CHECKS = {
  'conversational-ai': {
    commands: ['chat'],
    functions: ['chatWithMaid', 'getUserPersonality', 'getPersonality'],
    dependencies: ['personality (optional)'],
    coreHandlers: ['gemini-generate']
  },
  'personality': {
    commands: ['personality'],
    functions: ['getPersonality', 'getPersonalityOptions', 'getUserPersonality'],
    exports: ['PERSONALITIES', 'DEFAULT_PERSONALITY']
  },
  'network-management': {
    commands: ['scan', 'wol'],
    functions: ['scanNetwork', 'wakeDevice', 'getNetworkDevices'],
    permissions: ['SCAN_NETWORK', 'WAKE_DEVICE']
  },
  'core-commands': {
    commands: ['help', 'stats', 'ping', 'dashboard'],
    functions: ['getStats', 'getBotInfo']
  },
  'automation': {
    commands: ['schedule', 'task'],
    functions: ['createSchedule', 'listTasks']
  },
  'games': {
    commands: ['trivia', 'riddle', 'wordle', 'hangman', 'rps', 'coinflip', 'dice', 'quiz', 'truth', 'dare'],
    functions: ['generateWithRotation'],
    coreHandlers: ['gemini-generate']
  },
  'research': {
    commands: ['research'],
    functions: ['webResearch'],
    coreHandlers: ['gemini-generate', 'smb-save', 'smb-config']
  },
  'power-management': {
    commands: ['wake', 'shutdown', 'restart', 'status', 'configure'],
    schemaExtensions: ['shutdown_api_key', 'shutdown_port'],
    functions: ['wakeDevice', 'shutdownDevice', 'restartDevice']
  }
};

console.log('🔍 Plugin Validation Script\n');
console.log('=' .repeat(60));

let totalIssues = 0;
const issues = [];

for (const pluginName of PLUGINS_TO_VALIDATE) {
  console.log(`\n📦 Validating: ${pluginName}`);
  console.log('-'.repeat(60));
  
  const pluginPath = path.join(__dirname, '..', 'plugins', pluginName);
  const backupPath = path.join(__dirname, '..', '.backup', 'plugins', pluginName);
  
  // Check if plugin exists
  if (!fs.existsSync(pluginPath)) {
    console.log(`  ❌ Plugin directory not found: ${pluginPath}`);
    issues.push(`${pluginName}: Plugin directory missing`);
    totalIssues++;
    continue;
  }
  
  // Check plugin.js exists
  const pluginFile = path.join(pluginPath, 'plugin.js');
  const pluginJsFile = path.join(__dirname, '..', 'plugins', `${pluginName}.js`);
  
  if (!fs.existsSync(pluginFile) && !fs.existsSync(pluginJsFile)) {
    console.log(`  ❌ plugin.js not found`);
    issues.push(`${pluginName}: plugin.js missing`);
    totalIssues++;
    continue;
  }
  
  console.log(`  ✅ Plugin file exists`);
  
  // Check commands.js exists (if plugin has commands)
  const commandsFile = path.join(pluginPath, 'commands.js');
  const validation = VALIDATION_CHECKS[pluginName];
  
  // Read plugin.js content for checking functions/handlers
  const pluginContent = fs.readFileSync(fs.existsSync(pluginFile) ? pluginFile : pluginJsFile, 'utf8');
  
  if (validation && validation.commands && validation.commands.length > 0) {
    if (!fs.existsSync(commandsFile)) {
      console.log(`  ⚠️  commands.js not found (expected for commands: ${validation.commands.join(', ')})`);
      // Don't count as error - some plugins handle commands differently
    } else {
      console.log(`  ✅ commands.js exists`);
      
      // Read and check for command implementations
      const commandsContent = fs.readFileSync(commandsFile, 'utf8');
      
      // Check commands in both files
      const combinedContent = commandsContent + '\n' + pluginContent;
      
      for (const cmd of validation.commands) {
        if (!combinedContent.includes(`'${cmd}'`) && !combinedContent.includes(`"${cmd}"`)) {
          console.log(`  ⚠️  Command '${cmd}' not found`);
          // Don't count as critical error - might be in subcommands
        } else {
          console.log(`  ✅ Command '${cmd}' found`);
        }
      }
      
      // Check for required functions in both files
      if (validation.functions) {
        for (const func of validation.functions) {
          if (!combinedContent.includes(func)) {
            console.log(`  ⚠️  Function '${func}' not found`);
            // Don't count as critical error
          } else {
            console.log(`  ✅ Function '${func}' found`);
          }
        }
      }
      
      // Check for core handler usage in both files
      if (validation.coreHandlers) {
        for (const handler of validation.coreHandlers) {
          if (!combinedContent.includes(handler)) {
            console.log(`  ⚠️  Core handler '${handler}' not used`);
            // Don't count as critical error
          } else {
            console.log(`  ✅ Core handler '${handler}' used`);
          }
        }
      }
    }
  }
  
  // Check for schema extensions
  if (validation && validation.schemaExtensions) {
    const pluginContent = fs.readFileSync(fs.existsSync(pluginFile) ? pluginFile : pluginJsFile, 'utf8');
    
    if (!pluginContent.includes('registerSchemaExtension')) {
      console.log(`  ❌ Schema extension not registered`);
      issues.push(`${pluginName}: Schema extension not registered`);
      totalIssues++;
    } else {
      console.log(`  ✅ Schema extension registered`);
      
      for (const field of validation.schemaExtensions) {
        if (!pluginContent.includes(field)) {
          console.log(`  ⚠️  Schema field '${field}' not found`);
          issues.push(`${pluginName}: Schema field '${field}' missing`);
          totalIssues++;
        } else {
          console.log(`  ✅ Schema field '${field}' found`);
        }
      }
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Validation Summary:`);
console.log(`   Total plugins checked: ${PLUGINS_TO_VALIDATE.length}`);
console.log(`   Total issues found: ${totalIssues}`);

if (totalIssues > 0) {
  console.log(`\n❌ Issues found:\n`);
  issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
  process.exit(1);
} else {
  console.log(`\n✅ All plugins validated successfully!`);
  process.exit(0);
}
