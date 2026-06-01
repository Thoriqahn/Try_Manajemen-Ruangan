const fs = require('fs');

const code = fs.readFileSync('d:\\Codean\\Try_Manajemen Ruangan\\src\\app\\components\\user\\MyBookings.tsx', 'utf8');
let openBraces = 0, openParens = 0, openBrackets = 0;
let lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (char === '(') openParens++;
    if (char === ')') openParens--;
    if (char === '[') openBrackets++;
    if (char === ']') openBrackets--;
  }
}
console.log("Final balance: Braces:", openBraces, "Parens:", openParens, "Brackets:", openBrackets);
