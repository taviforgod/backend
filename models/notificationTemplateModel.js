import db from '../config/db.js';
export async function createTemplate({ church_id, name, channel, subject, body, description, config, created_by }) {
  const res = await db.query(
    `INSERT INTO notification_templates
     (church_id, name, channel, subject, body, description, config, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [church_id, name, channel, subject, body, description, JSON.stringify(config || {}), created_by]
  );
  return res.rows[0];
}
export async function getTemplate(id, church_id) {
  const res = await db.query(`SELECT * FROM notification_templates WHERE id = $1 AND church_id = $2`, [id, church_id]);
  return res.rows[0];
}
export async function updateTemplate(id, church_id, fields) {
  const cols = [], vals = [id, church_id], idx = 3;
  for (let k in fields) { cols.push(`${k} = $${idx}`); vals.push(fields[k]); idx++; }
  const res = await db.query(
    `UPDATE notification_templates SET ${cols.join(', ')} WHERE id = $1 AND church_id = $2 RETURNING *`, vals
  );
  return res.rows[0];
}
export async function deleteTemplate(id, church_id) {
  const res = await db.query(`DELETE FROM notification_templates WHERE id = $1 AND church_id = $2 RETURNING *`, [id, church_id]);
  return res.rows[0];
}
export async function listTemplates({ church_id, channel, page = 0, limit = 20 }) {
  let where = ['church_id = $1'], params = [church_id], idx = 2;
  if (channel) { where.push('channel = $' + idx); params.push(channel); idx++; }
  const whereSql = 'WHERE ' + where.join(' AND ');
  const totalRes = await db.query(`SELECT count(*) AS total FROM notification_templates ${whereSql}`, params);
  const total = Number(totalRes.rows[0]?.total || 0);
  params.push(limit, page * limit);
  const rows = await db.query(
    `SELECT * FROM notification_templates ${whereSql} ORDER BY updated_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );
  return { total, page, limit, templates: rows.rows };
}