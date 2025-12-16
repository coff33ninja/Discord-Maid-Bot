# tailscale.js

**Path:** `plugins\network-management\tailscale.js`

## Dependencies
- `child_process` → exec (L1)
- `util` → promisify (L2)
- `ping` → ping (L3)
- `node-arp` → arp (L4)

## Exports
- **getTailscaleStatus** [function] (L52)
- **getTailscaleDevices** [function] (L63)
- **scanTailscaleNetwork** [function] (L93)
- **getTailscaleRoutes** [function] (L147)
- **isTailscaleAvailable** [function] (L168)
- **getTailscaleIP** [function] (L178)

## Functions
- `async pingDevice(ip)` (L9)
- ✓ `async getTailscaleStatus()` (L52)
- ✓ `async getTailscaleDevices()` (L63)
- ✓ `async scanTailscaleNetwork()` (L93)
- ✓ `async getTailscaleRoutes()` (L147)
- ✓ `async isTailscaleAvailable()` (L168)
- ✓ `async getTailscaleIP()` (L178)

