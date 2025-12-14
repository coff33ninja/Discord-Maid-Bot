# Remote Shutdown Server

**Version:** 1.0.0.0-beta

Cross-platform remote shutdown server for Discord Maid Bot. Allows remote shutdown/restart of computers via HTTP API.

## Quick Start

### Test Manually

**Windows:** Run `windows/run-server.bat` as Administrator  
**Linux:** Run `sudo linux/run-server.sh`  
**macOS:** Run `sudo macos/run-server.sh`

### Configure

Edit `shutdown-config.json`:
```json
{
  "api_key": "your-secret-key-here",
  "port": 5000
}
```

### Install as Service

**Windows:** Run `windows/install-service.ps1` as Administrator  
**Linux:** Run `sudo linux/install-service.sh`  
**macOS:** Run `sudo macos/install-service.sh`

## API Endpoints

- `POST /shutdown` - Shutdown computer (requires API key)
- `POST /restart` - Restart computer (requires API key)
- `GET /status` - Check server status
- `GET /ping` - Simple ping test

## Security

Always change the default API key! Use strong, random keys for production.

See full documentation in the main scripts README.
