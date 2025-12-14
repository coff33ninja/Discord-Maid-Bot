# Dashboard API Reference

Base URL: `http://localhost:3000/api`

## Authentication

All protected endpoints require Bearer token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

### POST /auth/login
Login and receive JWT token.

**Body:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "username": "admin",
  "role": "admin",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## Users

### GET /users
List all dashboard users. Requires `MANAGE_USERS` permission.

### POST /users
Create new user. Requires `MANAGE_USERS` permission.

**Body:**
```json
{
  "username": "newuser",
  "password": "password123",
  "role": "viewer"
}
```

### PUT /users/:username/role
Update user role. Requires `MANAGE_USERS` permission.

### DELETE /users/:username
Delete user. Requires `MANAGE_USERS` permission.

### POST /users/change-password
Change own password.

**Body:**
```json
{
  "oldPassword": "current",
  "newPassword": "newpass123"
}
```

---

## Discord Users

### GET /discord-users
List Discord users with bot permissions.

### POST /discord-users
Add Discord user permission.

**Body:**
```json
{
  "userId": "123456789",
  "username": "DiscordUser#1234",
  "role": "operator"
}
```

### PUT /discord-users/:userId/role
Update Discord user role.

### DELETE /discord-users/:userId
Remove Discord user permission.

---

## Devices

### GET /devices
List all network devices.

### GET /devices/online
List online devices only.

### GET /devices/:id
Get device details with history.

### POST /devices/:id/notes
Update device notes. Requires `MODIFY_CONFIG` permission.

### POST /devices/:id/wake
Send Wake-on-LAN packet. Requires `WAKE_DEVICE` permission.

---

## Speed Tests

### GET /speedtests
Get recent speed tests.

**Query:** `?limit=10`

### GET /speedtests/stats
Get speed test statistics (avg, max, min).

### GET /speedtests/history
Get speed test history.

**Query:** `?days=7`

---

## Research

### GET /research
Get recent research logs.

**Query:** `?limit=20`

### GET /research/:id
Get full research result.

### GET /research/search
Search research logs.

**Query:** `?q=searchterm`

---

## Tasks

### GET /tasks
List all scheduled tasks.

### POST /tasks
Create scheduled task. Requires `CREATE_TASK` permission.

**Body:**
```json
{
  "name": "Daily Scan",
  "cronExpression": "0 9 * * *",
  "command": "scan",
  "enabled": true,
  "channelId": "123456789"
}
```

### PUT /tasks/:id/toggle
Enable/disable task. Requires `MODIFY_TASK` permission.

### DELETE /tasks/:id
Delete task. Requires `DELETE_TASK` permission.

---

## Configuration

### GET /config/smb
Get SMB configuration.

### POST /config/smb
Set SMB configuration. Requires `MODIFY_CONFIG` permission.

### POST /config/smb/test
Test SMB connection.

### POST /config/smb/toggle
Enable/disable SMB.

### GET /config/smb/files
List files on SMB share.

---

## Home Assistant

### GET /homeassistant/entities
List all Home Assistant entities.

### GET /homeassistant/lights
List all lights.

### GET /homeassistant/switches
List all switches.

### GET /homeassistant/sensors
List all sensors.

### POST /homeassistant/light/:entityId
Control light. Requires `WAKE_DEVICE` permission.

**Body:**
```json
{
  "state": true,
  "brightness": 255
}
```

### POST /homeassistant/switch/:entityId
Control switch.

**Body:**
```json
{
  "state": true
}
```

---

## Tailscale

### GET /tailscale/devices
List Tailscale network devices.

### GET /tailscale/status
Get Tailscale status.

---

## Plugins

### GET /plugins
List loaded plugins.

### GET /plugins/stats
Get plugin statistics.

### POST /plugins/:name/enable
Enable plugin. Requires `MODIFY_CONFIG` permission.

### POST /plugins/:name/disable
Disable plugin.

### POST /plugins/:name/reload
Reload plugin.

---

## Statistics

### GET /stats
Get dashboard overview statistics.

**Response:**
```json
{
  "devices": {
    "total": 15,
    "online": 8,
    "offline": 7
  },
  "speedTest": {
    "avg_download": 150.5,
    "avg_upload": 20.3,
    "lastTest": {...}
  },
  "tasks": {
    "total": 5,
    "enabled": 3
  }
}
```

---

## WebSocket Events

Connect to `ws://localhost:3000` for real-time updates.

**Events:**
- `device-update` - Device status change
- `speedtest-complete` - New speed test result
- `wol-sent` - Wake-on-LAN packet sent
- `task-complete` - Scheduled task finished
