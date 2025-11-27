import db from '../config/db.js';
export async function createPost({ church_id, member_id, user_id, title, content, starred = false, metadata, link }) {
  const res = await db.query(
    `INSERT INTO message_board_posts
     (church_id, member_id, user_id, title, content, starred, metadata, link)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [church_id, member_id, user_id, title, content, starred, JSON.stringify(metadata || {}), link]
  );
  return res.rows[0];
}
export async function getPost(id, church_id) {
  const res = await db.query(`SELECT * FROM message_board_posts WHERE id = $1 AND church_id = $2`, [id, church_id]);
  return res.rows[0];
}
export async function updatePost(id, church_id, fields) {
  const cols = [], vals = [id, church_id], idx = 3;
  for (let k in fields) { cols.push(`${k} = $${idx}`); vals.push(fields[k]); idx++; }
  const res = await db.query(
    `UPDATE message_board_posts SET ${cols.join(', ')} WHERE id = $1 AND church_id = $2 RETURNING *`, vals
  );
  return res.rows[0];
}
export async function deletePost(id, church_id) {
  const res = await db.query(`DELETE FROM message_board_posts WHERE id = $1 AND church_id = $2 RETURNING *`, [id, church_id]);
  return res.rows[0];
}
export async function listPosts({ church_id, page = 0, limit = 20, q }) {
  let where = ['church_id = $1'], params = [church_id], idx = 2;
  if (q) { where.push('(title ILIKE $' + idx + ' OR content ILIKE $' + idx + ')'); params.push('%' + q + '%'); idx++; }
  const whereSql = 'WHERE ' + where.join(' AND ');
  const totalRes = await db.query(`SELECT count(*) AS total FROM message_board_posts ${whereSql}`, params);
  const total = Number(totalRes.rows[0]?.total || 0);
  params.push(limit, page * limit);
  const rows = await db.query(
    `SELECT * FROM message_board_posts ${whereSql} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );
  return { total, page, limit, posts: rows.rows };
}