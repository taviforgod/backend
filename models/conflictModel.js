import db from '../config/db.js';

// Conflict Management CRUD
export async function createConflictLog(data) {
  const {
    church_id,
    title,
    description,
    conflict_type,
    reported_by,
    primary_party,
    secondary_party,
    involved_parties,
    cell_group_id,
    ministry_area,
    incident_date,
    reported_date,
    severity,
    witnesses,
    evidence
  } = data;

  const result = await db.query(`
    INSERT INTO conflict_logs (
      church_id, title, description, conflict_type, reported_by, primary_party,
      secondary_party, involved_parties, cell_group_id, ministry_area, incident_date,
      reported_date, severity, witnesses, evidence
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    ) RETURNING *
  `, [
    church_id, title, description, conflict_type, reported_by, primary_party,
    secondary_party, JSON.stringify(involved_parties || []), cell_group_id,
    ministry_area, incident_date, reported_date, severity, witnesses, evidence
  ]);

  return result.rows[0];
}

export async function getConflictLogs(churchId, filters = {}) {
  let query = `
    SELECT
      cl.*,
      rb.first_name as reported_by_first_name, rb.surname as reported_by_surname,
      pp.first_name as primary_party_first_name, pp.surname as primary_party_surname,
      sp.first_name as secondary_party_first_name, sp.surname as secondary_party_surname,
      cg.name as cell_group_name,
      COUNT(ca.id) as actions_count
    FROM conflict_logs cl
    LEFT JOIN members rb ON cl.reported_by = rb.id
    LEFT JOIN members pp ON cl.primary_party = pp.id
    LEFT JOIN members sp ON cl.secondary_party = sp.id
    LEFT JOIN cell_groups cg ON cl.cell_group_id = cg.id
    LEFT JOIN conflict_actions ca ON cl.id = ca.conflict_id
    WHERE cl.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.status) {
    query += ` AND cl.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.severity) {
    query += ` AND cl.severity = $${paramIndex}`;
    params.push(filters.severity);
    paramIndex++;
  }

  if (filters.conflict_type) {
    query += ` AND cl.conflict_type = $${paramIndex}`;
    params.push(filters.conflict_type);
    paramIndex++;
  }

  query += ` GROUP BY cl.id, rb.first_name, rb.surname, pp.first_name, pp.surname, sp.first_name, sp.surname, cg.name ORDER BY cl.created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

export async function getConflictLogById(conflictId, churchId) {
  const result = await db.query(`
    SELECT
      cl.*,
      rb.first_name as reported_by_first_name, rb.surname as reported_by_surname,
      pp.first_name as primary_party_first_name, pp.surname as primary_party_surname,
      sp.first_name as secondary_party_first_name, sp.surname as secondary_party_surname,
      cg.name as cell_group_name
    FROM conflict_logs cl
    LEFT JOIN members rb ON cl.reported_by = rb.id
    LEFT JOIN members pp ON cl.primary_party = pp.id
    LEFT JOIN members sp ON cl.secondary_party = sp.id
    LEFT JOIN cell_groups cg ON cl.cell_group_id = cg.id
    WHERE cl.id = $1 AND cl.church_id = $2
  `, [conflictId, churchId]);

  return result.rows[0];
}

export async function updateConflictLog(conflictId, churchId, data) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && key !== 'id' && key !== 'church_id') {
      if (key === 'involved_parties') {
        updates.push(`${key} = $${paramIndex}`);
        params.push(JSON.stringify(data[key]));
      } else {
        updates.push(`${key} = $${paramIndex}`);
        params.push(data[key]);
      }
      paramIndex++;
    }
  });

  if (updates.length === 0) return null;

  updates.push(`updated_at = NOW()`);

  const query = `
    UPDATE conflict_logs
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
    RETURNING *
  `;

  params.push(conflictId, churchId);

  const result = await db.query(query, params);
  return result.rows[0];
}

// Conflict Actions
export async function createConflictAction(data) {
  const {
    conflict_id,
    action_date,
    action_type,
    action_description,
    responsible_party
  } = data;

  const result = await db.query(`
    INSERT INTO conflict_actions (
      conflict_id, action_date, action_type, action_description, responsible_party
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [conflict_id, action_date, action_type, action_description, responsible_party]);

  return result.rows[0];
}

export async function getConflictActions(conflictId) {
  const result = await db.query(`
    SELECT
      ca.*,
      m.first_name, m.surname
    FROM conflict_actions ca
    LEFT JOIN members m ON ca.responsible_party = m.id
    WHERE ca.conflict_id = $1
    ORDER BY ca.action_date DESC
  `, [conflictId]);

  return result.rows;
}

// Get conflict statistics
export async function getConflictStats(churchId) {
  const result = await db.query(`
    SELECT
      COUNT(*) as total_conflicts,
      COUNT(CASE WHEN status = 'new' THEN 1 END) as new_conflicts,
      COUNT(CASE WHEN status = 'investigating' THEN 1 END) as investigating_conflicts,
      COUNT(CASE WHEN status = 'mediating' THEN 1 END) as mediating_conflicts,
      COUNT(CASE WHEN severity = 'high' OR severity = 'critical' THEN 1 END) as high_severity_conflicts,
      AVG(EXTRACT(EPOCH FROM (resolution_date - reported_date)) / 86400) as avg_resolution_days
    FROM conflict_logs
    WHERE church_id = $1
  `, [churchId]);

  return result.rows[0];
}

// Get active conflicts requiring attention
export async function getActiveConflicts(churchId, limit = 10) {
  const result = await db.query(`
    SELECT * FROM conflict_logs
    WHERE church_id = $1 AND status NOT IN ('resolved', 'closed')
    ORDER BY
      CASE severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      reported_date DESC
    LIMIT $2
  `, [churchId, limit]);

  return result.rows;
}