import fs from 'fs';
import db from './config/db.js';
const text = fs.readFileSync('migrations/cell_ministry_enhancements.sql','utf8');
const start = text.indexOf('CREATE TABLE IF NOT EXISTS cell_visitor_journeys');
if (start === -1) { console.error('start not found'); process.exit(1); }
// Find matching closing ');' after start
const frag = text.slice(start);
const endIndex = frag.indexOf(');');
if (endIndex === -1) { console.error('end not found'); process.exit(1); }
const sql = frag.slice(0, endIndex+2);
console.log('fragment to run (first 200 chars):', sql.slice(0,200));
(async ()=>{
  try {
    await db.query(sql);
    console.log('Fragment OK');
  } catch (err) {
    console.error('Fragment ERR:', err.message);
  }
  process.exit(0);
})();
