/**
 * Music Player Plugin
 * 
 * 24/7 music playback from local files in a dedicated voice channel.
 * Features:
 * - Continuous playback with shuffle
 * - AI-controlled start/stop/skip
 * - Persistent control buttons in channel
 * - Multiple music folders/playlists
 * 
 * @module plugins/music-player
 */

import { Plugin } from '../../src/core/plugin-system.js';
import { createLogger } from '../../src/logging/logger.js';
import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState
} from '@discordjs/voice';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

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
  defaultVolume: 0.5,
  // Auto-start configuration
  autoStart: true,
  voiceChannelName: '🎵 Music 24/7',
  textChannelName: '🎵-music-controls',
  channelCategory: null, // Set to category ID if you want channels in a specific category
  configFile: '/home/think/discord-maid-bot/data/music-config.json' // Persist guild settings
};

export default class MusicPlayerPlugin extends Plugin {
  constructor() {
    super('music-player', '1.0.0', '24/7 music playback from local files');
    this.logger = createLogger('music-player');
    
    // Player state
    this.player = null;
    this.connection = null;
    this.currentTrack = null;
    this.queue = [];
    this.isPlaying = false;
    this.isPaused = false;
    this.currentFolder = '7clouds';
    this.volume = MUSIC_CONFIG.defaultVolume;
    this.controlMessageId = null;
    this.controlChannelId = null;
    this.voiceChannelId = null;
    this.guildId = null;
    this.client = null;
  }
  
  async onLoad() {
    this.logger.info('🎵 Music Player plugin loading...');
    await this.loadConfig();
  }
  
  /**
   * Load saved configuration (guild ID, channel IDs)
   */
  async loadConfig() {
    try {
      const data = await fs.readFile(MUSIC_CONFIG.configFile, 'utf8');
      const config = JSON.parse(data);
      this.savedGuildId = config.guildId || null;
      this.savedVoiceChannelId = config.voiceChannelId || null;
      this.savedTextChannelId = config.textChannelId || null;
      this.logger.info(`Loaded music config for guild: ${this.savedGuildId}`);
    } catch (error) {
      // No config file yet - that's okay
      this.savedGuildId = null;
      this.savedVoiceChannelId = null;
      this.savedTextChannelId = null;
    }
  }
  
  /**
   * Save configuration (guild ID, channel IDs)
   */
  async saveConfig() {
    try {
      // Ensure data directory exists
      const dir = path.dirname(MUSIC_CONFIG.configFile);
      await fs.mkdir(dir, { recursive: true });
      
      const config = {
        guildId: this.guildId,
        voiceChannelId: this.voiceChannelId,
        textChannelId: this.controlChannelId
      };
      await fs.writeFile(MUSIC_CONFIG.configFile, JSON.stringify(config, null, 2));
      this.logger.info(`Saved music config for guild: ${this.guildId}`);
    } catch (error) {
      this.logger.error('Failed to save music config:', error.message);
    }
  }
  
  async onReady(discordClient) {
    this.client = discordClient;
    this.logger.info('🎵 Music Player ready');
  }
  
  /**
   * Called by bot.js when Discord client is ready
   */
  setClient(discordClient) {
    this.client = discordClient;
    this.logger.info('🎵 Music Player received Discord client');
    
    // Auto-start music if enabled
    if (MUSIC_CONFIG.autoStart) {
      // Small delay to ensure everything is ready
      setTimeout(() => this.autoStartMusic(), 5000);
    }
  }
  
