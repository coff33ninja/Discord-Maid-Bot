# Utility Scripts

**Version:** 1.0.0.0-beta  
**Last Updated:** December 14, 2025

This directory contains utility scripts for maintaining and managing the Discord Maid Bot project.

---

## 📋 Available Scripts

### Version Management

#### `update-version.js`
Updates the project version across all files.

**Usage:**
```bash
node scripts/update-version.js
```

**What it does:**
- Updates `package.json` version
- Updates all plugin versions (14 plugins)
- Updates documentation version references
- Updates README and other docs

**When to use:**
- Before releasing a new version
- After completing a major feature
- When preparing for beta/stable release

**Configuration:**
Edit the `NEW_VERSION` constant in the script:
```javascript
const NEW_VERSION = '1.0.0.0-beta';
```

---

### Documentation Management

#### `reorganize-docs.js`
Reorganizes documentation into the proper structure.

**Usage:**
```bash
node scripts/reorganize-docs.js
```

**What it does:**
- Moves user docs to `docs/user/`
- Moves developer docs to `docs/developer/`
- Moves plugin docs to `docs/plugins/`
- Moves planning docs to `docs/planning/`
- Creates new documentation files
- Cleans up empty directories

**When to use:**
- After adding new documentation
- When restructuring docs
- During major refactors

**Configuration:**
Edit the `DOC_MAP` object to define file movements:
```javascript
const DOC_MAP = {
  'docs/user/': [
    { from: 'docs/FILE.md', to: 'new-name.md' },
  ],
};
```

---

#### `create-plugin-docs.js`
Creates comprehensive documentation for all plugins.

**Usage:**
```bash
node scripts/create-plugin-docs.js
```

**What it does:**
- Creates `docs/` folder for each plugin
- Generates README.md (overview)
- Generates COMMANDS.md (command reference)
- Generates EXAMPLES.md (usage examples)
- Generates CHANGELOG.md (version history)

**When to use:**
- After creating a new plugin
- When updating plugin documentation
- During documentation audits

**Configuration:**
Edit the `PLUGIN_INFO` and `INTEGRATION_INFO` objects:
```javascript
const PLUGIN_INFO = {
  'plugin-name': {
    name: 'Plugin Name',
    category: 'Category',
    author: 'Author Name',
    description: 'Description',
    commands: [
      { name: '/command', description: 'Description' },
    ],
    features: [
      'Feature 1',
      'Feature 2',
    ],
  },
};
```

---

### Database Management

#### `cleanup-devices.js`
Cleans up ghost devices from the database.

**Usage:**
```bash
node scripts/cleanup-devices.js
```

**What it does:**
- Shows current device count
- Identifies devices with unknown MAC addresses
- Removes ghost devices
- Shows breakdown by network type

**When to use:**
- After network scans that found many devices
- When database has too many entries
- During maintenance

**Safety:**
- Only removes devices with `mac = 'unknown'`
- Preserves all devices with valid MAC addresses
- Shows summary before and after

---

## 🔧 Creating New Scripts

### Script Template

```javascript
/**
 * Script Name
 * 
 * Description of what the script does.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // Add configuration options here
};

async function main() {
  console.log('🚀 Starting script...\n');
  console.log('='.repeat(60));
  
  try {
    // Script logic here
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Script complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
```

### Best Practices

1. **Use ES6 Modules**
   - Import/export syntax
   - Async/await for async operations
   - Proper error handling

2. **Add Configuration**
   - Make scripts configurable
   - Use constants for values that might change
   - Document configuration options

3. **Provide Feedback**
   - Show progress with console.log
   - Use emoji for visual clarity (✅ ❌ ⚠️ 📦 🔧)
   - Show summary at the end

4. **Handle Errors**
   - Try/catch blocks
   - Meaningful error messages
   - Exit with proper codes

5. **Make it Reusable**
   - Don't hardcode values
   - Use configuration objects
   - Document usage

