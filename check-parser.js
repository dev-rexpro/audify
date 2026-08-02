const ts = require('typescript');
const fs = require('fs');

const code = fs.readFileSync('src/components/PlaylistPanel.tsx', 'utf8');
const sourceFile = ts.createSourceFile('test.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const diagnostics = ts.getParsingDiagnostics(sourceFile);
console.log('Parsing diagnostics:');
diagnostics.forEach(d => {
  const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
  const line = ts.getLineAndCharacterOfPosition(sourceFile, d.start || 0).line + 1;
  const col = ts.getLineAndCharacterOfPosition(sourceFile, d.start || 0).character + 1;
  console.log(`  Line ${line}, Col ${col}: ${message}`);
});

// Also check for syntactic errors
const syntacticDiagnostics = ts.getSyntacticDiagnostics(sourceFile);
console.log('\nSyntactic diagnostics:');
syntacticDiagnostics.forEach(d => {
  const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
  const pos = d.start || 0;
  const line = ts.getLineAndCharacterOfPosition(sourceFile, pos).line + 1;
  const col = ts.getLineAndCharacterOfPosition(sourceFile, pos).character + 1;
  console.log(`  Line ${line}, Col ${col}: ${message}`);
});
