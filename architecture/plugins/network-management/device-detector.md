# device-detector.js

**Path:** `plugins\network-management\device-detector.js`

## Description
* Device Type Detector

## Dependencies
- `../../src/logging/logger.js` → createLogger (L11)
- `child_process` → exec (L12)
- `util` → promisify (L13)

## Exports
- **DeviceType** [const] (L21) - Device types
- **detectFromMac** [function] (L143) - Detect device type from MAC vendor prefix
- **detectFromPorts** [function] (L165) - Detect device type from open ports
- **detectWithNmap** [function] (L205) - Use nmap for OS detection (requires nmap installed)
- **detectDeviceType** [function] (L318) - Detect device type using all available methods
- **getDeviceEmoji** [function] (L401) - Get emoji for device type

## Functions
- `normalizeMac(mac)` (L120) - Normalize MAC address to uppercase with colons
- `getMacPrefix(mac)` (L132) - Get MAC prefix (first 3 bytes)
- ✓ `detectFromMac(mac)` (L143) - Detect device type from MAC vendor prefix
- ✓ `detectFromPorts(ports)` (L165) - Detect device type from open ports
- ✓ `async detectWithNmap(ip)` (L205) - Use nmap for OS detection (requires nmap installed)
- `parseNmapOutput(output)` (L250) - Parse nmap output for OS detection
- `parseNmapPorts(output)` (L292) - Parse nmap output for open ports
- ✓ `async detectDeviceType(device, useNmap = true)` (L318) - Detect device type using all available methods
- ✓ `getDeviceEmoji(type)` (L401) - Get emoji for device type

## Constants
- ✓ **DeviceType** [object] (L21) - Device types
- **MAC_VENDORS** [object] (L38) - Common MAC vendor prefixes (first 3 bytes) mapped to device types
- **PORT_SIGNATURES** [object] (L100) - Port signatures for device type detection

