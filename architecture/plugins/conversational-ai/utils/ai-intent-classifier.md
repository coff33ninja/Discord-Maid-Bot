# ai-intent-classifier.js

**Path:** `plugins\conversational-ai\utils\ai-intent-classifier.js`

## Description
* AI Intent Classifier

## Dependencies
- `../../../src/logging/logger.js` → createLogger (L10)
- `../../../src/config/gemini-keys.js` (dynamic, L429)

## Exports
- **classifyIntent** [function] (L422) - Classify user intent using Gemini AI
- **mapActionToExecutor** [function] (L588) - Map classified action to the actual ACTIONS object key
- **getActionInfo** [function] (L619) - Get action category info
- **getAvailableActions** [function] (L626) - Get all available actions

## Functions
- `buildClassificationPrompt(userQuery)` (L389) - Build the classification prompt for Gemini
- ✓ `async classifyIntent(query, context = {})` (L422) - Classify user intent using Gemini AI
- `fallbackClassification(query)` (L483) - Fallback keyword-based classification when AI is unavailable
- ✓ `mapActionToExecutor(classifiedAction)` (L588) - Map classified action to the actual ACTIONS object key
- ✓ `getActionInfo(actionId)` (L619) - Get action category info
- ✓ `getAvailableActions()` (L626) - Get all available actions

## Constants
- **ACTION_CATEGORIES** [object] (L18) - Available action categories with their descriptions

