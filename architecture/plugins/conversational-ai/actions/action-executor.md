# action-executor.js

**Path:** `plugins\conversational-ai\actions\action-executor.js`

## Description
* Action Executor

## Dependencies
- `../../../src/logging/logger.js` → createLogger (L10)
- `../../network-management/commands.js` (dynamic, L127)
- `../../../src/database/db.js` (dynamic, L217)
- `../../network-management/commands.js` (dynamic, L262)
- `../../../src/database/db.js` (dynamic, L263)
- `../../../src/core/plugin-system.js` (dynamic, L291)
- `../../../src/core/plugin-system.js` (dynamic, L432)
- `../../../src/core/plugin-system.js` (dynamic, L462)
- `child_process` (dynamic, L573)
- `os` (dynamic, L574)
- `child_process` (dynamic, L628)
- `util` (dynamic, L629)
- `child_process` (dynamic, L662)
- `util` (dynamic, L663)
- `child_process` (dynamic, L695)
- `util` (dynamic, L696)
- `../../../src/core/plugin-system.js` (dynamic, L846)
- `../../../src/core/plugin-system.js` (dynamic, L984)
- `../../server-admin/discord/channel-manager.js` (dynamic, L1119)
- `../../../src/core/plugin-system.js` (dynamic, L1204)
- `../../../src/database/db.js` (dynamic, L1342)
- `../../../src/core/plugin-system.js` (dynamic, L1361)
- `../../../src/database/db.js` (dynamic, L1476)
- `../../../src/database/db.js` (dynamic, L1537)
- `../../../src/core/plugin-system.js` (dynamic, L1559)
- `../../../src/database/db.js` (dynamic, L1688)
- `../../network-management/device-detector.js` (dynamic, L1689)
- `../../../src/core/plugin-system.js` (dynamic, L1701)
- `../../../src/database/db.js` (dynamic, L1774)
- `../../../src/database/db.js` (dynamic, L1811)
- `../../../src/core/plugin-system.js` (dynamic, L1820)
- `../../../src/database/db.js` (dynamic, L1900)
- `../../network-management/device-detector.js` (dynamic, L1901)
- `../../../src/database/db.js` (dynamic, L2008)
- `../../../src/core/plugin-system.js` (dynamic, L2021)
- `../../network-management/scanner.js` (dynamic, L2070)
- `../../../src/database/db.js` (dynamic, L2137)
- `../../network-management/scanner.js` (dynamic, L2138)
- `../../../src/database/db.js` (dynamic, L2205)
- `../../network-management/scanner.js` (dynamic, L2206)
- `../../../src/database/db.js` (dynamic, L2262)
- `../../../src/database/db.js` (dynamic, L2269)
- `../../../src/database/db.js` (dynamic, L2359)
- `../../../src/core/plugin-system.js` (dynamic, L2370)
- `../../../src/database/db.js` (dynamic, L2504)
- `../../../src/core/plugin-system.js` (dynamic, L2584)
- `../../../src/core/plugin-system.js` (dynamic, L2778)
- `../utils/ai-reminder-parser.js` (dynamic, L2783)
- `../utils/message-rewriter.js` (dynamic, L2852)
- `../../../src/core/plugin-system.js` (dynamic, L3016)
- `../../../src/core/plugin-system.js` (dynamic, L3311)
- `../../../src/core/plugin-system.js` (dynamic, L3354)
- `../../../src/core/plugin-system.js` (dynamic, L3406)
- `../../server-admin/discord/channel-manager.js` (dynamic, L3467)
- `../../server-admin/discord/channel-manager.js` (dynamic, L3532)
- `../../server-admin/discord/channel-manager.js` (dynamic, L3591)
- `../../../src/core/plugin-system.js` (dynamic, L3613)
- `../../server-admin/discord/channel-manager.js` (dynamic, L3691)
- `../../../src/core/plugin-system.js` (dynamic, L3763)
- `../../server-admin/discord/channel-manager.js` (dynamic, L3813)
- `../../../src/core/plugin-system.js` (dynamic, L3850)
- `../../server-admin/discord/channel-manager.js` (dynamic, L3876)
- `../../server-admin/discord/channel-manager.js` (dynamic, L3890)
- `../../../src/core/plugin-system.js` (dynamic, L3920)
- `../../server-admin/discord/channel-manager.js` (dynamic, L3950)
- `../../server-admin/discord/channel-manager.js` (dynamic, L3964)
- `../../../src/core/plugin-system.js` (dynamic, L4234)
- `../../server-admin/discord/channel-manager.js` (dynamic, L4272)
- `../../../src/core/plugin-system.js` (dynamic, L4310)
- `../../../src/core/plugin-system.js` (dynamic, L4379)
- `../../../src/core/plugin-system.js` (dynamic, L4451)
- `../../../src/core/plugin-system.js` (dynamic, L4511)
- `../../../src/core/plugin-system.js` (dynamic, L4575)
- `../../../src/core/plugin-system.js` (dynamic, L4660)
- `discord.js` (dynamic, L4716)
- `../../../src/core/plugin-system.js` (dynamic, L4754)
- `../../../src/core/plugin-system.js` (dynamic, L4842)
- `../../../src/core/plugin-system.js` (dynamic, L4908)
- `../../../src/core/plugin-system.js` (dynamic, L4938)
- `../../../src/core/plugin-system.js` (dynamic, L4984)
- `../../../src/database/db.js` (dynamic, L4985)
- `../../../src/core/plugin-system.js` (dynamic, L5007)
- `../../../src/core/plugin-system.js` (dynamic, L5142)
- `../../../src/core/plugin-system.js` (dynamic, L5189)
- `../../../src/database/db.js` (dynamic, L5233)
- `../../../src/database/db.js` (dynamic, L5273)
- `../../../src/database/db.js` (dynamic, L5306)
- `../../../src/core/plugin-system.js` (dynamic, L5317)
- `../../../src/database/db.js` (dynamic, L5432)
- `../../games/games/game-manager.js` (dynamic, L5461)
- `../../../src/core/plugin-system.js` (dynamic, L5492)
- `../../../src/core/plugin-system.js` (dynamic, L5523)
- `../../../src/database/db.js` (dynamic, L5596)
- `../../../src/database/db.js` (dynamic, L5624)
- `../../../src/core/plugin-system.js` (dynamic, L5659)
- `../../../src/core/plugin-system.js` (dynamic, L5705)
- `../../../src/core/plugin-system.js` (dynamic, L5741)
- `../../../src/core/plugin-system.js` (dynamic, L5777)
- `../../../src/core/plugin-system.js` (dynamic, L5814)
- `../../../src/core/plugin-system.js` (dynamic, L5853)
- `../../../src/core/plugin-system.js` (dynamic, L5889)
- `../../network-management/scanner.js` (dynamic, L5944)
- `../utils/ai-intent-classifier.js` (dynamic, L6017)
- `../context/action-registry.js` (dynamic, L6035)
- `../../../src/core/plugin-system.js` (dynamic, L6127)
- `../../../src/database/db.js` (dynamic, L6159)
- `../../../src/auth/auth.js` (dynamic, L6172)
- `../../../src/database/db.js` (dynamic, L6442)
- `../../network-management/commands.js` (dynamic, L6516)
- `../../../src/database/db.js` (dynamic, L6517)

