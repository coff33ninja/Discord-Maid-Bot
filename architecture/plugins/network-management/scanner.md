# scanner.js

**Path:** `plugins\network-management\scanner.js`

## Dependencies
- `ping` → ping (L1)
- `node-arp` → arp (L2)
- `child_process` → exec (L3)
- `util` → promisify (L4)
- `../../src/database/db.js` → deviceOps (L5)
- `./device-detector.js` → detectDeviceType, getDeviceEmoji, DeviceType (L6)

## Exports
- **isTailscaleAvailable** [function] (L64)
- **scanDevicePorts** [function] (L238) - Scan common ports on a device using nmap
- **pingDeviceDetailed** [function] (L349) - Ping a single device and return detailed results
- **quickPingCheck** [function] (L384)
- **scanUnifiedNetwork** [function] (L444)
- **assignDeviceName** [function] (L490)
- **findDevice** [function] (L523)
- **getTailscaleDeviceInfo** [function] (L541) - Get Tailscale device info and link with local device if exists
- **linkTailscaleToLocal** [function] (L594) - Link a Tailscale device to a local device
- **getTailscaleStatus** [reference] (L618)

## Functions
- `async pingDevice(ip)` (L11)
- `async getTailscaleStatus()` (L54)
- ✓ `async isTailscaleAvailable()` (L64)
- `async scanLocalNetwork(subnet)` (L74)
- `async scanTailscaleNetwork()` (L146)
- ✓ `async scanDevicePorts(ip, fullScan = false)` (L238) - Scan common ports on a device using nmap
- `getServiceName(port)` (L333) - Get common service name for a port
- ✓ `async pingDeviceDetailed(ip)` (L349) - Ping a single device and return detailed results
- ✓ `async quickPingCheck()` (L384)
- ✓ `async scanUnifiedNetwork(subnet = '192.168.0.0/24')` (L444)
- ✓ `assignDeviceName(macOrId, name)` (L490)
- ✓ `findDevice(identifier)` (L523)
- ✓ `async getTailscaleDeviceInfo(identifier)` (L541) - Get Tailscale device info and link with local device if exists
- ✓ `linkTailscaleToLocal(tailscaleHostname, localIdentifier)` (L594) - Link a Tailscale device to a local device

