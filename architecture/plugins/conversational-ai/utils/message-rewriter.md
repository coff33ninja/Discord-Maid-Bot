# message-rewriter.js

**Path:** `plugins\conversational-ai\utils\message-rewriter.js`

## Description
* AI Message Rewriter

## Dependencies
- `../../../src/logging/logger.js` → createLogger (L10)
- `../../../src/core/plugin-system.js` (dynamic, L20)
- `../../../src/config/gemini-keys.js` (dynamic, L64)
- `../../../src/core/plugin-system.js` (dynamic, L72)

## Exports
- **rewriteReminderMessage** [function] (L50) - Rewrite a reminder message to sound more natural with personality
- **rewriteNotification** [function] (L168) - Rewrite a notification/alert message
- **formatReminderDelivery** [function] (L182) - Format a reminder delivery message

## Functions
- `async getCurrentPersonality()` (L18) - Get the current bot personality
- ✓ `async rewriteReminderMessage(originalMessage, options = {})` (L50) - Rewrite a reminder message to sound more natural with personality
- ✓ `async rewriteNotification(message, type = 'info')` (L168) - Rewrite a notification/alert message
- ✓ `async formatReminderDelivery(reminder, context = {})` (L182) - Format a reminder delivery message