6. **Add to README**
   - Document what it does
   - Show usage examples
   - Explain when to use it

---

## 📚 Script Categories

### Version Management
Scripts for managing versions across the project.
- `update-version.js` - Update project version

### Documentation
Scripts for managing documentation.
- `reorganize-docs.js` - Reorganize documentation structure
- `create-plugin-docs.js` - Generate plugin documentation

### Database
Scripts for database maintenance.
- `cleanup-devices.js` - Clean up ghost devices

### Development
Scripts for development tasks.
- (Add development scripts here)

### Deployment
Scripts for deployment tasks.
- (Add deployment scripts here)

---

## 🎯 Common Tasks

### Preparing a Release

1. Update version:
```bash
node scripts/update-version.js
```

2. Update documentation:
```bash
node scripts/create-plugin-docs.js
```

3. Test the bot:
```bash
npm start
```

4. Commit and push:
```bash
git add .
git commit -m "chore: prepare v1.0.0.0-beta release"
git push
```

### Adding a New Plugin

1. Create plugin files:
```bash
mkdir plugins/my-plugin
# Create plugin.js, commands.js, etc.
```

2. Generate documentation:
```bash
# Edit scripts/create-plugin-docs.js to add plugin info
node scripts/create-plugin-docs.js
```

3. Test the plugin:
```bash
npm start
```

### Cleaning Up Documentation

1. Reorganize docs:
```bash
node scripts/reorganize-docs.js
```

2. Review changes:
```bash
git status
git diff
```

3. Commit:
```bash
git add .
git commit -m "docs: reorganize documentation"
```

---

## 🔍 Troubleshooting

### Script Won't Run

**Error:** `Cannot find module`
```bash
# Make sure you're in the project root
cd /path/to/discord-maid-bot

# Install dependencies
npm install
```

**Error:** `Permission denied`
```bash
# On Linux/Mac, make script executable
chmod +x scripts/script-name.js

# Or run with node explicitly
node scripts/script-name.js
```

### Script Errors

1. Check Node.js version:
```bash
node --version
# Should be v20 or higher
```

2. Check for syntax errors:
```bash
# Run with --trace-warnings
node --trace-warnings scripts/script-name.js
```

3. Check file paths:
```bash
# Make sure you're in project root
pwd
# Should show: /path/to/discord-maid-bot
```

---

## 📝 Contributing Scripts

### Adding a New Script

1. Create the script in `scripts/`
2. Follow the template above
3. Add documentation to this README
4. Test thoroughly
5. Submit a pull request

### Script Guidelines

- **Name:** Use kebab-case (e.g., `my-script.js`)
- **Documentation:** Add to this README
- **Comments:** Add JSDoc comments
- **Error Handling:** Always handle errors
- **Feedback:** Show progress and results
- **Reusable:** Make it configurable

---

## 🛠️ Future Scripts

Ideas for future utility scripts:

### Development
- `generate-plugin.js` - Generate plugin boilerplate
- `validate-plugins.js` - Validate plugin structure
- `test-plugins.js` - Run plugin tests

### Database
- `backup-database.js` - Backup database
- `migrate-database.js` - Run database migrations
- `seed-database.js` - Seed test data

### Deployment
- `deploy-server.js` - Deploy to server
- `rollback-deployment.js` - Rollback deployment
- `health-check.js` - Check bot health

### Documentation
- `generate-api-docs.js` - Generate API documentation
- `validate-docs.js` - Validate documentation links
- `update-changelog.js` - Update CHANGELOG.md

### Maintenance
- `cleanup-logs.js` - Clean up old logs
- `optimize-database.js` - Optimize database
- `check-dependencies.js` - Check for outdated dependencies

---

## 📖 Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [File System API](https://nodejs.org/api/fs.html)

---

**Version:** 1.0.0.0-beta  
**Last Updated:** December 14, 2025

For questions or issues with scripts, open an issue on GitHub.
