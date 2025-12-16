/**
 * Music Player Plugin
 * 
 * 24/7 music playback from local SMB share in a dedicated voice channel.
 * Features:
 * - Continuous playback with shuffle
 * - AI-controlled start/stop/skip
 * - Persistent control buttons in channel
 * - Multiple music folders/playlists
 * 
 * @module plugins/music-player
 */

import { createLogger } from '../../src/logging/logger.js';
import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection
} from '@discordjs/voice';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger('music-player');

// Music configuration
const MUSIC_CONFIG = {
  basePath: '/DATA/Downloads',
  folders: [
    '7clouds',
    '7clouds Country',
    '7clouds Dance',
    '7clouds Drum & Bass',
    '7clouds Dubstep',
    '7clouds Trap',
    '7cloudsAcoustic',
    '7cloudsChristmasMusic',
    '7cloudsIndieOfficial',
    '7cloudsKPop',
    '7cloudsRock',
    '7cloudsTikTok'
  ],
  supportedFormats: ['.mp3', '.mp4', '.m4a', '.webm', '.ogg', '.wav', '.flac'],
  defaultVolume: 0.5
};

// Player state
let player = null;
let connection = null;
let currentTrack = null;
let queue = [];
let isPlaying = false;
let isPaused = false;
let currentFolder = '7clouds';
let volume = MUSIC_CONFIG.defaultVolume;
let controlMessageId = null;
let controlChannelId = null;
let voiceChannelId = null;
let guildId = null;
let client = null;

/**
 * Get all music files from a folder recursively
 */
async function getMusicFiles(folderPath, maxDepth = 2, currentDepth = 0) {
  const files = [];
  
  if (currentDepth > maxDepth) return files;
  
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name);
      
      if (entry.isDirectory() && currentDepth < maxDepth) {
        const subFiles = await getMusicFiles(fullPath, maxDepth, currentDepth + 1);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (MUSIC_CONFIG.supportedFormats.includes(ext)) {
          files.push({
            path: fullPath,
            name: entry.name,
            folder: path.basename(path.dirname(fullPath))
          });
        }
      }
    }
  } catch (error) {
    logger.error(`Error reading folder ${folderPath}:`, error.message);
  }
  
  return files;
}

/**
 * Shuffle array in place
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Load and shuffle music queue from folder
 */
async function loadQueue(folder = currentFolder) {
  const folderPath = path.join(MUSIC_CONFIG.basePath, folder);
  logger.info(`Loading music from: ${folderPath}`);
  
  const files = await getMusicFiles(folderPath);
  queue = shuffleArray(files);
  
  logger.info(`Loaded ${queue.length} tracks from ${folder}`);
  return queue.length;
}

/**
 * Extract track info from filename
 */
function parseTrackName(filename) {
  // Remove extension
  let name = filename.replace(/\.[^/.]+$/, '');
  
  // Remove YouTube ID if present [xxxxx]
  name = name.replace(/\s*\[[^\]]+\]$/, '');
  
  // Try to extract artist and title
  // Format: "Artist - Title" or "[Genre] Artist - Title"
  const genreMatch = name.match(/^\[([^\]]+)\]\s*(.+)$/);
  if (genreMatch) {
    name = genreMatch[2];
  }
  
  const parts = name.split(' - ');
  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim(),
      genre: genreMatch ? genreMatch[1] : null
    };
  }
  
  return {
    artist: 'Unknown',
    title: name.trim(),
    genre: genreMatch ? genreMatch[1] : null
  };
}

/**
 * Play next track in queue
 */
async function playNext() {
  if (queue.length === 0) {
    // Reload and reshuffle when queue is empty
    await loadQueue();
  }
  
  if (queue.length === 0) {
    logger.warn('No tracks available to play');
    return false;
  }
  
  currentTrack = queue.shift();
  
  try {
    const resource = createAudioResource(currentTrack.path, {
      inlineVolume: true
    });
    resource.volume?.setVolume(volume);
    
    player.play(resource);
    isPlaying = true;
    isPaused = false;
    
    const trackInfo = parseTrackName(currentTrack.name);
    logger.info(`Now playing: ${trackInfo.artist} - ${trackInfo.title}`);
    
    // Update control message
    await updateControlMessage();
    
    return true;
  } catch (error) {
    logger.error(`Error playing track: ${error.message}`);
    // Skip to next track on error
    return playNext();
  }
}

