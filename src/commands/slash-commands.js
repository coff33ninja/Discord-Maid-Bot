import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

// Command definitions
export const commands = [
  // ============================================
  // UNIFIED COMMANDS (New Structure)
  // ============================================
  
  // /network - Network Operations
  new SlashCommandBuilder()
    .setName('network')
    .setDescription('🌐 Network operations and monitoring')
    .addSubcommand(subcommand =>
      subcommand
        .setName('scan')
        .setDescription('Scan network for devices'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('devices')
        .setDescription('List all known devices')
        .addStringOption(option =>
          option.setName('filter')
            .setDescription('Filter devices')
            .addChoices(
              { name: 'Online Only', value: 'online' },
              { name: 'Offline Only', value: 'offline' },
              { name: 'All Devices', value: 'all' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('wol')
        .setDescription('Wake device with Wake-on-LAN')
        .addStringOption(option =>
          option.setName('device')
            .setDescription('Device to wake')
            .setRequired(true)
            .setAutocomplete(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('speedtest')
        .setDescription('Run internet speed test'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('speedhistory')
        .setDescription('View speed test history')
        .addIntegerOption(option =>
          option.setName('days')
            .setDescription('Number of days to show')
            .setMinValue(1)
            .setMaxValue(30))),

  // /device - Device Management
  new SlashCommandBuilder()
    .setName('device')
    .setDescription('📱 Device management and configuration')
    .addSubcommandGroup(group =>
      group
        .setName('group')
        .setDescription('Manage device groups')
        .addSubcommand(subcommand =>
          subcommand
            .setName('assign')
            .setDescription('Assign device to a group')
            .addStringOption(option =>
              option.setName('device')
                .setDescription('Device to assign')
                .setRequired(true)
                .setAutocomplete(true))
            .addStringOption(option =>
              option.setName('group')
                .setDescription('Group name')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('addmultiple')
            .setDescription('Add multiple devices to a group')
            .addStringOption(option =>
              option.setName('group')
                .setDescription('Group name')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('device1')
                .setDescription('First device')
                .setRequired(true)
                .setAutocomplete(true))
            .addStringOption(option =>
              option.setName('device2')
                .setDescription('Second device')
                .setAutocomplete(true))
            .addStringOption(option =>
              option.setName('device3')
                .setDescription('Third device')
                .setAutocomplete(true))
            .addStringOption(option =>
              option.setName('device4')
                .setDescription('Fourth device')
                .setAutocomplete(true))
            .addStringOption(option =>
              option.setName('device5')
                .setDescription('Fifth device')
                .setAutocomplete(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('assignpattern')
            .setDescription('Assign devices by name pattern')
            .addStringOption(option =>
              option.setName('group')
                .setDescription('Group name')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('pattern')
                .setDescription('Pattern to match')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('assignall')
            .setDescription('Assign all devices matching filter')
            .addStringOption(option =>
              option.setName('group')
                .setDescription('Group name')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('filter')
                .setDescription('Which devices to add')
                .setRequired(true)
                .addChoices(
                  { name: 'All Online Devices', value: 'online' },
                  { name: 'All Offline Devices', value: 'offline' },
                  { name: 'All Devices', value: 'all' },
                  { name: 'Local Network Only', value: 'local' },
                  { name: 'Tailscale Only', value: 'tailscale' }
                )))
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all groups'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('view')
            .setDescription('View devices in a group')
            .addStringOption(option =>
              option.setName('group')
                .setDescription('Group name')
                .setRequired(true)
                .setAutocomplete(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove device from its group')
            .addStringOption(option =>
              option.setName('device')
                .setDescription('Device to remove')
                .setRequired(true)
                .setAutocomplete(true))))
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('Configure device properties')
        .addStringOption(option =>
          option.setName('device')
            .setDescription('Device to configure')
            .setRequired(true)
            .setAutocomplete(true))
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Friendly name'))
        .addStringOption(option =>
          option.setName('emoji')
            .setDescription('Emoji (e.g., 🎮 💻 📱)'))
        .addStringOption(option =>
          option.setName('group')
            .setDescription('Group name')))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all known devices')
        .addStringOption(option =>
          option.setName('filter')
            .setDescription('Filter devices')
            .addChoices(
              { name: 'Online Only', value: 'online' },
              { name: 'Offline Only', value: 'offline' },
              { name: 'All Devices', value: 'all' }
            ))),

  // /automation - Automation & Triggers
  new SlashCommandBuilder()
    .setName('automation')
    .setDescription('⚙️ Automation and triggers')
    .addSubcommandGroup(group =>
      group
        .setName('speedalert')
        .setDescription('Speed alert notifications')
        .addSubcommand(subcommand =>
          subcommand
            .setName('config')
            .setDescription('Configure speed alerts')
            .addNumberOption(option =>
              option.setName('threshold')
                .setDescription('Alert when speed drops below (Mbps)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(1000))
            .addChannelOption(option =>
              option.setName('channel')
                .setDescription('Channel to send alerts')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('status')
            .setDescription('View current settings'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('enable')
            .setDescription('Enable speed alerts'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('disable')
            .setDescription('Disable speed alerts')))
    .addSubcommandGroup(group =>
      group
        .setName('devicetrigger')
        .setDescription('Device automation triggers')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Create a new trigger')
            .addStringOption(option =>
              option.setName('name')
                .setDescription('Trigger name')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('device')
                .setDescription('Device to monitor')
                .setRequired(true)
                .setAutocomplete(true))
            .addStringOption(option =>
              option.setName('event')
                .setDescription('When to trigger')
                .setRequired(true)
                .addChoices(
                  { name: 'Device comes online', value: 'online' },
                  { name: 'Device goes offline', value: 'offline' },
                  { name: 'Unknown device detected', value: 'unknown' }
                ))
            .addStringOption(option =>
              option.setName('action')
                .setDescription('What to do')
                .setRequired(true)
                .addChoices(
                  { name: 'Send me a DM', value: 'discord_dm' },
                  { name: 'Post in channel', value: 'discord_channel' },
                  { name: 'Control Home Assistant', value: 'homeassistant' }
                ))
            .addStringOption(option =>
              option.setName('message')
                .setDescription('Custom message'))
            .addChannelOption(option =>
              option.setName('channel')
                .setDescription('Channel for alerts'))
            .addStringOption(option =>
              option.setName('ha_entity')
                .setDescription('Home Assistant entity')
                .setAutocomplete(true))
            .addStringOption(option =>
              option.setName('ha_service')
                .setDescription('HA service (e.g., light.turn_on)')))
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all triggers'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove a trigger')
            .addStringOption(option =>
              option.setName('trigger')
                .setDescription('Trigger to remove')
                .setRequired(true)
                .setAutocomplete(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('toggle')
            .setDescription('Enable/disable a trigger')
            .addStringOption(option =>
              option.setName('trigger')
                .setDescription('Trigger to toggle')
                .setRequired(true)
                .setAutocomplete(true))
            .addBooleanOption(option =>
              option.setName('enabled')
                .setDescription('Enable or disable')
                .setRequired(true))))
    .addSubcommandGroup(group =>
      group
        .setName('schedule')
        .setDescription('Task scheduling')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add scheduled task')
            .addStringOption(option =>
              option.setName('name')
                .setDescription('Task name')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('cron')
                .setDescription('Cron expression (e.g., "0 9 * * *")')
                .setRequired(true))
            .addStringOption(option =>
              option.setName('command')
                .setDescription('Command to run')
                .setRequired(true)
                .addChoices(
                  { name: 'Network Scan', value: 'scan' },
                  { name: 'Speed Test', value: 'speedtest' },
                  { name: 'Weather Update', value: 'weather' }
                ))
            .addChannelOption(option =>
              option.setName('channel')
                .setDescription('Channel to post results')))
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all scheduled tasks'))
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove a scheduled task')
            .addStringOption(option =>
              option.setName('name')
                .setDescription('Task name')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('enable')
            .setDescription('Enable a task')
            .addStringOption(option =>
              option.setName('name')
                .setDescription('Task name')
                .setRequired(true)))
        .addSubcommand(subcommand =>
          subcommand
            .setName('disable')
            .setDescription('Disable a task')
            .addStringOption(option =>
              option.setName('name')
                .setDescription('Task name')
                .setRequired(true)))),

  // /research - Research & Search
  new SlashCommandBuilder()
    .setName('research')
    .setDescription('🔎 Research and search tools')
    .addSubcommand(subcommand =>
      subcommand
        .setName('query')
        .setDescription('Research a topic with AI')
        .addStringOption(option =>
          option.setName('query')
            .setDescription('What to research')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('history')
        .setDescription('View past research')
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('Number of results')
            .setMinValue(5)
            .setMaxValue(50)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('search')
        .setDescription('Search through past research')
        .addStringOption(option =>
          option.setName('query')
            .setDescription('Search terms')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('id')
            .setDescription('View full result by ID')))
    .addSubcommand(subcommand =>
      subcommand
        .setName('web')
        .setDescription('Search the web (DuckDuckGo)')
        .addStringOption(option =>
          option.setName('query')
            .setDescription('What to search for')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('results')
            .setDescription('Number of results (1-10)')
            .setMinValue(1)
            .setMaxValue(10))),

  // /game - Games (18 games consolidated)
  new SlashCommandBuilder()
    .setName('game')
    .setDescription('🎮 Play games')
    .addSubcommand(subcommand =>
      subcommand
        .setName('trivia')
        .setDescription('Trivia game')
        .addStringOption(option =>
          option.setName('category')
            .setDescription('Category')
            .addChoices(
              { name: 'General Knowledge', value: 'general' },
              { name: 'Science', value: 'science' },
              { name: 'History', value: 'history' },
              { name: 'Geography', value: 'geography' },
              { name: 'Entertainment', value: 'entertainment' },
              { name: 'Sports', value: 'sports' },
              { name: 'Random', value: 'random' }
            ))
        .addStringOption(option =>
          option.setName('difficulty')
            .setDescription('Difficulty')
            .addChoices(
              { name: 'Easy', value: 'easy' },
              { name: 'Medium', value: 'medium' },
              { name: 'Hard', value: 'hard' }
            ))
        .addIntegerOption(option =>
          option.setName('rounds')
            .setDescription('Number of rounds')
            .setMinValue(1)
            .setMaxValue(20)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('hangman')
        .setDescription('Hangman game')
        .addStringOption(option =>
          option.setName('category')
            .setDescription('Word category')
            .addChoices(
              { name: 'Animals', value: 'animals' },
              { name: 'Countries', value: 'countries' },
              { name: 'Movies', value: 'movies' },
              { name: 'Random', value: 'random' }
            ))
        .addStringOption(option =>
          option.setName('difficulty')
            .setDescription('Difficulty')
            .addChoices(
              { name: 'Easy', value: 'easy' },
              { name: 'Medium', value: 'medium' },
              { name: 'Hard', value: 'hard' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('wordchain')
        .setDescription('Word chain game')
        .addIntegerOption(option =>
          option.setName('rounds')
            .setDescription('Number of rounds')
            .setMinValue(5)
            .setMaxValue(50))
        .addBooleanOption(option =>
          option.setName('trust_mode')
            .setDescription('Trust mode (no validation)'))
        .addBooleanOption(option =>
          option.setName('hints')
            .setDescription('Enable hints')))
    .addSubcommand(subcommand =>
      subcommand
        .setName('tictactoe')
        .setDescription('Tic Tac Toe')
        .addUserOption(option =>
          option.setName('opponent')
            .setDescription('Player to challenge')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('connect4')
        .setDescription('Connect Four')
        .addUserOption(option =>
          option.setName('opponent')
            .setDescription('Player to challenge')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('rps')
        .setDescription('Rock Paper Scissors')
        .addUserOption(option =>
          option.setName('opponent')
            .setDescription('Player to challenge')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('rounds')
            .setDescription('Best of')
            .addChoices(
              { name: 'Best of 3', value: 3 },
              { name: 'Best of 5', value: 5 },
              { name: 'Best of 7', value: 7 }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('numguess')
        .setDescription('Number guessing game')
        .addIntegerOption(option =>
          option.setName('max')
            .setDescription('Maximum number')
            .setMinValue(10)
            .setMaxValue(1000)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('riddle')
        .setDescription('Riddle game')
        .addStringOption(option =>
          option.setName('difficulty')
            .setDescription('Difficulty')
            .addChoices(
              { name: 'Easy', value: 'easy' },
              { name: 'Medium', value: 'medium' },
              { name: 'Hard', value: 'hard' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('20questions')
        .setDescription('20 Questions with AI')
        .addStringOption(option =>
          option.setName('category')
            .setDescription('Category')
            .addChoices(
              { name: 'Animals', value: 'animals' },
              { name: 'Objects', value: 'objects' },
              { name: 'People', value: 'people' },
              { name: 'Places', value: 'places' },
              { name: 'Random', value: 'random' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('emojidecode')
        .setDescription('Guess from emojis')
        .addStringOption(option =>
          option.setName('category')
            .setDescription('Category')
            .addChoices(
              { name: 'Movies', value: 'movies' },
              { name: 'Songs', value: 'songs' },
              { name: 'Books', value: 'books' },
              { name: 'Random', value: 'random' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('wouldyourather')
        .setDescription('Would You Rather')
        .addStringOption(option =>
          option.setName('category')
            .setDescription('Category')
            .addChoices(
              { name: 'Funny', value: 'funny' },
              { name: 'Serious', value: 'serious' },
              { name: 'Random', value: 'random' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('caption')
        .setDescription('Caption contest'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('acronym')
        .setDescription('Acronym game')
        .addIntegerOption(option =>
          option.setName('length')
            .setDescription('Acronym length')
            .setMinValue(3)
            .setMaxValue(6)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('story')
        .setDescription('Collaborative story builder')
        .addStringOption(option =>
          option.setName('genre')
            .setDescription('Story genre')
            .addChoices(
              { name: 'Fantasy', value: 'fantasy' },
              { name: 'Sci-Fi', value: 'scifi' },
              { name: 'Horror', value: 'horror' },
              { name: 'Comedy', value: 'comedy' },
              { name: 'Random', value: 'random' }
            ))
        .addIntegerOption(option =>
          option.setName('rounds')
            .setDescription('Number of rounds')
            .setMinValue(3)
            .setMaxValue(20)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('mathblitz')
        .setDescription('Math blitz')
        .addStringOption(option =>
          option.setName('difficulty')
            .setDescription('Difficulty')
            .addChoices(
              { name: 'Easy', value: 'easy' },
              { name: 'Medium', value: 'medium' },
              { name: 'Hard', value: 'hard' }
            ))
        .addIntegerOption(option =>
          option.setName('rounds')
            .setDescription('Number of rounds')
            .setMinValue(5)
            .setMaxValue(30)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reaction')
        .setDescription('Reaction race'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('mafia')
        .setDescription('Mafia/Werewolf game')
        .addIntegerOption(option =>
          option.setName('players')
            .setDescription('Number of players')
            .setMinValue(5)
            .setMaxValue(20)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View your game statistics'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('stop')
        .setDescription('Stop the current game in this channel'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('View the games leaderboard')),

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
    .addSubcommand(subcommand =>
      subcommand
        .setName('personality')
        .setDescription('Change bot personality')
        .addStringOption(option =>
          option.setName('style')
            .setDescription('Personality style')
            .addChoices(
              { name: '🌸 Maid', value: 'maid' },
              { name: '💢 Tsundere', value: 'tsundere' },
              { name: '❄️ Kuudere', value: 'kuudere' },
              { name: '🥺 Dandere', value: 'dandere' },
              { name: '🖤 Yandere', value: 'yandere' },
              { name: '⭐ Genki', value: 'genki' },
              { name: '💋 Onee-san', value: 'oneesan' },
              { name: '🔮 Chuunibyou', value: 'chuunibyou' },
              { name: '🎩 Butler', value: 'butler' },
              { name: '🐱 Catgirl', value: 'catgirl' }
            )))
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
  
  new SlashCommandBuilder()
    .setName('weather')
    .setDescription('🌤️ Get weather information')
    .addStringOption(option =>
      option.setName('city')
        .setDescription('City name')
        .setRequired(false)),

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

// Inject plugin commands into parent commands
async function injectPluginCommands() {
  try {
    const { getPluginCommands } = await import('../plugins/plugin-manager.js');
    const pluginCommands = getPluginCommands();
    
    if (pluginCommands.length === 0) {
      return;
    }
    
    console.log(`📦 Injecting ${pluginCommands.length} plugin command(s)...`);
    
    for (const { pluginName, parentCommand, commandGroup } of pluginCommands) {
      // Find the parent command
      const parentCmd = commands.find(cmd => cmd.name === parentCommand);
      
      if (!parentCmd) {
        console.warn(`   ⚠️  Parent command '${parentCommand}' not found for plugin '${pluginName}'`);
        continue;
      }
      
      // Add the command group to the parent command
      parentCmd.addSubcommandGroup(commandGroup);
      console.log(`   ✅ Injected '${commandGroup.name}' into /${parentCommand} (${pluginName})`);
    }
  } catch (error) {
    console.error('Failed to inject plugin commands:', error);
  }
}
