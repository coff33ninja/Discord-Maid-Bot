# ai-reminder-parser.js

**Path:** `plugins\conversational-ai\utils\ai-reminder-parser.js`

## Description
* AI-Powered Reminder Parser

## Dependencies
- `../../../src/logging/logger.js` → createLogger (L10)
- `../../../src/config/gemini-keys.js` (dynamic, L27)

## Exports
- **parseReminderWithAI** [function] (L20) - Parse a reminder request using AI
- **formatReminderConfirmation** [function] (L262) - Format parsed reminder for confirmation

## Functions
- ✓ `async parseReminderWithAI(input, context = {})` (L20) - Parse a reminder request using AI
- `calculateTriggerTime(timeData, now)` (L136) - Calculate trigger time from parsed time data
- `fallbackParse(input)` (L207) - Fallback regex-based parsing when AI fails
- ✓ `formatReminderConfirmation(parsed)` (L262) - Format parsed reminder for confirmation

