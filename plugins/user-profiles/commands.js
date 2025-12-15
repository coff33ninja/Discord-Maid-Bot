import { SlashCommandSubcommandGroupBuilder, PermissionFlagsBits } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';
import { getUserRole } from '../../src/core/permission-manager.js';

const logger = createLogger('user-profiles-commands');

/**
 * Check if user is a bot admin
 * @param {string} userId - Discord user ID
 * @param {Object} member - Discord guild member (optional)
 * @returns {boolean}
 */
function isAdmin(userId, member = null) {
  // Check bot owner
  if (process.env.BOT_OWNER_ID === userId) return true;
  
  // Check database role
  const role = getUserRole(userId);
  if (role === 'admin') return true;
  
  // Check Discord admin permission
  if (member?.permissions?.has?.(PermissionFlagsBits.Administrator)) return true;
  
  return false;
}

/**
 * User Profile Commands
 * 
 * Injected into /bot as /bot profile subcommand group
 */

// Parent command to inject into
export const parentCommand = 'bot';

// Command group definition
export const commandGroup = new SlashCommandSubcommandGroupBuilder()
  .setName('profile')
  .setDescription('Manage your user profile')
  .addSubcommand(sub =>
    sub.setName('view')
      .setDescription('View your profile or another user\'s profile')
      .addUserOption(opt =>
        opt.setName('user')
          .setDescription('User to view (leave empty for your own)')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('edit')
      .setDescription('Edit your profile')
      .addStringOption(opt =>
        opt.setName('field')
          .setDescription('Field to edit')
          .setRequired(true)
          .addChoices(
            { name: '📛 Display Name', value: 'displayName' },
            { name: '⚧️ Gender', value: 'gender' },
            { name: '💬 Pronouns', value: 'pronouns' },
            { name: '🎭 Personality', value: 'personality' },
            { name: '🎯 Interests', value: 'interests' },
            { name: '🌍 Timezone', value: 'timezone' },
            { name: '📝 Bio', value: 'bio' }
          )
      )
      .addStringOption(opt =>
        opt.setName('value')
          .setDescription('New value (for interests, separate with commas)')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('setup')
      .setDescription('Start interactive profile setup')
  )
  .addSubcommand(sub =>
    sub.setName('delete')
      .setDescription('Delete your profile data')
  )
  .addSubcommand(sub =>
    sub.setName('createchannel')
      .setDescription('Create a profile setup channel (Admin only)')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Channel name')
          .setRequired(false)
      )
  );

/**
 * Handle profile commands
 * @param {Object} interaction - Discord interaction
 * @param {Object} plugin - Plugin instance
 */
export async function handleCommand(interaction, plugin) {
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case 'view':
      return handleView(interaction, plugin);
    case 'edit':
      return handleEdit(interaction, plugin);
    case 'setup':
      return handleSetup(interaction, plugin);
    case 'delete':
      return handleDelete(interaction, plugin);
    case 'createchannel':
      return handleCreateChannel(interaction, plugin);
    default:
      return interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
  }
}

async function handleView(interaction, plugin) {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const isViewingSelf = targetUser.id === interaction.user.id;
  
  // Only admins can view other users' profiles
  if (!isViewingSelf && !isAdmin(interaction.user.id, interaction.member)) {
    return interaction.reply({
      content: "❌ You can only view your own profile. Admins can view other users' profiles.",
      ephemeral: true
    });
  }
  
  const profile = await plugin.getProfile(targetUser.id);
  
  if (!profile) {
    if (isViewingSelf) {
      return interaction.reply({
        content: "You haven't set up your profile yet! Use `/bot profile setup` or `/bot profile edit` to get started~",
        ephemeral: true
      });
    }
    return interaction.reply({
      content: `${targetUser.username} hasn't set up their profile yet.`,
      ephemeral: true
    });
  }
  
  const embed = {
    color: 0x9B59B6,
    title: `👤 ${profile.displayName || targetUser.username}'s Profile`,
    thumbnail: { url: targetUser.displayAvatarURL({ dynamic: true }) },
    fields: [],
    footer: { text: `Profile last updated` },
    timestamp: profile.updatedAt ? new Date(profile.updatedAt) : new Date()
  };
  
  if (profile.gender) {
    embed.fields.push({ name: '⚧️ Gender', value: profile.gender, inline: true });
  }
  if (profile.pronouns) {
    embed.fields.push({ name: '💬 Pronouns', value: profile.pronouns, inline: true });
  }
  if (profile.personality) {
    embed.fields.push({ name: '� Personnality', value: profile.personality, inline: true });
  }
  if (profile.timezone) {
    embed.fields.push({ name: '� Timezone', value: profile.timezone, inline: true });
  }
  if (profile.interests?.length) {
    embed.fields.push({ name: '🎯 Interests', value: profile.interests.join(', '), inline: false });
  }
  if (profile.bio) {
    embed.fields.push({ name: '📝 Bio', value: profile.bio, inline: false });
  }
  
  if (embed.fields.length === 0) {
    embed.description = '_No profile information set yet_';
  }
  
  return interaction.reply({ embeds: [embed], ephemeral: isViewingSelf });
}

