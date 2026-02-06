import db from '../config/db.js';

export async function createNotification({ church_id, member_id, user_id, title, message, channel = 'in_app', metadata = {}, link }) {
  const res = await db.query(
    `INSERT INTO in_app_notifications
     (church_id, member_id, user_id, title, message, channel, metadata, link)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [church_id, member_id, user_id, title, message, channel, JSON.stringify(metadata), link]
  );
  return res.rows[0];
}

export async function getNotification(id, church_id) {
  const res = await db.query(`
    SELECT 
      in_app_notifications.*,
      COALESCE(users.name, CONCAT(members.first_name, ' ', members.surname)) as sender_name,
      users.email as user_email,
      members.first_name as member_first_name,
      members.surname as member_surname
    FROM in_app_notifications 
    LEFT JOIN users ON in_app_notifications.user_id = users.id
    LEFT JOIN members ON in_app_notifications.member_id = members.id
    WHERE in_app_notifications.id = $1 AND in_app_notifications.church_id = $2
  `, [id, church_id]);
  return res.rows[0];
}

export async function updateNotification(id, church_id, fields) {
  const cols = [], vals = [id, church_id], idx = 3;
  for (let k in fields) { cols.push(`${k} = $${idx}`); vals.push(fields[k]); idx++; }
  const res = await db.query(
    `UPDATE in_app_notifications SET ${cols.join(', ')} WHERE id = $1 AND church_id = $2 RETURNING *`,
    vals
  );
  return res.rows[0];
}

export async function deleteNotification(id, church_id) {
  const res = await db.query(`DELETE FROM in_app_notifications WHERE id = $1 AND church_id = $2 RETURNING *`, [id, church_id]);
  return res.rows[0];
}

export async function listNotifications({ church_id, user_id, member_id, page = 0, limit = 20, status, channel, q }) {
  const wheres = ['in_app_notifications.church_id = $1'];
  const params = [church_id];
  let idx = 2;
  if (user_id || member_id) {
    wheres.push('(in_app_notifications.user_id = $' + idx + ' OR in_app_notifications.member_id = $' + idx + ')');
    params.push(user_id || member_id);
    idx++;
  }
  if (status === 'read') wheres.push('in_app_notifications.read = TRUE');
  if (status === 'unread') wheres.push('in_app_notifications.read = FALSE');
  if (channel) { wheres.push('in_app_notifications.channel = $' + idx); params.push(channel); idx++; }
  if (q) { wheres.push('(in_app_notifications.title ILIKE $' + idx + ' OR in_app_notifications.message ILIKE $' + idx + ')'); params.push('%' + q + '%'); idx++; }
  const where = 'WHERE ' + wheres.join(' AND ');
  
  const totalRes = await db.query(`
    SELECT count(*) AS total 
    FROM in_app_notifications 
    ${where}
  `, params);
  const total = Number(totalRes.rows[0]?.total || 0);
  
  params.push(limit, page * limit);
  const rowsRes = await db.query(`
    SELECT 
      in_app_notifications.*,
      COALESCE(users.name, CONCAT(members.first_name, ' ', members.surname)) as sender_name,
      users.email as user_email,
      members.first_name as member_first_name,
      members.surname as member_surname
    FROM in_app_notifications 
    LEFT JOIN users ON in_app_notifications.user_id = users.id
    LEFT JOIN members ON in_app_notifications.member_id = members.id
    ${where} 
    ORDER BY in_app_notifications.created_at DESC 
    LIMIT $${idx++} OFFSET $${idx++}
  `, params);
  
  return { total, page, limit, notifications: rowsRes.rows };
}

export async function markRead(id, church_id) {
  const res = await db.query(
    `UPDATE in_app_notifications SET read = TRUE, read_at = NOW() WHERE id = $1 AND church_id = $2 RETURNING *`,
    [id, church_id]
  );
  return res.rows[0];
}

export async function markAllRead(church_id, user_id, member_id) {
  const res = await db.query(
    `UPDATE in_app_notifications SET read = TRUE, read_at = NOW()
     WHERE church_id = $1 AND (user_id = $2 OR member_id = $3) AND read = FALSE RETURNING id`,
    [church_id, user_id, member_id]
  );
  return res.rows.map(r => r.id);
}


export const createInAppNotification = createNotification;