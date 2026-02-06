import db from './config/db.js';
(async ()=>{
  const r = await db.query("SELECT to_regclass('public.departments') AS dep, to_regclass('public.member_departments') AS mdep, to_regclass('public.member_relationships') AS mrel");
  console.log(r.rows[0]);
  process.exit(0);
})();