/**
 * Create control buttons
 */
function createControlButtons(disabled = false) {
  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('music_prev')
        .setLabel('⏮️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('music_playpause')
        .setLabel(isPaused ? '▶️' : '⏸️')
        .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('music_next')
        .setLabel('⏭️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('music_stop')
        .setLabel('⏹️')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('music_shuffle')
        .setLabel('🔀')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    );
  
  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('music_voldown')
        .setLabel('🔉')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('music_volup')
        .setLabel('🔊')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('music_folder')
        .setLabel('📁 Playlist')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    );
  
  return [row1, row2];
}

/**
 * Create now playing embed
 */
function createNowPlayingEmbed() {
  const trackInfo = currentTrack ? parseTrackName(currentTrack.name) : null;
  
  const embed = new EmbedBuilder()
    .setColor(isPlaying ? (isPaused ? 0xFFA500 : 0x00FF00) : 0xFF0000)
    .setTitle('🎵 Music Player')
    .setDescription(isPlaying 
      ? `**Now Playing:**\n${trackInfo?.title || 'Unknown'}\n*by ${trackInfo?.artist || 'Unknown'}*`
      : '*Not playing*')
    .addFields(
      { name: '📁 Playlist', value: currentFolder, inline: true },
      { name: '🔊 Volume', value: `${Math.round(volume * 100)}%`, inline: true },
      { name: '📋 Queue', value: `${queue.length} tracks`, inline: true }
    )
    .setFooter({ text: isPlaying ? (isPaused ? '⏸️ Paused' : '▶️ Playing') : '⏹️ Stopped' })
    .setTimestamp();
  
  if (trackInfo?.genre) {
    embed.addFields({ name: '🎸 Genre', value: trackInfo.genre, inline: true });
  }
  
  return embed;
}

/**
 * Update the control message
 */
async function updateControlMessage() {
  if (!controlChannelId || !client) return;
  
  try {
    const channel = await client.channels.fetch(controlChannelId);
    if (!channel) return;
    
    const embed = createNowPlayingEmbed();
    const buttons = createControlButtons(!isPlaying && !isPaused);
    
    if (controlMessageId) {
      try {
        const message = await channel.messages.fetch(controlMessageId);
        await message.edit({ embeds: [embed], components: buttons });
        return;
      } catch (e) {
        // Message might have been deleted
        controlMessageId = null;
      }
    }
    
    // Create new control message
    const message = await channel.send({ embeds: [embed], components: buttons });
    controlMessageId = message.id;
    
  } catch (error) {
    logger.error('Error updating control message:', error.message);
  }
}

/**
 * Join voice channel and start playing
 */
async function startPlaying(voiceChannel, textChannel) {
  if (!voiceChannel) {
    throw new Error('No voice channel specified');
  }
  
  voiceChannelId = voiceChannel.id;
  controlChannelId = textChannel?.id || voiceChannel.id;
  guildId = voiceChannel.guild.id;
  
  // Create audio player if not exists
  if (!player) {
    player = createAudioPlayer();
    
    player.on(AudioPlayerStatus.Idle, () => {
      // Play next track when current one ends
      playNext();
    });
    
    player.on('error', (error) => {
      logger.error('Audio player error:', error.message);
      playNext();
    });
  }
  
  // Join voice channel
  connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true
  });
  
  // Handle disconnection
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000)
      ]);
    } catch (error) {
      // Connection was destroyed
      stopPlaying();
    }
  });
  
  // Subscribe player to connection
  connection.subscribe(player);
  
  // Load queue and start playing
  await loadQueue();
  await playNext();
  
  logger.info(`Started playing in ${voiceChannel.name}`);
  return true;
}