## Exports
- **ActionExecutor** [class] (L5993) - Action Executor class

## Functions
- `extractDeviceIdentifier(query)` (L19) - Extract device identifier from a query (IP, MAC, or name)
- `parseAutomationActions(message)` (L53) - Parse automation actions from a message

## Constants
- **ACTIONS** [object] (L120) - Action definitions with their execution logic

## AI Actions
### network-scan (L122)
Scan the network for devices
Keywords: scan, network scan, find devices, what devices, which devices, devices online, online devices, show network, show devices, network devices

### network-devices (L212)
List all known network devices
Keywords: list devices, show devices, device list, all devices

### wake-device (L255)
Wake a device using Wake-on-LAN
Keywords: wake, wol, turn on, power on, boot, start up, wake up

### speedtest (L426)
Run an internet speed test
Keywords: speed test, speedtest, internet speed, bandwidth, how fast, connection speed

### weather (L457)
Get current weather information
Keywords: weather, temperature, forecast, how hot, how cold, raining

### bot-stats (L483)
Get bot statistics
Keywords: bot stats, statistics, uptime, how long running, bot status

### help (L512)
Show available commands
Keywords: help, what can you do, commands, how to use

### server-admin-help (L537)
Show server admin capabilities
Keywords: do with the server, server admin, server commands, admin commands, server management, manage server

### server-status (L566)
Check server/bot status
Keywords: server status, bot status, is the bot running, check server, system status, uptime

### server-logs (L621)
View recent bot logs
Keywords: server logs, bot logs, show logs, view logs, read logs, recent logs

### server-restart (L655)
Restart the bot service
Keywords: restart bot, restart server, reboot bot, restart service

### server-deploy (L688)
Deploy latest code from git
Keywords: deploy, deploy code, update bot, git pull, deploy latest

### discord-kick (L742)
Kick a member from the server
Keywords: kick, kick user, kick member, remove member

