import db from './config/db.js';

(async ()=>{
  try {
    const r = await db.query("select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid = 'notifications'::regclass");
    console.log(JSON.stringify(r.rows, null, 2));
  } catch (err) {
    console.error('ERR', err.message || err);
  }
  process.exit(0);
})();