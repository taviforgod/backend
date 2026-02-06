import fs from 'fs';
import db from './config/db.js';

const text = fs.readFileSync('migrations/cell_ministry_enhancements.sql', 'utf8');
const lines = text.split('\n');

async function findError() {
  for (let i = 50; i <= lines.length; i += 50) {
    const chunk = lines.slice(0, i).join('\n');
    try {
      await db.query(chunk);
      console.log(`OK up to line ${i}`);
    } catch (err) {
      console.error(`ERROR at or before line ${i}:`, err.message);
      // Narrow down
      let lo = Math.max(1, i - 49);
      let hi = i;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        const s = lines.slice(0, mid).join('\n');
        try {
          await db.query(s);
          lo = mid + 1;
        } catch (e) {
          hi = mid;
        }
      }
      console.log('First bad line approximately:', lo);
      // Print context
      const start = Math.max(0, lo - 10);
      const end = Math.min(lines.length, lo + 10);
      console.log('Context:');
      for (let j = start; j < end; j++) {
        console.log(`${j+1}: ${lines[j]}`);
      }
      process.exit(0);
    }
  }
  console.log('No error found in chunks');
  process.exit(0);
}

findError();
