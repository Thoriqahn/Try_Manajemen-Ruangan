const fs = require('fs');
const path = require('path');

const dirs = [
  'd:/Codean/Try_Manajemen Ruangan/src/app/components/user',
  'd:/Codean/Try_Manajemen Ruangan/src/app/components/admin',
  'd:/Codean/Try_Manajemen Ruangan/src/app/components/superadmin',
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
      
      // Check for hidden UX (opacity-0 group-hover:opacity-100)
      if (content.includes('opacity-0') && content.includes('group-hover:opacity-100')) {
        issues.push(`[Hidden UX]: ${file} contains opacity-0 group-hover:opacity-100`);
      }

      // Check for duplicated dark classes
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        // e.g. dark:bg-emerald-500/10 dark:bg-emerald-500/20
        const darkBgs = line.match(/dark:bg-[a-z0-9\/-]+/g);
        if (darkBgs && darkBgs.length > 1) {
          // If they are literally in the same className string (very basic check)
          const classNamesMatch = line.match(/className="([^"]+)"/);
          if (classNamesMatch) {
            const classes = classNamesMatch[1].split(/\s+/);
            const darkBgClasses = classes.filter(c => c.startsWith('dark:bg-') && !c.includes('hover:') && !c.includes('focus:'));
            if (darkBgClasses.length > 1) {
              issues.push(`[Duplicate CSS]: ${file}:${i+1} has multiple dark:bg- classes: ${darkBgClasses.join(', ')}`);
            }
          }
        }
      });
    }
  }
}

dirs.forEach(scanDir);
fs.writeFileSync('d:/Codean/Try_Manajemen Ruangan/scratch/audit_ux.txt', issues.join('\n'));
console.log('Audit complete. Found ' + issues.length + ' issues.');
