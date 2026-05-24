const fs = require('fs');

function processFile(path) {
  let content = fs.readFileSync(path, 'utf8');

  // Replace text colors that might still be dark
  content = content.replace(/text-slate-800(?!\s*dark:)/g, 'text-slate-800 dark:text-slate-100');
  content = content.replace(/text-slate-900(?!\s*dark:)/g, 'text-slate-900 dark:text-slate-50');
  content = content.replace(/text-slate-700(?!\s*dark:)/g, 'text-slate-700 dark:text-slate-200');
  
  content = content.replace(/text-blue-900(?!\s*dark:)/g, 'text-blue-900 dark:text-blue-100');
  content = content.replace(/text-blue-800(?!\s*dark:)/g, 'text-blue-800 dark:text-blue-200');
  content = content.replace(/text-blue-700(?!\s*dark:)/g, 'text-blue-700 dark:text-blue-300');
  
  content = content.replace(/text-purple-900(?!\s*dark:)/g, 'text-purple-900 dark:text-purple-100');
  content = content.replace(/text-teal-900(?!\s*dark:)/g, 'text-teal-900 dark:text-teal-100');

  // Missing backgrounds for modal borders, empty states, etc.
  content = content.replace(/bg-blue-50(?!\/| dark:)/g, 'bg-blue-50 dark:bg-blue-900/20');
  content = content.replace(/bg-amber-50(?!\/| dark:)/g, 'bg-amber-50 dark:bg-amber-900/20');
  content = content.replace(/bg-green-50(?!\/| dark:)/g, 'bg-green-50 dark:bg-green-900/20');
  content = content.replace(/bg-purple-50(?!\/| dark:)/g, 'bg-purple-50 dark:bg-purple-900/20');
  content = content.replace(/bg-teal-50(?!\/| dark:)/g, 'bg-teal-50 dark:bg-teal-900/20');

  // Fix borders
  content = content.replace(/border-blue-200(?!\/| dark:)/g, 'border-blue-200 dark:border-blue-800/50');
  content = content.replace(/border-amber-200(?!\/| dark:)/g, 'border-amber-200 dark:border-amber-800/50');
  content = content.replace(/border-green-200(?!\/| dark:)/g, 'border-green-200 dark:border-green-800/50');
  content = content.replace(/border-purple-200(?!\/| dark:)/g, 'border-purple-200 dark:border-purple-800/50');
  content = content.replace(/border-teal-200(?!\/| dark:)/g, 'border-teal-200 dark:border-teal-800/50');
  content = content.replace(/border-gray-300(?!\/| dark:)/g, 'border-gray-300 dark:border-slate-600');

  // Any other text colors
  content = content.replace(/text-teal-950(?!\s*dark:)/g, 'text-teal-950 dark:text-teal-100');
  content = content.replace(/text-purple-950(?!\s*dark:)/g, 'text-purple-950 dark:text-purple-100');

  // Add transition-colors where missing
  content = content.replace(/className="([^"]*)"/g, (match, classes) => {
    if (!classes.includes('transition-colors') && !classes.includes('transition-all') && classes.includes('dark:')) {
      return `className="${classes} transition-colors"`;
    }
    return match;
  });

  fs.writeFileSync(path, content, 'utf8');
}

['d:/Codean/Try_Manajemen Ruangan/src/app/components/user/CalendarView.tsx',
 'd:/Codean/Try_Manajemen Ruangan/src/app/components/user/RoomDetail.tsx',
 'd:/Codean/Try_Manajemen Ruangan/src/app/components/user/MyBookings.tsx',
 'd:/Codean/Try_Manajemen Ruangan/src/app/components/user/RoomList.tsx'].forEach(file => {
  if (fs.existsSync(file)) {
    processFile(file);
    console.log('Processed', file);
  }
});
