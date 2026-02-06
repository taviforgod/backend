import db from '../config/db.js';

async function run() {
  try {
    const memberId = process.argv[2] || 14;
    const res = await db.query(`SELECT * FROM inactive_member_exits WHERE member_id = $1 ORDER BY created_at DESC LIMIT 10`, [memberId]);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Query failed', err);
    process.exit(1);
  }
}

run();
