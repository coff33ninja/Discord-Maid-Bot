# Research History Display Fix

**Date**: December 14, 2025  
**Status**: ✅ Complete

## Issue
Research history was not displaying in the dashboard UI, even though research data existed in the database.

## Root Cause
The `loadResearch()` function in the dashboard was using `fetch()` instead of `authFetch()`. Since the `/api/research` endpoint requires authentication (`requireAuth` middleware), the unauthenticated request was being rejected.

## Investigation

### Database Check
```bash
node -e "import('./src/database/db.js').then(db => { 
  const research = db.researchOps.getRecent(10); 
  console.log('Research count:', research.length); 
})"
```

Result: **4 research entries found** ✅
- Data exists in database
- Queries are being saved correctly
- Timestamps and metadata are present

### API Endpoint Check
**File**: `src/dashboard/server.js` (line 552)
```javascript
app.get('/api/research', requireAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const research = researchOps.getRecent(limit);
  res.json(research);
});
```

Result: Endpoint requires authentication ✅

### Dashboard Code Check
**File**: `public/dashboard.js` (line 1102)
```javascript
const response = await fetch('/api/research?limit=10'); // ❌ No auth!
```

Result: **Missing authentication** ❌

## Solution

### Changed fetch() to authFetch()
**File**: `public/dashboard.js` (line 1102)

**Before**:
```javascript
async function loadResearch() {
  try {
    const response = await fetch('/api/research?limit=10'); // No auth
    const research = await response.json();
```

**After**:
```javascript
async function loadResearch() {
  try {
    const response = await authFetch('/api/research?limit=10'); // With auth
    const research = await response.json();
```

## How authFetch Works

The `authFetch()` function is a wrapper around `fetch()` that automatically includes the JWT token in the request headers:

```javascript
async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
}
```

## Results

### Before Fix
- Research history tab: "Loading research..." (stuck)
- Console error: 401 Unauthorized
- No research items displayed

### After Fix
- Research history tab: Shows 4 research entries ✅
- Each entry displays:
  - Query text
  - Timestamp
  - SMB save status (💾 icon if saved)
- No console errors

## Research Data Structure

The dashboard displays the following fields from each research entry:

```javascript
{
  id: 4,
  query: "setup home assistant as a discord bot using nodejs",
  filename: "research_setup_home_assistant_as_a_disc_2025-12-12T21-32-06-322Z.txt",
  saved_to_smb: 1,
  timestamp: "2025-12-12 21:32:06",
  user_id: "312691199163236353"
}
```

Display format:
```
┌─────────────────────────────────────────────────┐
│ setup home assistant as a discord bot using... │
│ 12/12/2025, 9:32:06 PM | 💾 Saved to SMB      │
└─────────────────────────────────────────────────┘
```

## Other Dashboard Functions Using authFetch

Verified that other dashboard functions correctly use `authFetch()`:
- ✅ `loadSpeedHistory()` - uses `authFetch()`
- ✅ `loadHomeAssistant()` - uses `authFetch()`
- ✅ `loadTasks()` - uses `authFetch()`
- ✅ `loadDevices()` - uses `authFetch()`
- ❌ `loadResearch()` - was using `fetch()` (now fixed)

## Testing

1. Open dashboard at http://localhost:3000
2. Navigate to Research tab
3. Verify 4 research entries are displayed
4. Check that timestamps are formatted correctly
5. Verify SMB save status icons appear

## Benefits

✅ Research history now displays correctly  
✅ Consistent authentication across all dashboard API calls  
✅ No more 401 Unauthorized errors  
✅ Users can view their research history  
✅ SMB save status is visible  

## Related Files

- `public/dashboard.js` - Fixed loadResearch() function
- `src/dashboard/server.js` - API endpoint (no changes needed)
- `src/database/db.js` - Database operations (no changes needed)
- `plugins/research/plugin.js` - Research plugin (no changes needed)
