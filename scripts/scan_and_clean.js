// scan_and_clean.js
// Node.js utility to scan the resumatchvc3 project for risky patterns and unused files.
// Generates a markdown report (scan_report.md) and optionally backs up the project.

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const projectRoot = path.resolve(__dirname, '..'); // root of the repo
const excludeDirs = ['node_modules', '.git', 'scripts']; // can be adjusted later
const riskyPatterns = [
  { regex: /eval\s*\(/, description: 'Use of eval' },
  { regex: /child_process\.exec\s*\(/, description: 'Exec child process' },
  { regex: /require\(['"]fs['"]\)\.unlinkSync\s*\(/, description: 'File deletion via fs.unlinkSync' },
  { regex: /new Function\s*\(/, description: 'Dynamic function creation' },
  { regex: /Base64\.decode\s*\(/, description: 'Base64 decode (possible obfuscation)' },
];

// Helper to walk directory recursively
function walk(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excludeDirs.includes(entry.name)) continue;
      walk(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

// Scan files for risky patterns
function scanRisky(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = [];
  riskyPatterns.forEach(p => {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (p.regex.test(line)) {
        matches.push({ line: idx + 1, snippet: line.trim(), description: p.description });
      }
    });
  });
  return matches;
}

// Build simple import graph for JS/JSX files to find unused files
function buildImportGraph(files) {
  const graph = {};
  files.forEach(f => {
    const ext = path.extname(f);
    if (!['.js', '.jsx', '.ts', '.tsx'].includes(ext)) return;
    graph[f] = new Set();
    const content = fs.readFileSync(f, 'utf8');
    const importRegex = /import\s+.*?['"](.*?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      let imported = match[1];
      if (imported.startsWith('.')) {
        const resolved = path.resolve(path.dirname(f), imported);
        const possible = [resolved + '.js', resolved + '.jsx', resolved + '.ts', resolved + '.tsx', resolved + '/index.js', resolved + '/index.jsx'];
        const target = possible.find(p => fs.existsSync(p));
        if (target) graph[f].add(target);
      }
    }
  });
  return graph;
}

function findUnusedFiles(graph) {
  const allFiles = Object.keys(graph);
  const referenced = new Set();
  for (const src of allFiles) {
    for (const tgt of graph[src]) referenced.add(tgt);
  }
  const entryPoints = [
    path.join(projectRoot, 'server', 'server.js'),
    path.join(projectRoot, 'client', 'src', 'index.js'),
    path.join(projectRoot, 'client', 'src', 'main.jsx')
  ];
  return allFiles.filter(f => !referenced.has(f) && !entryPoints.includes(f));
}

async function main() {
  console.log('Scanning project at', projectRoot);
  const allFiles = walk(projectRoot);
  const reportLines = [];
  // Risky patterns
  for (const file of allFiles) {
    if (['.js', '.jsx', '.ts', '.tsx'].some(ext => file.endsWith(ext))) {
      const issues = scanRisky(file);
      if (issues.length) {
        reportLines.push(`## Risky patterns in ${path.relative(projectRoot, file)}`);
        issues.forEach(i => {
          reportLines.push(`- Line ${i.line}: ${i.description}\n  \\`${i.snippet}\\``);
        });
        reportLines.push('');
      }
    }
  }
  // Unused files detection
  const importGraph = buildImportGraph(allFiles);
  const unused = findUnusedFiles(importGraph);
  if (unused.length) {
    reportLines.push('## Potentially Unused Files');
    unused.forEach(f => {
      reportLines.push(`- ${path.relative(projectRoot, f)}`);
    });
    reportLines.push('');
  }
  const reportPath = path.join(projectRoot, 'scan_report.md');
  fs.writeFileSync(reportPath, reportLines.join('\n'));
  console.log('Report generated at', reportPath);

  // Prompt for deletion of unused files (optional)
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  for (const file of unused) {
    const rel = path.relative(projectRoot, file);
    await new Promise(resolve => {
      rl.question(`Delete unused file ${rel}? (y/N) `, answer => {
        if (answer.trim().toLowerCase() === 'y') {
          try { fs.unlinkSync(file); console.log('Deleted', rel); } catch (e) { console.error('Failed to delete', rel, e.message); }
        }
        resolve();
      });
    });
  }
  rl.close();
}

main().catch(err => {
  console.error('Error during scan:', err);
});
