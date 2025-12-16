# button-handler.js

**Path:** `plugins\server-admin\button-handler.js`

## Description
* Button Handler for Server Admin

## Dependencies
- `../../src/logging/logger.js` → createLogger (L9)
- `./audit-logger.js` → logAudit (L10)
- `./command-executor.js` → executeCommand (L11)
- `./command-generator.js` → detectPlatform (L12)

## Exports
- **storePendingApproval** [function] (L27) - Store a pending approval for a message
- **handleButtonInteraction** [function] (L43) - Handle button interaction for server admin

## Functions
- ✓ `storePendingApproval(messageId, data)` (L27) - Store a pending approval for a message
- ✓ `async handleButtonInteraction(interaction)` (L43) - Handle button interaction for server admin
- `async handleApprove(interaction, approvalData, messageId)` (L79) - Handle approval button click
- `async handleCancel(interaction, approvalData, messageId)` (L184) - Handle cancel button click
- `getSuccessMessage(action)` (L229) - Get success message based on action type

## Constants
- **pendingApprovals** [value] (L20) - Pending approval store

