const fs = require('fs');
const path = require('path');

const dirs = [
  'd:/Codean/Try_Manajemen Ruangan/src/app/components/user',
  'd:/Codean/Try_Manajemen Ruangan/src/app/components/admin',
  'd:/Codean/Try_Manajemen Ruangan/src/app/components/superadmin',
  'd:/Codean/Try_Manajemen Ruangan/src/app/components/auth',
  'd:/Codean/Try_Manajemen Ruangan/src/app/components/layout'
];

function deduplicateClasses(classString) {
  const classes = classString.split(/\s+/);
  const resultClasses = [];
  
  const darkBgMap = new Map();
  const darkTextMap = new Map();
  
  // First pass: collect unique classes and record last seen dark:bg- and dark:text-
  classes.forEach(c => {
    if (!c) return;
    
    if (c.startsWith('dark:bg-') && !c.includes('hover:') && !c.includes('focus:')) {
      darkBgMap.set('dark:bg', c); // Keep the last one encountered
    } else if (c.startsWith('dark:text-') && !c.includes('hover:') && !c.includes('focus:')) {
      darkTextMap.set('dark:text', c);
    } else if (c.startsWith('dark:border-') && !c.includes('hover:') && !c.includes('focus:')) {
      darkTextMap.set('dark:border', c);
    } else {
      // Add regular classes only if not already in result to avoid basic duplicates
      if (!resultClasses.includes(c)) {
        resultClasses.push(c);
      }
    }
  });
  
  // Second pass: add the winning dark classes back
  if (darkBgMap.has('dark:bg')) resultClasses.push(darkBgMap.get('dark:bg'));
  if (darkTextMap.has('dark:text')) resultClasses.push(darkTextMap.get('dark:text'));
  if (darkTextMap.has('dark:border')) resultClasses.push(darkTextMap.get('dark:border'));
  
  return resultClasses.join(' ');
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Remove hidden UX
  content = content.replace(/\s+opacity-0\s+/g, ' ');
  content = content.replace(/\s+sm:opacity-0\s+/g, ' ');
  content = content.replace(/\s+md:opacity-0\s+/g, ' ');
  content = content.replace(/\s+group-hover:opacity-100\s+/g, ' ');

  // 2. Deduplicate tailwind inside className="..." and className={`...`}
  content = content.replace(/className="([^"]+)"/g, (match, classes) => {
    return `className="${deduplicateClasses(classes)}"`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

let modifiedCount = 0;

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      if (processFile(fullPath)) {
        modifiedCount++;
      }
    }
  }
}

dirs.forEach(scanDir);
console.log(`Cleaned up ${modifiedCount} files.`);