  /**
   * Auto-create channels and start playing on bot startup
   */
  async autoStartMusic() {
    this.logger.info('🎵 Auto-starting music player...');
    
    try {
      // Use saved guild ID, env var, or first guild
      const guildId = this.savedGuildId || process.env.MUSIC_GUILD_ID || this.client.guilds.cache.first()?.id;
      if (!guildId) {
        this.logger.warn('No guild configured for auto-start. Use "@bot setup music" in a server first.');
        return;
      }
      
      const guild = await this.client.guilds.fetch(guildId);
      if (!guild) {
        this.logger.warn(`Guild ${guildId} not found`);
        return;
      }
      
      this.guildId = guildId;
      
      // Find or create voice channel
      let voiceChannel = guild.channels.cache.find(
        c => c.type === 2 && c.name === MUSIC_CONFIG.voiceChannelName
      );
      
      if (!voiceChannel) {
        this.logger.info(`Creating voice channel: ${MUSIC_CONFIG.voiceChannelName}`);
        voiceChannel = await guild.channels.create({
          name: MUSIC_CONFIG.voiceChannelName,
          type: 2, // GuildVoice
          parent: MUSIC_CONFIG.channelCategory,
          reason: 'Music Player auto-setup'
        });
      }
      
      // Find or create text channel for controls
      let textChannel = guild.channels.cache.find(
        c => c.type === 0 && c.name === MUSIC_CONFIG.textChannelName.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
      );
      
      if (!textChannel) {
        this.logger.info(`Creating text channel: ${MUSIC_CONFIG.textChannelName}`);
        textChannel = await guild.channels.create({
          name: MUSIC_CONFIG.textChannelName,
          type: 0, // GuildText
          parent: MUSIC_CONFIG.channelCategory,
          topic: '🎵 Music player controls - Use the buttons below to control playback!',
          reason: 'Music Player auto-setup'
        });
        
        // Clean channel and send initial control message
        await this.setupControlChannel(textChannel);
      } else {
        // Channel exists, find or create control message
        this.controlChannelId = textChannel.id;
        await this.findOrCreateControlMessage(textChannel);
      }
      
      this.voiceChannelId = voiceChannel.id;
      this.controlChannelId = textChannel.id;
      
      // Start playing
      await this.start(voiceChannel, textChannel);
      this.logger.info(`🎵 Auto-started in ${voiceChannel.name}`);
      
    } catch (error) {
      this.logger.error('Auto-start failed:', error.message);
    }
  }
  
  /**
   * Setup the control channel with a persistent message
   */
  async setupControlChannel(channel) {
    try {
      // Delete old messages (clean slate)
      const messages = await channel.messages.fetch({ limit: 10 });
      const botMessages = messages.filter(m => m.author.id === this.client.user.id);
      for (const msg of botMessages.values()) {
        await msg.delete().catch(() => {});
      }
      
      // Send welcome message
      const welcomeEmbed = new EmbedBuilder()
        .setColor('#667eea')
        .setTitle('🎵 Welcome to the Music Channel!')
        .setDescription('This channel controls the 24/7 music player.\nUse the buttons below to control playback!')
        .addFields(
          { name: '▶️ Play/Pause', value: 'Start or pause music', inline: true },
          { name: '⏭️ Skip', value: 'Skip to next track', inline: true },
          { name: '🔀 Shuffle', value: 'Shuffle the queue', inline: true },
          { name: '📁 Playlist', value: 'Cycle through playlists', inline: true },
          { name: '🔊 Volume', value: 'Adjust volume up/down', inline: true },
          { name: '⏹️ Stop', value: 'Stop playback', inline: true }
        )
        .setFooter({ text: 'Music plays 24/7 - Enjoy!' });
      
      await channel.send({ embeds: [welcomeEmbed] });
      
      // Send control panel
      const embed = this.createNowPlayingEmbed();
      const buttons = this.createControlButtons(true);
      const controlMsg = await channel.send({ embeds: [embed], components: buttons });
      this.controlMessageId = controlMsg.id;
      
    } catch (error) {
      this.logger.error('Error setting up control channel:', error.message);
    }
  }
  
  /**
   * Find existing control message or create new one
   */
  async findOrCreateControlMessage(channel) {
    try {
      const messages = await channel.messages.fetch({ limit: 20 });
      const controlMsg = messages.find(m => 
        m.author.id === this.client.user.id && 
        m.embeds.length > 0 && 
        m.embeds[0].title === '🎵 Music Player'
      );
      
      if (controlMsg) {
        this.controlMessageId = controlMsg.id;
      } else {
        const embed = this.createNowPlayingEmbed();
        const buttons = this.createControlButtons(true);
        const newMsg = await channel.send({ embeds: [embed], components: buttons });
        this.controlMessageId = newMsg.id;
      }
    } catch (error) {
      this.logger.error('Error finding control message:', error.message);
    }
  }
  
  async onUnload() {
    this.stop();
    this.logger.info('🎵 Music Player unloaded');
  }
  
  // Handle button interactions
  async onInteraction(interaction) {
    if (interaction.isButton() && interaction.customId.startsWith('music_')) {
      await this.handleButton(interaction);
      return true;
    }
    return false;
  }


  // ============ MUSIC METHODS ============
  
