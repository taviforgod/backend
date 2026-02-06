import fs from 'fs';
const path = 'migrations/cell_ministry_enhancements.sql';
const backup = path + '.bak';
const raw = fs.readFileSync(path, 'utf8');
fs.writeFileSync(backup, raw, 'utf8');

// Remove control chars except tab(9), newline(10), carriage return(13)
const cleaned = Array.from(raw).filter(ch => {
  const code = ch.charCodeAt(0);
  return code === 9 || code === 10 || code === 13 || code >= 32;
}).join('');

fs.writeFileSync(path, cleaned, 'utf8');
console.log('Backup created at', backup);
console.log('File cleaned and overwritten at', path);
