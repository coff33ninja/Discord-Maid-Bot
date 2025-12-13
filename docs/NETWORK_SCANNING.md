# Network Scanning Guide

## Overview

The Discord Maid Bot features a unified network scanning system that discovers and monitors devices on both your local network and Tailscale VPN network simultaneously.

## Features

### Unified Scanning
- **Single Command**: `/scan` now scans both local and Tailscale networks
- **Merged Results**: Devices appearing on both networks are intelligently merged
- **Tabbed Display**: Results are organized by network type for easy viewing
- **Real-time Status**: Shows online/offline status and latency for each device

### Device Naming
- **Friendly Names**: Assign memorable names to devices using `/namedevice`
- **Persistent**: Names are stored in the database and persist across scans
- **Autocomplete**: Device selection uses autocomplete with smart filtering
- **Priority Display**: Named devices appear first in lists

### Network Types

#### Local Network (🏠)
- Scans your subnet (default: 192.168.0.0/24)
- Uses ping + ARP to discover devices
- Shows IP, MAC address, hostname, and latency
- Configurable via `NETWORK_SUBNET` environment variable

#### Tailscale Network (🌐)
- Discovers Tailscale VPN peers
- Shows Tailscale IP, hostname, and OS
- Verifies connectivity with ping
- Displays VPN-specific information

#### Both Networks
- Devices on both networks show a 🌐 badge
- Combines information from both sources
- Uses local network info as primary

## Commands

### /scan
Performs a unified network scan.

**Output:**
```
📡 Unified Network Scan Results
Total: 15 devices (12 online)
├─ 🏠 Local Network: 12 devices
└─ 🌐 Tailscale: 3 devices

🏠 Local Network
  1. Gaming PC 🌐
     192.168.0.100 | aa:bb:cc:dd:ee:ff | 5ms
  2. Laptop
     192.168.0.101 | 11:22:33:44:55:66 | 12ms
  ...

  🌐 Tailscale Network
    1. Remote Server 🟢
       100.64.0.1 | Linux | 45ms
    2. Mobile Device 🔴
       100.64.0.2 | Android | offline
```

### /namedevice
Assign a friendly name to a device.

**Usage:**
```
/namedevice device:<select from list> name:Gaming PC
```

**Features:**
- Autocomplete shows all known devices
- Prioritizes devices with existing names
- Shows device status and info
- Names appear in all future scans

**Example:**
```
/namedevice device:aa:bb:cc:dd:ee:ff name:Gaming PC
```

**Result:**
```
🏷️ Device Name Assigned
Successfully named device Gaming PC

Device Name: Gaming PC
Hostname: DESKTOP-ABC123
IP Address: 192.168.0.100
MAC Address: aa:bb:cc:dd:ee:ff
Status: 🟢 Online
```

### /devices
List all known devices with optional filtering.

**Usage:**
```
/devices filter:online
```

**Filters:**
- `all` - Show all devices
- `online` - Only online devices
- `offline` - Only offline devices

**Features:**
- Shows friendly names prominently
- Displays device notes
- Includes status indicators

### /wol
Wake a device using Wake-on-LAN.

**Usage:**
```
/wol device:<select from list>
```

**Features:**
- Autocomplete shows device names
- Works with named devices
- Shows device info before waking

## Database Schema

Devices are stored with the following information:

```sql
CREATE TABLE devices (
  id INTEGER PRIMARY KEY,
  ip TEXT NOT NULL,
  mac TEXT NOT NULL UNIQUE,
  hostname TEXT,
  first_seen DATETIME,
  last_seen DATETIME,
  online BOOLEAN,
  device_type TEXT,
  notes TEXT  -- Used for friendly names
)
```

## API Endpoints

### GET /api/network/unified
Returns unified scan results.

**Response:**
```json
{
  "all": [...],
  "local": [...],
  "tailscale": [...],
  "stats": {
    "total": 15,
    "local": 12,
    "tailscale": 3,
    "online": 12
  }
}
```

### GET /api/tailscale/devices
Returns Tailscale devices only (legacy endpoint).

## Configuration

### Environment Variables

```env
# Network subnet to scan
NETWORK_SUBNET=192.168.0.0/24
```

### Tailscale Setup

1. Install Tailscale on your server
2. Run `tailscale up` to connect
3. Bot automatically detects Tailscale availability
4. No additional configuration needed

## Implementation Details

### Unified Scanner (`src/network/unified-scanner.js`)

The unified scanner:
1. Scans local network in parallel with Tailscale
2. Merges results, avoiding duplicates
3. Enriches device data from database
4. Updates database with latest information
5. Returns organized results

### Cross-Platform Compatibility

The scanner works on both Windows and Linux:
- **Ping Detection**: Uses `ping` npm module as primary method
- **Fallback Ping**: Platform-specific native ping commands
  - Windows: `ping -n 1 -w 5000 <ip>`
  - Linux/Mac: `ping -c 1 -W 5 <ip>`
- **Output Parsing**: Handles both Windows and Linux ping output formats
- **Tailscale**: Works on any platform where Tailscale is installed

### Device Naming

Device names are stored in the `notes` field of the devices table:
- Allows any text as a friendly name
- Searchable via autocomplete
- Displayed prominently in all lists
- Persists across bot restarts

### Autocomplete Logic

Device autocomplete uses score-based ranking:
1. **Exact matches** (score: 1000)
2. **Starts with** (score: 500-800)
3. **Contains** (score: 100-400)
4. **Bonus for online** (+25)
5. **Bonus for named devices** (+200)

## Best Practices

### Naming Devices
- Use descriptive, memorable names
- Include location or purpose (e.g., "Living Room TV")
- Keep names concise for better display
- Use consistent naming conventions

### Network Scanning
- Run initial scan after bot startup
- Schedule periodic scans for monitoring
- Use dashboard for detailed device management
- Check Tailscale status if VPN devices missing

### Performance
- Local network scan: ~30-60 seconds
- Tailscale scan: ~5-10 seconds
- Scans run in parallel for efficiency
- Results cached until next scan

## Troubleshooting

### No Devices Found
- Check `NETWORK_SUBNET` matches your network
- Verify firewall allows ICMP (ping)
- Ensure bot has network access
- Check ARP table permissions

### Tailscale Not Detected
- Verify Tailscale is installed: `tailscale version`
- Check Tailscale is running: `tailscale status`
- Ensure bot user has Tailscale access
- Review Tailscale logs for errors

### Device Names Not Showing
- Verify device was scanned at least once
- Check database for device entry
- Ensure MAC address matches
- Try rescanning the network

### Duplicate Devices
- Devices on both networks show as one entry
- Check for multiple MAC addresses
- Verify IP address consistency
- Review database for duplicates

## Future Enhancements

Potential improvements:
- Device type detection (router, PC, phone, etc.)
- Historical uptime tracking
- Network topology visualization
- Custom device icons
- Device grouping/tagging
- Notification on device status changes
- Integration with network monitoring tools

---

*Last updated: December 13, 2025*
