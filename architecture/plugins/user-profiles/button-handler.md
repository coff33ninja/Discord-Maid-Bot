# button-handler.js

**Path:** `plugins\user-profiles\button-handler.js`

## Description
* Profile Button/Select Handler

## Dependencies
- `../../src/logging/logger.js` → createLogger (L7)
- `discord.js` (dynamic, L363)

## Exports
- **handleProfileButton** [function] (L32) - Handle profile-related button interactions
- **handleProfileSelect** [function] (L111) - Handle profile-related select menu interactions

## Functions
- ✓ `async handleProfileButton(interaction, plugin)` (L32) - Handle profile-related button interactions
- ✓ `async handleProfileSelect(interaction, plugin)` (L111) - Handle profile-related select menu interactions
- `async handleStartSetup(interaction, plugin)` (L204) - Handle start setup button
- `async handleSkipName(interaction, plugin)` (L266) - Handle skip name button
- `async handleViewProfile(interaction, plugin)` (L282) - Handle view profile button
- `async handleInterestSelect(interaction, plugin, values)` (L297) - Handle interest selection from paginated menus
- `async handleInterestsDone(interaction, plugin)` (L337) - Handle interests done button
- `async handleEditMore(interaction, plugin)` (L362) - Handle edit more button

## Constants
- **wizardState** [value] (L24)

