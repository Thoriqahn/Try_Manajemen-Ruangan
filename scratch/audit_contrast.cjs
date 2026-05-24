const fs = require('fs');
const path = require('path');

const dirs = [
  'd:/Codean/Try_Manajemen Ruangan/src/app/components/user',
  'd:/Codean/Try_Manajemen Ruangan/src/app/components/admin',
  'd:/Codean/Try_Manajemen Ruangan/src/app/components/auth',
  'd:/Codean/Try_Manajemen Ruangan/src/app/components/layout'
];

let issues = [];

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Look for bg-X-50 or bg-X-100 without dark:bg
      const bgMatches = content.match(/bg-[a-z]+-(?:50|100)(?!\/)(?!\s*dark:bg-)[^"'\s]*\s/g) || [];
      if (bgMatches.length > 0) {
        issues.push(`${file} has bg- light colors without dark mode: ${[...new Set(bgMatches)].join(' ')}`);
      }

      // Look for text-gray-700/800/900 without dark:text
      const textMatches = content.match(/text-gray-(?:700|800|900)(?!\s*dark:text-)[^"'\s]*\s/g) || [];
      if (textMatches.length > 0) {
        issues.push(`${file} has dark text without dark mode: ${[...new Set(textMatches)].join(' ')}`);
      }

      // Look for border-gray without dark:border
      const borderMatches = content.match(/border-[a-z]+-(?:200|300)(?!\s*dark:border-)[^"'\s]*\s/g) || [];
      if (borderMatches.length > 0) {
        issues.push(`${file} has light borders without dark mode: ${[...new Set(borderMatches)].join(' ')}`);
      }
    }
  }
}

dirs.forEach(scanDir);
fs.writeFileSync('d:/Codean/Try_Manajemen Ruangan/scratch/audit_results.txt', issues.join('\n'));
console.log('Audit complete. Found ' + issues.length + ' issues.');
