# Cross-Platform Compatibility Guide

## Overview

Discord Maid Bot is designed to run on Windows, Linux, and macOS with full feature parity. All platform-specific operations are automatically detected and handled appropriately.

## Supported Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| Windows 10/11 | ✅ Fully Supported | Native commands used |
| Linux (Ubuntu/Debian) | ✅ Fully Supported | Tested on Ubuntu 24.04 |
| Linux (Other) | ✅ Should Work | Fedora, Arch, etc. |
| macOS | ⚠️ Untested | Should work (similar to Linux) |

## Platform Detection

The bot automatically detects the platform using Node.js `process.platform`:

```javascript
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';
const isMac = process.platform === 'darwin';
```

## Feature Compatibility

### Network Scanning

**Ping Detection:**
- Windows: `ping -n 1 -w 5000 <ip>`
- Linux/Mac: `ping -c 1 -W 5 <ip>`

**Implementation:**
```javascript
const pingCmd = isWindows 
  ? `ping -n 1 -w 5000 ${ip}`  // -n count, -w timeout in ms
  : `ping -c 1 -W 5 ${ip}`;     // -c count, -W timeout in seconds
```

**Output Parsing:**
- Windows: `"time=25ms"` or `"time<1ms"`
- Linux: `"time=25.0 ms"` or `"time=0.123 ms"`

### SMB/CIFS File Sharing

**Windows:**
- Uses native `net use`, `copy`, `dir` commands
- No additional software required
- UNC paths: `\\server\share\file.txt`

**Linux:**
- Requires `smbclient` package
- Install: `sudo apt-get install smbclient`
- Uses smbclient for all operations

**macOS:**
- Uses `smbclient` (usually pre-installed)
- Install via Homebrew if needed: `brew install samba`

**Implementation:**
```javascript
if (isWindows) {
  await execAsync(`net use \\\\${host}\\${share} ${password} /user:${username}`);
  await execAsync(`copy "${localPath}" "${smbPath}"`);
} else {
  await execAsync(`smbclient //${host}/${share} -U ${username}%${password} -c "put \\"${localPath}\\" \\"${filename}\\""`)
}
```

### Speed Testing

**All Platforms:**
- Uses `speedtest-net` npm package
- Fully cross-platform
- No platform-specific code needed

### Tailscale Integration

**All Platforms:**
- Uses `tailscale` CLI
- Commands are identical across platforms
- Requires Tailscale to be installed

**Commands:**
```bash
tailscale version
tailscale status --json
```

### Home Assistant

**All Platforms:**
- HTTP/REST API based
- No platform-specific code
- Works identically everywhere

## Installation Requirements

### Windows

**Required:**
- Node.js 18+ (from nodejs.org)
- Git (optional, for updates)

**Optional:**
- Tailscale (for VPN features)

### Linux (Ubuntu/Debian)

**Required:**
```bash
# Node.js (via nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Git
sudo apt-get install git
```

**Optional:**
```bash
# For SMB features
sudo apt-get install smbclient

# For Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
```

### macOS

**Required:**
```bash
# Node.js (via nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Git (usually pre-installed)
git --version
```

**Optional:**
```bash
# For SMB features (if not pre-installed)
brew install samba

# For Tailscale
brew install tailscale
```

## Testing Cross-Platform Features

### Network Scanning

Test on your platform:

```bash
# Windows
ping -n 1 -w 5000 8.8.8.8

# Linux/Mac
ping -c 1 -W 5 8.8.8.8
```

### SMB Connection

Test SMB access:

```bash
# Windows
net use \\192.168.0.250\share password /user:username
dir \\192.168.0.250\share

# Linux/Mac
smbclient //192.168.0.250/share -U username%password -c "ls"
```

### Tailscale

Test Tailscale:

```bash
# All platforms
tailscale version
tailscale status
```

## Known Platform Differences

### File Paths

**Windows:**
- Uses backslashes: `C:\path\to\file`
- UNC paths: `\\server\share\file`

**Linux/Mac:**
- Uses forward slashes: `/path/to/file`
- SMB paths: `//server/share/file`

**Solution:** Node.js `path` module handles this automatically

### Line Endings

**Windows:** CRLF (`\r\n`)
**Linux/Mac:** LF (`\n`)

**Solution:** Git handles this with `.gitattributes`

### Case Sensitivity

**Windows:** Case-insensitive file system
**Linux/Mac:** Case-sensitive file system

**Solution:** Use consistent casing in code

### Process Management

**Windows:**
- Service: Windows Service or Task Scheduler
- Manual: `node index.js`

**Linux:**
- Service: systemd
- Manual: `node index.js`

**macOS:**
- Service: launchd
- Manual: `node index.js`

## Deployment Examples

### Windows (Development)

```cmd
# Clone and setup
git clone https://github.com/coff33ninja/Discord-Maid-Bot.git
cd Discord-Maid-Bot
npm install

# Configure
copy .env.example .env
notepad .env

# Run
node index.js
```

### Linux (Production with systemd)

```bash
# Clone and setup
git clone https://github.com/coff33ninja/Discord-Maid-Bot.git
cd discord-maid-bot
npm install

# Install optional dependencies
sudo apt-get install smbclient

# Configure
cp .env.example .env
nano .env

# Create systemd service
sudo nano /etc/systemd/system/discord-maid-bot.service

# Enable and start
sudo systemctl enable discord-maid-bot
sudo systemctl start discord-maid-bot
```

### macOS (Development)

```bash
# Clone and setup
git clone https://github.com/coff33ninja/Discord-Maid-Bot.git
cd Discord-Maid-Bot
npm install

# Configure
cp .env.example .env
nano .env

# Run
node index.js
```

## Troubleshooting

### Platform Detection Issues

Check detected platform:

```javascript
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Node version:', process.version);
```

### Command Not Found

**Windows:**
- Ensure commands are in PATH
- Check Windows version (some commands require specific versions)

**Linux:**
- Install missing packages: `sudo apt-get install <package>`
- Check if command exists: `which <command>`

**macOS:**
- Install via Homebrew: `brew install <package>`
- Check if command exists: `which <command>`

### Permission Issues

**Windows:**
- Run as Administrator if needed
- Check file/folder permissions

**Linux/Mac:**
- Use `sudo` for system operations
- Check file permissions: `ls -la`
- Fix permissions: `chmod +x file`

## Performance Considerations

### Network Scanning

**Windows:**
- Slightly faster native ping
- Better ARP table access

**Linux:**
- May require root for some network operations
- ARP table access varies by distribution

### File Operations

**Windows:**
- Native SMB support is faster
- No additional process overhead

**Linux:**
- smbclient adds process overhead
- Each operation creates new connection

## Best Practices

1. **Test on Target Platform:** Always test on the platform where you'll deploy
2. **Use Path Module:** Use Node.js `path` module for file paths
3. **Handle Errors:** Platform-specific operations may fail differently
4. **Document Requirements:** List platform-specific dependencies
5. **Provide Fallbacks:** Implement fallback behavior when features unavailable

## Contributing

When adding new features:

1. Check if platform-specific code is needed
2. Use `process.platform` for detection
3. Test on multiple platforms if possible
4. Document platform requirements
5. Provide fallback behavior

## Resources

- [Node.js Platform Documentation](https://nodejs.org/api/process.html#processplatform)
- [Cross-Platform Node.js Guide](https://nodejs.org/en/docs/guides/)
- [SMB Setup Guide](./SMB_SETUP.md)
- [Network Scanning Guide](./NETWORK_SCANNING.md)

---

*Last updated: December 13, 2025*
