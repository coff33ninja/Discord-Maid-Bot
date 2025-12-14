@echo off
REM Discord Maid Bot - Remote Shutdown Server Launcher (Windows)
REM 
REM Run this script to manually start the shutdown server for testing
REM Right-click and "Run as administrator" for shutdown permissions
REM
REM Version: 1.0.0.0-beta
REM Author: Discord Maid Bot Team

cd /d "%~dp0\.."

title Discord Maid Bot - Remote Shutdown Server

echo ========================================
echo   Discord Maid Bot Remote Shutdown
echo ========================================
echo.
echo Starting remote shutdown server...
echo.
echo This window must remain open for remote shutdown to work.
echo Press Ctrl+C to stop the server.
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.7+ and try again
    echo.
    pause
    exit /b 1
)

REM Check if the Python script exists
if not exist "universal-shutdown-server.py" (
    echo ERROR: universal-shutdown-server.py not found
    echo Please ensure the script is in the correct location
    echo Current directory: %CD%
    echo.
    pause
    exit /b 1
)

REM Install required packages if needed
echo Checking Python dependencies...
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo Installing required Python packages...
    python -m pip install flask
    if errorlevel 1 (
        echo ERROR: Failed to install required packages
        echo Please run: pip install flask
        echo.
        pause
        exit /b 1
    )
)

echo Dependencies OK. Starting server...
echo.

REM Check if config exists
if not exist "shutdown-config.json" (
    echo WARNING: No configuration file found
    echo Creating default configuration...
    echo.
    echo IMPORTANT: Change the API key in shutdown-config.json before use!
    echo.
)

REM Run the Python script
python universal-shutdown-server.py

REM If we get here, the script has stopped
echo.
echo ========================================
echo Server has stopped.
echo ========================================
pause
