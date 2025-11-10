import db from '../config/db.js';
export async function createJob({ church_id, job_type, title, message, schedule, config, created_by }) {
  const res = await db.query(
    `INSERT INTO notification_jobs
     (church_id, job_type, title, message, schedule, config, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [church_id, job_type, title, message, schedule, JSON.stringify(config), created_by]
  );
  return res.rows[0];
}
export async function getJob(id, church_id) {
  const res = await db.query(`SELECT * FROM notification_jobs WHERE id = $1 AND church_id = $2`, [id, church_id]);
  return res.rows[0];
}
export async function updateJob(id, church_id, fields) {
  const cols = [], vals = [id, church_id], idx = 3;
  for (let k in fields) { cols.push(`${k} = $${idx}`); vals.push(fields[k]); idx++; }
  const res = await db.query(
    `UPDATE notification_jobs SET ${cols.join(', ')} WHERE id = $1 AND church_id = $2 RETURNING *`, vals
  );
  return res.rows[0];
}
export async function deleteJob(id, church_id) {
  const res = await db.query(`DELETE FROM notification_jobs WHERE id = $1 AND church_id = $2 RETURNING *`, [id, church_id]);
  return res.rows[0];
}
export async function listJobs({ church_id, job_type, status, page = 0, limit = 20 }) {
  let where = ['church_id = $1'], params = [church_id], idx = 2;
  if (job_type) { where.push('job_type = $' + idx); params.push(job_type); idx++; }
  if (status) { where.push('status = $' + idx); params.push(status); idx++; }
  const whereSql = 'WHERE ' + where.join(' AND ');
  const totalRes = await db.query(`SELECT count(*) AS total FROM notification_jobs ${whereSql}`, params);
  const total = Number(totalRes.rows[0]?.total || 0);
  params.push(limit, page * limit);
  const rows = await db.query(
    `SELECT * FROM notification_jobs ${whereSql} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );
  return { total, page, limit, jobs: rows.rows };
}