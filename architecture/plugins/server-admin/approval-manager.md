# approval-manager.js

**Path:** `plugins\server-admin\approval-manager.js`

## Description
* Approval Manager for Server Admin

## Dependencies
- `discord.js` → ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType (L10)
- `../../src/logging/logger.js` → createLogger (L11)

## Exports
- **APPROVAL_TIMEOUT** [const] (L18) - Approval timeout in milliseconds (60 seconds)
- **createApprovalRequest** [function] (L32) - Create an approval request message with buttons
- **handleApproval** [function] (L107) - Handle approval button interaction
- **waitForApproval** [function] (L175) - Wait for approval with timeout
- **requiresConfirmation** [function] (L229) - Check if a command requires confirmation
- **requiresDoubleConfirmation** [function] (L238) - Check if a command requires double confirmation
- **storePendingApproval** [function] (L247) - Store a pending approval
- **getPendingApproval** [function] (L260) - Get a pending approval
- **resolvePendingApproval** [function] (L269) - Resolve a pending approval
- **cleanupExpiredApprovals** [function] (L282) - Clean up expired pending approvals
- **getPendingCount** [function] (L297) - Get count of pending approvals (for testing)
- **clearPendingApprovals** [function] (L304) - Clear all pending approvals (for testing)

## Functions
- ✓ `createApprovalRequest(command, context = {})` (L32) - Create an approval request message with buttons
- ✓ `async handleApproval(interaction, command, requesterId)` (L107) - Handle approval button interaction
- ✓ `async waitForApproval(message, command, requesterId)` (L175) - Wait for approval with timeout
- ✓ `requiresConfirmation(command)` (L229) - Check if a command requires confirmation
- ✓ `requiresDoubleConfirmation(command)` (L238) - Check if a command requires double confirmation
- ✓ `storePendingApproval(messageId, approvalData)` (L247) - Store a pending approval
- ✓ `getPendingApproval(messageId)` (L260) - Get a pending approval
- ✓ `resolvePendingApproval(messageId, resolution)` (L269) - Resolve a pending approval
- ✓ `cleanupExpiredApprovals()` (L282) - Clean up expired pending approvals
- ✓ `getPendingCount()` (L297) - Get count of pending approvals (for testing)
- ✓ `clearPendingApprovals()` (L304) - Clear all pending approvals (for testing)

## Constants
- **pendingApprovals** [value] (L24) - Pending approvals store

