// backend/models/notificationModel.js
import db from '../config/db.js';
export const createNotification = async ({ church_id, user_id, title, message, link = null, type = 'Other' }) => {
  const { rows } = await db.query(`INSERT INTO notifications (church_id, user_id, title, message, link, type, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`, [church_id, user_id, title, message, link, type]);
  return rows[0];
};
