import fs from 'fs';
import db from './config/db.js';
const text = fs.readFileSync('migrations/cell_ministry_enhancements.sql','utf8');

// Split statements but avoid splitting inside dollar-quoted blocks (e.g., DO $$ ... $$;)
const DQ_PLACEHOLDER = '__DQ_SEMI__';
const safeText = text.replace(/(\$[A-Za-z0-9_]*\$)[\s\S]*?\1/g, (match) => match.replace(/;/g, DQ_PLACEHOLDER));
const stmts = safeText.split(';').map(s => s.replace(new RegExp(DQ_PLACEHOLDER,'g'), ';'));

(async ()=>{
  for (let i=0;i<stmts.length;i++){
    const s = stmts[i].trim();
    if (!s) continue;
    const toRun = s + ';';
    try {
      await db.query(toRun);
      console.log(`OK stmt ${i+1}`);
    } catch (err) {
      console.error(`ERR at stmt ${i+1}:`, err.message);
      // show snippet
      console.log('Snippet:', s.slice(0,200).replace(/\n/g,' '));
      process.exit(0);
    }
  }
  console.log('All statements executed without syntax error');
  process.exit(0);
})();
