#!/bin/bash
#
# Discord Maid Bot - Remote Shutdown Service Installer (macOS)
#
# Installs the remote shutdown server as a LaunchDaemon
#
# Version: 1.0.0.0-beta
# Author: Discord Maid Bot Team

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: This script must be run as root (use sudo)"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/../universal-shutdown-server.py"
PLIST_NAME="com.discordmaidbot.shutdown"

# Check if Python script exists
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo "ERROR: Script not found: $PYTHON_SCRIPT"
    exit 1
fi

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 not found. Please install Python 3.7+ first."
    exit 1
fi

# Install required packages
echo "Installing required Python packages..."
python3 -m pip install flask

# Create LaunchDaemon plist
cat > /Library/LaunchDaemons/${PLIST_NAME}.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>${PYTHON_SCRIPT}</string>
    </array>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>/tmp/discord-shutdown-server.log</string>
    
    <key>StandardErrorPath</key>
    <string>/tmp/discord-shutdown-server-error.log</string>
</dict>
</plist>
EOF

# Set permissions
chmod 644 /Library/LaunchDaemons/${PLIST_NAME}.plist

# Load LaunchDaemon
launchctl load /Library/LaunchDaemons/${PLIST_NAME}.plist

echo ""
echo "✅ Installation complete!"
echo ""
echo "The remote shutdown server will start automatically on boot."
echo ""
echo "Next steps:"
echo "1. Configure API key in shutdown-config.json"
echo "2. Check status: sudo launchctl list | grep ${PLIST_NAME}"
echo "3. View logs: tail -f /tmp/discord-shutdown-server.log"
echo ""
echo "To remove: sudo launchctl unload /Library/LaunchDaemons/${PLIST_NAME}.plist && sudo rm /Library/LaunchDaemons/${PLIST_NAME}.plist"
