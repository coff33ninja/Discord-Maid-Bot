# Changelog

## [Unreleased] - 2025-12-13

### Added
- **Unified Network Scanning**: Merged local and Tailscale network scanning into a single unified system
  - Scans both networks simultaneously
  - Intelligently merges devices appearing on both networks
  - Shows network type badges (Local, Tailscale, Both)
  - Displays comprehensive device information (IP, MAC, hostname, latency, OS)

- **Device Naming System**: Assign friendly names to network devices
  - `/namedevice` command to assign names via Discord
  - Names persist in database across scans
  - Autocomplete shows existing device names
  - Dashboard UI for quick device naming
  - Names displayed prominently in all device lists

- **Enhanced Dashboard**: Updated web dashboard for unified network view
  - Single "Network" tab with sub-tabs (All/Local/Tailscale)
  - Network statistics overview (total, local, Tailscale counts)
  - Device naming modal and quick edit buttons
  - Visual network badges for device types
  - Removed separate Tailscale tab (now integrated)

- **Cross-Platform Support**: Network scanning works on Windows, Linux, and macOS
  - Platform detection for ping commands
  - Windows: `ping -n 1 -w 5000`
  - Linux/Mac: `ping -c 1 -W 5`
  - Parses both Windows and Linux ping output formats

- **Multiple Gemini API Keys**: Support for API key rotation
  - Configure up to 7 API keys in `.env`
  - Automatic rotation on rate limits
  - Load balancing across keys
  - Updated server with all 6 configured keys

### Changed
- `/scan` command now shows unified network results with tabbed display
- Device lists show friendly names when assigned
- Improved device autocomplete with name-based search
- Network scanning runs in parallel for better performance

### Removed
- Separate `/tailscale` command (functionality merged into `/scan`)
- Separate Tailscale dashboard tab (integrated into Network tab)

### Technical Details
- New module: `src/network/unified-scanner.js`
- Updated: `index.js`, `src/commands/slash-commands.js`, `src/dashboard/server.js`
- Updated: `public/index.html`, `public/dashboard.js`
- New documentation: `docs/NETWORK_SCANNING.md`
- Database: Uses existing `devices.notes` field for friendly names

### Documentation
- Added comprehensive network scanning guide
- Updated commands documentation
- Added platform compatibility notes
- Updated README with platform support section

---

## Previous Versions

See git history for previous changes.