/**
 * Stop playing and disconnect
 */
function stopPlaying() {
  if (player) {
    player.stop();
  }
  
  if (connection) {
    connection.destroy();
    connection = null;
  }
  
  isPlaying = false;
  isPaused = false;
  currentTrack = null;
  
  updateControlMessage();
  logger.info('Stopped playing');
}

/**
 * Pause/Resume playback
 */
function togglePause() {
  if (!player) return false;
  
  if (isPaused) {
    player.unpause();
    isPaused = false;
  } else {
    player.pause();
    isPaused = true;
  }
  
  updateControlMessage();
  return !isPaused;
}

/**
 * Skip to next track
 */
async function skip() {
  if (!player) return false;
  player.stop(); // This triggers the Idle event which plays next
  return true;
}

/**
 * Set volume (0-1)
 */
function setVolume(newVolume) {
  volume = Math.max(0, Math.min(1, newVolume));
  
  if (player?.state?.resource?.volume) {
    player.state.resource.volume.setVolume(volume);
  }
  
  updateControlMessage();
  return volume;
}

/**
 * Change playlist/folder
 */
async function changeFolder(folder) {
  if (!MUSIC_CONFIG.folders.includes(folder)) {
    return false;
  }
  
  currentFolder = folder;
  await loadQueue(folder);
  
  if (isPlaying) {
    await playNext();
  }
  
  return true;
}

/**
 * Handle button interactions
 */
async function handleButton(interaction) {
  const { customId } = interaction;
  
  switch (customId) {
    case 'music_playpause':
      if (!isPlaying && !isPaused) {
        // Need to start fresh
        const member = interaction.member;
        if (member?.voice?.channel) {
          await startPlaying(member.voice.channel, interaction.channel);
        } else {
          await interaction.reply({ content: '❌ Join a voice channel first!', ephemeral: true });
          return;
        }
      } else {
        togglePause();
      }
      break;
      
    case 'music_next':
      await skip();
      break;
      
    case 'music_prev':
      // Restart current track (no previous track support yet)
      if (currentTrack) {
        queue.unshift(currentTrack);
        await playNext();
      }
      break;
      
    case 'music_stop':
      stopPlaying();
      break;
      
    case 'music_shuffle':
      shuffleArray(queue);
      await interaction.reply({ content: '🔀 Queue shuffled!', ephemeral: true });
      return;
      
    case 'music_volup':
      setVolume(volume + 0.1);
      break;
      
    case 'music_voldown':
      setVolume(volume - 0.1);
      break;
      
    case 'music_folder':
      // Show folder selection (simplified - just cycle through)
      const currentIndex = MUSIC_CONFIG.folders.indexOf(currentFolder);
      const nextIndex = (currentIndex + 1) % MUSIC_CONFIG.folders.length;
      await changeFolder(MUSIC_CONFIG.folders[nextIndex]);
      break;
  }
  
  await interaction.deferUpdate();
  await updateControlMessage();
}

// Plugin exports
export default {
  name: 'music-player',
  version: '1.0.0',
  description: '24/7 music playback from local files',
  
  async onLoad(pluginContext) {
    logger.info('🎵 Music Player plugin loading...');
    client = pluginContext.client;
  },
  
  async onReady(discordClient) {
    client = discordClient;
    logger.info('🎵 Music Player ready');
  },
  
  // Button handler
  async onInteraction(interaction) {
    if (interaction.isButton() && interaction.customId.startsWith('music_')) {
      await handleButton(interaction);
      return true;
    }
    return false;
  },
  
  // Expose methods for AI actions
  music: {
    start: startPlaying,
    stop: stopPlaying,
    pause: togglePause,
    skip,
    setVolume,
    changeFolder,
    getStatus: () => ({
      isPlaying,
      isPaused,
      currentTrack: currentTrack ? parseTrackName(currentTrack.name) : null,
      currentFolder,
      volume: Math.round(volume * 100),
      queueLength: queue.length
    }),
    getFolders: () => MUSIC_CONFIG.folders,
    updateControlMessage
  }
};
