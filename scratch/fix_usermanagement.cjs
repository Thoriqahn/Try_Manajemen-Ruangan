const fs = require('fs');
const path = require('path');

const filePath = 'd:/Codean/Try_Manajemen Ruangan/src/app/components/superadmin/UserManagement.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix bg-gray-50/50 missing dark mode
content = content.replace(/bg-gray-50\/50(?!\s*dark:)/g, 'bg-gray-50/50 dark:bg-slate-800/50');

// Fix bg-gray-100/50 missing dark mode
content = content.replace(/bg-gray-100\/50(?!\s*dark:)/g, 'bg-gray-100/50 dark:bg-slate-700/50');

// Fix hover:bg-... dark:bg-... which should be dark:hover:bg-...
content = content.replace(/hover:bg-([a-z]+-[0-9]+)\s+dark:bg-([a-z]+-[0-9]+(?:\/[0-9]+)?)/g, 'hover:bg-$1 dark:hover:bg-$2');

// Fix text-[#1E3A5F] in code blocks missing dark mode
content = content.replace(/text-\[\#1E3A5F\](?!\s*dark:)/g, 'text-[#1E3A5F] dark:text-blue-400');

// Fix floor label contrast (slate-500 is too dark, make it slate-400)
content = content.replace(/dark:text-slate-500 font-bold uppercase/g, 'dark:text-slate-400 font-bold uppercase');

// Fix empty states that have bg-gray-50/50 dark:bg-slate-800/50 (this is fine now)

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed UserManagement.tsx');
