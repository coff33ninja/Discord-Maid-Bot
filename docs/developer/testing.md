# Testing Guide - Quick Wins Features

## 🎯 Features to Test

### 1. Device Emoji (✅ Ready to Test)

**Commands:**
```
/deviceemoji device:<select device> emoji:🎮
/deviceemoji device:<select device> emoji:💻
/deviceemoji device:<select device> emoji:📱
```

**What to check:**
- Emoji appears in autocomplete lists
- Emoji shows in `/scan` results
- Emoji persists after bot restart

---

### 2. Device Groups (✅ Ready to Test)

**Commands:**
```
# Create groups by assigning devices
/devicegroup assign device:<Gaming PC> group:Family Devices
/devicegroup assign device:<Smart Light> group:IoT Devices
/devicegroup assign device:<Phone> group:Family Devices

# View groups
/devicegroup list
/devicegroup view group:Family Devices
```

**What to check:**
- Groups are created automatically
- Devices show in correct groups
- Online/offline count is accurate
- Group autocomplete works

---

### 3. Speed Alerts Plugin (✅ Ready to Test)

**Setup:**
```
# Configure the plugin
/speedalert config threshold:50 channel:#alerts

# Enable alerts
/speedalert enable

# Check status
/speedalert status
```

**Testing:**
```
# Run a speed test to trigger alert (if speed is low)
/speedtest
```

**What to check:**
- Configuration saves correctly
- Alert is sent when speed drops below threshold
- Alert shows severity level (warning/critical)
- Alert includes speed details

---

### 4. Device Triggers Plugin (✅ Ready to Test)

**Example Triggers:**

**Get DM when device comes online:**
```
/devicetrigger add name:PC Online Notification device:<Gaming PC> event:online action:discord_dm message:Your gaming PC is now online!
```

**Post to channel when device goes offline:**
```
/devicetrigger add name:Server Down Alert device:<Server> event:offline action:discord_channel channel:#alerts message:Server went offline!
```

**Alert on unknown devices:**
```
/devicetrigger add name:Security Alert device:any event:unknown action:discord_channel channel:#security
```

**Control Home Assistant:**
```
/devicetrigger add name:Lights Off device:<Phone> event:offline action:homeassistant ha_entity:light.bedroom ha_service:light.turn_off
```

**Manage triggers:**
```
# List all triggers
/devicetrigger list

# Disable a trigger
/devicetrigger toggle trigger:<select> enabled:false

# Remove a trigger
/devicetrigger remove trigger:<select>
```

**What to check:**
- Triggers are created successfully
- Triggers fire when conditions are met
- Discord DM/channel messages work
- Home Assistant integration works
- Trigger statistics update (trigger count)
- Enable/disable works without deleting

---

## 🧪 Test Scenarios

### Scenario 1: Device Lifecycle
1. Run `/scan` to discover devices
2. Add emoji to a device: `/deviceemoji`
3. Assign device to group: `/devicegroup assign`
4. Create trigger for device online: `/devicetrigger add`
5. Turn device off
6. Turn device on - trigger should fire
7. Check trigger stats: `/devicetrigger list`

### Scenario 2: Speed Monitoring
1. Configure speed alerts: `/speedalert config threshold:100 channel:#test`
2. Enable alerts: `/speedalert enable`
3. Run speed test: `/speedtest`
4. If speed < 100 Mbps, alert should appear in channel
5. Check alert details (download, upload, ping, severity)

### Scenario 3: Unknown Device Detection
1. Create trigger: `/devicetrigger add name:New Device device:any event:unknown action:discord_channel channel:#alerts`
2. Connect a new device to network
3. Run `/scan`
4. Alert should fire for unknown device
5. Check alert shows device details

### Scenario 4: Home Assistant Automation
1. Create trigger: `/devicetrigger add name:Auto Lights device:<Phone> event:offline action:homeassistant ha_entity:light.living_room ha_service:light.turn_off`
2. Disconnect phone from network
3. Run `/scan`
4. Home Assistant light should turn off

---

## 📊 Expected Results

### Device Emoji
- ✅ Emojis display in all device lists
- ✅ Emojis show in autocomplete
- ✅ Emojis persist in database

### Device Groups
- ✅ Groups created on-the-fly
- ✅ Multiple devices per group
- ✅ Online/offline counts accurate
- ✅ Group autocomplete works

### Speed Alerts
- ✅ Alerts sent when threshold exceeded
- ✅ Severity levels (warning/critical)
- ✅ Detailed speed information
- ✅ Enable/disable works

### Device Triggers
- ✅ Triggers fire on correct events
- ✅ All action types work (DM, channel, HA)
- ✅ Custom messages display
- ✅ Statistics track correctly
- ✅ Enable/disable without deleting

---

## 🐛 Known Issues / Limitations

1. **Device Triggers**: Only fire during network scans (every 5 minutes or manual `/scan`)
2. **Speed Alerts**: Only check during manual `/speedtest` commands
3. **Home Assistant**: Requires HA to be configured and accessible
4. **Autocomplete**: Limited to 25 results per Discord API

---

## 💡 Tips

- Use descriptive trigger names for easy management
- Test with non-critical devices first
- Check plugin status with `/speedalert status` and `/devicetrigger list`
- Emojis make device identification much faster
- Group similar devices (IoT, Family, Servers, etc.)

---

## 🔧 Troubleshooting

**Plugin not loaded:**
- Check `plugins/` folder has the plugin files
- Restart bot: `sudo systemctl restart discord-maid-bot`
- Check logs: `sudo journalctl -u discord-maid-bot -n 50`

**Triggers not firing:**
- Ensure plugin is enabled: `/devicetrigger list` should show ✅
- Run `/scan` to trigger device checks
- Check trigger conditions match device state

**Speed alerts not working:**
- Configure first: `/speedalert config`
- Enable: `/speedalert enable`
- Run speed test: `/speedtest`
- Check threshold is set correctly

**Home Assistant actions fail:**
- Verify HA is connected: `/homeassistant diagnose`
- Check entity ID is correct
- Verify service format: `domain.service` (e.g., `light.turn_on`)

---

*Last updated: December 13, 2025*
