/**
 * Music Player Commands
 * 
 * Slash commands for music control
 */

import { SlashCommandBuilder, EmbedBuilder, ChannelType } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';

const logger = createLogger('music-player');

// Standalone plugin - defines its own commands
export const parentCommand = null;

// Commands this plugin handles
export const handlesCommands = ['music'];

/**
 * Command definitions - /music
 */
export const commands = [
  new SlashCommandBuilder()
    .setName('music')
    .setDescription('🎵 Music player controls')
    .addSubcommand(sub => sub
      .setName('play')
      .setDescription('Start playing music')
      .addChannelOption(opt => opt
        .setName('channel')
        .setDescription('Voice channel to play in')
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(false)))
    .addSubcommand(sub => sub
      .setName('stop')
      .setDescription('Stop playing and disconnect'))
    .addSubcommand(sub => sub
      .setName('pause')
      .setDescription('Pause/resume playback'))
    .addSubcommand(sub => sub
      .setName('skip')
      .setDescription('Skip to next track'))
    .addSubcommand(sub => sub
      .setName('volume')
      .setDescription('Set volume')
      .addIntegerOption(opt => opt
        .setName('level')
        .setDescription('Volume level (0-100)')
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(true)))
    .addSubcommand(sub => sub
      .setName('playlist')
      .setDescription('Change playlist/folder')
      .addStringOption(opt => opt
        .setName('name')
        .setDescription('Playlist name')
        .setRequired(true)
        .addChoices(
          { name: '7clouds (NCS)', value: '7clouds' },
          { name: 'Country', value: '7clouds Country' },
          { name: 'Dance', value: '7clouds Dance' },
          { name: 'Drum & Bass', value: '7clouds Drum & Bass' },
          { name: 'Dubstep', value: '7clouds Dubstep' },
          { name: 'Trap', value: '7clouds Trap' },
          { name: 'Acoustic', value: '7cloudsAcoustic' },
          { name: 'Christmas', value: '7cloudsChristmasMusic' },
          { name: 'Indie', value: '7cloudsIndieOfficial' },
          { name: 'K-Pop', value: '7cloudsKPop' },
          { name: 'Rock', value: '7cloudsRock' },
          { name: 'TikTok Hits', value: '7cloudsTikTok' }
        )))
    .addSubcommand(sub => sub
      .setName('nowplaying')
      .setDescription('Show current track info'))
    .addSubcommand(sub => sub
      .setName('controls')
      .setDescription('Send control panel to this channel'))
];

/**
 * Handle music commands
 */
export async function handleCommand(interaction, commandName, subcommand, plugin) {
  if (commandName !== 'music') return false;
  
  // Get the music methods from the plugin
  const music = plugin?.music;
  if (!music) {
    await interaction.reply({ content: '❌ Music player not available', ephemeral: true });
    return true;
  }
  
  switch (subcommand) {
    case 'play':
      return await handlePlayCommand(interaction, music);
    case 'stop':
      return await handleStopCommand(interaction, music);
    case 'pause':
      return await handlePauseCommand(interaction, music);
    case 'skip':
      return await handleSkipCommand(interaction, music);
    case 'volume':
      return await handleVolumeCommand(interaction, music);
    case 'playlist':
      return await handlePlaylistCommand(interaction, music);
    case 'nowplaying':
      return await handleNowPlayingCommand(interaction, music);
    case 'controls':
      return await handleControlsCommand(interaction, music);
    default:
      return false;
  }
}

/**
 * /music play - Start playing music
 */
async function handlePlayCommand(interaction, music) {
  let voiceChannel = interaction.options.getChannel('channel');
  
  if (!voiceChannel) {
    voiceChannel = interaction.member?.voice?.channel;
  }
  
  if (!voiceChannel) {
    await interaction.reply({ 
      content: '❌ Please join a voice channel or specify one!', 
      ephemeral: true 
    });
    return true;
  }
  
  await interaction.deferReply();
  
  try {
    await music.start(voiceChannel, interaction.channel);
    const status = music.getStatus();
    
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🎵 Music Started!')
      .setDescription(`Playing in **${voiceChannel.name}**`)
      .addFields(
        { name: '📁 Playlist', value: status.currentFolder, inline: true },
        { name: '📋 Queue', value: `${status.queueLength} tracks`, inline: true }
      )
      .setFooter({ text: 'Use /music controls to get the control panel' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    return true;
  } catch (error) {
    logger.error('Play command error:', error);
    await interaction.editReply(`❌ Error: ${error.message}`);
    return true;
  }
}

/**
 * /music stop - Stop playing
 */
async function handleStopCommand(interaction, music) {
  music.stop();
  await interaction.reply('⏹️ Music stopped');
  return true;
}

/**
 * /music pause - Pause/resume
 */
async function handlePauseCommand(interaction, music) {
  const playing = music.pause();
  await interaction.reply(playing ? '▶️ Resumed' : '⏸️ Paused');
  return true;
}

/**
 * /music skip - Skip track
 */
async function handleSkipCommand(interaction, music) {
  await music.skip();
  await interaction.reply('⏭️ Skipped to next track');
  return true;
}

/**
 * /music volume - Set volume
 */
async function handleVolumeCommand(interaction, music) {
  const level = interaction.options.getInteger('level');
  music.setVolume(level / 100);
  await interaction.reply(`🔊 Volume set to ${level}%`);
  return true;
}

/**
 * /music playlist - Change playlist
 */
async function handlePlaylistCommand(interaction, music) {
  const name = interaction.options.getString('name');
  await interaction.deferReply();
  
  const success = await music.changeFolder(name);
  if (success) {
    const status = music.getStatus();
    await interaction.editReply(`📁 Switched to playlist: **${name}** (${status.queueLength} tracks)`);
  } else {
    await interaction.editReply('❌ Playlist not found');
  }
  return true;
}

/**
 * /music nowplaying - Show current track
 */
async function handleNowPlayingCommand(interaction, music) {
  const status = music.getStatus();
  
  if (!status.isPlaying) {
    await interaction.reply({ content: '🔇 Not playing anything', ephemeral: true });
    return true;
  }
  
  const track = status.currentTrack;
  const embed = new EmbedBuilder()
    .setColor('#667eea')
    .setTitle('🎵 Now Playing')
    .setDescription(`**${track?.title || 'Unknown'}**\n*by ${track?.artist || 'Unknown'}*`)
    .addFields(
      { name: '📁 Playlist', value: status.currentFolder, inline: true },
      { name: '🔊 Volume', value: `${status.volume}%`, inline: true },
      { name: '📋 Queue', value: `${status.queueLength} tracks`, inline: true }
    )
    .setFooter({ text: status.isPaused ? '⏸️ Paused' : '▶️ Playing' })
    .setTimestamp();
  
  if (track?.genre) {
    embed.addFields({ name: '🎸 Genre', value: track.genre, inline: true });
  }
  
  await interaction.reply({ embeds: [embed] });
  return true;
}

/**
 * /music controls - Send control panel
 */
async function handleControlsCommand(interaction, music) {
  await interaction.deferReply({ ephemeral: true });
  await music.updateControlMessage();
  await interaction.editReply('✅ Control panel sent!');
  return true;
}

export default commands;
