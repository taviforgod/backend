import db from '../config/db.js';

// Get preferences by user_id
export const getByUserId = async (user_id) => {
  const res = await db.query(
    'SELECT * FROM user_notification_preferences WHERE user_id = $1',
    [user_id]
  );
  const prefs = res.rows[0];
  if (prefs) {
    // Parse JSON fields
    prefs.channels = typeof prefs.channels === 'string' ? JSON.parse(prefs.channels) : prefs.channels;
    prefs.quiet_hours = typeof prefs.quiet_hours === 'string' ? JSON.parse(prefs.quiet_hours) : prefs.quiet_hours;
  }
  return prefs || null;
};

// Create default preferences
export const create = async (user_id, church_id, data = {}) => {
  // Find member_id if user has one
  let member_id = null;
  if (church_id) {
    const memberRes = await db.query(
      'SELECT id FROM members WHERE user_id = $1 AND church_id = $2',
      [user_id, church_id]
    );
    if (memberRes.rows[0]) {
      member_id = memberRes.rows[0].id;
    }
  }

  const res = await db.query(
    `INSERT INTO user_notification_preferences
       (church_id, user_id, member_id, channels, digest_enabled, quiet_hours)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      church_id,
      user_id,
      member_id,
      JSON.stringify(data.channels || { in_app: true, email: true, sms: false, whatsapp: false }),
      data.digest_enabled ?? true,
      JSON.stringify(data.quiet_hours || { start: "", end: "" }),
    ]
  );
  const prefs = res.rows[0];
  // Parse JSON fields
  prefs.channels = JSON.parse(prefs.channels);
  prefs.quiet_hours = JSON.parse(prefs.quiet_hours);
  return prefs;
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
  const prefs = res.rows[0];
  if (prefs) {
    // Parse JSON fields
    prefs.channels = JSON.parse(prefs.channels);
    prefs.quiet_hours = JSON.parse(prefs.quiet_hours);
  }
  return prefs;
};
