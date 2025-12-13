# AI System Administrator Plugin - Design Document

## Overview
An AI-powered system administration assistant that allows authorized users to manage servers, deploy code, and perform maintenance tasks through natural language commands.

## ⚠️ Security Considerations

### Critical Requirements
1. **Admin-Only Access** - Requires highest permission level
2. **Command Approval** - All commands must be approved before execution
3. **Audit Logging** - Every action logged with user, timestamp, command, result
4. **Rate Limiting** - Max 10 commands per hour per user
5. **Whitelist Mode** - Only approved command patterns allowed
6. **Encrypted Credentials** - SSH credentials encrypted in .env
7. **Timeout Protection** - Commands timeout after 5 minutes
8. **Rollback Capability** - Ability to undo certain operations

### Permission Levels
- **Super Admin** - Full access, can execute any command
- **Admin** - Limited to predefined safe operations
- **Operator/Viewer** - No access

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Discord User (Admin)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              /admin sysadmin <natural language>              │
│                    Discord Bot Command                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI Sysadmin Plugin                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. Permission Check (SUPER_ADMIN)                   │   │
│  │  2. Rate Limit Check                                 │   │
│  │  3. Parse Natural Language → Commands (Gemini)       │   │
│  │  4. Validate Against Whitelist                       │   │
│  │  5. Show Preview + Request Approval                  │   │
│  │  6. Execute (if approved)                            │   │
│  │  7. Capture Output                                   │   │
│  │  8. Log to Audit Trail                               │   │
│  │  9. Return Results                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Command Executor                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Local      │  │   SSH        │  │   Docker     │      │
│  │   Execution  │  │   Remote     │  │   Container  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → Natural language request
2. **AI Processing** → Gemini translates to commands
3. **Validation** → Check against whitelist and safety rules
4. **Approval** → Interactive confirmation with preview
5. **Execution** → Run command (local or remote)
6. **Logging** → Audit trail in database
7. **Response** → Results back to user

## Features

### Phase 1 - Basic Operations (Safe)
- View system status (uptime, memory, disk, CPU)
- Check service status
- View logs (last N lines)
- List processes
- Check network connectivity
- View file contents (read-only)
- Git operations (pull, status, log)

### Phase 2 - Service Management
- Restart services
- Start/stop services
- Reload configurations
- View service logs
- Enable/disable services

### Phase 3 - Deployment
- Pull latest code
- Install dependencies
- Restart bot
- Run database migrations
- Deploy to production

### Phase 4 - Maintenance
- Update system packages
- Clean up logs
- Disk space management
- Backup operations
- Certificate renewal

### Phase 5 - Advanced (Dangerous)
- Execute arbitrary commands (with extra confirmation)
- File system modifications
- User management
- Firewall rules
- Database operations

## Command Whitelist

### Allowed Patterns
```javascript
const SAFE_COMMANDS = [
  // System info (read-only)
  /^uptime$/,
  /^free -h$/,
  /^df -h$/,
  /^top -bn1$/,
  /^ps aux$/,
  /^systemctl status .+$/,
  
  // Service management
  /^systemctl (start|stop|restart|reload) discord-maid-bot$/,
  /^journalctl -u discord-maid-bot .+$/,
  
  // Git operations
  /^git (status|log|pull|fetch)$/,
  /^git log --oneline -\d+$/,
  
  // File viewing (read-only)
  /^cat \/home\/think\/discord-maid-bot\/.+$/,
  /^tail -n \d+ .+\.log$/,
  /^ls -la .+$/,
  
  // Network
  /^ping -c \d+ .+$/,
  /^curl -I .+$/,
  
  // Package management (with confirmation)
  /^apt update$/,
  /^nala upgrade -y$/,
];

const DANGEROUS_COMMANDS = [
  /rm -rf/,
  /dd if=/,
  /mkfs/,
  /fdisk/,
  /> \/dev\//,
  /chmod 777/,
  /chown -R/,
];
```

## Environment Variables

```env
# AI Sysadmin Configuration
SYSADMIN_ENABLED=true
SYSADMIN_MODE=whitelist  # whitelist | approval | unrestricted

# SSH Configuration (for remote execution)
SYSADMIN_SSH_HOST=192.168.0.250
SYSADMIN_SSH_USER=think
SYSADMIN_SSH_PASSWORD=encrypted:base64encodedpassword
SYSADMIN_SSH_KEY_PATH=/path/to/private/key  # Alternative to password

# Security
SYSADMIN_MAX_COMMANDS_PER_HOUR=10
SYSADMIN_COMMAND_TIMEOUT=300000  # 5 minutes
SYSADMIN_REQUIRE_APPROVAL=true
SYSADMIN_AUDIT_LOG=true

# AI Configuration
SYSADMIN_AI_MODEL=gemini-1.5-pro
SYSADMIN_AI_TEMPERATURE=0.1  # Low temperature for precise commands
```

## Database Schema

