const fs = require('fs');
const babel = require('@babel/core');

const code = fs.readFileSync('src/app/components/user/MyBookings.tsx', 'utf8');

try {
  babel.parseSync(code, {
    presets: ['@babel/preset-typescript', '@babel/preset-react'],
    filename: 'MyBookings.tsx',
  });
  console.log("No syntax errors found by Babel.");
} catch (err) {
  console.error("Syntax Error found!");
  console.error(err.message);
  console.error(err.codeFrame);
}