### discord-ban (L785)
Ban a member from the server
Keywords: ban, ban user, ban member, permanently ban

### discord-timeout (L823)
Timeout a member
Keywords: timeout, mute, silence, timeout user

### discord-role (L949)
Give or remove a role from a member
Keywords: give role, add role, assign role, remove role, take role, make them, promote, demote

### discord-lock (L1106)
Lock or unlock a channel
Keywords: lock channel, unlock channel, lock this, unlock this

### ssh-command (L1150)
Execute a command on a remote server via SSH
Keywords: ssh, run command, execute command, remote command, run on server

### game-list (L1167)
List available games
Keywords: what games, list games, available games, show games, games list

### game-play (L1199)
Start a game
Keywords: play trivia, play hangman, play game, lets play, lets play, start game, play rps, play riddle, play number

### trivia (L1209)
Keywords: emoji, decode, emoji decode

### hangman (L1210)
Keywords: would you rather, wyr

### numguess (L1211)
Keywords: math, math blitz, maths

### rps (L1212)
Keywords: reaction, reaction race, quick

### tictactoe (L1213)
Keywords: mafia, werewolf

### connect4 (L1214)
Keywords: mafia, werewolf

### riddle (L1215)
Keywords: mafia, werewolf

### wordchain (L1216)
Keywords: mafia, werewolf

### 20questions (L1217)
Keywords: mafia, werewolf

### emojidecode (L1218)
Keywords: mafia, werewolf

### wouldyourather (L1219)
Keywords: mafia, werewolf

### mathblitz (L1220)
Keywords: mafia, werewolf

### reaction (L1221)
Keywords: mafia, werewolf

### device-rename (L1337)
Rename a device
Keywords: rename, name device, call device, set device name, change device name,  is , call it, name it

### device-emoji (L1532)
Set device emoji
Keywords: set emoji, device emoji, change emoji, add emoji, give emoji

### device-set-type (L1683)
Set device type (pc, server, phone, etc)
Keywords: set type, device type, change type, mark as, is a, set as

### device-set-os (L1806)
Set device operating system
Keywords: set os, operating system, runs, running

### device-deep-scan (L1893)
Deep scan network using nmap for OS/type detection
Keywords: deep scan, full scan, nmap scan, detect devices, scan with nmap, identify devices

### device-info (L2002)
Get detailed info about a device
Keywords: device info, about device, device details, show device, what is device

### device-ping (L2132)
Ping a device to check connectivity
Keywords: ping, ping device, check device, is device online, test connection

### device-port-scan (L2199)
Scan open ports on a device
Keywords: port scan, scan ports, open ports, what ports, services, docker ports

### service-name (L2354)
Name a service running on a port
Keywords: name port, name service, call port, label port, service name, set service

### service-list (L2499)
List all named services
Keywords: list services, show services, my services, all services, what services

### research (L2578)
Research a topic
Keywords: research, look up, find out about, learn about, tell me about, what is, who is, explain

### web-search (L2637)
Search the web using DuckDuckGo
Keywords: search for, search the web, google, look up online, find online, web search

### homeassistant (L2744)
Control Home Assistant
Keywords: turn on light, turn off light, lights on, lights off, home assistant, smart home

### ping (L2759)
Check bot latency
Keywords: ping, latency, response time

### reminder-create (L2773)
Create a reminder or scheduled automation via natural language
Keywords: remind me, remind us, set reminder, reminder in, reminder at, remind me every, dont forget, wake me, alert me, at , every day at, every morning, every night, every evening, schedule, automate, in 5, in 10, in 30

### scheduled-automation (L2994)
Schedule automated actions (handled by reminder-create)

### homeassistant-control (L3011)
Control Home Assistant devices
Keywords: turn on the, turn off the, switch on, switch off, lights on, lights off, set brightness, activate scene, what lights, dim the, brighten

### profile-setup (L3305)
Create a profile setup channel for members
Keywords: create profile channel, setup profile channel, profile channel, introduce themselves, member profiles, user profiles

### profile-view (L3349)
View your profile
Keywords: my profile, view profile, show profile, what do you know about me, who am i

### discord-create-channel (L3390)
Create a new Discord channel
Keywords: create channel, make channel, new channel, add channel, create a channel, make a channel

### discord-delete-channel (L3575)
Delete a Discord channel
Keywords: delete channel, remove channel, delete this channel, get rid of channel

### discord-rename-channel (L3741)
Rename a Discord channel
Keywords: rename channel, change channel name, rename this channel

### discord-set-topic (L3835)
Set channel topic/description
Keywords: set topic, channel topic, set description, channel description, change topic

### discord-set-slowmode (L3905)
Set channel slowmode
Keywords: set slowmode, slowmode, slow mode, rate limit

