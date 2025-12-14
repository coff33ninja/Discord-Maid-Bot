# System Maintenance Scripts

**Version:** 1.0.0.0-beta  
**Last Updated:** December 14, 2025

Automated system maintenance scripts for Linux, Windows, and macOS. These scripts handle system updates, package upgrades, and reboot scheduling with network connectivity checks and retry logic.

---

## 📋 Overview

These scripts automate system maintenance tasks:
- Check network connectivity before running
- Update package lists/repositories
- Upgrade installed packages
- Schedule reboots if required
- Retry on network failures
- Log all operations

---

## 🐧 Linux (Ubuntu/Debian)

### Files
- `linux/system-maintenance.sh` - Main maintenance script
- `linux/system-maintenance.service` - Systemd service unit
- `linux/system-maintenance.timer` - Systemd timer unit

### Features
- Uses `nala` package manager (apt wrapper)
- Checks network connectivity (ping 8.8.8.8)
- Retries up to 3 times with 1-hour delays
- Schedules reboot 30 minutes after updates if required
- Logs to `/var/log/system-maintenance.log`

### Installation

1. **Copy script to system:**
```bash
sudo cp linux/system-maintenance.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/system-maintenance.sh
```

2. **Copy systemd units:**
```bash
sudo cp linux/system-maintenance.service /etc/systemd/system/
sudo cp linux/system-maintenance.timer /etc/systemd/system/
```

