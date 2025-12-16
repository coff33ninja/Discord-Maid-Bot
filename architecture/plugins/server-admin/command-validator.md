# command-validator.js

**Path:** `plugins\server-admin\command-validator.js`

## Description
* Command Validator for Server Admin

## Dependencies
- `../../src/logging/logger.js` → createLogger (L10)

## Exports
- **COMMAND_WHITELIST** [const] (L18) - Whitelist of allowed command patterns
- **DANGEROUS_PATTERNS** [const] (L75) - Dangerous patterns that should always be blocked
- **CONFIRMATION_REQUIRED_PATTERNS** [const] (L126) - Commands that require explicit user confirmation before execution
- **validateCommand** [function] (L147) - Validate a command against security rules
- **matchesDangerousPattern** [function] (L222) - Check if a command matches any dangerous pattern
- **matchesWhitelist** [function] (L244) - Check if a command matches the whitelist
- **requiresApproval** [function] (L263) - Check if a command requires approval

## Functions
- ✓ `validateCommand(command, userId = 'unknown')` (L147) - Validate a command against security rules
- ✓ `matchesDangerousPattern(command)` (L222) - Check if a command matches any dangerous pattern
- ✓ `matchesWhitelist(command)` (L244) - Check if a command matches the whitelist
- ✓ `requiresApproval(command)` (L263) - Check if a command requires approval

## Constants
- ✓ **COMMAND_WHITELIST** [array] (L18) - Whitelist of allowed command patterns
- ✓ **DANGEROUS_PATTERNS** [array] (L75) - Dangerous patterns that should always be blocked
- ✓ **CONFIRMATION_REQUIRED_PATTERNS** [array] (L126) - Commands that require explicit user confirmation before execution

