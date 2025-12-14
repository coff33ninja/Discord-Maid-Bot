# Discord Maid Bot - Remote Shutdown Service Installer (Windows)
#
# Installs the remote shutdown server as a Windows service using Task Scheduler
#
# Version: 1.0.0.0-beta
# Author: Discord Maid Bot Team

# Requires Administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator"
    exit 1
}

$TaskName = "DiscordMaidBot_RemoteShutdown"
$ScriptPath = Join-Path $PSScriptRoot "..\universal-shutdown-server.py"

# Check if Python script exists
if (!(Test-Path $ScriptPath)) {
    Write-Error "Script not found: $ScriptPath"
    exit 1
}

# Check if Python is installed
try {
    $pythonPath = (Get-Command python).Source
} catch {
    Write-Error "Python not found. Please install Python 3.7+ first."
    exit 1
}

# Install required packages
Write-Host "Installing required Python packages..."
python -m pip install flask

# Remove existing task if it exists
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($ExistingTask) {
    Write-Host "Removing existing task..."
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create scheduled task action
$Action = New-ScheduledTaskAction -Execute "python" -Argument "`"$ScriptPath`""

# Create scheduled task trigger (at startup)
$Trigger = New-ScheduledTaskTrigger -AtStartup

# Create scheduled task settings
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

# Create scheduled task principal (run as SYSTEM)
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Register scheduled task
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description "Discord Maid Bot Remote Shutdown Server"

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "The remote shutdown server will start automatically on boot."
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Configure API key in shutdown-config.json"
Write-Host "2. Start the service: Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "3. Check status: Get-ScheduledTask -TaskName '$TaskName'"
Write-Host ""
Write-Host "To remove: Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
