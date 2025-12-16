#!/usr/bin/env node
/**
 * Architecture Extractor
 * 
 * Extracts architectural design information from source files:
 * - Exports (functions, classes, constants)
 * - Class definitions with methods
 * - Function signatures
 * - Module dependencies (imports)
 * - JSDoc comments
 * 
 * Output: architecture/ folder mirroring src/ and plugins/ structure
 * 
 * Usage: node scripts/extract-architecture.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'architecture');

// Directories to scan
const SCAN_DIRS = ['src', 'plugins'];

// File extensions to process
const EXTENSIONS = ['.js', '.mjs', '.ts'];

/**
 * Extract architectural info from a JavaScript file
 */
function extractArchitecture(filePath, content) {
  const lines = content.split('\n');
  const architecture = {
    file: filePath,
    description: null,
    imports: [],
    exports: [],
    classes: [],
    functions: [],
    constants: [],
    actions: [],
    commands: []
  };

  let currentJSDoc = null;
  let inClass = null;
  let classIndent = 0;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    // Track JSDoc comments
    if (trimmed.startsWith('/**')) {
      currentJSDoc = { start: lineNum, lines: [trimmed] };
    } else if (currentJSDoc && !currentJSDoc.end) {
      currentJSDoc.lines.push(trimmed);
      if (trimmed.includes('*/')) {
        currentJSDoc.end = lineNum;
      }
    }

    // File-level description (first JSDoc)
    if (!architecture.description && currentJSDoc?.end && i === currentJSDoc.end - 1) {
      const descMatch = currentJSDoc.lines.join('\n').match(/\*\s*([^@*][^\n]*)/);
      if (descMatch && !lines[i + 1]?.trim().match(/^(import|export|const|let|var|class|function|async)/)) {
        architecture.description = descMatch[1].trim();
      }
    }

    // Imports
    const importMatch = line.match(/^import\s+(?:(\{[^}]+\})|(\w+)(?:\s*,\s*\{([^}]+)\})?)\s+from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      const named = importMatch[1] || importMatch[3];
      const defaultImport = importMatch[2];
      const source = importMatch[4];
      architecture.imports.push({
        line: lineNum,
        source,
        default: defaultImport || null,
        named: named ? named.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean) : []
      });
    }

    // Dynamic imports
    const dynamicImportMatch = line.match(/await\s+import\(['"]([^'"]+)['"]\)/);
    if (dynamicImportMatch) {
      architecture.imports.push({
        line: lineNum,
        source: dynamicImportMatch[1],
        dynamic: true
      });
    }

    // Exports
    const exportMatch = line.match(/^export\s+(default\s+)?(const|let|var|function|async\s+function|class)\s+(\w+)/);
    if (exportMatch) {
      const jsDoc = currentJSDoc?.end === lineNum - 1 ? extractJSDocSummary(currentJSDoc.lines) : null;
      architecture.exports.push({
        line: lineNum,
        type: exportMatch[2].replace('async ', ''),
        name: exportMatch[3],
        default: !!exportMatch[1],
        description: jsDoc
      });
    }

    // Named exports at end of file
    const namedExportMatch = line.match(/^export\s+\{([^}]+)\}/);
    if (namedExportMatch) {
      const names = namedExportMatch[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
      names.forEach(name => {
        architecture.exports.push({ line: lineNum, name, type: 'reference' });
      });
    }

    // Class definitions
    const classMatch = line.match(/^(export\s+)?(default\s+)?class\s+(\w+)(\s+extends\s+(\w+))?/);
    if (classMatch) {
      const jsDoc = currentJSDoc?.end === lineNum - 1 ? extractJSDocSummary(currentJSDoc.lines) : null;
      inClass = {
        line: lineNum,
        name: classMatch[3],
        extends: classMatch[5] || null,
        exported: !!classMatch[1],
        default: !!classMatch[2],
        description: jsDoc,
        methods: [],
        properties: []
      };
      classIndent = line.search(/\S/);
      braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    }

    // Track class methods
    if (inClass) {
      braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      
      const methodMatch = trimmed.match(/^(async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/);
      if (methodMatch && !['if', 'for', 'while', 'switch', 'catch'].includes(methodMatch[2])) {
        const jsDoc = currentJSDoc?.end === lineNum - 1 ? extractJSDocSummary(currentJSDoc.lines) : null;
        inClass.methods.push({
          line: lineNum,
          name: methodMatch[2],
          async: !!methodMatch[1],
          params: methodMatch[3].split(',').map(p => p.trim()).filter(Boolean),
          description: jsDoc
        });
      }

      // End of class
      if (braceCount <= 0) {
        architecture.classes.push(inClass);
        inClass = null;
      }
    }

    // Standalone functions
    if (!inClass) {
      const funcMatch = line.match(/^(export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
      if (funcMatch) {
        const jsDoc = currentJSDoc?.end === lineNum - 1 ? extractJSDocSummary(currentJSDoc.lines) : null;
        architecture.functions.push({
          line: lineNum,
          name: funcMatch[3],
          async: !!funcMatch[2],
          exported: !!funcMatch[1],
          params: funcMatch[4].split(',').map(p => p.trim()).filter(Boolean),
          description: jsDoc
        });
      }

      // Arrow functions assigned to const
      const arrowMatch = line.match(/^(export\s+)?const\s+(\w+)\s*=\s*(async\s+)?\(?([^)=]*)\)?\s*=>/);
      if (arrowMatch) {
        const jsDoc = currentJSDoc?.end === lineNum - 1 ? extractJSDocSummary(currentJSDoc.lines) : null;
        architecture.functions.push({
          line: lineNum,
          name: arrowMatch[2],
          async: !!arrowMatch[3],
          exported: !!arrowMatch[1],
          params: arrowMatch[4].split(',').map(p => p.trim()).filter(Boolean),
          description: jsDoc,
          arrow: true
        });
      }
    }

    // Constants (objects/configs)
    const constMatch = line.match(/^(export\s+)?const\s+(\w+)\s*=\s*(\{|\[|['"`]|new\s+)/);
    if (constMatch && !line.includes('=>')) {
      const jsDoc = currentJSDoc?.end === lineNum - 1 ? extractJSDocSummary(currentJSDoc.lines) : null;
      architecture.constants.push({
        line: lineNum,
        name: constMatch[2],
        exported: !!constMatch[1],
        type: constMatch[3] === '{' ? 'object' : constMatch[3] === '[' ? 'array' : 'value',
        description: jsDoc
      });
    }

    // Action definitions (for conversational-ai)
    const actionMatch = line.match(/^\s*['"]?([\w-]+)['"]?\s*:\s*\{/);
    if (actionMatch && filePath.includes('action-executor') && !['keywords', 'plugin', 'description'].includes(actionMatch[1])) {
      // Look for keywords and description in next few lines
      let keywords = null;
      let description = null;
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const kMatch = lines[j].match(/keywords:\s*\[([^\]]+)\]/);
        const dMatch = lines[j].match(/description:\s*['"]([^'"]+)['"]/);
        if (kMatch) keywords = kMatch[1].split(',').map(k => k.trim().replace(/['"]/g, ''));
        if (dMatch) description = dMatch[1];
        if (keywords && description) break;
      }
      if (keywords || description) {
        architecture.actions.push({
          line: lineNum,
          id: actionMatch[1],
          keywords,
          description
        });
      }
    }

    // Slash command definitions
    const cmdMatch = line.match(/\.setName\(['"](\w+)['"]\)/);
    if (cmdMatch) {
      const descMatch = lines.slice(i, i + 5).join('').match(/\.setDescription\(['"]([^'"]+)['"]\)/);
      architecture.commands.push({
        line: lineNum,
        name: cmdMatch[1],
        description: descMatch?.[1] || null
      });
    }

    // Clear JSDoc after use
    if (currentJSDoc?.end && lineNum > currentJSDoc.end) {
      currentJSDoc = null;
    }
  }

  return architecture;
}

/**
 * Extract summary from JSDoc lines
 */
function extractJSDocSummary(lines) {
  const text = lines.join('\n');
  const match = text.match(/\*\s*([^@*\n][^\n]*)/);
  return match ? match[1].trim() : null;
}

/**
 * Format architecture as markdown
 */
function formatArchitecture(arch) {
  let md = `# ${path.basename(arch.file)}\n\n`;
  md += `**Path:** \`${arch.file}\`\n\n`;

  if (arch.description) {
    md += `## Description\n${arch.description}\n\n`;
  }

  // Imports
  if (arch.imports.length > 0) {
    md += `## Dependencies\n`;
    arch.imports.forEach(imp => {
      if (imp.dynamic) {
        md += `- \`${imp.source}\` (dynamic, L${imp.line})\n`;
      } else {
        const items = [imp.default, ...(imp.named || [])].filter(Boolean).join(', ');
        md += `- \`${imp.source}\` → ${items} (L${imp.line})\n`;
      }
    });
    md += '\n';
  }

  // Exports
  if (arch.exports.length > 0) {
    md += `## Exports\n`;
    arch.exports.forEach(exp => {
      const def = exp.default ? ' (default)' : '';
      md += `- **${exp.name}** [${exp.type}]${def} (L${exp.line})`;
      if (exp.description) md += ` - ${exp.description}`;
      md += '\n';
    });
    md += '\n';
  }

  // Classes
  if (arch.classes.length > 0) {
    md += `## Classes\n`;
    arch.classes.forEach(cls => {
      md += `### ${cls.name}`;
      if (cls.extends) md += ` extends ${cls.extends}`;
      md += ` (L${cls.line})\n`;
      if (cls.description) md += `${cls.description}\n`;
      if (cls.methods.length > 0) {
        md += `\n**Methods:**\n`;
        cls.methods.forEach(m => {
          const async = m.async ? 'async ' : '';
          md += `- \`${async}${m.name}(${m.params.join(', ')})\` (L${m.line})`;
          if (m.description) md += ` - ${m.description}`;
          md += '\n';
        });
      }
      md += '\n';
    });
  }

  // Functions
  if (arch.functions.length > 0) {
    md += `## Functions\n`;
    arch.functions.forEach(fn => {
      const async = fn.async ? 'async ' : '';
      const exp = fn.exported ? '✓ ' : '';
      md += `- ${exp}\`${async}${fn.name}(${fn.params.join(', ')})\` (L${fn.line})`;
      if (fn.description) md += ` - ${fn.description}`;
      md += '\n';
    });
    md += '\n';
  }

  // Constants
  if (arch.constants.length > 0) {
    md += `## Constants\n`;
    arch.constants.forEach(c => {
      const exp = c.exported ? '✓ ' : '';
      md += `- ${exp}**${c.name}** [${c.type}] (L${c.line})`;
      if (c.description) md += ` - ${c.description}`;
      md += '\n';
    });
    md += '\n';
  }

  // Actions (for action-executor)
  if (arch.actions.length > 0) {
    md += `## AI Actions\n`;
    arch.actions.forEach(a => {
      md += `### ${a.id} (L${a.line})\n`;
      if (a.description) md += `${a.description}\n`;
      if (a.keywords) md += `Keywords: ${a.keywords.join(', ')}\n`;
      md += '\n';
    });
  }

  // Commands
  if (arch.commands.length > 0) {
    md += `## Slash Commands\n`;
    arch.commands.forEach(c => {
      md += `- **/${c.name}** (L${c.line})`;
      if (c.description) md += ` - ${c.description}`;
      md += '\n';
    });
    md += '\n';
  }

  return md;
}

/**
 * Process a directory recursively
 */
function processDirectory(dir, relativePath = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      results.push(...processDirectory(fullPath, relPath));
    } else if (entry.isFile() && EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const arch = extractArchitecture(relPath, content);
        
        // Only include files with meaningful architecture
        if (arch.exports.length > 0 || arch.classes.length > 0 || 
            arch.functions.length > 0 || arch.actions.length > 0) {
          results.push({ path: relPath, architecture: arch });
        }
      } catch (error) {
        console.error(`Error processing ${fullPath}: ${error.message}`);
      }
    }
  }

  return results;
}

/**
 * Main execution
 */
function main() {
  console.log('🏗️  Extracting architecture documentation...\n');

  // Clean output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalFiles = 0;
  let indexContent = '# Architecture Documentation\n\n';
  indexContent += `Generated: ${new Date().toISOString()}\n\n`;

  for (const scanDir of SCAN_DIRS) {
    const dirPath = path.join(ROOT_DIR, scanDir);
    if (!fs.existsSync(dirPath)) continue;

    console.log(`📁 Scanning ${scanDir}/...`);
    const results = processDirectory(dirPath, scanDir);

    if (results.length > 0) {
      indexContent += `## ${scanDir}/\n\n`;

      for (const { path: relPath, architecture } of results) {
        // Create output directory structure
        const outPath = path.join(OUTPUT_DIR, relPath.replace(/\.(js|mjs|ts)$/, '.md'));
        const outDir = path.dirname(outPath);
        fs.mkdirSync(outDir, { recursive: true });

        // Write architecture file
        const markdown = formatArchitecture(architecture);
        fs.writeFileSync(outPath, markdown);

        // Add to index
        const linkPath = relPath.replace(/\.(js|mjs|ts)$/, '.md');
        const summary = architecture.description || `${architecture.exports.length} exports, ${architecture.functions.length} functions`;
        indexContent += `- [${relPath}](${linkPath}) - ${summary}\n`;

        totalFiles++;
        console.log(`  ✓ ${relPath}`);
      }
      indexContent += '\n';
    }
  }

  // Write index
  fs.writeFileSync(path.join(OUTPUT_DIR, 'INDEX.md'), indexContent);

  console.log(`\n✅ Extracted architecture from ${totalFiles} files`);
  console.log(`📂 Output: ${OUTPUT_DIR}/`);
}

main();
