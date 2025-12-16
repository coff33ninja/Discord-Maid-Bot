# discord-admin.js

**Path:** `plugins\server-admin\discord-admin.js`

## Description
* Discord Admin Handler

## Dependencies
- `../../src/logging/logger.js` → createLogger (L10)

## Exports
- **handleDiscordAdmin** [function] (L33) - Handle Discord admin intent
- **requiresConfirmation** [function] (L164) - Check if an action requires confirmation
- **formatResult** [function] (L174) - Format result for Discord message

## Functions
- ✓ `async handleDiscordAdmin(intent, context)` (L33) - Handle Discord admin intent
- ✓ `requiresConfirmation(action)` (L164) - Check if an action requires confirmation
- ✓ `formatResult(result, action)` (L174) - Format result for Discord message

## Constants
- **CONFIRMATION_REQUIRED** [array] (L19)