### discord-unban (L3980)
Unban a user from the server
Keywords: unban, unban user, remove ban, lift ban

### discord-remove-timeout (L4026)
Remove timeout from a user
Keywords: remove timeout, untimeout, unmute, remove mute, lift timeout

### discord-member-info (L4054)
Get information about a member
Keywords: member info, user info, who is, info about, whois

### discord-server-info (L4102)
Get server information
Keywords: server info, guild info, server stats, about server, server details

### discord-list-roles (L4148)
List all server roles
Keywords: list roles, show roles, all roles, server roles, what roles

### discord-ban-list (L4183)
View banned users
Keywords: ban list, banned users, show bans, list bans, who is banned

### discord-move-channel (L4220)
Move a channel to a category
Keywords: move channel, move to category, change category, put channel in

### discord-create-role (L4296)
Create a new server role
Keywords: create role, make role, new role, add role

### discord-delete-role (L4365)
Delete a server role
Keywords: delete role, remove role, destroy role

### discord-set-server-name (L4438)
Change the server name
Keywords: rename server, change server name, set server name, server name

### discord-set-server-description (L4498)
Set the server description
Keywords: server description, set server description, change server description

### discord-purge (L4556)
Bulk delete messages in a channel
Keywords: purge, delete messages, clear messages, bulk delete, clean chat, clear chat, remove messages

### discord-announce (L4644)
Send an announcement message with embed
Keywords: announce, announcement, send announcement, make announcement, broadcast

### discord-create-invite (L4739)
Create a server invite link
Keywords: create invite, make invite, invite link, generate invite, get invite, server invite

### discord-set-nickname (L4826)
Change a member\
Keywords: set nickname, change nickname, nickname, set nick, change nick, rename user

### network-insights (L4902)
Generate AI-powered network insights and analysis
Keywords: network insights, network analysis, analyze network, network report, network health

### device-health (L4933)
Get device health and uptime reports
Keywords: device health, health report, device uptime, device reliability, unhealthy devices

### shutdown-device (L4978)
Shutdown or restart a remote device
Keywords: shutdown, turn off, power off, restart, reboot, shut down

### reminder-list (L5137)
List your active reminders
Keywords: list reminders, show reminders, my reminders, view reminders, what reminders

### reminder-delete (L5184)
Delete a reminder
Keywords: delete reminder, remove reminder, cancel reminder

### speedtest-history (L5228)
View speed test history and trends
Keywords: speed history, speed test history, internet history, past speed tests, speed trends

### device-groups (L5268)
List device groups
Keywords: device groups, list groups, show groups, what groups

### device-group-view (L5301)
View devices in a specific group
Keywords: devices in group, show group, group devices, whats in group, list group

### scheduled-tasks (L5427)
List scheduled automation tasks
Keywords: scheduled tasks, list tasks, show tasks, automation tasks, cron jobs

### game-leaderboard (L5456)
Show game leaderboard
Keywords: game leaderboard, leaderboard, top players, game scores, who is winning

### speed-alert-config (L5486)
Configure speed alerts
Keywords: speed alert, set speed threshold, alert when slow, speed notification

### device-triggers-list (L5517)
List device automation triggers
Keywords: device triggers, list triggers, my triggers, automation triggers

### personality-change (L5560)
Change bot personality style
Keywords: change personality, set personality, switch personality, be more, act like, personality to

### personality-list (L5619)
List available bot personalities
Keywords: list personalities, show personalities, available personalities, what personalities

### device-health-summary (L5653)
Get health summary for all devices
Keywords: health summary, network health summary, overall health, health overview

### device-health-unhealthy (L5699)
List devices with poor health
Keywords: unhealthy devices, problem devices, devices with issues, unreliable devices

### device-health-reliable (L5735)
List most reliable devices
Keywords: reliable devices, best devices, most stable, highest uptime

### device-health-alerts (L5771)
Check for predictive health alerts
Keywords: health alerts, predictive alerts, device warnings, unusual behavior

### network-insights-history (L5808)
View past network insights
Keywords: insights history, past insights, previous insights, network analysis history

### plugin-list (L5847)
List loaded plugins
Keywords: list plugins, show plugins, what plugins, loaded plugins, available plugins

### plugin-stats (L5883)
Show plugin statistics
Keywords: plugin stats, plugin statistics, plugin info

### dashboard-url (L5911)
Get web dashboard URL
Keywords: dashboard, web dashboard, dashboard url, open dashboard, web interface

### tailscale-status (L5938)
Check Tailscale VPN status
Keywords: tailscale, tailscale status, vpn status, tailscale devices

