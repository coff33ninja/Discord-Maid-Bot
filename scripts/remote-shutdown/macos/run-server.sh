#!/bin/bash
#
# Discord Maid Bot - Remote Shutdown Server Launcher (macOS)
#
# Run this script to manually start the shutdown server for testing
# Use sudo for shutdown permissions
#
# Version: 1.0.0.0-beta
# Author: Discord Maid Bot Team

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "========================================"
echo "  Discord Maid Bot Remote Shutdown"
echo "========================================"
echo ""
echo "Starting remote shutdown server..."
echo ""
echo "This terminal must remain open for remote shutdown to work."
echo "Press Ctrl+C to stop the server."
echo ""

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.7+ and try again"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if the Python script exists
if [ ! -f "universal-shutdown-server.py" ]; then
    echo "ERROR: universal-shutdown-server.py not found"
    echo "Please ensure the script is in the correct location"
    echo "Current directory: $(pwd)"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Install required packages if needed
echo "Checking Python dependencies..."
python3 -c "import flask" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing required Python packages..."
    python3 -m pip install flask
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install required packages"
        echo "Please run: pip3 install flask"
        echo ""
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

echo "Dependencies OK. Starting server..."
echo ""

# Check if config exists
if [ ! -f "shutdown-config.json" ]; then
    echo "WARNING: No configuration file found"
    echo "Creating default configuration..."
    echo ""
    echo "IMPORTANT: Change the API key in shutdown-config.json before use!"
    echo ""
fi

# Check if running as root (needed for shutdown)
if [ "$EUID" -ne 0 ]; then
    echo "WARNING: Not running as root"
    echo "Shutdown commands will require sudo password"
    echo ""
fi

# Run the Python script
python3 universal-shutdown-server.py

# If we get here, the script has stopped
echo ""
echo "========================================"
echo "Server has stopped."
echo "========================================"
read -p "Press Enter to exit..."
