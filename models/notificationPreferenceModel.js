import db from '../config/db.js';

// Get preferences by user_id
export const getByUserId = async (user_id) => {
  const res = await db.query(
    'SELECT * FROM user_notification_preferences WHERE user_id = $1',
    [user_id]
  );
  return res.rows[0] || null;
};

// Create default preferences
export const create = async (user_id, church_id = null, data = {}) => {
  const res = await db.query(
    `INSERT INTO user_notification_preferences
       (user_id, church_id, member_id, channels, digest_enabled, quiet_hours)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      user_id,
      church_id,
      data.member_id || null,
      JSON.stringify(data.channels || { in_app: true, email: true, sms: false, whatsapp: false }),
      data.digest_enabled ?? true,
      JSON.stringify(data.quiet_hours || { start: "", end: "" }),
    ]
  );
  return res.rows[0];
};

// Update preferences by user_id
export const updateByUserId = async (user_id, data) => {
  const res = await db.query(
    `UPDATE user_notification_preferences
       SET channels = $1,
           digest_enabled = $2,
           quiet_hours = $3,
           updated_at = NOW()
     WHERE user_id = $4
     RETURNING *`,
    [
      JSON.stringify(data.channels || { in_app: true, email: true, sms: false, whatsapp: false }),
      data.digest_enabled ?? true,
      JSON.stringify(data.quiet_hours || { start: "", end: "" }),
      user_id,
    ]
  );
  return res.rows[0];
};
