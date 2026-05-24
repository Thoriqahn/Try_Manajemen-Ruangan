const fs = require('fs');
const path = require('path');

const dirs = [
  'd:/Codean/Try_Manajemen Ruangan/src/app/components/user',
  'd:/Codean/Try_Manajemen Ruangan/src/app/components/admin',
  'd:/Codean/Try_Manajemen Ruangan/src/app/components/auth',
  'd:/Codean/Try_Manajemen Ruangan/src/app/components/layout'
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Clean up known bad strings (specifically MyBookings.tsx)
  content = content.replace(/dark:bg-amber-50 dark:bg-amber-900\/200\/10/g, 'dark:bg-amber-500/20');
  content = content.replace(/dark:text-amber-200\/80/g, 'dark:text-amber-400');

  // Also catch other potential 200 opacity typos globally just in case
  content = content.replace(/\/200\/10/g, '/20');
  content = content.replace(/\/200/g, '/20');

  // 2. Grayscales / Neutrals
  // bg-slate-50 / bg-gray-50
  content = content.replace(/bg-gray-50(?![\/\-\w]|\s*dark:bg-)/g, 'bg-gray-50 dark:bg-slate-800');
  content = content.replace(/bg-slate-50(?![\/\-\w]|\s*dark:bg-)/g, 'bg-slate-50 dark:bg-slate-800');
  
  // bg-gray-100 / bg-slate-100
  content = content.replace(/bg-gray-100(?![\/\-\w]|\s*dark:bg-)/g, 'bg-gray-100 dark:bg-slate-800');
  content = content.replace(/bg-slate-100(?![\/\-\w]|\s*dark:bg-)/g, 'bg-slate-100 dark:bg-slate-800');

  // bg-white
  content = content.replace(/bg-white(?![\/\-\w]|\s*dark:bg-)/g, 'bg-white dark:bg-slate-900');

  // text-gray-900 / 800 / 700 / 600 / 500 / 400
  content = content.replace(/text-gray-900(?![\/\-\w]|\s*dark:text-)/g, 'text-gray-900 dark:text-white');
  content = content.replace(/text-gray-800(?![\/\-\w]|\s*dark:text-)/g, 'text-gray-800 dark:text-slate-100');
  content = content.replace(/text-slate-800(?![\/\-\w]|\s*dark:text-)/g, 'text-slate-800 dark:text-slate-100');
  content = content.replace(/text-gray-700(?![\/\-\w]|\s*dark:text-)/g, 'text-gray-700 dark:text-slate-200');
  content = content.replace(/text-slate-700(?![\/\-\w]|\s*dark:text-)/g, 'text-slate-700 dark:text-slate-200');
  content = content.replace(/text-gray-600(?![\/\-\w]|\s*dark:text-)/g, 'text-gray-600 dark:text-slate-300');
  content = content.replace(/text-gray-500(?![\/\-\w]|\s*dark:text-)/g, 'text-gray-500 dark:text-slate-400');
  content = content.replace(/text-gray-400(?![\/\-\w]|\s*dark:text-)/g, 'text-gray-400 dark:text-slate-500');

  // borders
  content = content.replace(/border-gray-200(?![\/\-\w]|\s*dark:border-)/g, 'border-gray-200 dark:border-slate-700/50');
  content = content.replace(/border-slate-200(?![\/\-\w]|\s*dark:border-)/g, 'border-slate-200 dark:border-slate-700/50');
  content = content.replace(/border-gray-300(?![\/\-\w]|\s*dark:border-)/g, 'border-gray-300 dark:border-slate-600');
  content = content.replace(/border-slate-300(?![\/\-\w]|\s*dark:border-)/g, 'border-slate-300 dark:border-slate-600');
  
  // divide
  content = content.replace(/divide-gray-100(?![\/\-\w]|\s*dark:divide-)/g, 'divide-gray-100 dark:divide-slate-800/50');
  content = content.replace(/divide-gray-50(?![\/\-\w]|\s*dark:divide-)/g, 'divide-gray-50 dark:divide-slate-800/50');

  // 3. Colored Accents
  const colors = ['blue', 'purple', 'indigo', 'emerald', 'green', 'amber', 'rose', 'red', 'sky', 'teal', 'orange'];
  
  colors.forEach(color => {
    // 50 opacity/bg missing dark
    content = content.replace(new RegExp(`bg-${color}-50(?![\\/\\-\\w]|\\s*dark:bg-)`, 'g'), `bg-${color}-50 dark:bg-${color}-500/10`);
    
    // 100 opacity/bg missing dark
    content = content.replace(new RegExp(`bg-${color}-100(?![\\/\\-\\w]|\\s*dark:bg-)`, 'g'), `bg-${color}-100 dark:bg-${color}-500/20`);
    
    // 500/10, 500/20, 500/80 missing dark (usually these are already dark or light overlays, we'll ensure they are visible)
    content = content.replace(new RegExp(`bg-${color}-500\\/10(?![\\/\\-\\w]|\\s*dark:bg-)`, 'g'), `bg-${color}-500/10 dark:bg-${color}-500/20`);
    content = content.replace(new RegExp(`bg-${color}-500\\/20(?![\\/\\-\\w]|\\s*dark:bg-)`, 'g'), `bg-${color}-500/20 dark:bg-${color}-500/30`);

    // Solid 500 backgrounds
    content = content.replace(new RegExp(`bg-${color}-500(?![\\/\\-\\w]|\\s*dark:bg-)`, 'g'), `bg-${color}-500 dark:bg-${color}-600`);
    
    // Borders
    content = content.replace(new RegExp(`border-${color}-200(?![\\/\\-\\w]|\\s*dark:border-)`, 'g'), `border-${color}-200 dark:border-${color}-500/30`);
    content = content.replace(new RegExp(`border-${color}-300(?![\\/\\-\\w]|\\s*dark:border-)`, 'g'), `border-${color}-300 dark:border-${color}-500/40`);

    // Text missing dark
    content = content.replace(new RegExp(`text-${color}-800(?![\\/\\-\\w]|\\s*dark:text-)`, 'g'), `text-${color}-800 dark:text-${color}-300`);
    content = content.replace(new RegExp(`text-${color}-700(?![\\/\\-\\w]|\\s*dark:text-)`, 'g'), `text-${color}-700 dark:text-${color}-400`);
    content = content.replace(new RegExp(`text-${color}-600(?![\\/\\-\\w]|\\s*dark:text-)`, 'g'), `text-${color}-600 dark:text-${color}-400`);
    content = content.replace(new RegExp(`text-${color}-500(?![\\/\\-\\w]|\\s*dark:text-)`, 'g'), `text-${color}-500 dark:text-${color}-400`);
  });

  // Fix transitions where dark: is used but transition-colors is not present
  content = content.replace(/className="([^"]*)"/g, (match, classes) => {
    if (classes.includes('dark:') && !classes.includes('transition-')) {
      return `className="${classes} transition-colors duration-300"`;
    }
    return match;
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
console.log(`Refactored ${modifiedCount} files.`);
