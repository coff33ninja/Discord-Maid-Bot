/**
 * Music Player Commands
 * 
 * Slash commands for music control
 */

import { SlashCommandBuilder, ChannelType } from 'discord.js';

export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName('music')
      .setDescription('Music player controls')
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
        .setDescription('Send control panel to this channel')),
    
    async execute(interaction, plugin) {
      const subcommand = interaction.options.getSubcommand();
      const music = plugin.music;
      
      switch (subcommand) {
        case 'play': {
          let voiceChannel = interaction.options.getChannel('channel');
          
          if (!voiceChannel) {
            voiceChannel = interaction.member?.voice?.channel;
          }
          
          if (!voiceChannel) {
            return interaction.reply({ 
              content: '❌ Please join a voice channel or specify one!', 
              ephemeral: true 
            });
          }
          
          await interaction.deferReply();
          
          try {
            await music.start(voiceChannel, interaction.channel);
            await interaction.editReply('🎵 Started playing music!');
          } catch (error) {
            await interaction.editReply(`❌ Error: ${error.message}`);
          }
          break;
        }
        
        case 'stop': {
          music.stop();
          await interaction.reply('⏹️ Stopped playing');
          break;
        }
        
        case 'pause': {
          const playing = music.pause();
          await interaction.reply(playing ? '▶️ Resumed' : '⏸️ Paused');
          break;
        }
        
        case 'skip': {
          await music.skip();
          await interaction.reply('⏭️ Skipped to next track');
          break;
        }
        
        case 'volume': {
          const level = interaction.options.getInteger('level');
          music.setVolume(level / 100);
          await interaction.reply(`🔊 Volume set to ${level}%`);
          break;
        }
        
        case 'playlist': {
          const name = interaction.options.getString('name');
          await interaction.deferReply();
          
          const success = await music.changeFolder(name);
          if (success) {
            await interaction.editReply(`📁 Switched to playlist: **${name}**`);
          } else {
            await interaction.editReply('❌ Playlist not found');
          }
          break;
        }
        
        case 'nowplaying': {
          const status = music.getStatus();
          
          if (!status.isPlaying) {
            return interaction.reply({ content: '🔇 Not playing anything', ephemeral: true });
          }
          
          const track = status.currentTrack;
          await interaction.reply(
            `🎵 **Now Playing:**\n` +
            `**${track?.title || 'Unknown'}**\n` +
            `*by ${track?.artist || 'Unknown'}*\n\n` +
            `📁 Playlist: ${status.currentFolder}\n` +
            `🔊 Volume: ${status.volume}%\n` +
            `📋 Queue: ${status.queueLength} tracks`
          );
          break;
        }
        
        case 'controls': {
          await interaction.deferReply();
          await music.updateControlMessage();
          await interaction.deleteReply();
          break;
        }
      }
    }
  }
];

export default commands;
