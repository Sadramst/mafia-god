const fs = require('fs');
let code = fs.readFileSync('js/utils/i18n.js', 'utf8');
const lines = code.split('\n');

let fullCode = 'const Settings = { getLanguage() { return "both"; } }; const Language = { FARSI: "fa", ENGLISH: "en", BOTH: "both" };\n';
for (let line of lines) {
  if (line.match(/^import /)) line = '// ' + line;
  if (line.match(/^export const /)) line = line.replace('export const ', 'const ');
  if (line.match(/^export function /)) line = line.replace('export function ', 'function ');
  fullCode += line + '\n';
}
try {
  new Function(fullCode);
  console.log('FULL FILE: OK');
} catch(e) {
  console.log('FULL FILE ERROR:', e.message);
  // Find the line
  const flines = fullCode.split('\n');
  for (let i = 0; i < flines.length; i++) {
    if (flines[i].includes("'s ") && !flines[i].includes("\\'s ")) {
      console.log('Potential unescaped apostrophe at line ' + (i) + ': ' + flines[i].trim().substring(0, 80));
    }
  }
}
