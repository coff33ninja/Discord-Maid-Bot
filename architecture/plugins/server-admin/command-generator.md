# command-generator.js

**Path:** `plugins\server-admin\command-generator.js`

## Description
* Command Generator for Server Admin

## Dependencies
- `../../src/logging/logger.js` → createLogger (L10)
- `./nlp-parser.js` → INTENTS (L11)

## Exports
- **PLATFORMS** [const] (L18) - Supported platforms
- **DEFAULT_CONFIG** [const] (L27) - Default configuration
- **COMMAND_TEMPLATES** [const] (L37) - Platform-specific command templates
- **generateCommand** [function] (L130) - Generate a shell command from a parsed intent
- **detectPlatform** [function] (L218) - Detect the current platform
- **getSupportedIntents** [function] (L236) - Get all supported intents for a platform
- **intentRequiresConfirmation** [function] (L249) - Check if an intent requires confirmation
- **intentRequiresDoubleConfirmation** [function] (L258) - Check if an intent requires double confirmation
- **intentCausesDowntime** [function] (L267) - Check if an intent causes downtime
- **getIntentDescription** [function] (L276) - Get description for an intent

## Functions
- ✓ `generateCommand(intent, options = {})` (L130) - Generate a shell command from a parsed intent
- `substituteParams(template, intent, config, platform)` (L185) - Substitute parameters in command template
- ✓ `detectPlatform()` (L218) - Detect the current platform
- ✓ `getSupportedIntents(platform = detectPlatform()` (L236) - Get all supported intents for a platform
- ✓ `intentRequiresConfirmation(intentAction)` (L249) - Check if an intent requires confirmation
- ✓ `intentRequiresDoubleConfirmation(intentAction)` (L258) - Check if an intent requires double confirmation
- ✓ `intentCausesDowntime(intentAction)` (L267) - Check if an intent causes downtime
- ✓ `getIntentDescription(intentAction)` (L276) - Get description for an intent

## Constants
- ✓ **PLATFORMS** [object] (L18) - Supported platforms
- ✓ **DEFAULT_CONFIG** [object] (L27) - Default configuration
- ✓ **COMMAND_TEMPLATES** [object] (L37) - Platform-specific command templates
- **CONFIRMATION_REQUIRED** [array] (L82) - Commands that require confirmation before execution
- **DOUBLE_CONFIRMATION_REQUIRED** [array] (L93) - Commands that require double confirmation (extra dangerous)
- **CAUSES_DOWNTIME** [array] (L100) - Commands that cause downtime
- **INTENT_DESCRIPTIONS** [object] (L110) - Intent descriptions for user display