```sql
CREATE TABLE sysadmin_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  request TEXT NOT NULL,
  generated_commands TEXT NOT NULL,
  approved BOOLEAN NOT NULL,
  executed BOOLEAN NOT NULL,
  exit_code INTEGER,
  stdout TEXT,
  stderr TEXT,
  duration_ms INTEGER,
  host TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sysadmin_user ON sysadmin_audit(user_id);
CREATE INDEX idx_sysadmin_timestamp ON sysadmin_audit(timestamp DESC);
```

## Example Interactions

### Example 1: Check Bot Status
```
User: "Is the bot running?"

AI: Analyzing request...
Generated commands:
  1. systemctl status discord-maid-bot
  2. ps aux | grep node

Approve execution? [Yes/No]

User: Yes

Executing...
✅ discord-maid-bot.service - Discord Maid Bot
   Active: active (running) since Sun 2025-12-14 00:45:18
   PID: 37129
   Memory: 39.2M
   
Bot is running normally.
```

### Example 2: Deploy Updates
```
User: "Deploy the latest code"

AI: Analyzing request...
Generated commands:
  1. cd /home/think/discord-maid-bot
  2. git pull
  3. npm install
  4. systemctl restart discord-maid-bot

⚠️ This will restart the bot. Approve? [Yes/No]

User: Yes

Executing...
✅ Step 1/4: Changed directory
✅ Step 2/4: Pulled latest code (3 files changed)
✅ Step 3/4: Installed dependencies (0 new packages)
✅ Step 4/4: Bot restarted successfully

Deployment complete! Bot is online.
```

### Example 3: System Diagnostics
```
User: "Why is the server slow?"

AI: Running diagnostics...

📊 System Status:
- CPU: 85% usage (high)
- Memory: 7.2GB / 8GB (90% used)
- Disk: 45GB / 100GB (45% used)
- Load Average: 4.2, 3.8, 3.5

🔍 Top Processes:
1. node (PID 37129) - 45% CPU, 2.1GB RAM
2. docker (PID 1234) - 25% CPU, 3.8GB RAM
3. mysql (PID 5678) - 15% CPU, 1.3GB RAM

💡 Recommendations:
- High memory usage detected
- Consider restarting Docker containers
- Check for memory leaks in node process

Would you like me to restart any services?
```

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Create plugin structure
- [ ] Implement permission system
- [ ] Add audit logging
- [ ] Create command whitelist
- [ ] Basic SSH executor

### Phase 2: AI Integration (Week 2)
- [ ] Gemini prompt engineering
- [ ] Command generation
- [ ] Validation system
- [ ] Approval workflow

### Phase 3: Safe Operations (Week 3)
- [ ] System status commands
- [ ] Service management
- [ ] Log viewing
- [ ] Git operations

### Phase 4: Advanced Features (Week 4)
- [ ] Deployment automation
- [ ] Maintenance tasks
- [ ] Rollback capability
- [ ] Multi-server support

## Safety Mechanisms

### 1. Dry Run Mode
Always show what will be executed before running:
```
🔍 Preview Mode
Commands to be executed:
  1. cd /home/think/discord-maid-bot
  2. git pull origin main
  3. npm install --production
  4. systemctl restart discord-maid-bot

Estimated time: 30-60 seconds
Risk level: MEDIUM (will restart bot)

Type 'CONFIRM' to proceed:
```

### 2. Rollback System
For certain operations, create automatic rollback:
```javascript
const rollbackStack = [
  { action: 'git pull', rollback: 'git reset --hard HEAD@{1}' },
  { action: 'npm install', rollback: 'npm ci' },
  { action: 'systemctl restart', rollback: 'systemctl start' }
];
```

### 3. Rate Limiting
```javascript
const rateLimits = {
  perUser: 10,      // 10 commands per hour
  perGuild: 50,     // 50 commands per hour per server
  cooldown: 30000   // 30 seconds between commands
};
```

### 4. Emergency Stop
```
/admin sysadmin stop
Kills all running sysadmin operations immediately
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Malicious commands | Whitelist + approval system |
| Credential exposure | Encrypted storage, never logged |
| Service disruption | Dry-run mode, rollback capability |
| Privilege escalation | Strict permission checks |
| Command injection | Input sanitization, parameterized execution |
| Audit trail tampering | Immutable logs, checksums |
| AI hallucination | Command validation, human approval |
| Rate limit bypass | Token bucket algorithm, IP tracking |

## Future Enhancements

1. **Multi-Server Management** - Manage multiple servers from one interface
2. **Scheduled Operations** - "Deploy every night at 3 AM"
3. **Monitoring Integration** - Proactive alerts and auto-remediation
4. **Playbooks** - Save common operation sequences
5. **Voice Commands** - Voice channel integration
6. **Mobile App** - Dedicated admin mobile interface
7. **Terraform/IaC** - Infrastructure as code integration
8. **Kubernetes** - Container orchestration support

## Conclusion

This plugin would be incredibly powerful but requires extreme care in implementation. The key is:
- **Security first** - Multiple layers of protection
- **Transparency** - Always show what will happen
- **Auditability** - Log everything
- **Fail-safe** - Prefer to block than allow dangerous operations

**Recommendation:** Start with Phase 1 (read-only operations) and gradually expand based on real-world usage and safety validation.
