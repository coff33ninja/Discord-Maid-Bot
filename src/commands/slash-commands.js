import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

// Command definitions
export const commands = [
  new SlashCommandBuilder()
    .setName('scan')
    .setDescription('🔍 Scan network for devices'),

  new SlashCommandBuilder()
    .setName('devices')
    .setDescription('📋 List all known devices')
    .addStringOption(option =>
      option.setName('filter')
        .setDescription('Filter devices (online/offline/all)')
        .addChoices(
          { name: 'Online Only', value: 'online' },
          { name: 'Offline Only', value: 'offline' },
          { name: 'All Devices', value: 'all' }
        )),

  new SlashCommandBuilder()
    .setName('wol')
    .setDescription('⚡ Wake a device with Wake-on-LAN (Admin/Manager only)')
    .addStringOption(option =>
      option.setName('device')
        .setDescription('Select device to wake (or leave empty to see list)')
        .setRequired(false)
        .setAutocomplete(true)),

  new SlashCommandBuilder()
    .setName('speedtest')
    .setDescription('🚀 Test internet speed'),

  new SlashCommandBuilder()
    .setName('speedhistory')
    .setDescription('📊 View speed test history')
    .addIntegerOption(option =>
      option.setName('days')
        .setDescription('Number of days to show')
        .setMinValue(1)
        .setMaxValue(30)),

  new SlashCommandBuilder()
    .setName('research')
    .setDescription('🔎 Research a topic with AI')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('What to research')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('researchhistory')
    .setDescription('📚 View past research')
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of results to show')
        .setMinValue(5)
        .setMaxValue(50)),

  new SlashCommandBuilder()
    .setName('researchsearch')
    .setDescription('🔍 Search through past research with full-text search')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('Search terms')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('id')
        .setDescription('View full result by ID')),

  new SlashCommandBuilder()
    .setName('websearch')
    .setDescription('🌐 Search the web (DuckDuckGo)')
    .addStringOption(option =>
      option.setName('query')
        .setDescription('What to search for')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('results')
        .setDescription('Number of results (1-10)')
        .setMinValue(1)
        .setMaxValue(10)),

  new SlashCommandBuilder()
    .setName('weather')
    .setDescription('🌤️ Get weather information')
    .addStringOption(option =>
      option.setName('city')
        .setDescription('City name')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('chat')
    .setDescription('💬 Chat with maid assistant')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Your message')
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('⏰ Manage scheduled tasks')
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all scheduled tasks'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new scheduled task')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Task name')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('schedule')
            .setDescription('Cron expression (e.g., "0 */6 * * *" for every 6 hours)')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('command')
            .setDescription('Command to run')
            .setRequired(true)
            .addChoices(
              { name: 'Network Scan', value: 'scan' },
              { name: 'Speed Test', value: 'speedtest' },
              { name: 'Weather Update', value: 'weather' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('Enable/disable a task')
        .addIntegerOption(option =>
          option.setName('id')
            .setDescription('Task ID')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete a task')
        .addIntegerOption(option =>
          option.setName('id')
            .setDescription('Task ID')
            .setRequired(true))),

  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('📊 View bot statistics'),

  new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('🌐 Get web dashboard URL'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('❓ Show help and available commands'),

  new SlashCommandBuilder()
    .setName('personality')
    .setDescription('🎭 Change bot personality')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Select a personality')
        .setRequired(false)
        .addChoices(
          { name: '🌸 Devoted Maid', value: 'maid' },
          { name: '💢 Tsundere', value: 'tsundere' },
          { name: '❄️ Kuudere', value: 'kuudere' },
          { name: '🥺 Dandere', value: 'dandere' },
          { name: '🖤 Yandere', value: 'yandere' },
          { name: '⭐ Genki', value: 'genki' },
          { name: '💋 Onee-san', value: 'oneesan' },
          { name: '🔮 Chuunibyou', value: 'chuunibyou' },
          { name: '🎩 Butler', value: 'butler' },
          { name: '🐱 Catgirl', value: 'catgirl' }
        )),

  // Permission management
  new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('👥 Manage user permissions (Admin only)')
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
              { name: 'Viewer', value: 'viewer' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('check')
        .setDescription('Check user permissions')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to check')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all Discord users with roles')),

  // Tailscale commands
  new SlashCommandBuilder()
    .setName('tailscale')
    .setDescription('🌐 Tailscale network management')
    .addSubcommand(subcommand =>
      subcommand
        .setName('devices')
        .setDescription('List Tailscale devices'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Show Tailscale status')),

  // Home Assistant commands
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
        .setDescription('List ESP devices')),

  // Plugin commands
  new SlashCommandBuilder()
    .setName('plugin')
    .setDescription('🔌 Manage plugins')
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
            .setRequired(true))),

  // Trivia Game commands
  new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('🎮 Play trivia games!')
    .addSubcommand(subcommand =>
      subcommand
        .setName('play')
        .setDescription('Start an AI trivia game')
        .addStringOption(option =>
          option.setName('category')
            .setDescription('Question category')
            .addChoices(
              { name: '🧠 General Knowledge', value: 'general' },
              { name: '🔬 Science & Nature', value: 'science' },
              { name: '📜 History', value: 'history' },
              { name: '🌍 Geography', value: 'geography' },
              { name: '🎌 Anime & Manga', value: 'anime' },
              { name: '🎮 Video Games', value: 'gaming' },
              { name: '💻 Technology', value: 'tech' },
              { name: '🎬 Movies & TV', value: 'movies' },
              { name: '🎵 Music', value: 'music' },
              { name: '⚽ Sports', value: 'sports' }
            ))
        .addStringOption(option =>
          option.setName('difficulty')
            .setDescription('Difficulty level')
            .addChoices(
              { name: '🟢 Easy', value: 'easy' },
              { name: '🟡 Medium', value: 'medium' },
              { name: '🔴 Hard', value: 'hard' }
            ))
        .addIntegerOption(option =>
          option.setName('questions')
            .setDescription('Number of questions (1-10)')
            .setMinValue(1)
            .setMaxValue(10)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('research')
        .setDescription('Research a topic then answer questions about it')
        .addStringOption(option =>
          option.setName('topic')
            .setDescription('Topic to research and quiz on')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('reading_time')
            .setDescription('Seconds to read (30-180)')
            .setMinValue(30)
            .setMaxValue(180))
        .addIntegerOption(option =>
          option.setName('questions')
            .setDescription('Number of questions (3-10)')
            .setMinValue(3)
            .setMaxValue(10)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('speed')
        .setDescription('Speed round - quick fire questions!')
        .addIntegerOption(option =>
          option.setName('questions')
            .setDescription('Number of questions (5-20)')
            .setMinValue(5)
            .setMaxValue(20)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('stop')
        .setDescription('Stop the current trivia game'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View your trivia statistics'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('View the trivia leaderboard'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('Configure your trivia settings')
        .addIntegerOption(option =>
          option.setName('question_time')
            .setDescription('Seconds per question (10-60)')
            .setMinValue(10)
            .setMaxValue(60))
        .addIntegerOption(option =>
          option.setName('reading_time')
            .setDescription('Default reading time for research mode (30-180)')
            .setMinValue(30)
            .setMaxValue(180))),

  // Hangman
  new SlashCommandBuilder()
    .setName('hangman')
    .setDescription('🎯 Play Hangman!')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Word category')
        .addChoices(
          { name: '🎲 Random', value: 'random' },
          { name: '🐾 Animals', value: 'animals' },
          { name: '🎬 Movies', value: 'movies' },
          { name: '🌍 Countries', value: 'countries' },
          { name: '🍕 Food', value: 'food' },
          { name: '💻 Technology', value: 'technology' },
          { name: '🎌 Anime', value: 'anime' },
          { name: '⚽ Sports', value: 'sports' }
        )),

  // Number Guess
  new SlashCommandBuilder()
    .setName('numguess')
    .setDescription('🔢 Guess the number!')
    .addIntegerOption(option =>
      option.setName('max')
        .setDescription('Maximum number (default: 100)')
        .setMinValue(10)
        .setMaxValue(1000))
    .addIntegerOption(option =>
      option.setName('attempts')
        .setDescription('Max attempts (default: 10)')
        .setMinValue(3)
        .setMaxValue(20)),

  // Rock Paper Scissors
  new SlashCommandBuilder()
    .setName('rps')
    .setDescription('✂️ Rock Paper Scissors!')
    .addSubcommand(subcommand =>
      subcommand
        .setName('challenge')
        .setDescription('Challenge another player')
        .addUserOption(option =>
          option.setName('opponent')
            .setDescription('Who to challenge')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('best_of')
            .setDescription('Best of X rounds (default: 3)')
            .addChoices(
              { name: 'Best of 1', value: 1 },
              { name: 'Best of 3', value: 3 },
              { name: 'Best of 5', value: 5 }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('quick')
        .setDescription('Quick game against the bot')),

  // Tic Tac Toe
  new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('⭕ Tic Tac Toe!')
    .addSubcommand(subcommand =>
      subcommand
        .setName('challenge')
        .setDescription('Challenge another player')
        .addUserOption(option =>
          option.setName('opponent')
            .setDescription('Who to challenge')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('ai')
        .setDescription('Play against the bot')),

  // 20 Questions
  new SlashCommandBuilder()
    .setName('20questions')
    .setDescription('🤔 Play 20 Questions with AI!')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('What should I think of?')
        .addChoices(
          { name: '🎲 Anything', value: 'anything' },
          { name: '👤 Famous Person', value: 'person' },
          { name: '🌍 Place', value: 'place' },
          { name: '🐾 Animal', value: 'animal' },
          { name: '📦 Object', value: 'object' },
          { name: '🍕 Food', value: 'food' },
          { name: '🎬 Movie/Show', value: 'movie' },
          { name: '🎌 Anime Character', value: 'anime' }
        )),

  // Riddles
  new SlashCommandBuilder()
    .setName('riddle')
    .setDescription('🧩 Riddle game!')
    .addStringOption(option =>
      option.setName('difficulty')
        .setDescription('How hard?')
        .addChoices(
          { name: '🟢 Easy', value: 'easy' },
          { name: '🟡 Medium', value: 'medium' },
          { name: '🔴 Hard', value: 'hard' }
        ))
    .addIntegerOption(option =>
      option.setName('rounds')
        .setDescription('Number of riddles (1-10)')
        .setMinValue(1)
        .setMaxValue(10)),

  // Word Chain
  new SlashCommandBuilder()
    .setName('wordchain')
    .setDescription('🔗 Word Chain game!')
    .addStringOption(option =>
      option.setName('start')
        .setDescription('Starting word (optional)'))
    .addStringOption(option =>
      option.setName('theme')
        .setDescription('Word theme/category')
        .addChoices(
          { name: '🎲 Any Words', value: 'any' },
          { name: '🐾 Animals', value: 'animals' },
          { name: '🍕 Food & Drinks', value: 'food' },
          { name: '🌍 Countries & Places', value: 'places' },
          { name: '🔬 Science & Nature', value: 'science' },
          { name: '🎬 Movies & Entertainment', value: 'entertainment' }
        ))
    .addStringOption(option =>
      option.setName('difficulty')
        .setDescription('Difficulty level')
        .addChoices(
          { name: '🟢 Easy (30s, hints)', value: 'easy' },
          { name: '🟡 Normal (20s)', value: 'normal' },
          { name: '🔴 Hard (15s, no AI help)', value: 'hard' },
          { name: '💀 Expert (10s, 5+ letters)', value: 'expert' }
        ))
    .addBooleanOption(option =>
      option.setName('definitions')
        .setDescription('Show word definitions after each valid word'))
    .addBooleanOption(option =>
      option.setName('trust_mode')
        .setDescription('Skip word validation entirely (honor system)')),

  // Emoji Decode
  new SlashCommandBuilder()
    .setName('emojidecode')
    .setDescription('🔮 Guess from emojis!')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Category')
        .addChoices(
          { name: '🎲 Random Mix', value: 'random' },
          { name: '🎬 Movies', value: 'movies' },
          { name: '🎵 Songs', value: 'songs' },
          { name: '🎌 Anime', value: 'anime' },
          { name: '🎮 Video Games', value: 'games' },
          { name: '📺 TV Shows', value: 'tvshows' },
          { name: '💬 Phrases', value: 'phrases' }
        ))
    .addIntegerOption(option =>
      option.setName('rounds')
        .setDescription('Number of rounds (1-10)')
        .setMinValue(1)
        .setMaxValue(10)),

  // Would You Rather
  new SlashCommandBuilder()
    .setName('wouldyourather')
    .setDescription('🤔 Would You Rather game!')
    .addIntegerOption(option =>
      option.setName('rounds')
        .setDescription('Number of rounds (1-10)')
        .setMinValue(1)
        .setMaxValue(10))
    .addStringOption(option =>
      option.setName('theme')
        .setDescription('Theme for scenarios')
        .addChoices(
          { name: '🎲 Random', value: 'random' },
          { name: '🦸 Superpowers', value: 'superpowers' },
          { name: '💰 Money', value: 'money' },
          { name: '🌍 Travel', value: 'travel' },
          { name: '🍕 Food', value: 'food' },
          { name: '😱 Scary', value: 'scary' }
        ))
    .addStringOption(option =>
      option.setName('option_a')
        .setDescription('Custom option A (requires option_b)'))
    .addStringOption(option =>
      option.setName('option_b')
        .setDescription('Custom option B (requires option_a)')),

  // Caption Contest
  new SlashCommandBuilder()
    .setName('caption')
    .setDescription('📝 Caption Contest game!')
    .addIntegerOption(option =>
      option.setName('rounds')
        .setDescription('Number of rounds (1-5)')
        .setMinValue(1)
        .setMaxValue(5)),

  // Acronym Game
  new SlashCommandBuilder()
    .setName('acronym')
    .setDescription('🔤 Acronym game!')
    .addIntegerOption(option =>
      option.setName('rounds')
        .setDescription('Number of rounds (1-10)')
        .setMinValue(1)
        .setMaxValue(10))
    .addIntegerOption(option =>
      option.setName('letters')
        .setDescription('Number of letters (2-5)')
        .setMinValue(2)
        .setMaxValue(5)),

  // Story Builder
  new SlashCommandBuilder()
    .setName('story')
    .setDescription('📖 Collaborative Story Builder!')
    .addStringOption(option =>
      option.setName('theme')
        .setDescription('Story theme')
        .addChoices(
          { name: '⚔️ Adventure', value: 'adventure' },
          { name: '👻 Horror', value: 'horror' },
          { name: '💕 Romance', value: 'romance' },
          { name: '🚀 Sci-Fi', value: 'scifi' },
          { name: '🧙 Fantasy', value: 'fantasy' },
          { name: '😂 Comedy', value: 'comedy' }
        ))
    .addIntegerOption(option =>
      option.setName('turns')
        .setDescription('Max turns (5-20)')
        .setMinValue(5)
        .setMaxValue(20)),

  // Connect Four
  new SlashCommandBuilder()
    .setName('connect4')
    .setDescription('🔴🟡 Connect Four!')
    .addSubcommand(subcommand =>
      subcommand
        .setName('challenge')
        .setDescription('Challenge another player')
        .addUserOption(option =>
          option.setName('opponent')
            .setDescription('Player to challenge')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('ai')
        .setDescription('Play against AI')),

  // Math Blitz
  new SlashCommandBuilder()
    .setName('mathblitz')
    .setDescription('🔢 Math Blitz!')
    .addStringOption(option =>
      option.setName('difficulty')
        .setDescription('Difficulty level')
        .addChoices(
          { name: '🟢 Easy', value: 'easy' },
          { name: '🟡 Medium', value: 'medium' },
          { name: '🔴 Hard', value: 'hard' }
        ))
    .addIntegerOption(option =>
      option.setName('problems')
        .setDescription('Number of problems (5-20)')
        .setMinValue(5)
        .setMaxValue(20)),

  // Reaction Race
  new SlashCommandBuilder()
    .setName('reaction')
    .setDescription('⚡ Reaction Race!')
    .addIntegerOption(option =>
      option.setName('rounds')
        .setDescription('Number of rounds (3-10)')
        .setMinValue(3)
        .setMaxValue(10)),

  // Mafia
  new SlashCommandBuilder()
    .setName('mafia')
    .setDescription('🔪 Mafia/Werewolf game!')
    .addIntegerOption(option =>
      option.setName('min_players')
        .setDescription('Minimum players to start (4-10)')
        .setMinValue(4)
        .setMaxValue(10)),

  // Game utilities
  new SlashCommandBuilder()
    .setName('game')
    .setDescription('🎮 Game utilities')
    .addSubcommand(subcommand =>
      subcommand
        .setName('stop')
        .setDescription('Stop the current game in this channel'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View your game statistics'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('View the games leaderboard'))
];

// Register commands with Discord
export async function registerCommands(client) {
  try {
    console.log('📝 Registering slash commands...');
    
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
