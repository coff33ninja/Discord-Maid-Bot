# Network Scanner Fix - Ghost Device Filtering

**Date**: December 14, 2025  
**Status**: ✅ Complete

## Issue
Network scanner was showing 264 devices (252 local + 12 Tailscale) when only ~20 actual devices exist. The scanner was detecting:
- Actual devices
- Temporary DHCP leases
- Ghost entries from previous connections
- Devices responding to ping without valid MAC addresses

## Root Cause
The `scanLocalNetwork()` function scans all 254 IPs in the subnet (192.168.0.0/24) and was adding EVERY device that responded to ping, even if it couldn't get a valid MAC address.

## Solution Implemented

### 1. Added MAC Address Validation
**File**: `plugins/network-management/scanner.js` (lines 100-120)

**Before**:
```javascript
devices.push(device);
deviceOps.upsert(device); // Saved ALL responding devices
```

**After**:
```javascript
// Only add devices with valid MAC addresses OR devices that were previously registered
// This prevents filling the database with temporary/ghost devices
if (isValidMac || existingDevice) {
  devices.push(device);
  deviceOps.upsert(device); // Only save valid devices
}
```

### 2. Added Database Cleanup Functions
**File**: `src/database/db.js`

Added three new functions to `deviceOps`:
```javascript
// Cleanup devices with unknown MAC addresses (ghost devices)
cleanupUnknownDevices: () => {
  return db.prepare(`DELETE FROM devices WHERE mac = 'unknown'`).run();
},

// Delete a specific device by MAC
deleteByMac: (mac) => {
  return db.prepare('DELETE FROM devices WHERE mac = ?').run(mac);
},

// Delete a specific device by ID
deleteById: (id) => {
  return db.prepare('DELETE FROM devices WHERE id = ?').run(id);
}
```

### 3. Created Cleanup Script
**File**: `cleanup-devices.js`

A utility script to:
- Show current device count
- Count devices with unknown MAC addresses
- Remove ghost devices from database
- Show breakdown by network type (local vs Tailscale)

## How It Works Now

### Full Network Scan (`/network scan`)
1. Scans all 254 IPs in the subnet
2. Pings each IP to check if alive
3. Attempts to get MAC address via ARP
4. **NEW**: Only saves devices with valid MAC addresses
5. Shows all responding devices in scan result (temporary)
6. Only persists valid devices to database

### Quick Ping Check (Default)
1. Only pings already registered devices (20 devices)
2. Updates online/offline status
3. Much faster than full scan
4. Recommended for regular monitoring

## Results

### Database State
```
📊 Current device count: 20
❌ Devices with unknown MAC: 0 (cleaned up)
✅ Devices with valid MAC: 20

📍 Local devices: 8
📡 Tailscale devices: 12
```

### Scan Behavior
- **Full Scan**: Shows 252 responding IPs temporarily, but only saves ~20 with valid MACs
- **Quick Check**: Only checks the 20 registered devices
- **Database**: Maintains clean list of 20 actual devices

## Recommendations

### For Regular Monitoring
Use **Quick Ping Check** instead of full scan:
- Faster (checks only 20 devices vs 254 IPs)
- Cleaner results
- No ghost devices
- Updates online/offline status

### For Discovery
Use **Full Network Scan** when:
- Adding new devices to network
- Troubleshooting connectivity
- Discovering unknown devices
- Note: Scan results show all responding IPs, but only valid devices are saved

### Cleanup
Run `node cleanup-devices.js` to:
- Remove ghost devices with unknown MAC
- See device breakdown
- Clean up database

## Configuration

### Adjust Subnet Range
Edit `.env` to scan a smaller range:
```env
# Current (scans 254 IPs)
NETWORK_SUBNET=192.168.0.0/24

# Smaller range (scans 62 IPs)
NETWORK_SUBNET=192.168.0.0/26

# Even smaller (scans 30 IPs)
NETWORK_SUBNET=192.168.0.0/27
```

### Valid MAC Address Pattern
The scanner validates MAC addresses using regex:
```javascript
/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
```

Examples:
- ✅ Valid: `AA:BB:CC:DD:EE:FF`
- ✅ Valid: `aa-bb-cc-dd-ee-ff`
- ❌ Invalid: `unknown`
- ❌ Invalid: `incomplete`

## Benefits

✅ Database stays clean with only real devices  
✅ No more ghost devices filling the database  
✅ Faster queries (20 devices vs 264)  
✅ Better dashboard performance  
✅ Accurate device counts  
✅ Easy cleanup with utility script  

## Testing

Bot is running with:
- 20 registered devices (8 local + 12 Tailscale)
- Clean database with no ghost entries
- Full scan shows 252 responding IPs but only saves valid devices
- Quick ping check monitors 20 registered devices
