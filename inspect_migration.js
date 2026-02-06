import fs from 'fs';
const text = fs.readFileSync('migrations/cell_ministry_enhancements.sql','utf8');
const lines = text.split('\n');
const start = 1388 - 1; // zero-index
for (let i = start; i < start + 40 && i < lines.length; i++) {
  const lnum = i + 1;
  const line = lines[i];
  const codes = Array.from(line).map(c => c.charCodeAt(0));
  console.log(`${lnum}: ${line}`);
  console.log('codes:', codes.slice(0,200));
}
