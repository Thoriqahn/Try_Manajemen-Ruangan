const fs = require('fs');
const path = require('path');

const files = [
  'UserManagement.tsx',
  'BuildingManagement.tsx',
  'ApiMonitoring.tsx',
  'AuditTrail.tsx',
  'ZoomManagement.tsx'
];

const basePath = 'd:/Codean/Try_Manajemen Ruangan/src/app/components/superadmin';

files.forEach(file => {
  const filePath = path.join(basePath, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Backgrounds
  content = content.replace(/bg-white(?!\/|\s*dark:)/g, 'bg-white dark:bg-slate-900/90 backdrop-blur-md');
  content = content.replace(/bg-gray-50(?!\/|\s*dark:)/g, 'bg-gray-50 dark:bg-slate-800/80');
  content = content.replace(/bg-slate-50(?!\/|\s*dark:)/g, 'bg-slate-50 dark:bg-slate-800/80');
  content = content.replace(/bg-gray-100(?!\/|\s*dark:)/g, 'bg-gray-100 dark:bg-slate-800');

  // Text Colors
  content = content.replace(/text-gray-900(?!\/|\s*dark:)/g, 'text-gray-900 dark:text-white');
  content = content.replace(/text-gray-800(?!\/|\s*dark:)/g, 'text-gray-800 dark:text-slate-100');
  content = content.replace(/text-gray-700(?!\/|\s*dark:)/g, 'text-gray-700 dark:text-slate-200');
  content = content.replace(/text-gray-600(?!\/|\s*dark:)/g, 'text-gray-600 dark:text-slate-300');
  content = content.replace(/text-gray-500(?!\/|\s*dark:)/g, 'text-gray-500 dark:text-slate-400');
  content = content.replace(/text-gray-400(?!\/|\s*dark:)/g, 'text-gray-400 dark:text-slate-500');

  // Borders
  content = content.replace(/border-gray-300(?!\/|\s*dark:)/g, 'border-gray-300 dark:border-slate-600');
  content = content.replace(/border-gray-200(?!\/|\s*dark:)/g, 'border-gray-200 dark:border-slate-700/50');
  content = content.replace(/border-gray-150(?!\/|\s*dark:)/g, 'border-gray-150 dark:border-slate-700/50');
  content = content.replace(/border-gray-100(?!\/|\s*dark:)/g, 'border-gray-100 dark:border-slate-800/50');
  content = content.replace(/divide-gray-100(?!\/|\s*dark:)/g, 'divide-gray-100 dark:divide-slate-800/50');
  content = content.replace(/divide-gray-50(?!\/|\s*dark:)/g, 'divide-gray-50 dark:divide-slate-800/50');

  // Accent Backgrounds (e.g., bg-blue-50)
  const accents = ['blue', 'purple', 'indigo', 'green', 'amber', 'red', 'teal'];
  accents.forEach(color => {
    content = content.replace(new RegExp(`bg-${color}-50(?!\\/|\\s*dark:)`, 'g'), `bg-${color}-50 dark:bg-${color}-900/20`);
    content = content.replace(new RegExp(`bg-${color}-100(?!\\/|\\s*dark:)`, 'g'), `bg-${color}-100 dark:bg-${color}-900/40`);
    content = content.replace(new RegExp(`border-${color}-100(?!\\/|\\s*dark:)`, 'g'), `border-${color}-100 dark:border-${color}-800/30`);
    content = content.replace(new RegExp(`border-${color}-200(?!\\/|\\s*dark:)`, 'g'), `border-${color}-200 dark:border-${color}-800/50`);
    content = content.replace(new RegExp(`text-${color}-800(?!\\/|\\s*dark:)`, 'g'), `text-${color}-800 dark:text-${color}-200`);
    content = content.replace(new RegExp(`text-${color}-700(?!\\/|\\s*dark:)`, 'g'), `text-${color}-700 dark:text-${color}-300`);
    content = content.replace(new RegExp(`text-${color}-600(?!\\/|\\s*dark:)`, 'g'), `text-${color}-600 dark:text-${color}-400`);
  });

  // Structural Pro Max Changes
  content = content.replace(/rounded-xl/g, 'rounded-2xl');
  content = content.replace(/rounded-lg/g, 'rounded-xl');
  content = content.replace(/shadow-sm/g, 'shadow-md shadow-black/5 dark:shadow-black/20');

  // Add transition-all to interactive elements
  content = content.replace(/className="([^"]*(hover:|active:|focus:)[^"]*)"/g, (match, classes) => {
    if (!classes.includes('transition-all') && !classes.includes('transition-colors')) {
      return `className="${classes} transition-all duration-300"`;
    }
    return match;
  });

  // Make general classNames transition-colors if they have dark:
  content = content.replace(/className="([^"]*)"/g, (match, classes) => {
    if (classes.includes('dark:') && !classes.includes('transition-')) {
      return `className="${classes} transition-colors duration-300"`;
    }
    return match;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Refactored ${file}`);
});
