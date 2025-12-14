# Remaining Tasks - Plugin Reorganization

**Date:** December 14, 2025  
**Status:** Minor cleanup needed

---

## Issues Found

### 1. Example Plugin Not Reorganized ⚠️
**File:** `plugins/example-plugin.js`  
**Issue:** Still at root level, should be in directory  
**Fix Needed:**
```bash
mkdir plugins/example-plugin
mv plugins/example-plugin.js plugins/example-plugin/plugin.js
# Update import: '../src/' -> '../../src/'
```

### 2. Documentation Outdated 📝
**Files:**
- `plugins/README.md` - Shows old structure
- `plugins/PLUGIN_CATALOG.md` - May need updates

**Fix Needed:**
- Update README.md to show new structure:
  ```
  plugins/
  ├── my-plugin/
  │   ├── plugin.js          # Plugin logic
  │   └── commands.js        # Commands (optional)
  ```

### 3. Integration Plugin Names 🔍
**Current:** Plugin names use `/` in code
- `integrations/homeassistant`
- `integrations/speedtest`
- `integrations/weather`

**Question:** Should these be renamed to avoid `/` in plugin names?
- Option A: Keep as-is (works fine)
- Option B: Rename to `integrations-homeassistant` in code only
- Option C: Flatten structure back to root level

**Recommendation:** Keep as-is. The `/` in plugin names is fine and makes logical sense.

---

## Optional Improvements

### 1. Plugin Loading Order
Currently plugins load alphabetically. Consider:
- Priority-based loading
- Dependency resolution
- Core plugins first, then features

### 2. Plugin Metadata
Add metadata to each plugin:
```javascript
export default class MyPlugin extends Plugin {
  constructor() {
    super('my-plugin', '1.0.0', 'Description');
    this.metadata = {
      author: 'Your Name',
      category: 'automation',
      dependencies: ['network-management'],
      keywords: ['devices', 'monitoring']
    };
  }
}
```

### 3. Plugin Configuration
Add per-plugin config files:
```
plugins/
└── my-plugin/
    ├── plugin.js
    ├── commands.js
    ├── config.json      # Plugin-specific config
    └── README.md        # Plugin documentation
```

### 4. Plugin Testing
Add test files for each plugin:
```
plugins/
└── my-plugin/
    ├── plugin.js
    ├── commands.js
    └── plugin.test.js   # Unit tests
```

---

## Priority Tasks

### High Priority
1. ✅ Move example-plugin to directory structure
2. ✅ Update plugins/README.md with new structure
3. ⏳ Test all plugins work correctly

### Medium Priority
1. ⏳ Update PLUGIN_CATALOG.md if needed
2. ⏳ Add plugin development guide
3. ⏳ Document plugin structure standard

### Low Priority
1. ⏳ Add plugin metadata system
2. ⏳ Add plugin configuration system
3. ⏳ Add plugin testing framework
4. ⏳ Implement plugin dependencies

---

## Quick Fixes

### Fix Example Plugin
```bash
mkdir plugins/example-plugin
mv plugins/example-plugin.js plugins/example-plugin/plugin.js
# Then update import in plugin.js
```

### Update README
Replace the structure section in `plugins/README.md`:
```markdown
### 1. Plugin Structure

```
plugins/
└── my-plugin/
    ├── plugin.js         # Plugin logic (required)
    └── commands.js       # Slash commands (optional)
```
```

---

## Testing Checklist

After fixes:
- [ ] Bot starts successfully
- [ ] All 14 plugins load
- [ ] Example plugin loads from new location
- [ ] Commands register correctly
- [ ] No import errors
- [ ] Dashboard works
- [ ] Hot-reload works

---

## Notes

- The current structure is functional and working
- These are minor cleanup items
- No breaking changes needed
- Can be done incrementally

