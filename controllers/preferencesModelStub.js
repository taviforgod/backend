import db from '../config/db.js';

export async function getPreferencesForUser(church_id, member_id) {
  if (!church_id || !member_id) return null;
  const res = await db.query('SELECT channels FROM notification_preferences WHERE church_id = $1 AND member_id = $2 LIMIT 1', [church_id, member_id]);
  return res.rows[0] || null;
}
