import pool from '../config/db.js';

// List all (with optional filters)
export async function getAllCrisisFollowups(filters = {}) {
  const { church_id, is_active, crisis_type } = filters;
  const clauses = [];
  const values = [];
  let i = 1;

  if (church_id) { clauses.push(`c.church_id = $${i++}`); values.push(church_id); }
  if (typeof is_active === 'boolean') { clauses.push(`c.is_active = $${i++}`); values.push(is_active); }
  if (crisis_type) { clauses.push(`c.crisis_type ILIKE $${i++}`); values.push(`%${crisis_type}%`); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT c.*,
           m.first_name AS member_first_name, m.surname AS member_surname,
           fp.first_name AS followup_first_name, fp.surname AS followup_surname
    FROM crisis_followups c
    LEFT JOIN members m ON c.member_id = m.id
    LEFT JOIN members fp ON c.followup_person_id = fp.id
    ${where}
    ORDER BY c.date_reported DESC
  `;

  // pass values array to pool.query so parameter placeholders ($1, $2...) are bound
  const { rows } = await pool.query(sql, values);
  return rows;
}

// Get one
export async function getCrisisFollowupById(id) {
  const { rows } = await pool.query('SELECT * FROM crisis_followups WHERE id = $1', [id]);
  return rows[0];
}

// Create
export async function createCrisisFollowup(data) {
  const {
    church_id, member_id, reported_by, crisis_type, emotional_state,
    support_provided, external_referral, followup_person_id,
    followup_frequency, recovery_progress, comments, next_followup_date
  } = data;

  const { rows } = await pool.query(
    `INSERT INTO crisis_followups
      (church_id, member_id, reported_by, crisis_type, emotional_state,
       support_provided, external_referral, followup_person_id,
       followup_frequency, recovery_progress, comments, next_followup_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [church_id, member_id, reported_by, crisis_type, emotional_state,
     support_provided, external_referral, followup_person_id,
     followup_frequency, recovery_progress, comments, next_followup_date]
  );
  return rows[0];
}

// Update
export async function updateCrisisFollowup(id, data) {
  const fields = Object.keys(data);
  if (!fields.length) return null;

  const values = Object.values(data);
  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const { rows } = await pool.query(
    `UPDATE crisis_followups
     SET ${setClause}, updated_at = NOW()
     WHERE id = $${fields.length + 1}
     RETURNING *`,
    [...values, id]
  );
  return rows[0];
}

// Soft delete (mark inactive)
export async function deleteCrisisFollowup(id) {
  const { rowCount } = await pool.query(
    'UPDATE crisis_followups SET is_active = FALSE, closed_date = CURRENT_DATE WHERE id = $1',
    [id]
  );
  return rowCount > 0;
}

// Optional: Summary per church
export async function getCrisisSummary(church_id) {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE is_active) AS active,
      COUNT(*) FILTER (WHERE NOT is_active) AS closed,
      COUNT(*) FILTER (WHERE next_followup_date = CURRENT_DATE) AS due_today
    FROM crisis_followups
    WHERE church_id = $1;
  `, [church_id]);
  return rows[0];
}
