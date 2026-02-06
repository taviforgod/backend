import db from '../config/db.js';

// Cell Visitor Journey CRUD
export async function createCellVisitorJourney(data) {
  const {
    church_id,
    visitor_id,
    member_id,
    is_ntyaba,
    first_visit_date,
    how_heard_about_church,
    age_group,
    conversion_date,
    conversion_notes,
    baptized,
    baptism_date,
    current_stage,
    primary_mentor_id,
    secondary_mentor_id,
    salvation_testimony,
    serving_area,
    ministry_interest,
    integration_notes,
    prayer_requests,
    created_by
  } = data;

  const result = await db.query(`
    INSERT INTO cell_visitor_journeys (
      church_id, visitor_id, member_id, is_ntyaba, first_visit_date,
      how_heard_about_church, age_group, conversion_date, conversion_notes,
      baptized, baptism_date, current_stage, primary_mentor_id, secondary_mentor_id,
      salvation_testimony, serving_area, ministry_interest, integration_notes,
      prayer_requests, created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
    ) RETURNING *
  `, [
    church_id, visitor_id, member_id, is_ntyaba, first_visit_date,
    how_heard_about_church, age_group, conversion_date, conversion_notes,
    baptized, baptism_date, current_stage || 'new_believer', primary_mentor_id, secondary_mentor_id,
    salvation_testimony, serving_area, ministry_interest, integration_notes,
    prayer_requests, created_by
  ]);

  return result.rows[0];
}

export async function getCellVisitorJourneys(churchId, filters = {}) {
  let query = `
    SELECT
      nbj.*,
      v.first_name as visitor_first_name, v.surname as visitor_surname, v.contact_primary as visitor_contact,
      m.first_name as member_first_name, m.surname as member_surname, m.contact_primary as member_contact,
      pm.first_name as primary_mentor_first_name, pm.surname as primary_mentor_surname,
      sm.first_name as secondary_mentor_first_name, sm.surname as secondary_mentor_surname
    FROM cell_visitor_journeys nbj
    LEFT JOIN visitors v ON nbj.visitor_id = v.id
    LEFT JOIN members m ON nbj.member_id = m.id
    LEFT JOIN members pm ON nbj.primary_mentor_id = pm.id
    LEFT JOIN members sm ON nbj.secondary_mentor_id = sm.id
    WHERE nbj.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.stage) {
    query += ` AND nbj.current_stage = $${paramIndex}`;
    params.push(filters.stage);
    paramIndex++;
  }

  if (filters.status) {
    query += ` AND nbj.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.is_ntyaba !== undefined) {
    query += ` AND nbj.is_ntyaba = $${paramIndex}`;
    params.push(filters.is_ntyaba);
    paramIndex++;
  }

  if (filters.mentor_id) {
    query += ` AND (nbj.primary_mentor_id = $${paramIndex} OR nbj.secondary_mentor_id = $${paramIndex})`;
    params.push(filters.mentor_id);
    paramIndex++;
  }

  query += ` ORDER BY nbj.created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

export async function getCellVisitorJourneyById(journeyId, churchId) {
  const result = await db.query(`
    SELECT
      nbj.*,
      v.first_name as visitor_first_name, v.surname as visitor_surname,
      v.contact_primary as visitor_contact, v.email as visitor_email,
      m.first_name as member_first_name, m.surname as member_surname,
      m.contact_primary as member_contact, m.email as member_email,
      pm.first_name as primary_mentor_first_name, pm.surname as primary_mentor_surname,
      sm.first_name as secondary_mentor_first_name, sm.surname as secondary_mentor_surname
    FROM cell_visitor_journeys nbj
    LEFT JOIN visitors v ON nbj.visitor_id = v.id
    LEFT JOIN members m ON nbj.member_id = m.id
    LEFT JOIN members pm ON nbj.primary_mentor_id = pm.id
    LEFT JOIN members sm ON nbj.secondary_mentor_id = sm.id
    WHERE nbj.id = $1 AND nbj.church_id = $2
  `, [journeyId, churchId]);

  return result.rows[0];
}

export async function updateCellVisitorJourney(journeyId, churchId, data) {
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

  updates.push(`updated_at = NOW()`);

  const query = `
    UPDATE cell_visitor_journeys
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
    RETURNING *
  `;

  params.push(journeyId, churchId);

  const result = await db.query(query, params);
  return result.rows[0];
}

// NTYABA Visit Tracking
export async function createNTYABAVisit(data) {
  const {
    church_id,
    cell_visitor_journey_id,
    visit_date,
    service_time,
    welcomed_by,
    follow_up_method,
    follow_up_date,
    visit_notes,
    created_by
  } = data;

  const result = await db.query(`
    INSERT INTO ntyaba_visits (
      church_id, cell_visitor_journey_id, visit_date, service_time,
      welcomed_by, follow_up_method, follow_up_date, visit_notes, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    church_id, cell_visitor_journey_id, visit_date, service_time,
    welcomed_by, follow_up_method, follow_up_date, visit_notes, created_by
  ]);

  return result.rows[0];
}

