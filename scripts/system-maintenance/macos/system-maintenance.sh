#!/bin/bash
#
# System Maintenance Script for macOS
# 
# Automatically updates Homebrew packages and macOS software with network
# connectivity checks and retry logic.
#
# Version: 1.0.0.0-beta
# Author: Discord Maid Bot Team
# License: MIT

LOG_FILE="$HOME/Library/Logs/system-maintenance.log"
MAX_RETRIES=3
RETRY_COUNT=0

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_connectivity() {
    ping -c 1 -W 2 8.8.8.8 > /dev/null 2>&1
    return $?
}

run_maintenance() {
    log '=== Starting System Maintenance ==='
    
    # Check network connectivity
    if ! check_connectivity; then
        log 'ERROR: No network connectivity (cannot ping 8.8.8.8)'
        
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            RETRY_COUNT=$((RETRY_COUNT + 1))
            log "Retry $RETRY_COUNT/$MAX_RETRIES - Waiting 1 hour..."
            sleep 3600
            run_maintenance
            return
        else
            log 'ERROR: Max retries reached, giving up'
            return 1
        fi
    fi
    
    log 'Network connectivity OK'
    
    # Update Homebrew
    if command -v brew &> /dev/null; then
        log 'Updating Homebrew...'
        brew update >> "$LOG_FILE" 2>&1
        
        log 'Upgrading Homebrew packages...'
        brew upgrade >> "$LOG_FILE" 2>&1
        
        log 'Cleaning up Homebrew...'
        brew cleanup >> "$LOG_FILE" 2>&1
    else
        log 'Homebrew not installed, skipping'
    fi
    
    # Check for macOS software updates
    log 'Checking for macOS software updates...'
    softwareupdate -l >> "$LOG_FILE" 2>&1
    
    # Install recommended updates (non-interactive)
    log 'Installing recommended updates...'
    softwareupdate -i -r >> "$LOG_FILE" 2>&1
    
    # Check if reboot is required
    if softwareupdate -l 2>&1 | grep -q "restart"; then
        log 'Reboot recommended after updates'
        log 'Please restart your Mac when convenient'
    else
        log 'No reboot required'
    fi
    
    log '=== System Maintenance Complete ==='
    RETRY_COUNT=0
}

# Run maintenance
run_maintenance
