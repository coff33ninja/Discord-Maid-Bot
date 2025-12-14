# Phase Out Command Bridge Plan

**Goal:** Move all autocomplete and command handling from `src/core/command-bridge.js` into individual plugins.

## Current State

### Plugins WITH handleAutocomplete
1. ✅ smart-reminders
2. ✅ power-management  
3. ✅ device-triggers
4. ✅ device-health
5. ✅ core-commands (stub)

### Plugins NEEDING handleAutocomplete
1. ❌ network-management - Uses device autocomplete for WOL
2. ❌ device-bulk-ops - Uses device autocomplete for bulk operations
3. ❌ automation - May need device autocomplete
4. ❌ personality - May need autocomplete for personality selection
5. ❌ research - May need autocomplete for history search
6. ❌ games - May need autocomplete for game selection

## Command Bridge Current Functionality

### Autocomplete Handlers
1. **Device Autocomplete** - Used by multiple plugins
   - Scoring algorithm (exact match, starts with, contains, IP match)
   - Shows online status, emoji, name/hostname
   - Filters and sorts by relevance
   - Used by: network-management, power-management, device-health, device-triggers, smart-reminders

2. **Group Autocomplete** - Used for device groups
   - Simple filtering by name
   - Used by: device-bulk-ops, network-management

### Command Handlers
- Fallback routing to legacy handlers
- Plugin command routing (already handled by plugin-system.js)

## Implementation Plan

### Phase 1: Create Shared Autocomplete Utility
Create `src/utils/autocomplete-helpers.js` with reusable functions:
- `getDeviceAutocomplete(focusedValue, devices)` - Device autocomplete logic
- `getGroupAutocomplete(focusedValue)` - Group autocomplete logic

### Phase 2: Update Plugins to Use Shared Utility
Update each plugin's `handleAutocomplete` to use the shared utility:
1. network-management
2. device-bulk-ops  
3. automation (if needed)
4. personality (if needed)
5. research (if needed)
6. games (if needed)

### Phase 3: Verify All Plugins Have Autocomplete
Test each plugin's autocomplete functionality

### Phase 4: Remove Command Bridge
Once all plugins handle their own autocomplete:
1. Remove `src/core/command-bridge.js`
2. Update `src/core/event-router.js` to handle autocomplete directly
3. Update documentation

## Success Criteria
- ✅ All plugins with device options have handleAutocomplete
- ✅ All plugins with group options have handleAutocomplete
- ✅ Shared utility reduces code duplication
- ✅ Command bridge can be safely removed
- ✅ All autocomplete features work correctly
