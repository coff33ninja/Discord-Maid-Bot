/**
 * Button Handler for Server Admin
 * 
 * Handles button interactions for approval workflow.
 * 
 * @module plugins/server-admin/button-handler
 */

import { createLogger } from '../../src/logging/logger.js';
import { logAudit } from './audit-logger.js';
import { executeCommand } from './command-executor.js';
import { detectPlatform } from './command-generator.js';

const logger = createLogger('server-admin:buttons');

/**
 * Pending approval store
 * Map<messageId, { command, userId, action, timestamp }>
 */
const pendingApprovals = new Map();

/**
 * Store a pending approval for a message
 * @param {string} messageId - Discord message ID
 * @param {Object} data - Approval data
 */
export function storePendingApproval(messageId, data) {
  pendingApprovals.set(messageId, {
    ...data,
    timestamp: Date.now()
  });
  
  // Auto-cleanup after 5 minutes
  setTimeout(() => {
    pendingApprovals.delete(messageId);
  }, 5 * 60 * 1000);
}

/**
 * Handle button interaction for server admin
 * @param {Object} interaction - Discord button interaction
 */
export async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;
  const messageId = interaction.message.id;
  
  logger.info(`Button interaction: ${customId} on message ${messageId}`);
  
  // Get pending approval data
  const approvalData = pendingApprovals.get(messageId);
  
  if (!approvalData) {
    await interaction.reply({
      content: '❌ This approval request has expired or was already processed.',
      ephemeral: true
    });
    return;
  }
  
  // Verify the user clicking is the one who requested
  if (interaction.user.id !== approvalData.userId) {
    await interaction.reply({
      content: '❌ Only the user who requested this action can approve or cancel it.',
      ephemeral: true
    });
    return;
  }
  
  if (customId === 'server_admin_approve') {
    await handleApprove(interaction, approvalData, messageId);
  } else if (customId === 'server_admin_cancel') {
    await handleCancel(interaction, approvalData, messageId);
  }
}

/**
 * Handle approval button click
 */
async function handleApprove(interaction, approvalData, messageId) {
  const { command, action, userId, username } = approvalData;
  
  logger.info(`Command approved by ${username}: ${command.command}`);
  
  // Update message to show executing
  await interaction.update({
    embeds: [{
      title: '⏳ Executing Command...',
      description: 'Please wait while the command is being executed.',
      fields: [
        {
          name: 'Command',
          value: `\`\`\`bash\n${command.command}\n\`\`\``,
          inline: false
        }
      ],
      color: 0x3498db, // Blue
      timestamp: new Date().toISOString()
    }],
    components: [] // Remove buttons
  });
  
  // Execute the command
  const startTime = Date.now();
  const result = await executeCommand(command.command);
  const duration = Date.now() - startTime;
  
  // Log to audit
  logAudit({
    userId,
    username,
    command: command.command,
    intent: action,
    type: 'command',
    approved: true,
    executed: true,
    success: result.success,
    output: result.output,
    error: result.error,
    duration,
    platform: detectPlatform(),
    guildId: interaction.guild?.id,
    channelId: interaction.channel?.id
  });
  
  // Update message with result
  if (result.success) {
    await interaction.editReply({
      embeds: [{
        title: '✅ Command Executed Successfully',
        description: getSuccessMessage(action),
        fields: [
          {
            name: 'Command',
            value: `\`\`\`bash\n${command.command}\n\`\`\``,
            inline: false
          },
          {
            name: 'Output',
            value: `\`\`\`\n${(result.output || 'No output').substring(0, 900)}\n\`\`\``,
            inline: false
          },
          {
            name: 'Duration',
            value: `${duration}ms`,
            inline: true
          }
        ],
        color: 0x00FF00, // Green
        timestamp: new Date().toISOString()
      }],
      components: []
    });
  } else {
    await interaction.editReply({
      embeds: [{
        title: '❌ Command Failed',
        description: result.error || 'Unknown error occurred',
        fields: [
          {
            name: 'Command',
            value: `\`\`\`bash\n${command.command}\n\`\`\``,
            inline: false
          },
          {
            name: 'Error Output',
            value: `\`\`\`\n${(result.error || result.output || 'No output').substring(0, 900)}\n\`\`\``,
            inline: false
          }
        ],
        color: 0xFF0000, // Red
        timestamp: new Date().toISOString()
      }],
      components: []
    });
  }
  
  // Remove from pending
  pendingApprovals.delete(messageId);
}

/**
 * Handle cancel button click
 */
async function handleCancel(interaction, approvalData, messageId) {
  const { command, action, userId, username } = approvalData;
  
  logger.info(`Command cancelled by ${username}: ${command.command}`);
  
  // Log to audit
  logAudit({
    userId,
    username,
    command: command.command,
    intent: action,
    type: 'command',
    approved: false,
    executed: false,
    success: false,
    error: 'Cancelled by user',
    guildId: interaction.guild?.id,
    channelId: interaction.channel?.id
  });
  
  // Update message
  await interaction.update({
    embeds: [{
      title: '❌ Command Cancelled',
      description: 'The command was cancelled by the user.',
      fields: [
        {
          name: 'Command',
          value: `\`\`\`bash\n${command.command}\n\`\`\``,
          inline: false
        }
      ],
      color: 0xFF0000, // Red
      timestamp: new Date().toISOString()
    }],
    components: [] // Remove buttons
  });
  
  // Remove from pending
  pendingApprovals.delete(messageId);
}

/**
 * Get success message based on action type
 */
function getSuccessMessage(action) {
  const messages = {
    'service_restart': '🔄 Bot service has been restarted successfully!',
    'service_stop': '⏹️ Bot service has been stopped.',
    'deploy': '🚀 Deployment completed successfully!',
    'update_packages': '📦 System packages have been updated.',
    'reboot': '🔄 Server reboot initiated. The bot will be back online shortly.'
  };
  
  return messages[action] || 'Command executed successfully.';
}

export default {
  handleButtonInteraction,
  storePendingApproval
};
