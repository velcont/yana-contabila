#!/usr/bin/env node
import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Replace all console.log/error/warn/info with logger equivalents
 * Add logger import if not present
 */
async function replaceConsoleLogs() {
  try {
    // Find all TS/TSX files in src directory, excluding test files
    const files = await glob('src/**/*.{ts,tsx}', {
      cwd: rootDir,
      absolute: true,
      ignore: ['**/*.test.ts', '**/*.test.tsx', '**/node_modules/**']
    });

    console.log(`🔍 Found ${files.length} files to process`);
    
    let filesModified = 0;
    let totalReplacements = 0;

    for (const file of files) {
      try {
        let content = await readFile(file, 'utf-8');
        const originalContent = content;
        
        // Check if logger import is needed
        const hasConsole = /console\.(log|error|warn|info)\(/.test(content);
        if (!hasConsole) continue;

        // Check if logger is already imported
        const hasLoggerImport = /import.*logger.*from ['"]@\/lib\/logger['"]/.test(content);
        
        // Add logger import if needed and not present
        if (!hasLoggerImport) {
          // Find the last import statement
          const importRegex = /^import .+;?$/gm;
          const imports = content.match(importRegex);
          
          if (imports && imports.length > 0) {
            const lastImport = imports[imports.length - 1];
            const lastImportIndex = content.indexOf(lastImport) + lastImport.length;
            content = content.slice(0, lastImportIndex) + 
                     `\nimport { logger } from '@/lib/logger';` + 
                     content.slice(lastImportIndex);
          } else {
            // No imports found, add at the beginning
            content = `import { logger } from '@/lib/logger';\n\n` + content;
          }
        }

        // Replace console.log -> logger.log
        content = content.replace(/console\.log\(/g, 'logger.log(');
        
        // Replace console.error -> logger.error
        content = content.replace(/console\.error\(/g, 'logger.error(');
        
        // Replace console.warn -> logger.warn
        content = content.replace(/console\.warn\(/g, 'logger.warn(');
        
        // Replace console.info -> logger.info
        content = content.replace(/console\.info\(/g, 'logger.info(');

        // Count replacements
        const replacements = (originalContent.match(/console\.(log|error|warn|info)\(/g) || []).length;
        
        if (content !== originalContent) {
          await writeFile(file, content, 'utf-8');
          filesModified++;
          totalReplacements += replacements;
          console.log(`✅ ${file.replace(rootDir + '/', '')} - ${replacements} replacements`);
        }
      } catch (err) {
        console.error(`❌ Error processing ${file}:`, err.message);
      }
    }

    console.log(`\n✨ Done! Modified ${filesModified} files with ${totalReplacements} total replacements`);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

replaceConsoleLogs();
