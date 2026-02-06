import db from '../config/db.js';

// Get notification logs with pagination and filters
export const getLogs = async (church_id, filters = {}, pagination = {}) => {
  let query = `
    SELECT nl.*,
           u.name as recipient_user_name,
           m.first_name || ' ' || m.surname as recipient_member_name,
           nj.name as job_name
    FROM notification_logs nl
    LEFT JOIN users u ON nl.recipient_user_id = u.id
    LEFT JOIN members m ON nl.recipient_member_id = m.id
    LEFT JOIN notification_jobs nj ON nl.job_id = nj.id
    WHERE nl.church_id = $1
  `;
  const params = [church_id];
  let paramIndex = 2;

  if (filters.status) {
    query += ` AND nl.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.channel) {
    query += ` AND nl.channel = $${paramIndex}`;
    params.push(filters.channel);
    paramIndex++;
  }

  if (filters.user_id) {
    query += ` AND nl.recipient_user_id = $${paramIndex}`;
    params.push(filters.user_id);
    paramIndex++;
  }

  if (filters.member_id) {
    query += ` AND nl.recipient_member_id = $${paramIndex}`;
    params.push(filters.member_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND nl.created_at >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND nl.created_at <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM (${query}) as subquery`;
  const countRes = await db.query(countQuery, params);
  const total = parseInt(countRes.rows[0].total);

  // Add ordering and pagination
  query += ` ORDER BY nl.created_at DESC`;

  if (pagination.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(pagination.limit);
    paramIndex++;
  }

  if (pagination.offset) {
    query += ` OFFSET $${paramIndex}`;
    params.push(pagination.offset);
    paramIndex++;
  }

  const res = await db.query(query, params);

  return {
    logs: res.rows,
    total,
    pagination: {
      ...pagination,
      total
    }
  };
};

// Create notification log
export const createLog = async (data) => {
  const res = await db.query(`
    INSERT INTO notification_logs
      (church_id, job_id, notification_id, recipient_user_id, recipient_member_id,
       channel, status, subject, body, error_message, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    data.church_id,
    data.job_id || null,
    data.notification_id || null,
    data.recipient_user_id || null,
    data.recipient_member_id || null,
    data.channel,
    data.status || 'pending',
    data.subject || null,
    data.body || null,
    data.error_message || null,
    data.metadata ? JSON.stringify(data.metadata) : null
  ]);
  return res.rows[0];
};

// Update log status
export const updateLogStatus = async (id, status, additionalData = {}) => {
  let updateFields = ['status = $1'];
  let params = [status];
  let paramIndex = 2;

  if (additionalData.sent_at) {
    updateFields.push(`sent_at = $${paramIndex}`);
    params.push(additionalData.sent_at);
    paramIndex++;
  }

  if (additionalData.delivered_at) {
    updateFields.push(`delivered_at = $${paramIndex}`);
    params.push(additionalData.delivered_at);
    paramIndex++;
  }

  if (additionalData.read_at) {
    updateFields.push(`read_at = $${paramIndex}`);
    params.push(additionalData.read_at);
    paramIndex++;
  }

  if (additionalData.error_message) {
    updateFields.push(`error_message = $${paramIndex}`);
    params.push(additionalData.error_message);
    paramIndex++;
  }

  params.push(id);

  const res = await db.query(`
    UPDATE notification_logs
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, params);

  return res.rows[0];
};

// Get delivery statistics
export const getDeliveryStats = async (church_id, dateRange = {}) => {
  let dateFilter = '';
  const params = [church_id];
  let paramIndex = 2;

  if (dateRange.from) {
    dateFilter += ` AND nl.created_at >= $${paramIndex}`;
    params.push(dateRange.from);
    paramIndex++;
  }

  if (dateRange.to) {
    dateFilter += ` AND nl.created_at <= $${paramIndex}`;
    params.push(dateRange.to);
    paramIndex++;
  }

  const res = await db.query(`
    SELECT
      COUNT(*) as total_sent,
      COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
      COUNT(CASE WHEN status = 'read' THEN 1 END) as read,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      channel,
      DATE(created_at) as date
    FROM notification_logs nl
    WHERE church_id = $1 ${dateFilter}
    GROUP BY channel, DATE(created_at)
    ORDER BY date DESC, channel
  `, params);

  return res.rows;
};

export default {
  getLogs,
  createLog,
  updateLogStatus,
  getDeliveryStats
};