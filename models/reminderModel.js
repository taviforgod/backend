import db from '../config/db.js';

// Get all reminders for a church
export const getAllReminders = async (church_id, filters = {}) => {
  let query = `
    SELECT r.*, u.name as created_by_name, nt.name as template_name
    FROM reminders r
    LEFT JOIN users u ON r.created_by = u.id
    LEFT JOIN notification_templates nt ON r.template_id = nt.id
    WHERE r.church_id = $1
  `;
  const params = [church_id];
  let paramIndex = 2;

  if (filters.type) {
    query += ` AND r.reminder_type = $${paramIndex}`;
    params.push(filters.type);
    paramIndex++;
  }

  if (filters.active !== undefined) {
    query += ` AND r.is_active = $${paramIndex}`;
    params.push(filters.active);
    paramIndex++;
  }

  query += ` ORDER BY r.created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  if (filters.offset) {
    query += ` OFFSET $${paramIndex}`;
    params.push(filters.offset);
    paramIndex++;
  }

  const res = await db.query(query, params);
  return res.rows;
};

// Get reminder by ID
export const getReminderById = async (id, church_id) => {
  const res = await db.query(`
    SELECT r.*, u.name as created_by_name, nt.name as template_name
    FROM reminders r
    LEFT JOIN users u ON r.created_by = u.id
    LEFT JOIN notification_templates nt ON r.template_id = nt.id
    WHERE r.id = $1 AND r.church_id = $2
  `, [id, church_id]);
  return res.rows[0];
};

// Create reminder
export const createReminder = async (data) => {
  const res = await db.query(`
    INSERT INTO reminders
      (church_id, title, description, reminder_type, target_type, target_id,
       schedule_type, scheduled_at, recurring_rule, channels, template_id,
       is_active, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `, [
    data.church_id,
    data.title,
    data.description,
    data.reminder_type,
    data.target_type,
    data.target_id,
    data.schedule_type,
    data.scheduled_at,
    data.recurring_rule || null,
    JSON.stringify(data.channels || ['in_app']),
    data.template_id || null,
    data.is_active ?? true,
    data.created_by
  ]);
  return res.rows[0];
};

// Update reminder
export const updateReminder = async (id, church_id, data) => {
  const res = await db.query(`
    UPDATE reminders
    SET title = $1, description = $2, reminder_type = $3, target_type = $4,
        target_id = $5, schedule_type = $6, scheduled_at = $7,
        recurring_rule = $8, channels = $9, template_id = $10,
        is_active = $11, updated_at = NOW()
    WHERE id = $12 AND church_id = $13
    RETURNING *
  `, [
    data.title,
    data.description,
    data.reminder_type,
    data.target_type,
    data.target_id,
    data.schedule_type,
    data.scheduled_at,
    data.recurring_rule || null,
    JSON.stringify(data.channels || ['in_app']),
    data.template_id || null,
    data.is_active ?? true,
    id,
    church_id
  ]);
  return res.rows[0];
};

// Delete reminder
export const deleteReminder = async (id, church_id) => {
  const res = await db.query(
    'DELETE FROM reminders WHERE id = $1 AND church_id = $2 RETURNING *',
    [id, church_id]
  );
  return res.rows[0];
};

// Get upcoming reminders
export const getUpcomingReminders = async (church_id, limit = 10) => {
  const res = await db.query(`
    SELECT r.*, u.name as created_by_name
    FROM reminders r
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.church_id = $1
      AND r.is_active = true
      AND (r.next_send_at IS NULL OR r.next_send_at <= NOW() + INTERVAL '24 hours')
    ORDER BY r.next_send_at ASC NULLS FIRST
    LIMIT $2
  `, [church_id, limit]);
  return res.rows;
};

// Update next_send_at for recurring reminders
export const updateNextSendTime = async (id, nextSendAt) => {
  const res = await db.query(`
    UPDATE reminders
    SET next_send_at = $1, last_sent_at = NOW(), updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `, [nextSendAt, id]);
  return res.rows[0];
};

export default {
  getAllReminders,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder,
  getUpcomingReminders,
  updateNextSendTime
};