import db from './config/db.js';

(async ()=>{
  try {
    const r = await db.query("select column_name, data_type from information_schema.columns where table_name='notifications' order by ordinal_position");
    console.log(JSON.stringify(r.rows, null, 2));
  } catch (err) {
    console.error('ERR', err.message || err);
    process.exit(1);
  }
  process.exit(0);
})();