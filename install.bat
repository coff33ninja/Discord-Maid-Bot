@echo off
echo ============================================================
echo Discord Maid Bot - Installation
echo ============================================================
echo.

echo Step 1: Installing Node.js dependencies...
call npm install

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies
    echo Please make sure Node.js is installed
    pause
    exit /b 1
)

echo.
echo ============================================================
echo Installation Complete!
echo ============================================================
echo.
echo Next steps:
echo.
echo 1. Configure your .env file with:
echo    - DISCORD_BOT_TOKEN
echo    - GEMINI_API_KEY
echo    - OPENWEATHER_API_KEY
echo    - SMB server details
echo.
echo 2. Invite bot to your Discord server with:
echo    https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID^&permissions=534723950656^&scope=bot
echo.
echo 3. Start the bot:
echo    npm start
echo.
echo 4. Access the dashboard:
echo    http://localhost:3000
echo.
echo 5. In Discord, type:
echo    /help
echo.
echo ============================================================
echo.
echo Your maid assistant will be ready to serve! 
echo.
pause
