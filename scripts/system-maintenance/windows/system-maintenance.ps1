# System Maintenance Script for Windows
# 
# Automatically updates Windows and installed applications
# with network connectivity checks and retry logic.
#
# Version: 1.0.0.0-beta
# Author: Discord Maid Bot Team
# License: MIT

$LogFile = "$env:ProgramData\SystemMaintenance\maintenance.log"
$MaxRetries = 3
$RetryCount = 0

# Ensure log directory exists
$LogDir = Split-Path $LogFile -Parent
if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogMessage = "[$Timestamp] $Message"
    Write-Host $LogMessage
    Add-Content -Path $LogFile -Value $LogMessage
}

function Test-Connectivity {
    try {
        $ping = Test-Connection -ComputerName 8.8.8.8 -Count 1 -Quiet -ErrorAction Stop
        return $ping
    } catch {
        return $false
    }
}

function Start-Maintenance {
    Write-Log "=== Starting System Maintenance ==="
    
    # Check network connectivity
    if (!(Test-Connectivity)) {
        Write-Log "ERROR: No network connectivity (cannot ping 8.8.8.8)"
        
        if ($script:RetryCount -lt $MaxRetries) {
            $script:RetryCount++
            Write-Log "Retry $script:RetryCount/$MaxRetries - Waiting 1 hour..."
            Start-Sleep -Seconds 3600
            Start-Maintenance
            return
        } else {
            Write-Log "ERROR: Max retries reached, giving up"
            return
        }
    }
    
    Write-Log "Network connectivity OK"
    
    # Check for Windows Updates
    Write-Log "Checking for Windows Updates..."
    try {
        # Install PSWindowsUpdate module if not present
        if (!(Get-Module -ListAvailable -Name PSWindowsUpdate)) {
            Write-Log "Installing PSWindowsUpdate module..."
            Install-Module -Name PSWindowsUpdate -Force -Scope CurrentUser
        }
        
        Import-Module PSWindowsUpdate
        
        # Get available updates
        $Updates = Get-WindowsUpdate -AcceptAll -IgnoreReboot
        
        if ($Updates.Count -gt 0) {
            Write-Log "Found $($Updates.Count) update(s)"
            Write-Log "Installing updates..."
            Install-WindowsUpdate -AcceptAll -IgnoreReboot -Verbose | Out-File -FilePath $LogFile -Append
            
            # Check if reboot is required
            if (Get-WURebootStatus -Silent) {
                Write-Log "Reboot required - scheduling reboot in 30 minutes"
                shutdown /r /t 1800 /c "System updates installed, rebooting in 30 minutes"
            } else {
                Write-Log "No reboot required"
            }
        } else {
            Write-Log "No updates available"
        }
    } catch {
        Write-Log "ERROR: Failed to check/install updates: $_"
    }
    
    # Update Chocolatey packages (if installed)
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Log "Updating Chocolatey packages..."
        try {
            choco upgrade all -y | Out-File -FilePath $LogFile -Append
        } catch {
            Write-Log "ERROR: Failed to update Chocolatey packages: $_"
        }
    }
    
    Write-Log "=== System Maintenance Complete ==="
    $script:RetryCount = 0
}

# Run maintenance
Start-Maintenance
