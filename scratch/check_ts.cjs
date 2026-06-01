const ts = require('typescript');
const fs = require('fs');

const code = fs.readFileSync('d:\\Codean\\Try_Manajemen Ruangan\\src\\app\\components\\user\\MyBookings.tsx', 'utf8');

const sourceFile = ts.createSourceFile('MyBookings.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function getDiagnostics() {
  // We can just rely on tsc if we want semantic checking, but syntactic errors can be found by looking at parseErrors
  if (sourceFile.parseDiagnostics.length > 0) {
    sourceFile.parseDiagnostics.forEach(d => {
      const pos = sourceFile.getLineAndCharacterOfPosition(d.start);
      console.log(`Error at line ${pos.line + 1}:`, typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText);
    });
  } else {
    console.log("No syntax errors found by TypeScript parser!");
  }
}

getDiagnostics();