async function handleEdit(interaction, plugin) {
  const field = interaction.options.getString('field');
  const value = interaction.options.getString('value');
  
  let processedValue = value;
  
  // Special handling for interests (comma-separated)
  if (field === 'interests') {
    processedValue = value.split(',').map(i => i.trim()).filter(i => i.length > 0);
  }
  
  const updates = { [field]: processedValue };
  await plugin.updateProfile(interaction.user.id, updates);
  
  const fieldNames = {
    displayName: '📛 Display Name',
    gender: '⚧️ Gender',
    pronouns: '💬 Pronouns',
    personality: '🎭 Personality',
    interests: '🎯 Interests',
    timezone: '🌍 Timezone',
    bio: '📝 Bio'
  };
  
  return interaction.reply({
    embeds: [{
      color: 0x2ECC71,
      title: '✅ Profile Updated!',
      description: `**${fieldNames[field]}** has been set to:\n${Array.isArray(processedValue) ? processedValue.join(', ') : processedValue}`,
      footer: { text: 'Use /bot profile view to see your full profile' }
    }],
    ephemeral: true
  });
}

async function handleSetup(interaction, plugin) {
  // Start interactive setup mode
  plugin.startSetup(interaction.user.id, interaction.channelId);
  
  const profile = await plugin.getProfile(interaction.user.id);
  
  return interaction.reply({
    embeds: [{
      color: 0x9B59B6,
      title: '👤 Profile Setup',
      description: profile 
        ? "Let's update your profile! Just chat with me naturally and tell me about yourself~"
        : "Hi there! I'd love to get to know you better~ Just tell me about yourself!\n\n" +
          "You can share things like:\n" +
          "• Your preferred name\n" +
          "• Gender & pronouns\n" +
          "• Interests & hobbies\n" +
          "• Your personality type\n" +
          "• Timezone\n\n" +
          "_Or just chat naturally and I'll pick up on the details!_",
      footer: { text: 'Say "done" or "finish" when you\'re finished' }
    }]
  });
}

async function handleDelete(interaction, plugin) {
  const { configOps } = await import('../../src/database/db.js');
  
  // Users can only delete their own profile
  const userId = interaction.user.id;
  
  const profile = await plugin.getProfile(userId);
  if (!profile) {
    return interaction.reply({
      content: "You don't have a profile to delete.",
      ephemeral: true
    });
  }
  
  configOps.delete(`user_profile_${userId}`);
  plugin.endSetup(userId);
  
  logger.info(`User ${interaction.user.username} (${userId}) deleted their profile`);
  
  return interaction.reply({
    embeds: [{
      color: 0xE74C3C,
      title: '🗑️ Profile Deleted',
      description: 'Your profile data has been removed.',
      footer: { text: 'You can set up a new profile anytime with /bot profile setup' }
    }],
    ephemeral: true
  });
}

async function handleCreateChannel(interaction, plugin) {
  // Check bot admin permission (not just Discord permission)
  if (!isAdmin(interaction.user.id, interaction.member)) {
    return interaction.reply({
      content: '❌ Only bot admins can create profile channels.',
      ephemeral: true
    });
  }
  
  await interaction.deferReply();
  
  const channelName = interaction.options.getString('name') || '👤-profile-setup';
  
  try {
    const result = await plugin.createProfileChannel(interaction.guild, {
      name: channelName
    });
    
    if (result.created) {
      return interaction.editReply({
        embeds: [{
          color: 0x2ECC71,
          title: '✅ Profile Channel Created!',
          description: `Created ${result.channel} for profile setup.\n\n` +
            `New members can introduce themselves there and I'll remember their preferences~`,
          footer: { text: 'The bot will automatically respond to messages in this channel' }
        }]
      });
    } else {
      return interaction.editReply({
        embeds: [{
          color: 0xF39C12,
          title: '⚠️ Channel Already Exists',
          description: `A profile channel already exists: ${result.channel}`,
        }]
      });
    }
  } catch (error) {
    logger.error('Failed to create profile channel:', error);
    return interaction.editReply({
      content: `❌ Failed to create channel: ${error.message}`,
    });
  }
}

export default { commandGroup, handleCommand, parentCommand };
