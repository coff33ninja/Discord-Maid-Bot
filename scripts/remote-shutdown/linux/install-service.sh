#!/bin/bash
#
# Discord Maid Bot - Remote Shutdown Service Installer (Linux)
#
# Installs the remote shutdown server as a systemd service
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
SERVICE_NAME="discord-shutdown-server"

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

# Create systemd service file
cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=Discord Maid Bot Remote Shutdown Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 $PYTHON_SCRIPT
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Enable service
systemctl enable ${SERVICE_NAME}.service

echo ""
echo "✅ Installation complete!"
echo ""
echo "The remote shutdown server will start automatically on boot."
echo ""
echo "Next steps:"
echo "1. Configure API key in shutdown-config.json"
echo "2. Start the service: sudo systemctl start ${SERVICE_NAME}"
echo "3. Check status: sudo systemctl status ${SERVICE_NAME}"
echo "4. View logs: sudo journalctl -u ${SERVICE_NAME} -f"
echo ""
echo "To remove: sudo systemctl disable ${SERVICE_NAME} && sudo rm /etc/systemd/system/${SERVICE_NAME}.service"