3. **Enable and start timer:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable system-maintenance.timer
sudo systemctl start system-maintenance.timer
```

### Usage

**Check timer status:**
```bash
systemctl status system-maintenance.timer
```

**View logs:**
```bash
sudo tail -f /var/log/system-maintenance.log
```

**Run manually:**
```bash
sudo /usr/local/bin/system-maintenance.sh
```

**Disable:**
```bash
sudo systemctl stop system-maintenance.timer
sudo systemctl disable system-maintenance.timer
```

### Configuration

Edit `/usr/local/bin/system-maintenance.sh`:
```bash
LOG_FILE='/var/log/system-maintenance.log'  # Log file location
MAX_RETRIES=3                                # Maximum retry attempts
```

Edit `/etc/systemd/system/system-maintenance.timer`:
```ini
OnCalendar=*-*-* 03:00:00  # Run daily at 3 AM
```

---

## 🪟 Windows

### Files
- `windows/system-maintenance.ps1` - Main maintenance script
- `windows/install-task.ps1` - Scheduled task installer

### Features
- Uses Windows Update and PSWindowsUpdate module
- Updates Chocolatey packages (if installed)
- Checks network connectivity (ping 8.8.8.8)
- Retries up to 3 times with 1-hour delays
- Schedules reboot 30 minutes after updates if required
- Logs to `C:\ProgramData\SystemMaintenance\maintenance.log`

### Installation

1. **Open PowerShell as Administrator**

2. **Navigate to scripts directory:**
```powershell
cd path\to\discord-maid-bot\scripts\system-maintenance\windows
```

3. **Run installer:**
```powershell
.\install-task.ps1
```

This will:
- Create scheduled task "SystemMaintenance"
- Run daily at 3:00 AM
- Run as SYSTEM account
- Start even if on battery power

### Usage

**Check task status:**
```powershell
Get-ScheduledTask -TaskName SystemMaintenance
```

**View logs:**
```powershell
Get-Content C:\ProgramData\SystemMaintenance\maintenance.log -Tail 50
```

**Run manually:**
```powershell
Start-ScheduledTask -TaskName SystemMaintenance
```

**Disable:**
```powershell
Disable-ScheduledTask -TaskName SystemMaintenance
```

**Remove:**
```powershell
Unregister-ScheduledTask -TaskName SystemMaintenance -Confirm:$false
```

### Configuration

Edit `windows/system-maintenance.ps1`:
```powershell
$LogFile = "$env:ProgramData\SystemMaintenance\maintenance.log"
$MaxRetries = 3
```

Edit scheduled task time:
```powershell
$Trigger = New-ScheduledTaskTrigger -Daily -At 3am
```

### Prerequisites

**PSWindowsUpdate Module:**
The script will automatically install this module if not present. To install manually:
```powershell
Install-Module -Name PSWindowsUpdate -Force
```

**Chocolatey (Optional):**
If you use Chocolatey for package management:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

---

## 🍎 macOS

### Files
- `macos/system-maintenance.sh` - Main maintenance script
- `macos/com.discordmaidbot.maintenance.plist` - LaunchDaemon configuration

### Features
- Updates Homebrew packages
- Checks for macOS software updates
- Installs recommended updates
- Checks network connectivity (ping 8.8.8.8)
- Retries up to 3 times with 1-hour delays
- Logs to `~/Library/Logs/system-maintenance.log`

### Installation

1. **Copy script to system:**
```bash
sudo cp macos/system-maintenance.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/system-maintenance.sh
```

2. **Copy LaunchDaemon:**
```bash
sudo cp macos/com.discordmaidbot.maintenance.plist /Library/LaunchDaemons/
```

3. **Load LaunchDaemon:**
```bash
sudo launchctl load /Library/LaunchDaemons/com.discordmaidbot.maintenance.plist
```

### Usage

**Check status:**
```bash
sudo launchctl list | grep maintenance
```

**View logs:**
```bash
tail -f ~/Library/Logs/system-maintenance.log
```

**Run manually:**
```bash
/usr/local/bin/system-maintenance.sh
```

**Disable:**
```bash
sudo launchctl unload /Library/LaunchDaemons/com.discordmaidbot.maintenance.plist
```

### Configuration

Edit `/usr/local/bin/system-maintenance.sh`:
```bash
LOG_FILE="$HOME/Library/Logs/system-maintenance.log"
MAX_RETRIES=3
```

Edit `/Library/LaunchDaemons/com.discordmaidbot.maintenance.plist`:
```xml
<key>Hour</key>
<integer>3</integer>  <!-- Run at 3 AM -->
```

### Prerequisites

**Homebrew (Recommended):**
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

---

## 🔧 Common Configuration

### Change Schedule

**Linux:**
```bash
sudo systemctl edit system-maintenance.timer
# Add: OnCalendar=*-*-* 02:00:00
```

**Windows:**
```powershell
$Trigger = New-ScheduledTaskTrigger -Daily -At 2am
Set-ScheduledTask -TaskName SystemMaintenance -Trigger $Trigger
```

**macOS:**
```bash
sudo nano /Library/LaunchDaemons/com.discordmaidbot.maintenance.plist
# Change Hour to 2
sudo launchctl unload /Library/LaunchDaemons/com.discordmaidbot.maintenance.plist
sudo launchctl load /Library/LaunchDaemons/com.discordmaidbot.maintenance.plist
```

### Change Retry Settings

Edit the script for your OS and modify:
```bash
MAX_RETRIES=5  # Increase retries
```

### Change Log Location

Edit the script for your OS and modify:
```bash
LOG_FILE='/path/to/your/log.log'
```

---

## 📊 Monitoring

### View Recent Activity

**Linux:**
```bash
sudo tail -n 50 /var/log/system-maintenance.log
```

**Windows:**
```powershell
Get-Content C:\ProgramData\SystemMaintenance\maintenance.log -Tail 50
```

**macOS:**
```bash
tail -n 50 ~/Library/Logs/system-maintenance.log
```

### Check for Errors

**Linux:**
```bash
sudo grep ERROR /var/log/system-maintenance.log
```

**Windows:**
```powershell
Select-String -Path C:\ProgramData\SystemMaintenance\maintenance.log -Pattern "ERROR"
```

**macOS:**
```bash
grep ERROR ~/Library/Logs/system-maintenance.log
```

### Monitor in Real-Time

**Linux:**
```bash
sudo tail -f /var/log/system-maintenance.log
```

**Windows:**
```powershell
Get-Content C:\ProgramData\SystemMaintenance\maintenance.log -Wait
```

**macOS:**
```bash
tail -f ~/Library/Logs/system-maintenance.log
```

---

## 🛡️ Security Considerations

### Permissions

- **Linux:** Runs as root (via systemd)
- **Windows:** Runs as SYSTEM (via Task Scheduler)
- **macOS:** Runs as root (via LaunchDaemon)

### Network Checks

All scripts check network connectivity before running updates to avoid:
- Hanging on network timeouts
- Partial updates
- Corrupted package databases

### Reboot Scheduling

- **30-minute delay** gives time to save work
- **Notification** shown to users (OS-dependent)
- **Can be cancelled** before reboot occurs

---

## 🔍 Troubleshooting

### Script Not Running

**Linux:**
```bash
# Check timer status
systemctl status system-maintenance.timer

