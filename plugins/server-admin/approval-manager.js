/**
 * Approval Manager for Server Admin
 * 
 * Handles command approval workflow with Discord buttons
 * for confirming potentially dangerous operations.
 * 
 * @module plugins/server-admin/approval-manager
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { createLogger } from '../../src/logging/logger.js';

const logger = createLogger('server-admin:approval');

/**
 * Approval timeout in milliseconds (60 seconds)
 */
export const APPROVAL_TIMEOUT = 60000;

/**
 * Pending approvals store
 * Map<messageId, { command, userId, timestamp, resolved }>
 */
const pendingApprovals = new Map();

/**
 * Create an approval request message with buttons
 * @param {Object} command - Command object to approve
 * @param {Object} context - Execution context
 * @returns {Object} Discord message options with buttons
 */
export function createApprovalRequest(command, context = {}) {
  if (!command || !command.command) {
    throw new Error('Invalid command object');
  }

  const approveButton = new ButtonBuilder()
    .setCustomId('server_admin_approve')
    .setLabel('✓ Approve')
    .setStyle(ButtonStyle.Success);

  const cancelButton = new ButtonBuilder()
    .setCustomId('server_admin_cancel')
    .setLabel('✗ Cancel')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder()
    .addComponents(approveButton, cancelButton);

  const embed = {
    title: '⚠️ Command Approval Required',
    description: 'Please review and approve the following command:',
    fields: [
      {
        name: 'Command',
        value: `\`\`\`bash\n${command.command}\n\`\`\``,
        inline: false
      }
    ],
    color: 0xFFA500, // Orange
    footer: {
      text: `This request will expire in ${APPROVAL_TIMEOUT / 1000} seconds`
    },
    timestamp: new Date().toISOString()
  };

  // Add description if available
  if (command.description) {
    embed.fields.push({
      name: 'Description',
      value: command.description,
      inline: false
    });
  }

  // Add warning for downtime-causing commands
  if (command.causesDowntime) {
    embed.fields.push({
      name: '⚠️ Warning',
      value: 'This command may cause service downtime.',
      inline: false
    });
  }

  // Add double confirmation warning
  if (command.requiresDoubleConfirmation) {
    embed.fields.push({
      name: '🔴 Critical Operation',
      value: 'This is a critical operation that requires extra caution.',
      inline: false
    });
  }

  return {
    embeds: [embed],
    components: [row]
  };
}

/**
 * Handle approval button interaction
 * @param {Object} interaction - Discord button interaction
 * @param {Object} command - Original command object
 * @param {string} requesterId - ID of user who requested the command
 * @returns {Promise<Object>} Approval result
 */
export async function handleApproval(interaction, command, requesterId) {
  // Verify the user clicking is the same who requested
  if (interaction.user.id !== requesterId) {
    await interaction.reply({
      content: '❌ Only the user who requested this command can approve it.',
      ephemeral: true
    });
    return { approved: false, cancelled: false, unauthorized: true };
  }

  const customId = interaction.customId;

  if (customId === 'server_admin_approve') {
    logger.info(`Command approved by user ${interaction.user.id}: ${command.command}`);
    
    await interaction.update({
      embeds: [{
        title: '✅ Command Approved',
        description: 'Executing command...',
        fields: [
          {
            name: 'Command',
            value: `\`\`\`bash\n${command.command}\n\`\`\``,
            inline: false
          }
        ],
        color: 0x00FF00, // Green
        timestamp: new Date().toISOString()
      }],
      components: [] // Remove buttons
    });

    return { approved: true, cancelled: false, timedOut: false };
  }

  if (customId === 'server_admin_cancel') {
    logger.info(`Command cancelled by user ${interaction.user.id}: ${command.command}`);
    
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

    return { approved: false, cancelled: true, timedOut: false };
  }

  return { approved: false, cancelled: false, unknown: true };
}

