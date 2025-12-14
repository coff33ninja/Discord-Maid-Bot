# Remote Shutdown Server

**Version:** 1.0.0.0-beta  
**Author:** Discord Maid Bot Team

Cross-platform remote shutdown server for Discord Maid Bot. Allows remote shutdown/restart of computers via HTTP API. Complements the Wake-on-LAN functionality in the network management plugin.

---

## 🚀 Quick Start

### 1. Test Manually (Recommended First Step)

Run the server manually to test before installing as a service:

**Windows:**
```powershell
# Right-click and "Run as administrator"
cd scripts/remote-shutdown
windows\run-server.bat
```

**Linux:**
```bash
cd scripts/remote-shutdown
sudo linux/run-server.sh
```

**macOS:**
```bash
cd scripts/remote-shutdown
sudo macos/run-server.sh
```

The run scripts will:
- Check if Python is installed
- Install required packages (Flask)
- Create default configuration if needed
- Start the server on port 5000

### 2. Configure

On first run, a `shutdown-config.json` file is created with default settings:

```json
{
  "port": 5000,
  "host": "0.0.0.0",
  "api_key": "change-this-secret-key",
  "device_name": "YOUR-COMPUTER-NAME",
  "shutdown_delay": 5,
  "log_file": "shutdown-server.log"
}
```

**IMPORTANT:** Change the `api_key` before using in production!

**Configuration Options:**
- `port` - Port to listen on (default: 5000)
- `host` - Interface to bind to (0.0.0.0 = all interfaces)
- `api_key` - Secret key for authentication (CHANGE THIS!)
- `device_name` - Friendly name for this device
- `shutdown_delay` - Countdown in seconds before shutdown (default: 5)
- `log_file` - Path to log file

### 3. Test the API

Once the server is running, test it:

**Check Status (No Auth Required):**
```bash
curl http://localhost:5000/status
```

**Test Shutdown (Auth Required):**
```bash
curl -X POST http://localhost:5000/shutdown?api_key=change-this-secret-key
```

**Test Restart (Auth Required):**
```bash
curl -X POST http://localhost:5000/restart?api_key=change-this-secret-key
```

### 4. Install as Service (Optional)

Once tested, install as a system service for auto-start on boot:

**Windows:**
```powershell
# Run as Administrator
cd scripts/remote-shutdown
powershell -ExecutionPolicy Bypass -File windows\install-service.ps1
```

**Linux:**
```bash
cd scripts/remote-shutdown
sudo linux/install-service.sh
```

**macOS:**
```bash
cd scripts/remote-shutdown
sudo macos/install-service.sh
```

---

## 📡 API Reference

### Authentication

All shutdown/restart endpoints require authentication via API key. Provide the key in one of three ways:

1. **Header:** `X-API-Key: your-secret-key`
2. **Query Parameter:** `?api_key=your-secret-key`
3. **JSON Body:** `{"api_key": "your-secret-key"}`

### Endpoints

#### `POST /shutdown`
Shutdown the computer after a countdown.

**Authentication:** Required

**Response:**
```json
{
  "status": "success",
  "message": "Shutdown initiated",
  "device": "MY-PC",
  "delay": 5,
  "timestamp": "2025-12-14T12:00:00"
}
```

#### `POST /restart`
Restart the computer after a countdown.

**Authentication:** Required

**Response:**
```json
{
  "status": "success",
  "message": "Restart initiated",
  "device": "MY-PC",
  "delay": 5,
  "timestamp": "2025-12-14T12:00:00"
}
```

#### `GET /status`
Check if the server is online.

**Authentication:** Not required

**Response:**
```json
{
  "status": "online",
  "device": "MY-PC",
  "platform": "win32",
  "version": "1.0.0.0-beta",
  "timestamp": "2025-12-14T12:00:00"
}
```

#### `GET /ping`
Simple ping test.

**Authentication:** Not required

**Response:**
```json
{
  "pong": true,
  "device": "MY-PC",
  "timestamp": "2025-12-14T12:00:00"
}
```

#### `GET /config`
Get current configuration (API key hidden).

**Authentication:** Required

**Response:**
```json
{
  "port": 5000,
  "host": "0.0.0.0",
  "api_key": "***hidden***",
  "device_name": "MY-PC",
  "shutdown_delay": 5,
  "log_file": "shutdown-server.log"
}
```

---

## 🔧 Discord Bot Integration

### Network Management Plugin

The remote shutdown server is designed to work with the Discord bot's network management plugin. Once installed on your devices, you can:

1. **Wake devices** using Wake-on-LAN (`/network wol`)
2. **Shutdown devices** using this HTTP API
3. **Check device status** using network scanning

### Example Bot Command (Future)

