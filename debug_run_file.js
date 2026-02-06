import fs from 'fs';
import db from './config/db.js';
const sql = fs.readFileSync('migrations/cell_ministry_enhancements.sql','utf8');
(async ()=>{
  try {
    await db.query(sql);
    console.log('File executed OK');
  } catch (err) {
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error position:', err.position);
    console.error('Error detail:', err.detail);
    if (err.position) {
      const pos = parseInt(err.position, 10);
      console.log('Context around position:');
      console.log(sql.slice(Math.max(0,pos-80), pos+80));
    }
  }
  process.exit(0);
})();