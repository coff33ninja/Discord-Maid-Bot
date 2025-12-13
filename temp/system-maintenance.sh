#!/bin/bash

LOG_FILE='/var/log/system-maintenance.log'
MAX_RETRIES=3
RETRY_COUNT=0

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
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
    
    # Update package lists
    log 'Running nala update...'
    nala update >> $LOG_FILE 2>&1
    
    # Upgrade packages
    log 'Running nala upgrade...'
    DEBIAN_FRONTEND=noninteractive nala upgrade -y >> $LOG_FILE 2>&1
    
    # Check if reboot is required
    if [ -f /var/run/reboot-required ]; then
        log 'Reboot required - scheduling reboot in 30 minutes'
        shutdown -r +30 'System updates installed, rebooting in 30 minutes' >> $LOG_FILE 2>&1
        
        # Verify connectivity after reboot (this will run on next boot via systemd)
        log 'Reboot scheduled'
    else
        log 'No reboot required'
    fi
    
    log '=== System Maintenance Complete ==='
    RETRY_COUNT=0
}

# Run maintenance
run_maintenance