```javascript
// In network management plugin
async function shutdownDevice(deviceIp, apiKey) {
  const response = await fetch(`http://${deviceIp}:5000/shutdown`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey
    }
  });
  return await response.json();
}
```

---

## 🔒 Security

### Important Security Considerations

1. **Change the Default API Key**
   - The default key is `change-this-secret-key`
   - Use a strong, random key (32+ characters)
   - Generate with: `openssl rand -hex 32`

2. **Firewall Configuration**
   - Only allow connections from trusted IPs
   - Consider using a VPN (like Tailscale)
   - Block port 5000 from public internet

3. **HTTPS (Recommended)**
   - Use a reverse proxy (nginx, Caddy) for HTTPS
   - Never send API keys over unencrypted HTTP on public networks

4. **Network Isolation**
   - Run on a private network only
   - Use Tailscale or VPN for remote access
   - Don't expose directly to the internet

### Example Firewall Rules

**Windows Firewall:**
```powershell
# Allow only from specific IP
New-NetFirewallRule -DisplayName "Remote Shutdown Server" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow -RemoteAddress 192.168.0.0/24
```

**Linux (ufw):**
```bash
# Allow only from specific IP
sudo ufw allow from 192.168.0.0/24 to any port 5000
```

---

## 📝 Logging

All actions are logged to `shutdown-server.log`:

```
2025-12-14 12:00:00 - INFO - Discord Maid Bot - Remote Shutdown Server
2025-12-14 12:00:00 - INFO - Device: MY-PC
2025-12-14 12:00:00 - INFO - Platform: win32
2025-12-14 12:00:00 - INFO - Port: 5000
2025-12-14 12:00:00 - INFO - Server ready! Listening for shutdown commands...
2025-12-14 12:05:00 - INFO - Shutdown request received from 192.168.0.100
2025-12-14 12:05:00 - INFO - Initiating system shutdown on win32...
2025-12-14 12:05:05 - INFO - Executing shutdown command...
```

---

## 🛠️ Troubleshooting

### Server Won't Start

**Error: Python not found**
```bash
# Install Python 3.7+
# Windows: Download from python.org
# Linux: sudo apt install python3 python3-pip
# macOS: brew install python3
```

**Error: Flask not installed**
```bash
# Install Flask
pip install flask
# or
pip3 install flask
```

**Error: Port already in use**
```bash
# Change port in shutdown-config.json
{
  "port": 5001
}
```

### Shutdown Fails

**Error: Permission denied**
- Windows: Run as Administrator
- Linux/macOS: Run with sudo

**Error: Shutdown command not found**
- Check platform detection in logs
- Verify OS is supported (Windows, Linux, macOS)

### Can't Connect from Bot

**Check firewall:**
```bash
# Windows
netsh advfirewall firewall show rule name=all | findstr 5000

# Linux
sudo ufw status

# macOS
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --listapps
```

**Check server is running:**
```bash
curl http://localhost:5000/status
```

**Check from remote machine:**
```bash
curl http://192.168.0.100:5000/status
```

---

## 📂 File Structure

```
scripts/remote-shutdown/
├── universal-shutdown-server.py    # Main server script
├── shutdown-config.json            # Configuration (auto-generated)
├── shutdown-server.log             # Log file (auto-generated)
├── README.md                       # This file
├── windows/
│   ├── run-server.bat             # Manual launcher
│   └── install-service.ps1        # Service installer
├── linux/
│   ├── run-server.sh              # Manual launcher
│   └── install-service.sh         # Service installer
└── macos/
    ├── run-server.sh              # Manual launcher
    └── install-service.sh         # Service installer
```

---

## 🔄 Service Management

### Windows (Task Scheduler)

```powershell
# Check if service is running
Get-ScheduledTask -TaskName "DiscordMaidBotShutdownServer"

# Start service
Start-ScheduledTask -TaskName "DiscordMaidBotShutdownServer"

# Stop service
Stop-ScheduledTask -TaskName "DiscordMaidBotShutdownServer"

# Remove service
Unregister-ScheduledTask -TaskName "DiscordMaidBotShutdownServer"
```

### Linux (systemd)

```bash
# Check status
sudo systemctl status discord-shutdown-server

# Start service
sudo systemctl start discord-shutdown-server

# Stop service
sudo systemctl stop discord-shutdown-server

# Restart service
sudo systemctl restart discord-shutdown-server

# View logs
sudo journalctl -u discord-shutdown-server -f

# Remove service
sudo systemctl disable discord-shutdown-server
sudo rm /etc/systemd/system/discord-shutdown-server.service
```

### macOS (LaunchDaemon)

```bash
# Check status
sudo launchctl list | grep discord.shutdown

# Start service
sudo launchctl load /Library/LaunchDaemons/com.discord.shutdown.plist

# Stop service
sudo launchctl unload /Library/LaunchDaemons/com.discord.shutdown.plist

# View logs
tail -f /var/log/discord-shutdown-server.log

# Remove service
sudo launchctl unload /Library/LaunchDaemons/com.discord.shutdown.plist
sudo rm /Library/LaunchDaemons/com.discord.shutdown.plist
```

---

## 🎯 Use Cases

### Home Lab Management
- Wake servers with WOL
- Shutdown servers remotely
- Schedule maintenance windows

### Gaming PC Control
- Wake PC before gaming session
- Shutdown PC after streaming
- Remote power management

### Energy Saving
- Shutdown idle computers
- Schedule power-off times
- Reduce electricity costs

### Multi-Device Coordination
- Shutdown all devices at once
- Staggered shutdown sequence
- Automated maintenance routines

---

## 🚀 Future Enhancements

- [ ] Discord bot command integration (`/device shutdown`)
- [ ] Scheduled shutdown support
- [ ] Cancel shutdown command
- [ ] Hibernate/sleep support
- [ ] Multi-device bulk operations
- [ ] Web dashboard for management
- [ ] Notification system (Discord DM on shutdown)
- [ ] Shutdown reason logging
- [ ] Integration with device health monitoring

---

## 📖 Related Documentation

- [Main Scripts README](../README.md)
- [Network Management Plugin](../../plugins/network-management/docs/README.md)
- [System Maintenance Scripts](../system-maintenance/README.md)

---

**Version:** 1.0.0.0-beta  
**Last Updated:** December 14, 2025  
**Author:** Discord Maid Bot Team

For questions or issues, open an issue on GitHub.
