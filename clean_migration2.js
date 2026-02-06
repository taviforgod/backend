import fs from 'fs';
const path = 'migrations/cell_ministry_enhancements.sql';
const backup = path + '.bak2';
const raw = fs.readFileSync(path,'utf8');
fs.writeFileSync(backup, raw, 'utf8');

// Remove ASCII control characters except tab(\t), LF(\n), CR(\r)
const cleaned = raw.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
fs.writeFileSync(path, cleaned, 'utf8');
console.log('Backup2 created at', backup);
console.log('Cleaning complete');
