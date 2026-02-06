import db from '../config/db.js';

// Baptism Prep Checklist CRUD
export async function createChecklistItem(data) {
  const {
    church_id,
    candidate_id,
    checklist_item,
    category,
    description,
    is_required,
    sort_order
  } = data;

  const result = await db.query(`
    INSERT INTO baptism_prep_checklist (
      church_id, candidate_id, checklist_item, category, description,
      is_required, sort_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [church_id, candidate_id, checklist_item, category, description, is_required, sort_order]);

  return result.rows[0];
}

export async function getChecklistByCandidate(candidateId) {
  const result = await db.query(`
    SELECT * FROM baptism_prep_checklist
    WHERE candidate_id = $1
    ORDER BY sort_order ASC
  `, [candidateId]);

  return result.rows;
}

export async function updateChecklistItem(itemId, data) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && key !== 'id') {
      updates.push(`${key} = $${paramIndex}`);
      params.push(data[key]);
      paramIndex++;
    }
  });

  if (updates.length === 0) return null;

  updates.push(`updated_at = NOW()`);

  const query = `
    UPDATE baptism_prep_checklist
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  params.push(itemId);

  const result = await db.query(query, params);
  return result.rows[0];
}

// Initialize checklist for new candidate
export async function initializeChecklistForCandidate(candidateId, churchId) {
  // Get template items (where candidate_id = 0)
  const templateResult = await db.query(`
    SELECT checklist_item, category, description, is_required, sort_order
    FROM baptism_prep_checklist
    WHERE church_id = $1 AND candidate_id = 0
    ORDER BY sort_order ASC
  `, [churchId]);

  const checklistItems = [];
  for (const template of templateResult.rows) {
    const itemData = {
      church_id: churchId,
      candidate_id: candidateId,
      checklist_item: template.checklist_item,
      category: template.category,
      description: template.description,
      is_required: template.is_required,
      sort_order: template.sort_order
    };

    const item = await createChecklistItem(itemData);
    checklistItems.push(item);
  }

  return checklistItems;
}

// Get checklist completion status
export async function getChecklistProgress(candidateId) {
  const result = await db.query(`
    SELECT
      COUNT(*) as total_items,
      COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_items,
      COUNT(CASE WHEN is_required = true THEN 1 END) as required_items,
      COUNT(CASE WHEN is_required = true AND is_completed = true THEN 1 END) as completed_required_items
    FROM baptism_prep_checklist
    WHERE candidate_id = $1
  `, [candidateId]);

  const progress = result.rows[0];
  progress.completion_percentage = progress.total_items > 0 ?
    Math.round((progress.completed_items / progress.total_items) * 100) : 0;
  progress.required_completion_percentage = progress.required_items > 0 ?
    Math.round((progress.completed_required_items / progress.required_items) * 100) : 0;

  return progress;
}

// Baptism Prep Sessions CRUD
export async function createPrepSession(data) {
  const {
    church_id,
    candidate_id,
    session_date,
    session_type,
    facilitator_id,
    topics_covered,
    concerns_addressed,
    next_steps,
    prayer_requests,
    attendance_marked,
    session_notes,
    follow_up_date,
    created_by
  } = data;

  const result = await db.query(`
    INSERT INTO baptism_prep_sessions (
      church_id, candidate_id, session_date, session_type, facilitator_id,
      topics_covered, concerns_addressed, next_steps, prayer_requests,
      attendance_marked, session_notes, follow_up_date, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `, [
    church_id, candidate_id, session_date, session_type, facilitator_id,
    topics_covered, concerns_addressed, next_steps, prayer_requests,
    attendance_marked, session_notes, follow_up_date, created_by
  ]);

  return result.rows[0];
}

export async function getPrepSessionsByCandidate(candidateId) {
  const result = await db.query(`
    SELECT
      bps.*,
      m.first_name as facilitator_first_name, m.surname as facilitator_surname
    FROM baptism_prep_sessions bps
    LEFT JOIN members m ON bps.facilitator_id = m.id
    WHERE bps.candidate_id = $1
    ORDER BY bps.session_date DESC
  `, [candidateId]);

  return result.rows;
}

export async function updatePrepSession(sessionId, data) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && key !== 'id') {
      updates.push(`${key} = $${paramIndex}`);
      params.push(data[key]);
      paramIndex++;
    }
  });

  if (updates.length === 0) return null;

  const query = `
    UPDATE baptism_prep_sessions
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  params.push(sessionId);

  const result = await db.query(query, params);
  return result.rows[0];
}

// Get upcoming preparation sessions
export async function getUpcomingPrepSessions(churchId, limit = 10) {
  const result = await db.query(`
    SELECT
      bps.*,
      bc.first_name, bc.surname, bc.contact_primary,
      m.first_name as facilitator_first_name, m.surname as facilitator_surname
    FROM baptism_prep_sessions bps
    JOIN baptism_candidates bc ON bps.candidate_id = bc.id
    LEFT JOIN members m ON bps.facilitator_id = m.id
    WHERE bps.church_id = $1 AND bps.session_date >= CURRENT_DATE
    ORDER BY bps.session_date ASC
    LIMIT $2
  `, [churchId, limit]);

  return result.rows;
}

// Get candidates ready for baptism (all required checklist items completed)
export async function getCandidatesReadyForBaptism(churchId) {
  const result = await db.query(`
    SELECT DISTINCT
      bc.*,
      cp.total_items,
      cp.completed_items,
      cp.required_items,
      cp.completed_required_items
    FROM baptism_candidates bc
    JOIN (
      SELECT
        candidate_id,
        COUNT(*) as total_items,
        COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_items,
        COUNT(CASE WHEN is_required = true THEN 1 END) as required_items,
        COUNT(CASE WHEN is_required = true AND is_completed = true THEN 1 END) as completed_required_items
      FROM baptism_prep_checklist
      GROUP BY candidate_id
    ) cp ON bc.id = cp.candidate_id
    WHERE bc.church_id = $1
    AND bc.status IN ('preparing', 'ready')
    AND cp.completed_required_items = cp.required_items
    ORDER BY bc.created_at ASC
  `, [churchId]);

  return result.rows;
}