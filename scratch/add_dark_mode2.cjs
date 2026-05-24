const fs = require('fs');

function processFile(path) {
  let content = fs.readFileSync(path, 'utf8');

  // Replace bg-white with bg-white dark:bg-slate-900
  content = content.replace(/bg-white(?!\/| dark:)/g, 'bg-white dark:bg-slate-900');
  
  // Replace bg-gray-50 or bg-slate-50
  content = content.replace(/bg-gray-50(?!\/| dark:)/g, 'bg-gray-50 dark:bg-slate-800');
  content = content.replace(/bg-slate-50(?!\/| dark:)/g, 'bg-slate-50 dark:bg-slate-950');

  // Replace border colors
  content = content.replace(/border-gray-200/g, 'border-gray-200 dark:border-slate-700');
  content = content.replace(/border-gray-100/g, 'border-gray-100 dark:border-slate-800');

  // Replace text colors
  content = content.replace(/text-gray-800/g, 'text-gray-800 dark:text-slate-100');
  content = content.replace(/text-gray-700/g, 'text-gray-700 dark:text-slate-200');
  content = content.replace(/text-gray-600/g, 'text-gray-600 dark:text-slate-300');
  content = content.replace(/text-gray-500/g, 'text-gray-500 dark:text-slate-400');
  content = content.replace(/text-gray-400/g, 'text-gray-400 dark:text-slate-500');

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
