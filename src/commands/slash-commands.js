import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

// Command definitions
// NOTE: Many commands are now defined in plugins and loaded dynamically
// See plugins/*/commands.js for command definitions
export const commands = [
  // ============================================
  // COMMANDS DEFINED HERE (will be moved to plugins)
  // ============================================
  
  // /automation - Automation & Triggers (parent for plugin subcommands)
  new SlashCommandBuilder()
    .setName('automation')
    .setDescription('⚙️ Automation and triggers'),
    // Plugin commands (speedalert, devicetrigger, health, schedule) are injected dynamically

  // /network - NOW DEFINED IN plugins/network-management/commands.js
  // /device - NOW DEFINED IN plugins/device-management/commands.js
  // /research - NOW DEFINED IN plugins/research/commands.js
  // /game - NOW DEFINED IN plugins/games/commands.js

  // /bot - Bot Management
  new SlashCommandBuilder()
    .setName('bot')
    .setDescription('🤖 Bot management and settings')
    .addSubcommand(subcommand =>
      subcommand
        .setName('chat')
        .setDescription('Chat with AI assistant')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Your message')
            .setRequired(true)))
    // personality subcommand now injected by personality plugin
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View bot statistics'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('dashboard')
        .setDescription('Get web dashboard URL'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('help')
        .setDescription('Show help and available commands'))
    .addSubcommandGroup(group =>
      group
        .setName('logs')
        .setDescription('View system logs')
        .addSubcommand(subcommand =>
          subcommand
            .setName('recent')
            .setDescription('View recent logs')
            .addStringOption(option =>
              option.setName('level')
                .setDescription('Filter by log level')
                .addChoices(
                  { name: 'All', value: 'all' },
                  { name: 'Debug', value: 'debug' },
                  { name: 'Info', value: 'info' },
                  { name: 'Warning', value: 'warn' },
                  { name: 'Error', value: 'error' },
                  { name: 'Critical', value: 'critical' }
                ))
            .addIntegerOption(option =>
              option.setName('limit')
                .setDescription('Number of logs to show (default: 10)')
                .setMinValue(1)
                .setMaxValue(50)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('search')
            .setDescription('Search logs')
            .addStringOption(option =>
              option.setName('query')
                .setDescription('Search query')
                .setRequired(true))
            .addIntegerOption(option =>
              option.setName('limit')
                .setDescription('Number of results (default: 10)')
                .setMinValue(1)
                .setMaxValue(50)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('stats')
            .setDescription('View log statistics'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('errors')
            .setDescription('View recent errors')
            .addIntegerOption(option =>
              option.setName('limit')
                .setDescription('Number of errors to show (default: 10)')
                .setMinValue(1)
                .setMaxValue(50))))
    .addSubcommandGroup(group =>
      group
        .setName('plugin')
        .setDescription('Plugin management')
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all plugins'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('enable')
            .setDescription('Enable a plugin')
            .addStringOption(option =>
              option.setName('name')
                .setDescription('Plugin name')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('disable')
            .setDescription('Disable a plugin')
            .addStringOption(option =>
              option.setName('name')
                .setDescription('Plugin name')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('reload')
            .setDescription('Reload a plugin')
            .addStringOption(option =>
              option.setName('name')
                .setDescription('Plugin name')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('stats')
            .setDescription('View plugin statistics'))),

  // /admin - Administration
  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('👑 Administration (Admin only)')
    .addSubcommandGroup(group =>
      group
        .setName('permissions')
        .setDescription('Permission management')
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all users and permissions'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('set')
            .setDescription('Set user role')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to modify')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('role')
                .setDescription('Role to assign')
                .setRequired(true)
                .addChoices(
                  { name: 'Admin', value: 'admin' },
                  { name: 'Operator', value: 'operator' },
                  { name: 'User', value: 'user' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('grant')
            .setDescription('Grant specific permission')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to grant permission')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('permission')
                .setDescription('Permission to grant')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('revoke')
            .setDescription('Revoke specific permission')
            .addUserOption(option =>
              option.setName('user')
                .setDescription('User to revoke permission')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('permission')
                .setDescription('Permission to revoke')
                .setRequired(true))))
    .addSubcommandGroup(group =>
      group
        .setName('config')
        .setDescription('Bot configuration')
        .addSubcommand(subcommand =>
          subcommand
            .setName('view')
            .setDescription('View configuration')
            .addStringOption(option =>
              option.setName('section')
                .setDescription('Config section')
                .addChoices(
                  { name: 'SMB Storage', value: 'smb' },
                  { name: 'Home Assistant', value: 'homeassistant' },
                  { name: 'Gemini API', value: 'gemini' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('set')
            .setDescription('Set configuration value')
            .addStringOption(option =>
              option.setName('key')
                .setDescription('Configuration key')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('value')
                .setDescription('Configuration value')
                .setRequired(true)))),

  // ============================================
  // STANDALONE COMMANDS
  // ============================================
  
  // weather command now provided by integrations/weather plugin

  new SlashCommandBuilder()
    .setName('homeassistant')
    .setDescription('🏠 Control Home Assistant devices')
    .addSubcommand(subcommand =>
      subcommand
        .setName('lights')
        .setDescription('List all lights'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('light')
        .setDescription('Control a light')
        .addStringOption(option =>
          option.setName('entity')
            .setDescription('Entity ID (e.g., light.living_room)')
            .setRequired(true)
            .setAutocomplete(true))
        .addBooleanOption(option =>
          option.setName('state')
            .setDescription('Turn on or off')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('brightness')
            .setDescription('Brightness (0-255)')
            .setMinValue(0)
            .setMaxValue(255)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('switches')
        .setDescription('List all switches'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('switch')
        .setDescription('Control a switch')
        .addStringOption(option =>
          option.setName('entity')
            .setDescription('Entity ID (e.g., switch.fan)')
            .setRequired(true)
            .setAutocomplete(true))
        .addBooleanOption(option =>
          option.setName('state')
            .setDescription('Turn on or off')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('sensors')
        .setDescription('List all sensors'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('sensor')
        .setDescription('Read a sensor')
        .addStringOption(option =>
          option.setName('entity')
            .setDescription('Entity ID (e.g., sensor.temperature)')
            .setRequired(true)
            .setAutocomplete(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('esp')
        .setDescription('List ESP devices'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('diagnose')
        .setDescription('Run Home Assistant diagnostics'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('scenes')
        .setDescription('List all scenes'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('scene')
        .setDescription('Activate a scene (Admin only)')
        .addStringOption(option =>
          option.setName('entity')
            .setDescription('Scene entity ID (e.g., scene.movie_time)')
            .setRequired(true)
            .setAutocomplete(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('automations')
        .setDescription('List all automations'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('automation')
        .setDescription('Trigger an automation (Admin only)')
        .addStringOption(option =>
          option.setName('entity')
            .setDescription('Automation entity ID (e.g., automation.lights_on)')
            .setRequired(true)
            .setAutocomplete(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('scripts')
        .setDescription('List all scripts'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('script')
        .setDescription('Run a script (Admin only)')
        .addStringOption(option =>
          option.setName('entity')
            .setDescription('Script entity ID (e.g., script.goodnight)')
            .setRequired(true)
            .setAutocomplete(true))),
];

// Register commands with Discord
export async function registerCommands(client) {
  try {
    console.log('📝 Registering slash commands...');
    
    // Inject plugin commands dynamically
    await injectPluginCommands();
    
    // Register globally (takes up to 1 hour to propagate)
    // await client.application.commands.set(commands);
    
    // Register per guild (instant, for development)
    for (const guild of client.guilds.cache.values()) {
      await guild.commands.set(commands);
      console.log(`✅ Registered commands for guild: ${guild.name}`);
    }
    
    console.log('✅ All slash commands registered!');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
}

// Inject plugin commands into parent commands or as standalone commands
async function injectPluginCommands() {
  try {
    const { getPluginCommands } = await import('../core/plugin-system.js');
    const pluginCommands = getPluginCommands();
    
    // FIRST: Load standalone commands from plugins (these define new top-level commands)
    const standaloneCommands = await loadStandalonePluginCommands();
    
    // Add standalone commands FIRST so subcommands can be injected into them
    if (standaloneCommands.length > 0) {
      console.log(`📦 Adding ${standaloneCommands.length} standalone plugin command(s)...`);
      
      for (const { pluginName, commands: pluginCmds } of standaloneCommands) {
        for (const cmd of pluginCmds) {
          // Check if command already exists (avoid duplicates)
          const existing = commands.find(c => c.name === cmd.name);
          if (!existing) {
            commands.push(cmd);
            console.log(`   ✅ Added /${cmd.name} (${pluginName})`);
          } else {
            console.log(`   ⚠️  Skipped /${cmd.name} (already exists)`);
          }
        }
      }
    }
    
    // THEN: Inject subcommand groups into parent commands (including newly added ones)
    if (pluginCommands.length > 0) {
      console.log(`📦 Injecting ${pluginCommands.length} plugin subcommand(s)...`);
      
      for (const { pluginName, parentCommand, commandGroup } of pluginCommands) {
        // Skip if this is a standalone command (handled separately)
        if (parentCommand === null) {
          continue;
        }
        
        // Find the parent command
        const parentCmd = commands.find(cmd => cmd.name === parentCommand);
        
        if (!parentCmd) {
          console.warn(`   ⚠️  Parent command '${parentCommand}' not found for plugin '${pluginName}'`);
          continue;
        }
        
        // Check if it's a subcommand group or single subcommand
        // SubcommandGroupBuilder has nested subcommands (options with type 1)
        // SubcommandBuilder has options but they're not subcommands
        const hasNestedSubcommands = commandGroup.options && 
          commandGroup.options.some(opt => opt.type === 1); // Type 1 = SUB_COMMAND
        
        if (hasNestedSubcommands) {
          // It's a subcommand group (has nested subcommands)
          parentCmd.addSubcommandGroup(group => {
            // Copy properties from the commandGroup
            group.setName(commandGroup.name);
            group.setDescription(commandGroup.description);
            // Add all nested subcommands
            for (const subCmd of commandGroup.options) {
              group.addSubcommand(sub => {
                sub.setName(subCmd.name);
                sub.setDescription(subCmd.description);
                // Add options if any
                if (subCmd.options) {
                  for (const opt of subCmd.options) {
                    if (opt.type === 3) { // STRING
                      sub.addStringOption(option => {
                        option.setName(opt.name).setDescription(opt.description);
                        if (opt.required) option.setRequired(true);
                        if (opt.choices) option.addChoices(...opt.choices);
                        return option;
                      });
                    }
                    // Add other option types as needed
                  }
                }
                return sub;
              });
            }
            return group;
          });
          console.log(`   ✅ Injected '${commandGroup.name}' group into /${parentCommand} (${pluginName})`);
        } else {
          // It's a single subcommand
          parentCmd.addSubcommand(sub => {
            sub.setName(commandGroup.name);
            sub.setDescription(commandGroup.description);
            // Add options if any
            if (commandGroup.options) {
              for (const opt of commandGroup.options) {
                if (opt.type === 3) { // STRING
                  sub.addStringOption(option => {
                    option.setName(opt.name).setDescription(opt.description);
                    if (opt.required) option.setRequired(true);
                    if (opt.choices) option.addChoices(...opt.choices);
                    return option;
                  });
                }
                // Add other option types as needed
              }
            }
            return sub;
          });
          console.log(`   ✅ Injected '${commandGroup.name}' into /${parentCommand} (${pluginName})`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to inject plugin commands:', error);
  }
}

// Load standalone commands from plugins (commands with parentCommand = null)
async function loadStandalonePluginCommands() {
  const standaloneCommands = [];
  
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const { pathToFileURL } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const pluginsDir = path.join(__dirname, '../../plugins');
    
    const files = await fs.readdir(pluginsDir);
    
    for (const file of files) {
      // Check if it's a directory
      const filePath = path.join(pluginsDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isDirectory()) {
        // Check if commands.js exists
        const commandsPath = path.join(filePath, 'commands.js');
        try {
          await fs.access(commandsPath);
          
          // Load the commands module
          const commandsUrl = pathToFileURL(commandsPath).href;
          const commandsModule = await import(`${commandsUrl}?t=${Date.now()}`);
          
          // Check if it's a standalone command (parentCommand = null)
          if (commandsModule.parentCommand === null) {
            // Support both 'commands' array and single 'commandGroup'
            if (commandsModule.commands && Array.isArray(commandsModule.commands)) {
              standaloneCommands.push({
                pluginName: file,
                commands: commandsModule.commands
              });
            } else if (commandsModule.commandGroup) {
              standaloneCommands.push({
                pluginName: file,
                commands: [commandsModule.commandGroup]
              });
            }
          }
        } catch (err) {
          // No commands.js or error loading - skip
        }
      }
    }
  } catch (error) {
    console.error('Error loading standalone plugin commands:', error);
  }
  
  return standaloneCommands;
}
