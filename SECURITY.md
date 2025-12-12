# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email details to the repository owner
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Best Practices

When running this bot, follow these guidelines:

### Environment Variables
- Never commit `.env` files
- Use strong, unique values for `JWT_SECRET`
- Rotate API keys periodically
- Use different keys for development/production

### Dashboard
- Change default admin password immediately
- Don't expose dashboard to public internet without:
  - HTTPS/TLS encryption
  - Reverse proxy (nginx, Cloudflare)
  - IP whitelisting
- Use strong passwords for all users

### Discord Bot
- Enable 2FA on bot owner Discord account
- Limit bot permissions to what's needed
- Review OAuth2 scopes carefully
- Don't share bot token

### Database
- Database file contains sensitive data
- Restrict file system permissions
- Regular backups (encrypted)
- Don't expose database port

### Network Features
- WoL can wake any device with known MAC
- Network scanning may trigger security alerts
- Use on trusted networks only

## Known Security Considerations

1. **Passwords stored with bcrypt** - Industry standard, 10 salt rounds
2. **JWT tokens expire in 7 days** - Consider shorter for sensitive deployments
3. **SQLite database is unencrypted** - Sensitive data stored in plaintext
4. **API has no rate limiting** - Vulnerable to brute force (improvement planned)
5. **WebSocket has no authentication** - Real-time updates are public (improvement planned)

## Acknowledgments

Thanks to everyone who reports security issues responsibly.