  /**
   * Get all music files from a folder recursively
   */
  async getMusicFiles(folderPath, maxDepth = 2, currentDepth = 0) {
    const files = [];
    if (currentDepth > maxDepth) return files;
    
    try {
      const entries = await fs.readdir(folderPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        
        if (entry.isDirectory() && currentDepth < maxDepth) {
          const subFiles = await this.getMusicFiles(fullPath, maxDepth, currentDepth + 1);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (MUSIC_CONFIG.supportedFormats.includes(ext)) {
            files.push({ path: fullPath, name: entry.name, folder: path.basename(path.dirname(fullPath)) });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error reading folder ${folderPath}:`, error.message);
    }
    return files;
  }
  
  /**
   * Shuffle array in place
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  /**
   * Load and shuffle music queue from folder
   */
  async loadQueue(folder = this.currentFolder) {
    const folderPath = path.join(MUSIC_CONFIG.basePath, folder);
    this.logger.info(`Loading music from: ${folderPath}`);
    
    const files = await this.getMusicFiles(folderPath);
    this.queue = this.shuffleArray(files);
    
    this.logger.info(`Loaded ${this.queue.length} tracks from ${folder}`);
    return this.queue.length;
  }
  
  /**
   * Extract track info from filename
   */
  parseTrackName(filename) {
    let name = filename.replace(/\.[^/.]+$/, '');
    name = name.replace(/\s*\[[^\]]+\]$/, '');
    
    const genreMatch = name.match(/^\[([^\]]+)\]\s*(.+)$/);
    if (genreMatch) name = genreMatch[2];
    
    const parts = name.split(' - ');
    if (parts.length >= 2) {
      return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim(), genre: genreMatch ? genreMatch[1] : null };
    }
    return { artist: 'Unknown', title: name.trim(), genre: genreMatch ? genreMatch[1] : null };
  }
  
  /**
   * Play next track in queue
   */
  async playNext() {
    if (this.queue.length === 0) await this.loadQueue();
    if (this.queue.length === 0) {
      this.logger.warn('No tracks available to play');
      return false;
    }
    
    this.currentTrack = this.queue.shift();
    
    try {
      const resource = createAudioResource(this.currentTrack.path, { inlineVolume: true });
      resource.volume?.setVolume(this.volume);
      
      this.player.play(resource);
      this.isPlaying = true;
      this.isPaused = false;
      
      const trackInfo = this.parseTrackName(this.currentTrack.name);
      this.logger.info(`Now playing: ${trackInfo.artist} - ${trackInfo.title}`);
      
      await this.updateControlMessage();
      return true;
    } catch (error) {
      this.logger.error(`Error playing track: ${error.message}`);
      return this.playNext();
    }
  }


  /**
   * Create control buttons
   */
  createControlButtons(disabled = false) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('music_prev').setLabel('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
      new ButtonBuilder().setCustomId('music_playpause').setLabel(this.isPaused ? '▶️' : '⏸️').setStyle(this.isPaused ? ButtonStyle.Success : ButtonStyle.Primary).setDisabled(disabled),
      new ButtonBuilder().setCustomId('music_next').setLabel('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
      new ButtonBuilder().setCustomId('music_stop').setLabel('⏹️').setStyle(ButtonStyle.Danger).setDisabled(disabled),
      new ButtonBuilder().setCustomId('music_shuffle').setLabel('🔀').setStyle(ButtonStyle.Secondary).setDisabled(disabled)
    );
    
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('music_voldown').setLabel('🔉').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
      new ButtonBuilder().setCustomId('music_volup').setLabel('🔊').setStyle(ButtonStyle.Secondary).setDisabled(disabled),
      new ButtonBuilder().setCustomId('music_folder').setLabel('📁 Playlist').setStyle(ButtonStyle.Secondary).setDisabled(disabled)
    );
    
    return [row1, row2];
  }
  
  /**
   * Create now playing embed
   */
  createNowPlayingEmbed() {
    const trackInfo = this.currentTrack ? this.parseTrackName(this.currentTrack.name) : null;
    
    const embed = new EmbedBuilder()
      .setColor(this.isPlaying ? (this.isPaused ? 0xFFA500 : 0x00FF00) : 0xFF0000)
      .setTitle('🎵 Music Player')
      .setDescription(this.isPlaying 
        ? `**Now Playing:**\n${trackInfo?.title || 'Unknown'}\n*by ${trackInfo?.artist || 'Unknown'}*`
        : '*Not playing*')
      .addFields(
        { name: '📁 Playlist', value: this.currentFolder, inline: true },
        { name: '🔊 Volume', value: `${Math.round(this.volume * 100)}%`, inline: true },
        { name: '📋 Queue', value: `${this.queue.length} tracks`, inline: true }
      )
      .setFooter({ text: this.isPlaying ? (this.isPaused ? '⏸️ Paused' : '▶️ Playing') : '⏹️ Stopped' })
      .setTimestamp();
    
    if (trackInfo?.genre) embed.addFields({ name: '🎸 Genre', value: trackInfo.genre, inline: true });
    return embed;
  }
  
  /**
   * Update the control message
   */
  async updateControlMessage() {
    if (!this.controlChannelId || !this.client) return;
    
    try {
      const channel = await this.client.channels.fetch(this.controlChannelId);
      if (!channel) return;
      
      const embed = this.createNowPlayingEmbed();
      const buttons = this.createControlButtons(!this.isPlaying && !this.isPaused);
      
      if (this.controlMessageId) {
        try {
          const message = await channel.messages.fetch(this.controlMessageId);
          await message.edit({ embeds: [embed], components: buttons });
          return;
        } catch (e) {
          this.controlMessageId = null;
        }
      }
      
      const message = await channel.send({ embeds: [embed], components: buttons });
      this.controlMessageId = message.id;
    } catch (error) {
      this.logger.error('Error updating control message:', error.message);
    }
  }


  /**
   * Join voice channel and start playing
   */
  async start(voiceChannel, textChannel) {
    if (!voiceChannel) throw new Error('No voice channel specified');
    
    this.voiceChannelId = voiceChannel.id;
    this.controlChannelId = textChannel?.id || voiceChannel.id;
    this.guildId = voiceChannel.guild.id;
    
    if (!this.player) {
      this.player = createAudioPlayer();
      this.player.on(AudioPlayerStatus.Idle, () => this.playNext());
      this.player.on('error', (error) => {
        this.logger.error('Audio player error:', error.message);
        this.playNext();
      });
    }
    
    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true
    });
    
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5000)
        ]);
      } catch (error) {
        // Try to reconnect instead of stopping (24/7 mode)
        this.logger.warn('Disconnected, attempting to reconnect...');
        setTimeout(() => this.reconnect(), 3000);
      }
    });
    
    this.connection.subscribe(this.player);
    await this.loadQueue();
    await this.playNext();
    
    this.logger.info(`Started playing in ${voiceChannel.name}`);
    
    // Save config so we auto-start in this guild next time
    await this.saveConfig();
    
    return true;
  }
  
  /**
   * Stop playing and disconnect
   */
  stop() {
    if (this.player) this.player.stop();
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.currentTrack = null;
    this.updateControlMessage();
    this.logger.info('Stopped playing');
  }
  
  /**
   * Reconnect to voice channel (for 24/7 mode)
   */
  async reconnect() {
    if (!this.voiceChannelId || !this.guildId) {
      this.logger.warn('Cannot reconnect - no channel info saved');
      return;
    }
    
    try {
      const guild = await this.client.guilds.fetch(this.guildId);
      const voiceChannel = await guild.channels.fetch(this.voiceChannelId);
      const textChannel = this.controlChannelId ? await guild.channels.fetch(this.controlChannelId) : null;
      
      if (voiceChannel) {
        this.logger.info('Reconnecting to voice channel...');
        await this.start(voiceChannel, textChannel);
      }
    } catch (error) {
      this.logger.error('Reconnect failed:', error.message);
      // Try again in 30 seconds
      setTimeout(() => this.reconnect(), 30000);
    }
  }
  
  /**
   * Pause/Resume playback
   */
  pause() {
    if (!this.player) return false;
    if (this.isPaused) {
      this.player.unpause();
      this.isPaused = false;
    } else {
      this.player.pause();
      this.isPaused = true;
    }
    this.updateControlMessage();
    return !this.isPaused;
  }
  
  /**
   * Skip to next track
   */
  async skip() {
    if (!this.player) return false;
    this.player.stop();
    return true;
  }
  
  /**
   * Set volume (0-1)
   */
  setVolume(newVolume) {
    this.volume = Math.max(0, Math.min(1, newVolume));
    if (this.player?.state?.resource?.volume) {
      this.player.state.resource.volume.setVolume(this.volume);
    }
    this.updateControlMessage();
    return this.volume;
  }
  
  /**
   * Change playlist/folder
   */
  async changeFolder(folder) {
    if (!MUSIC_CONFIG.folders.includes(folder)) return false;
    this.currentFolder = folder;
    await this.loadQueue(folder);
    if (this.isPlaying) await this.playNext();
    return true;
  }
  
  /**
   * Get current status
   */
  getStatus() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentTrack: this.currentTrack ? this.parseTrackName(this.currentTrack.name) : null,
      currentFolder: this.currentFolder,
      volume: Math.round(this.volume * 100),
      queueLength: this.queue.length
    };
  }
  
  /**
   * Get available folders
   */
  getFolders() {
    return MUSIC_CONFIG.folders;
  }


  /**
   * Handle button interactions
   */
  async handleButton(interaction) {
    const { customId } = interaction;
    
    switch (customId) {
      case 'music_playpause':
        if (!this.isPlaying && !this.isPaused) {
          const member = interaction.member;
          if (member?.voice?.channel) {
            await this.start(member.voice.channel, interaction.channel);
          } else {
            await interaction.reply({ content: '❌ Join a voice channel first!', ephemeral: true });
            return;
          }
        } else {
          this.pause();
        }
        break;
        
      case 'music_next':
        await this.skip();
        break;
        
      case 'music_prev':
        if (this.currentTrack) {
          this.queue.unshift(this.currentTrack);
          await this.playNext();
        }
        break;
        
      case 'music_stop':
        this.stop();
        break;
        
      case 'music_shuffle':
        this.shuffleArray(this.queue);
        await interaction.reply({ content: '🔀 Queue shuffled!', ephemeral: true });
        return;
        
      case 'music_volup':
        this.setVolume(this.volume + 0.1);
        break;
        
      case 'music_voldown':
        this.setVolume(this.volume - 0.1);
        break;
        
      case 'music_folder':
        const currentIndex = MUSIC_CONFIG.folders.indexOf(this.currentFolder);
        const nextIndex = (currentIndex + 1) % MUSIC_CONFIG.folders.length;
        await this.changeFolder(MUSIC_CONFIG.folders[nextIndex]);
        break;
    }
    
    await interaction.deferUpdate();
    await this.updateControlMessage();
  }
  
  /**
   * Setup music in a specific guild (called by AI or command)
   * Creates channels and starts playing
   */
  async setupInGuild(guild) {
    if (!guild) throw new Error('No guild specified');
    
    this.logger.info(`🎵 Setting up music in guild: ${guild.name}`);
    this.guildId = guild.id;
    
    // Find or create voice channel
    let voiceChannel = guild.channels.cache.find(
      c => c.type === 2 && c.name === MUSIC_CONFIG.voiceChannelName
    );
    
    if (!voiceChannel) {
      this.logger.info(`Creating voice channel: ${MUSIC_CONFIG.voiceChannelName}`);
      voiceChannel = await guild.channels.create({
        name: MUSIC_CONFIG.voiceChannelName,
        type: 2, // GuildVoice
        parent: MUSIC_CONFIG.channelCategory,
        reason: 'Music Player setup'
      });
    }
    
    // Find or create text channel for controls
    const textChannelName = MUSIC_CONFIG.textChannelName.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    let textChannel = guild.channels.cache.find(
      c => c.type === 0 && c.name === textChannelName
    );
    
    if (!textChannel) {
      this.logger.info(`Creating text channel: ${MUSIC_CONFIG.textChannelName}`);
      textChannel = await guild.channels.create({
        name: MUSIC_CONFIG.textChannelName,
        type: 0, // GuildText
        parent: MUSIC_CONFIG.channelCategory,
        topic: '🎵 Music player controls - Use the buttons below to control playback!',
        reason: 'Music Player setup'
      });
      
      await this.setupControlChannel(textChannel);
    } else {
      this.controlChannelId = textChannel.id;
      await this.findOrCreateControlMessage(textChannel);
    }
    
    this.voiceChannelId = voiceChannel.id;
    this.controlChannelId = textChannel.id;
    
    // Start playing
    await this.start(voiceChannel, textChannel);
    
    return {
      voiceChannel: voiceChannel.name,
      textChannel: textChannel.name,
      status: 'playing'
    };
  }
  
  // Expose music methods for AI actions
  get music() {
    return {
      start: this.start.bind(this),
      stop: this.stop.bind(this),
      pause: this.pause.bind(this),
      skip: this.skip.bind(this),
      setVolume: this.setVolume.bind(this),
      changeFolder: this.changeFolder.bind(this),
      getStatus: this.getStatus.bind(this),
      getFolders: this.getFolders.bind(this),
      updateControlMessage: this.updateControlMessage.bind(this),
      setupInGuild: this.setupInGuild.bind(this)
    };
  }
}
