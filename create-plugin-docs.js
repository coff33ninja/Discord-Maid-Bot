/**
 * Create Plugin Documentation Script
 * 
 * Creates comprehensive documentation for all plugins:
 * - docs/README.md
 * - docs/COMMANDS.md
 * - docs/EXAMPLES.md
 * - docs/CHANGELOG.md
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLUGIN_INFO = {
  'automation': {
    name: 'Automation',
    category: 'Core',
    author: 'Discord Maid Bot Team',
    description: 'Scheduler, triggers, and automation system for recurring tasks and device-based automation',
    commands: [
      { name: '/automation schedule', description: 'Manage scheduled tasks' },
      { name: '/automation devicetrigger', description: 'Device-based automation triggers' },
      { name: '/automation health', description: 'Device health monitoring' },
      { name: '/automation speedalert', description: 'Internet speed alerts' },
    ],
    features: [
      'Cron-based task scheduling',
      'Device status triggers',
      'Speed monitoring and alerts',
      'Device health tracking',
    ],
  },
  'conversational-ai': {
    name: 'Conversational AI',
    category: 'AI',
    author: 'Discord Maid Bot Team',
    description: 'AI-powered conversational chat using Google Gemini with personality support',
    commands: [
      { name: '/chat', description: 'Chat with the AI bot' },
    ],
    features: [
      'Natural language conversations',
      'Personality-aware responses',
      'Chat history tracking',
      'Context-aware replies',
    ],
  },
  'core-commands': {
    name: 'Core Commands',
    category: 'Core',
    author: 'Discord Maid Bot Team',
    description: 'Essential bot commands and utilities',
    commands: [
      { name: '/core', description: 'Core bot utilities' },
    ],
    features: [
      'Bot management',
      'System utilities',
      'Essential commands',
    ],
  },
  'device-bulk-ops': {
    name: 'Device Bulk Operations',
    category: 'Network',
    author: 'Discord Maid Bot Team',
    description: 'Bulk operations for managing multiple devices at once',
    commands: [
      { name: '/device bulk', description: 'Bulk device operations' },
    ],
    features: [
      'Bulk device configuration',
      'Group assignments',
      'Pattern matching',
      'Filter-based operations',
    ],
  },
  'device-health': {
    name: 'Device Health Monitoring',
    category: 'Network',
    author: 'Discord Maid Bot Team',
    description: 'Monitor device uptime, health metrics, and reliability',
    commands: [
      { name: '/automation health', description: 'Device health reports and monitoring' },
    ],
    features: [
      'Uptime tracking',
      'Response time monitoring',
      'Health reports',
      'Reliability metrics',
    ],
  },
  'device-triggers': {
    name: 'Device Triggers',
    category: 'Automation',
    author: 'Discord Maid Bot Team',
    description: 'Automation triggers based on device network status',
    commands: [
      { name: '/automation devicetrigger', description: 'Device-based automation' },
    ],
    features: [
      'Device online/offline triggers',
      'Custom actions',
      'Notification system',
      'Rule management',
    ],
  },
  'games': {
    name: 'Games',
    category: 'Entertainment',
    author: 'Discord Maid Bot Team',
    description: '18 interactive games including trivia, hangman, word games, and more',
    commands: [
      { name: '/game trivia', description: 'Trivia game' },
      { name: '/game hangman', description: 'Hangman game' },
      { name: '/game wordchain', description: 'Word chain game' },
      { name: '/game tictactoe', description: 'Tic Tac Toe' },
      { name: '/game connect4', description: 'Connect Four' },
      { name: '/game rps', description: 'Rock Paper Scissors' },
      { name: '/game numguess', description: 'Number guessing' },
      { name: '/game riddle', description: 'Riddle game' },
      { name: '/game 20questions', description: '20 Questions with AI' },
      { name: '/game emojidecode', description: 'Emoji decoding' },
      { name: '/game wouldyourather', description: 'Would You Rather' },
      { name: '/game caption', description: 'Caption contest' },
      { name: '/game acronym', description: 'Acronym game' },
      { name: '/game story', description: 'Collaborative story' },
      { name: '/game mathblitz', description: 'Math blitz' },
      { name: '/game reaction', description: 'Reaction race' },
      { name: '/game mafia', description: 'Mafia/Werewolf' },
      { name: '/game stats', description: 'Game statistics' },
    ],
    features: [
      '18 different games',
      'Single and multiplayer',
      'Statistics tracking',
      'Leaderboards',
    ],
  },
  'network-insights': {
    name: 'Network Insights',
    category: 'Network',
    author: 'Discord Maid Bot Team',
    description: 'AI-powered network analytics and insights using Gemini',
    commands: [
      { name: '/network insights', description: 'Network analytics and insights' },
    ],
    features: [
      'AI-powered analysis',
      'Network statistics',
      'Trend detection',
      'Actionable insights',
    ],
  },
  'network-management': {
    name: 'Network Management',
    category: 'Network',
    author: 'Discord Maid Bot Team',
    description: 'Network scanning, device management, and Wake-on-LAN',
    commands: [
      { name: '/network scan', description: 'Scan network for devices' },
      { name: '/network devices', description: 'List all devices' },
      { name: '/network wol', description: 'Wake device with WOL' },
      { name: '/device config', description: 'Configure device' },
      { name: '/device group', description: 'Manage device groups' },
    ],
    features: [
      'Network scanning (local + Tailscale)',
      'Device discovery',
      'Wake-on-LAN',
      'Device groups',
      'Friendly names and emoji',
    ],
  },
  'personality': {
    name: 'Personality',
    category: 'AI',
    author: 'Discord Maid Bot Team',
    description: 'AI personality system with 10+ unique personalities',
    commands: [
      { name: '/bot personality', description: 'Manage AI personalities' },
    ],
    features: [
      '10+ unique personalities',
      'Per-user personality settings',
      'Custom personality prompts',
      'Personality-aware responses',
    ],
  },
  'research': {
    name: 'Research',
    category: 'AI',
    author: 'Discord Maid Bot Team',
    description: 'AI-powered research and web search using Gemini',
    commands: [
      { name: '/research query', description: 'AI-powered research' },
      { name: '/research history', description: 'View research history' },
      { name: '/research search', description: 'Search past research' },
      { name: '/research web', description: 'Web search' },
    ],
    features: [
      'AI-powered research',
      'Web search integration',
      'Research history',
      'SMB file saving',
    ],
  },
  'smart-reminders': {
    name: 'Smart Reminders',
    category: 'Utility',
    author: 'Discord Maid Bot Team',
    description: 'Context-aware reminder system with time and presence-based triggers',
    commands: [
      { name: '/bot reminder', description: 'Manage reminders' },
    ],
    features: [
      'Time-based reminders',
      'Recurring reminders',
      'Presence-based triggers',
      'AI-generated variations',
    ],
  },
  'speed-alerts': {
    name: 'Speed Alerts',
    category: 'Network',
    author: 'Discord Maid Bot Team',
    description: 'Internet speed monitoring with automatic alerts',
    commands: [
      { name: '/automation speedalert', description: 'Speed monitoring alerts' },
    ],
    features: [
      'Automatic speed monitoring',
      'Threshold-based alerts',
      'Speed history tracking',
      'Channel notifications',
    ],
  },
};

const INTEGRATION_INFO = {
  'integrations/homeassistant': {
    name: 'Home Assistant',
    category: 'Integration',
    author: 'Discord Maid Bot Team',
    description: 'Control Home Assistant devices from Discord',
    commands: [
      { name: '/homeassistant lights', description: 'List all lights' },
      { name: '/homeassistant light', description: 'Control a light' },
      { name: '/homeassistant switches', description: 'List all switches' },
      { name: '/homeassistant switch', description: 'Control a switch' },
      { name: '/homeassistant sensors', description: 'List all sensors' },
      { name: '/homeassistant sensor', description: 'Read a sensor' },
    ],
    features: [
      'Light control',
      'Switch control',
      'Sensor reading',
      'Scene activation',
      'Automation triggers',
    ],
  },
  'integrations/speedtest': {
    name: 'Speed Test',
    category: 'Integration',
    author: 'Discord Maid Bot Team',
    description: 'Internet speed testing and monitoring',
    commands: [
      { name: '/network speedtest', description: 'Run speed test' },
      { name: '/network speedhistory', description: 'View speed history' },
    ],
    features: [
      'Download/upload speed testing',
      'Ping measurement',
      'Speed history',
      'Statistics and trends',
    ],
  },
  'integrations/weather': {
    name: 'Weather',
    category: 'Integration',
    author: 'Discord Maid Bot Team',
    description: 'Weather information and forecasts',
    commands: [
      { name: '/weather', description: 'Get weather information' },
    ],
    features: [
      'Current weather',
      'Weather forecasts',
      'Multiple locations',
      'Temperature units',
    ],
  },
};

async function createPluginDocs(pluginPath, info) {
  const docsDir = path.join(__dirname, 'plugins', pluginPath, 'docs');
  await fs.mkdir(docsDir, { recursive: true });
  
  // README.md
  const readme = `# ${info.name}

**Version:** 1.0.0.0-beta  
**Category:** ${info.category}  
**Author:** ${info.author}

${info.description}

## Features

${info.features.map(f => `- ${f}`).join('\n')}

## Commands

${info.commands.map(c => `- \`${c.name}\` - ${c.description}`).join('\n')}

## Installation

This plugin is included by default.

## Configuration

No additional configuration required.

## Documentation

- [Commands Reference](COMMANDS.md)
- [Usage Examples](EXAMPLES.md)
- [Changelog](CHANGELOG.md)

## Support

For issues or questions, please open an issue on GitHub.
`;

  // COMMANDS.md
  const commands = `# ${info.name} - Commands

**Version:** 1.0.0.0-beta

Complete command reference for ${info.name}.

## Commands

${info.commands.map(c => `### \`${c.name}\`

${c.description}

**Usage:**
\`\`\`
${c.name}
\`\`\`

**Permissions:** User

---

`).join('\n')}

## See Also

- [Plugin Overview](README.md)
- [Usage Examples](EXAMPLES.md)
`;

  // EXAMPLES.md
  const examples = `# ${info.name} - Examples

**Version:** 1.0.0.0-beta

Usage examples for ${info.name}.

## Basic Usage

${info.commands.slice(0, 3).map(c => `### ${c.description}

\`\`\`
${c.name}
\`\`\`

`).join('\n')}

## Advanced Usage

See [Commands Reference](COMMANDS.md) for all available commands.

## Tips

- Check command help with \`/help\`
- Use autocomplete for easier input
- Commands are case-insensitive

## Troubleshooting

If you encounter issues:
1. Check bot permissions
2. Verify command syntax
3. Check bot logs
4. Open an issue on GitHub
`;

  // CHANGELOG.md
  const changelog = `# ${info.name} - Changelog

## [1.0.0.0-beta] - 2025-12-14

### Added
- Initial beta release
- ${info.features[0]}
- ${info.features[1] || 'Core functionality'}

### Changed
- Migrated to plugin architecture

### Fixed
- Various bug fixes and improvements
`;

  // Write files
  await fs.writeFile(path.join(docsDir, 'README.md'), readme);
  await fs.writeFile(path.join(docsDir, 'COMMANDS.md'), commands);
  await fs.writeFile(path.join(docsDir, 'EXAMPLES.md'), examples);
  await fs.writeFile(path.join(docsDir, 'CHANGELOG.md'), changelog);
  
  console.log(`   ✅ Created docs for ${pluginPath}`);
}

async function main() {
  console.log('📚 Creating plugin documentation\n');
  console.log('='.repeat(60));
  
  try {
    console.log('\n📦 Creating core plugin documentation...');
    for (const [pluginPath, info] of Object.entries(PLUGIN_INFO)) {
      await createPluginDocs(pluginPath, info);
    }
    
    console.log('\n🔌 Creating integration plugin documentation...');
    for (const [pluginPath, info] of Object.entries(INTEGRATION_INFO)) {
      await createPluginDocs(pluginPath, info);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Plugin documentation complete!`);
    console.log(`   📊 Created docs for ${Object.keys(PLUGIN_INFO).length + Object.keys(INTEGRATION_INFO).length} plugins`);
    console.log(`   📝 Each plugin now has:`);
    console.log(`      - README.md (overview)`);
    console.log(`      - COMMANDS.md (command reference)`);
    console.log(`      - EXAMPLES.md (usage examples)`);
    console.log(`      - CHANGELOG.md (version history)`);
    
  } catch (error) {
    console.error('\n❌ Error creating plugin docs:', error);
    process.exit(1);
  }
}

main();
