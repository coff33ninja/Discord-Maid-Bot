# nlp-parser.js

**Path:** `plugins\server-admin\nlp-parser.js`

## Description
* NLP Parser for Server Admin

## Dependencies
- `../../src/logging/logger.js` → createLogger (L10)

## Exports
- **INTENTS** [const] (L17) - Intent types for server administration
- **parseAdminIntent** [function] (L266) - Parse natural language into server admin intent
- **requiresConfirmation** [function] (L411) - Check if an intent requires confirmation
- **requiresDoubleConfirmation** [function] (L429) - Check if an intent requires double confirmation (extra dangerous)

## Functions
- ✓ `parseAdminIntent(query)` (L266) - Parse natural language into server admin intent
- `extractParams(intent, query)` (L325) - Extract parameters from query based on intent
- `calculateConfidence(query, keywords)` (L352) - Calculate confidence score for intent match
- `getIntentType(intent)` (L371) - Get the type category for an intent
- ✓ `requiresConfirmation(intent)` (L411) - Check if an intent requires confirmation
- ✓ `requiresDoubleConfirmation(intent)` (L429) - Check if an intent requires double confirmation (extra dangerous)

## Constants
- ✓ **INTENTS** [object] (L17) - Intent types for server administration
- **INTENT_PATTERNS** [array] (L73) - Intent patterns with keywords and regex