export async function getNTYABAVisits(journeyId) {
  const result = await db.query(`
    SELECT nv.*, m.first_name, m.surname
    FROM ntyaba_visits nv
    LEFT JOIN members m ON nv.welcomed_by = m.id
    WHERE nv.cell_visitor_journey_id = $1
    ORDER BY nv.visit_date DESC
  `, [journeyId]);

  return result.rows;
}

// New Believer Session Tracking
export async function createCellVisitorSession(data) {
  const {
    journey_id,
    session_date,
    session_type,
    mentor_id,
    topics_covered,
    next_steps,
    attendance_marked,
    session_notes,
    created_by
  } = data;

  const result = await db.query(`
    INSERT INTO cell_visitor_sessions (
      journey_id, session_date, session_type, mentor_id, topics_covered,
      next_steps, attendance_marked, session_notes, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    journey_id, session_date, session_type, mentor_id, topics_covered,
    next_steps, attendance_marked, session_notes, created_by
  ]);

  return result.rows[0];
}

export async function getCellVisitorSessions(journeyId) {
  const result = await db.query(`
    SELECT nbs.*, m.first_name, m.surname
    FROM cell_visitor_sessions nbs
    LEFT JOIN members m ON nbs.mentor_id = m.id
    WHERE nbs.journey_id = $1
    ORDER BY nbs.session_date DESC
  `, [journeyId]);

  return result.rows;
}

// Convert visitor to new believer journey
export async function convertCellVisitorToChurchAttendee(visitorId, churchId, conversionData) {
  // First get visitor details
  const visitorResult = await db.query(`
    SELECT * FROM visitors WHERE id = $1 AND church_id = $2
  `, [visitorId, churchId]);

  if (visitorResult.rows.length === 0) {
    throw new Error('Visitor not found');
  }

  const visitor = visitorResult.rows[0];

  // Create new believer journey
  const journeyData = {
    church_id: churchId,
    visitor_id: visitorId,
    is_ntyaba: conversionData.is_ntyaba || false,
    first_visit_date: visitor.date_of_first_visit,
    how_heard_about_church: visitor.how_heard,
    age_group: visitor.age_group,
    conversion_date: conversionData.conversion_date,
    conversion_notes: conversionData.conversion_notes,
    baptized: conversionData.baptized || false,
    baptism_date: conversionData.baptism_date,
    primary_mentor_id: conversionData.primary_mentor_id,
    salvation_testimony: conversionData.salvation_testimony,
    prayer_requests: visitor.prayer_requests,
    created_by: conversionData.created_by
  };

  const journey = await createNewBelieverJourney(journeyData);

  // Update visitor as converted
  await db.query(`
    UPDATE visitors
    SET converted = true, converted_date = $1, updated_at = NOW()
    WHERE id = $2
  `, [conversionData.conversion_date, visitorId]);

  return journey;
}

// Get new believer stats
export async function getCellVisitorStats(churchId) {
  const result = await db.query(`
    SELECT
      COUNT(*) as total_journeys,
      COUNT(CASE WHEN current_stage = 'new_believer' THEN 1 END) as new_believers,
      COUNT(CASE WHEN current_stage = 'foundation_school' THEN 1 END) as in_foundation_school,
      COUNT(CASE WHEN current_stage = 'membership_class' THEN 1 END) as in_membership_class,
      COUNT(CASE WHEN current_stage = 'disciple' THEN 1 END) as disciples,
      COUNT(CASE WHEN is_ntyaba = true THEN 1 END) as ntyaba_count,
      COUNT(CASE WHEN baptized = true THEN 1 END) as baptized_count,
      AVG(EXTRACT(EPOCH FROM (conversion_date - first_visit_date))/86400) as avg_days_to_conversion
    FROM cell_visitor_journeys
    WHERE church_id = $1 AND status = 'active'
  `, [churchId]);

  return result.rows[0];
}