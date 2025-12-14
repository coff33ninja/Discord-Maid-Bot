# Install System Maintenance Scheduled Task for Windows
#
# Creates a scheduled task that runs system maintenance daily at 3 AM
#
# Version: 1.0.0.0-beta
# Author: Discord Maid Bot Team
# License: MIT

# Requires Administrator privileges
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator"
    exit 1
}

$TaskName = "SystemMaintenance"
$ScriptPath = "$PSScriptRoot\system-maintenance.ps1"

# Check if script exists
if (!(Test-Path $ScriptPath)) {
    Write-Error "Script not found: $ScriptPath"
    exit 1
}

# Remove existing task if it exists
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($ExistingTask) {
    Write-Host "Removing existing task..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create scheduled task action
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""

# Create scheduled task trigger (daily at 3 AM)
$Trigger = New-ScheduledTaskTrigger -Daily -At 3am

# Create scheduled task settings
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Create scheduled task principal (run as SYSTEM)
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Register scheduled task
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description "Automated system maintenance (updates and upgrades)"

Write-Host "✅ Scheduled task '$TaskName' created successfully"
Write-Host "   Runs daily at 3:00 AM"
Write-Host "   Logs to: $env:ProgramData\SystemMaintenance\maintenance.log"
Write-Host ""
Write-Host "To view the task:"
Write-Host "   Get-ScheduledTask -TaskName $TaskName"
Write-Host ""
Write-Host "To run manually:"
Write-Host "   Start-ScheduledTask -TaskName $TaskName"
Write-Host ""
Write-Host "To remove the task:"
Write-Host "   Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false"
