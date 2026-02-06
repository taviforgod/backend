import db from '../config/db.js';

// Giving Log CRUD
export async function createGivingRecord(data) {
  const {
    church_id,
    member_id,
    giver_name,
    giving_type,
    amount,
    currency,
    giving_date,
    payment_method,
    service_date,
    cell_group_id,
    ministry_area,
    purpose_description,
    receipt_number,
    transaction_reference,
    is_anonymous,
    recorded_by,
    notes
  } = data;

  const result = await db.query(`
    INSERT INTO giving_log (
      church_id, member_id, giver_name, giving_type, amount, currency,
      giving_date, payment_method, service_date, cell_group_id, ministry_area,
      purpose_description, receipt_number, transaction_reference, is_anonymous,
      recorded_by, notes
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
    ) RETURNING *
  `, [
    church_id, member_id, giver_name, giving_type, amount, currency,
    giving_date, payment_method, service_date, cell_group_id, ministry_area,
    purpose_description, receipt_number, transaction_reference, is_anonymous,
    recorded_by, notes
  ]);

  return result.rows[0];
}

export async function getGivingRecords(churchId, filters = {}) {
  let query = `
    SELECT
      gl.*,
      m.first_name, m.surname, m.contact_primary,
      cg.name as cell_group_name,
      rb.first_name as recorded_by_first_name, rb.surname as recorded_by_surname
    FROM giving_log gl
    LEFT JOIN members m ON gl.member_id = m.id
    LEFT JOIN cell_groups cg ON gl.cell_group_id = cg.id
    LEFT JOIN members rb ON gl.recorded_by = rb.id
    WHERE gl.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.giving_type) {
    query += ` AND gl.giving_type = $${paramIndex}`;
    params.push(filters.giving_type);
    paramIndex++;
  }

  if (filters.member_id) {
    query += ` AND gl.member_id = $${paramIndex}`;
    params.push(filters.member_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND gl.giving_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND gl.giving_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  if (filters.cell_group_id) {
    query += ` AND gl.cell_group_id = $${paramIndex}`;
    params.push(filters.cell_group_id);
    paramIndex++;
  }

  query += ` ORDER BY gl.giving_date DESC, gl.created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

export async function updateGivingRecord(recordId, churchId, data) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && key !== 'id' && key !== 'church_id') {
      updates.push(`${key} = $${paramIndex}`);
      params.push(data[key]);
      paramIndex++;
    }
  });

  if (updates.length === 0) return null;

  updates.push(`created_at = created_at`); // Preserve original created_at

  const query = `
    UPDATE giving_log
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
    RETURNING *
  `;

  params.push(recordId, churchId);

  const result = await db.query(query, params);
  return result.rows[0];
}

// Get giving summary by member
export async function getMemberGivingSummary(memberId, churchId, year = null) {
  let query = `
    SELECT
      COUNT(*) as total_contributions,
      SUM(amount) as total_amount,
      AVG(amount) as average_amount,
      MAX(giving_date) as last_contribution_date,
      MIN(giving_date) as first_contribution_date,
      COUNT(CASE WHEN giving_type = 'tithe' THEN 1 END) as tithe_count,
      SUM(CASE WHEN giving_type = 'tithe' THEN amount ELSE 0 END) as tithe_total
    FROM giving_log
    WHERE member_id = $1 AND church_id = $2 AND is_anonymous = FALSE
  `;

  const params = [memberId, churchId];

  if (year) {
    query += ` AND EXTRACT(YEAR FROM giving_date) = $3`;
    params.push(year);
  }

  const result = await db.query(query, params);
  return result.rows[0];
}

// Get giving analytics
export async function getGivingAnalytics(churchId, dateRange = {}) {
  const { start_date, end_date } = dateRange;

  let dateFilter = '';
  const params = [churchId];
  let paramIndex = 2;

  if (start_date) {
    dateFilter += ` AND giving_date >= $${paramIndex}`;
    params.push(start_date);
    paramIndex++;
  }

  if (end_date) {
    dateFilter += ` AND giving_date <= $${paramIndex}`;
    params.push(end_date);
    paramIndex++;
  }

  const result = await db.query(`
    SELECT
      SUM(amount) as total_giving,
      COUNT(*) as total_contributions,
      COUNT(DISTINCT member_id) as active_givers,
      AVG(amount) as average_gift,
      SUM(CASE WHEN giving_type = 'tithe' THEN amount ELSE 0 END) as tithe_total,
      SUM(CASE WHEN giving_type = 'offering' THEN amount ELSE 0 END) as offering_total,
      SUM(CASE WHEN giving_type = 'special_offering' THEN amount ELSE 0 END) as special_offering_total
    FROM giving_log
    WHERE church_id = $1 AND is_anonymous = FALSE ${dateFilter}
  `, params);

  return result.rows[0];
}

// Get giving by type breakdown
export async function getGivingByType(churchId, dateRange = {}) {
  const { start_date, end_date } = dateRange;

  let dateFilter = '';
  const params = [churchId];
  let paramIndex = 2;

  if (start_date) {
    dateFilter += ` AND giving_date >= $${paramIndex}`;
    params.push(start_date);
    paramIndex++;
  }

  if (end_date) {
    dateFilter += ` AND giving_date <= $${paramIndex}`;
    params.push(end_date);
    paramIndex++;
  }

  const result = await db.query(`
    SELECT
      giving_type,
      COUNT(*) as contribution_count,
      SUM(amount) as total_amount,
      AVG(amount) as average_amount,
      COUNT(DISTINCT member_id) as unique_givers
    FROM giving_log
    WHERE church_id = $1 AND is_anonymous = FALSE ${dateFilter}
    GROUP BY giving_type
    ORDER BY total_amount DESC
  `, params);

  return result.rows;
}

// Get giving trends (monthly)
export async function getGivingTrends(churchId, months = 12) {
  const result = await db.query(`
    SELECT
      DATE_TRUNC('month', giving_date) as month,
      SUM(amount) as monthly_total,
      COUNT(*) as contribution_count,
      COUNT(DISTINCT member_id) as unique_givers
    FROM giving_log
    WHERE church_id = $1 AND is_anonymous = FALSE
    AND giving_date >= CURRENT_DATE - INTERVAL '${months} months'
    GROUP BY DATE_TRUNC('month', giving_date)
    ORDER BY month ASC
  `, [churchId]);

  return result.rows;
}