/**
 * Wait for approval with timeout
 * @param {Object} message - Discord message with approval buttons
 * @param {Object} command - Command awaiting approval
 * @param {string} requesterId - ID of user who requested the command
 * @returns {Promise<Object>} Approval result
 */
export async function waitForApproval(message, command, requesterId) {
  try {
    const filter = (i) => {
      return (i.customId === 'server_admin_approve' || i.customId === 'server_admin_cancel') &&
             i.user.id === requesterId;
    };

    const interaction = await message.awaitMessageComponent({
      filter,
      componentType: ComponentType.Button,
      time: APPROVAL_TIMEOUT
    });

    return await handleApproval(interaction, command, requesterId);
  } catch (error) {
    // Timeout occurred
    if (error.code === 'InteractionCollectorError' || error.message?.includes('time')) {
      logger.info(`Approval timed out for command: ${command.command}`);
      
      // Update message to show timeout
      try {
        await message.edit({
          embeds: [{
            title: '⏰ Request Timed Out',
            description: 'The approval request has expired.',
            fields: [
              {
                name: 'Command',
                value: `\`\`\`bash\n${command.command}\n\`\`\``,
                inline: false
              }
            ],
            color: 0x808080, // Gray
            timestamp: new Date().toISOString()
          }],
          components: [] // Remove buttons
        });
      } catch (editError) {
        logger.error('Failed to update timed out message:', editError);
      }

      return { approved: false, cancelled: false, timedOut: true };
    }

    logger.error('Error waiting for approval:', error);
    throw error;
  }
}

/**
 * Check if a command requires confirmation
 * @param {Object} command - Command object
 * @returns {boolean} True if confirmation is required
 */
export function requiresConfirmation(command) {
  return command && command.requiresConfirmation === true;
}

/**
 * Check if a command requires double confirmation
 * @param {Object} command - Command object
 * @returns {boolean} True if double confirmation is required
 */
export function requiresDoubleConfirmation(command) {
  return command && command.requiresDoubleConfirmation === true;
}

/**
 * Store a pending approval
 * @param {string} messageId - Discord message ID
 * @param {Object} approvalData - Approval data to store
 */
export function storePendingApproval(messageId, approvalData) {
  pendingApprovals.set(messageId, {
    ...approvalData,
    timestamp: Date.now(),
    resolved: false
  });
}

/**
 * Get a pending approval
 * @param {string} messageId - Discord message ID
 * @returns {Object|null} Pending approval data or null
 */
export function getPendingApproval(messageId) {
  return pendingApprovals.get(messageId) || null;
}

/**
 * Resolve a pending approval
 * @param {string} messageId - Discord message ID
 * @param {string} resolution - 'approved', 'cancelled', or 'timedOut'
 */
export function resolvePendingApproval(messageId, resolution) {
  const approval = pendingApprovals.get(messageId);
  if (approval) {
    approval.resolved = true;
    approval.resolution = resolution;
    approval.resolvedAt = Date.now();
    pendingApprovals.set(messageId, approval);
  }
}

/**
 * Clean up expired pending approvals
 */
export function cleanupExpiredApprovals() {
  const now = Date.now();
  for (const [messageId, approval] of pendingApprovals.entries()) {
    if (now - approval.timestamp > APPROVAL_TIMEOUT && !approval.resolved) {
      approval.resolved = true;
      approval.resolution = 'timedOut';
      pendingApprovals.set(messageId, approval);
    }
  }
}

/**
 * Get count of pending approvals (for testing)
 * @returns {number} Number of pending approvals
 */
export function getPendingCount() {
  return pendingApprovals.size;
}

/**
 * Clear all pending approvals (for testing)
 */
export function clearPendingApprovals() {
  pendingApprovals.clear();
}

export default {
  APPROVAL_TIMEOUT,
  createApprovalRequest,
  handleApproval,
  waitForApproval,
  requiresConfirmation,
  requiresDoubleConfirmation,
  storePendingApproval,
  getPendingApproval,
  resolvePendingApproval,
  cleanupExpiredApprovals,
  getPendingCount,
  clearPendingApprovals
};
