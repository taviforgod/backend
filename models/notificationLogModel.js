import db from '../config/db.js';
export async function logSend({
  church_id, notification_id, channel, status = 'sent',
  sender_user_id, recipient_user_id, recipient_member_id,
  response, error
}) {
  const res = await db.query(
    `INSERT INTO notification_logs
     (church_id, notification_id, channel, status, sender_user_id, recipient_user_id, recipient_member_id, response, error)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [church_id, notification_id, channel, status, sender_user_id, recipient_user_id, recipient_member_id, JSON.stringify(response), error]
  );
  return res.rows[0];
}
export async function listLogs({ church_id, channel, status, page = 0, limit = 20 }) {
  let where = ['church_id = $1'], params = [church_id], idx = 2;
  if (channel) { where.push('channel = $' + idx); params.push(channel); idx++; }
  if (status) { where.push('status = $' + idx); params.push(status); idx++; }
  const whereSql = 'WHERE ' + where.join(' AND ');
  const totalRes = await db.query(`SELECT count(*) AS total FROM notification_logs ${whereSql}`, params);
  const total = Number(totalRes.rows[0]?.total || 0);
  params.push(limit, page * limit);
  const rows = await db.query(
    `SELECT * FROM notification_logs ${whereSql} ORDER BY sent_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );
  return { total, page, limit, logs: rows.rows };
}
export async function getLog(id, church_id) {
  const res = await db.query(`SELECT * FROM notification_logs WHERE id = $1 AND church_id = $2`, [id, church_id]);
  return res.rows[0];
}
export async function deleteLog(id, church_id) {
  const res = await db.query(`DELETE FROM notification_logs WHERE id = $1 AND church_id = $2 RETURNING *`, [id, church_id]);
  return res.rows[0];
}