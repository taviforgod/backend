import db from '../config/db.js';
import { getIO } from '../socket/index.js';

export async function createNotification({ church_id, user_id=null, member_id=null, title, message, channel='in_app', metadata = {} }, { force=false } = {}) {
  console.log('Creating notification:', { church_id, user_id, member_id, title, message, channel, metadata }); // Add this line
  if (!church_id || !title || !message) {
    const e = new Error('church_id, title and message are required');
    e.code = 'INVALID_PAYLOAD';
    throw e;
  }

  const res = await db.query(
    `INSERT INTO in_app_notifications (church_id, user_id, member_id, title, message, channel, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [church_id, user_id, member_id, title, message, channel, metadata]
  );
  const row = res.rows[0];

  try {
    const io = getIO();
    if (user_id) io.to(`user:${user_id}`).emit('notification', row);
    else if (member_id) io.to(`user:${member_id}`).emit('notification', row);
    else io.to(`church:${church_id}`).emit('notification', row);
  } catch (err) { /* ignore */ }

  return row;
}

export async function listNotifications({ church_id, user_id=null, member_id=null, page=0, limit=20, status=null, channel=null, q=null, allowedChannels=null }) {
  const where = ['church_id = $1'];
  const params = [church_id];
  let idx = 2;

  if (user_id || member_id) {
    where.push(`(user_id = $${idx} OR member_id = $${idx} OR member_id IS NULL)`);
    params.push(user_id || member_id);
    idx++;
  }

  if (status === 'read') where.push('read = true');
  else if (status === 'unread') where.push('read = false');

  if (channel) { where.push(`channel = $${idx}`); params.push(channel); idx++; }

  if (allowedChannels && allowedChannels.length) {
    const placeholders = allowedChannels.map((_, i) => `$${idx + i}`);
    where.push(`channel IN (${placeholders.join(',')})`);
    allowedChannels.forEach(c => params.push(c)); idx += allowedChannels.length;
  }

  if (q) { where.push(`(title ILIKE $${idx} OR message ILIKE $${idx})`); params.push(`%${q}%`); idx++; }

  const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

  const totalRes = await db.query(`SELECT count(*) as total FROM in_app_notifications ${whereSql}`, params);
  const total = Number(totalRes.rows[0]?.total || 0);

  params.push(limit, page * limit);
  const rows = await db.query(
    `SELECT * FROM in_app_notifications ${whereSql} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    params
  );

  return { total, page, limit, notifications: rows.rows };
}

export async function getNotificationById({ id, church_id }) {
  const res = await db.query(`SELECT * FROM in_app_notifications WHERE id = $1 AND church_id = $2`, [id, church_id]);
  return res.rows[0];
}

export async function markNotificationRead({ id, church_id, user_id=null, member_id=null }) {
  const res = await db.query(
    `UPDATE in_app_notifications SET read = true, read_at = now() WHERE id = $1 AND church_id = $2 RETURNING *`,
    [id, church_id]
  );
  const row = res.rows[0];

  try {
    const io = getIO();
    if (row) {
      if (user_id) io.to(`user:${user_id}`).emit('notification_read', { id: row.id });
      else if (row.member_id) io.to(`user:${row.member_id}`).emit('notification_read', { id: row.id });
      io.to(`church:${row.church_id}`).emit('notification_read', { id: row.id });
    }
  } catch (err) { /* ignore */ }

  return row;
}

export async function markAllRead({ church_id, member_id=null, user_id=null }) {
  const res = await db.query(
    `UPDATE in_app_notifications SET read = true, read_at = now() WHERE church_id = $1 AND (member_id IS NULL OR member_id = $2) AND read = false RETURNING id`,
    [church_id, member_id || user_id]
  );
  const ids = res.rows.map(r => r.id);
  try {
    const io = getIO();
    if (member_id || user_id) io.to(`user:${member_id || user_id}`).emit('notifications_mark_all_read', { ids });
  } catch (err) {}
  return { updated: ids.length, ids };
}

export async function deleteNotification({ id, church_id }) {
  const res = await db.query(`DELETE FROM in_app_notifications WHERE id = $1 AND church_id = $2 RETURNING *`, [id, church_id]);
  return res.rows[0];
}