# Check service status
systemctl status system-maintenance.service

# View systemd logs
journalctl -u system-maintenance.service
```

**Windows:**
```powershell
# Check task status
Get-ScheduledTask -TaskName SystemMaintenance

# View task history
Get-ScheduledTaskInfo -TaskName SystemMaintenance

# Check Event Viewer
Get-WinEvent -LogName Microsoft-Windows-TaskScheduler/Operational | Where-Object {$_.Message -like "*SystemMaintenance*"}
```

**macOS:**
```bash
# Check if loaded
sudo launchctl list | grep maintenance

# View system logs
log show --predicate 'process == "system-maintenance.sh"' --last 1h
```

### Network Connectivity Issues

If the script keeps retrying:
1. Check internet connection
2. Verify DNS resolution: `ping 8.8.8.8`
3. Check firewall settings
4. Review logs for specific errors

### Permission Errors

**Linux:**
```bash
# Ensure script is executable
sudo chmod +x /usr/local/bin/system-maintenance.sh

# Check systemd unit permissions
ls -l /etc/systemd/system/system-maintenance.*
```

**Windows:**
```powershell
# Run PowerShell as Administrator
# Check execution policy
Get-ExecutionPolicy
Set-ExecutionPolicy RemoteSigned
```

**macOS:**
```bash
# Ensure script is executable
sudo chmod +x /usr/local/bin/system-maintenance.sh

# Check LaunchDaemon permissions
ls -l /Library/LaunchDaemons/com.discordmaidbot.maintenance.plist
```

---

## 📝 Customization

### Add Custom Tasks

Edit the script for your OS and add tasks before the completion log:

**Example (Linux):**
```bash
# Clean up old logs
log 'Cleaning up old logs...'
find /var/log -name "*.log" -mtime +30 -delete

# Update Docker images
if command -v docker &> /dev/null; then
    log 'Updating Docker images...'
    docker image prune -af >> $LOG_FILE 2>&1
fi
```

### Email Notifications

Add email notifications on completion or errors:

**Linux (using mail):**
```bash
if [ $? -eq 0 ]; then
    echo "Maintenance completed successfully" | mail -s "System Maintenance" admin@example.com
else
    echo "Maintenance failed" | mail -s "System Maintenance ERROR" admin@example.com
fi
```

### Slack/Discord Webhooks

Send notifications to Slack or Discord:

```bash
WEBHOOK_URL="https://discord.com/api/webhooks/..."
curl -X POST -H 'Content-Type: application/json' \
    -d "{\"content\":\"System maintenance complete\"}" \
    $WEBHOOK_URL
```

---

## 🚀 Best Practices

1. **Test First** - Run manually before scheduling
2. **Monitor Logs** - Check logs regularly for issues
3. **Backup First** - Ensure backups before updates
4. **Schedule Wisely** - Choose low-usage times (3 AM)
5. **Review Updates** - Check what's being updated
6. **Keep Scripts Updated** - Update scripts with OS changes

---

## 📚 Additional Resources

### Linux
- [Systemd Timers](https://www.freedesktop.org/software/systemd/man/systemd.timer.html)
- [Nala Package Manager](https://gitlab.com/volian/nala)
- [Ubuntu Updates](https://ubuntu.com/server/docs/package-management)

### Windows
- [Task Scheduler](https://docs.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-start-page)
- [PSWindowsUpdate](https://www.powershellgallery.com/packages/PSWindowsUpdate)
- [Chocolatey](https://chocolatey.org/)

### macOS
- [LaunchDaemons](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)
- [Homebrew](https://brew.sh/)
- [softwareupdate](https://ss64.com/osx/softwareupdate.html)

---

**Version:** 1.0.0.0-beta  
**Last Updated:** December 14, 2025

For issues or questions, open an issue on GitHub.
