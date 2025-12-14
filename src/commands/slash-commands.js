import { SlashCommandBuilder } from 'discord.js';

/**
 * Slash Commands Registry
 * 
 * ALL commands are now defined in their respective plugins!
 * This file only handles command registration and plugin command injection.
 * 
 * Commands are loaded from:
 * - plugins/automation/commands.js -> /automation
 * - plugins/core-commands/commands.js -> /help, /stats, /ping, /dashboard, /plugin, /bot, /admin
 * - plugins/device-management/commands.js -> /device
 * - plugins/games/commands.js -> /game
 * - plugins/integrations/weather/commands.js -> /weather
 * - plugins/integrations/homeassistant/commands.js -> /homeassistant
 * - plugins/network-management/commands.js -> /network
 * - plugins/research/commands.js -> /research
 * - plugins/conversational-ai/commands.js -> /chat
 */

// Start with empty array - all commands loaded from plugins
export const commands = [];

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
    
    // Helper to load commands from a directory
    async function loadFromDir(dirPath, pluginName) {
      const commandsPath = path.join(dirPath, 'commands.js');
      try {
        await fs.access(commandsPath);
        
        const commandsUrl = pathToFileURL(commandsPath).href;
        const commandsModule = await import(`${commandsUrl}?t=${Date.now()}`);
        
        if (commandsModule.parentCommand === null) {
          if (commandsModule.commands && Array.isArray(commandsModule.commands)) {
            standaloneCommands.push({
              pluginName,
              commands: commandsModule.commands
            });
          } else if (commandsModule.commandGroup) {
            standaloneCommands.push({
              pluginName,
              commands: [commandsModule.commandGroup]
            });
          }
        }
      } catch (err) {
        // No commands.js or error loading - skip
      }
    }
    
    const files = await fs.readdir(pluginsDir);
    
    for (const file of files) {
      const filePath = path.join(pluginsDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isDirectory()) {
        // Load from main plugin directory
        await loadFromDir(filePath, file);
        
        // Also check for subplugins (e.g., integrations/homeassistant)
        try {
          const subFiles = await fs.readdir(filePath);
          for (const subFile of subFiles) {
            const subPath = path.join(filePath, subFile);
            const subStats = await fs.stat(subPath);
            if (subStats.isDirectory()) {
              await loadFromDir(subPath, `${file}/${subFile}`);
            }
          }
        } catch (err) {
          // Can't read subdirectories - skip
        }
      }
    }
  } catch (error) {
    console.error('Error loading standalone plugin commands:', error);
  }
  
  return standaloneCommands;
}
