import db from './config/db.js';

(async ()=>{
  try {
    const r = await db.query("select id, first_name, surname from members where id=1");
    console.log(JSON.stringify(r.rows, null, 2));
  } catch (err) {
    console.error('ERR', err.message || err);
    process.exit(1);
  }
  process.exit(0);
})();