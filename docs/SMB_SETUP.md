# SMB/CIFS Setup Guide

## Overview

The Discord Maid Bot supports saving files (like research results) to SMB/CIFS network shares. This feature is cross-platform and works on Windows, Linux, and macOS.

## Platform Requirements

### Windows
- ✅ **Built-in support** - No additional software needed
- Uses native `net use`, `copy`, and `dir` commands

### Linux (Ubuntu/Debian)
- 📦 **Requires smbclient package**

```bash
sudo apt-get update
sudo apt-get install smbclient
```

For other distributions:
```bash
# Fedora/RHEL/CentOS
sudo dnf install samba-client

# Arch Linux
sudo pacman -S smbclient
```

### macOS
- ✅ **Usually pre-installed** - smbclient comes with macOS
- If missing, install via Homebrew:

```bash
brew install samba
```

## Configuration

### 1. Environment Variables

Add to your `.env` file:

```env
# SMB Server Configuration
SMB_HOST=192.168.0.250
SMB_USERNAME=your_username
SMB_PASSWORD=your_password
SMB_SHARE=share_name
```

### 2. Test Connection

You can test the SMB connection from the dashboard:
1. Go to Settings tab
2. Check SMB Status section
3. Connection status will show if configured correctly

### 3. Verify Access

#### Windows
```cmd
net use \\192.168.0.250\share password /user:username
dir \\192.168.0.250\share
```

#### Linux/Mac
```bash
smbclient //192.168.0.250/share -U username%password -c "ls"
```

## Usage

### Automatic Saving

When SMB is configured and enabled, research results are automatically saved to the SMB share:

```
/research query:best practices for Discord bots
```

The bot will:
1. Generate research results
2. Save to local temp file
3. Upload to SMB share
4. Clean up local file
5. Notify you of success

### Fallback Behavior

If SMB is not configured or connection fails:
- Files are saved to local `./temp` directory
- Bot continues to function normally
- You can retrieve files from the local temp folder

## Troubleshooting

### Windows Issues

**Error: "Multiple connections to a server or shared resource"**
```cmd
# Disconnect existing connections
net use \\192.168.0.250\share /delete

# Reconnect
net use \\192.168.0.250\share password /user:username
```

**Error: "Access Denied"**
- Verify username and password are correct
- Check share permissions on the server
- Ensure user has write access to the share

### Linux Issues

**Error: "smbclient: command not found"**
```bash
# Install smbclient
sudo apt-get install smbclient
```

**Error: "NT_STATUS_LOGON_FAILURE"**
- Check username and password
- Verify SMB server allows the user
- Try with domain: `DOMAIN\\username`

**Error: "NT_STATUS_BAD_NETWORK_NAME"**
- Verify share name is correct
- Check if share exists on server
- Ensure SMB server is accessible

### Connection Test

Test SMB connection manually:

#### Windows
```cmd
# Test connection
net use \\192.168.0.250\share password /user:username

# List files
dir \\192.168.0.250\share

# Disconnect
net use \\192.168.0.250\share /delete
```

#### Linux/Mac
```bash
# Test connection and list files
smbclient //192.168.0.250/share -U username%password -c "ls"

# Upload a test file
echo "test" > test.txt
smbclient //192.168.0.250/share -U username%password -c "put test.txt"

# Download a file
smbclient //192.168.0.250/share -U username%password -c "get test.txt"
```

## Security Considerations

### Password Storage
- Passwords are stored in `.env` file
- Never commit `.env` to version control
- Use `.gitignore` to exclude `.env`

### Network Security
- Use SMB over VPN (like Tailscale) for remote access
- Consider using SMB3 with encryption
- Restrict share permissions to specific users

### File Permissions
- Ensure bot user has write access to share
- Consider creating a dedicated bot user account
- Limit permissions to only what's needed

## Advanced Configuration

### Custom Temp Directory

Change the local temp directory in code:

```javascript
await saveToSMB(filename, content, './custom-temp');
```

### Disable SMB

To disable SMB without removing configuration:

```javascript
// Via dashboard Settings tab
// Or via database
configOps.set('smb_enabled', 'false');
```

### Enable SMB

```javascript
configOps.set('smb_enabled', 'true');
```

## File Management

### List Files on Share

The bot can list files on the SMB share:

```javascript
const result = await listSMBFiles();
console.log(result.files);
```

### File Naming

Research files are named with timestamp:
```
research_topic_name_2025-12-13T16-30-45.txt
```

## Platform-Specific Notes

### Windows
- Uses UNC paths: `\\server\share\file.txt`
- Supports persistent connections
- Can map network drives

### Linux
- Uses smbclient for all operations
- Each operation creates new connection
- No persistent mounting required

### macOS
- Similar to Linux (uses smbclient)
- Can also mount via Finder
- Native SMB support in Finder

## Examples

### Research with SMB

```
User: /research query:AI best practices
Bot: 🔎 Researching: AI best practices
     [Research results...]
     💾 Saved to SMB: research_ai_best_practices_2025-12-13.txt
```

### Research without SMB

```
User: /research query:AI best practices
Bot: 🔎 Researching: AI best practices
     [Research results...]
     📁 Saved locally: ./temp/research_ai_best_practices_2025-12-13.txt
```

## Integration with Other Features

### Scheduled Research

Combine with task scheduler for automated research:

```
/schedule add name:daily-research cron:0 9 * * * command:research
```

Results automatically saved to SMB share.

### Plugin Integration

Plugins can access SMB functionality:

```javascript
import { saveToSMB } from './src/config/smb-config.js';

async function savePluginData(data) {
  await saveToSMB('plugin-data.json', JSON.stringify(data));
}
```

## FAQ

**Q: Do I need SMB configured to use the bot?**
A: No, SMB is optional. Files will be saved locally if not configured.

**Q: Can I use NFS instead of SMB?**
A: Not currently supported, but could be added as a plugin.

**Q: Does this work with cloud storage?**
A: Not directly, but you can mount cloud storage as SMB share.

**Q: Can I access files from Discord?**
A: Not directly, but you can implement a plugin to list/retrieve files.

**Q: Is SMB secure?**
A: Use SMB3 with encryption and VPN for best security.

---

*Last updated: December 13, 2025*
