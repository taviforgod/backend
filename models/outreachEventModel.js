import db from '../config/db.js';

// Outreach Events CRUD
export async function createOutreachEvent(data) {
  const {
    church_id,
    title,
    description,
    event_type,
    event_date,
    start_time,
    end_time,
    location,
    address,
    target_audience,
    expected_attendance,
    objective,
    preparation_needed,
    materials_needed,
    estimated_budget,
    event_coordinator_id,
    team_members,
    created_by
  } = data;

  const result = await db.query(`
    INSERT INTO outreach_events (
      church_id, title, description, event_type, event_date, start_time, end_time,
      location, address, target_audience, expected_attendance, objective,
      preparation_needed, materials_needed, estimated_budget, event_coordinator_id,
      team_members, created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
    ) RETURNING *
  `, [
    church_id, title, description, event_type, event_date, start_time, end_time,
    location, address, target_audience, expected_attendance, objective,
    preparation_needed, materials_needed, estimated_budget, event_coordinator_id,
    JSON.stringify(team_members || []), created_by
  ]);

  return result.rows[0];
}

export async function getOutreachEvents(churchId, filters = {}) {
  let query = `
    SELECT
      oe.*,
      m.first_name as coordinator_first_name, m.surname as coordinator_surname,
      json_array_length(oe.team_members) as team_size
    FROM outreach_events oe
    LEFT JOIN members m ON oe.event_coordinator_id = m.id
    WHERE oe.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.event_type) {
    query += ` AND oe.event_type = $${paramIndex}`;
    params.push(filters.event_type);
    paramIndex++;
  }

  if (filters.status) {
    query += ` AND oe.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND oe.event_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND oe.event_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY oe.event_date DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

export async function getOutreachEventById(eventId, churchId) {
  const result = await db.query(`
    SELECT
      oe.*,
      m.first_name as coordinator_first_name, m.surname as coordinator_surname
    FROM outreach_events oe
    LEFT JOIN members m ON oe.event_coordinator_id = m.id
    WHERE oe.id = $1 AND oe.church_id = $2
  `, [eventId, churchId]);

  return result.rows[0];
}

export async function updateOutreachEvent(eventId, churchId, data) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && key !== 'id' && key !== 'church_id') {
      if (key === 'team_members') {
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
    UPDATE outreach_events
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
    RETURNING *
  `;

  params.push(eventId, churchId);

  const result = await db.query(query, params);
  return result.rows[0];
}

// Event Participants
export async function addEventParticipant(data) {
  const { event_id, member_id, role, confirmed } = data;

  const result = await db.query(`
    INSERT INTO outreach_participants (event_id, member_id, role, confirmed)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (event_id, member_id) DO UPDATE SET
      role = EXCLUDED.role,
      confirmed = EXCLUDED.confirmed
    RETURNING *
  `, [event_id, member_id, role, confirmed]);

  return result.rows[0];
}

export async function getEventParticipants(eventId) {
  const result = await db.query(`
    SELECT
      op.*,
      m.first_name, m.surname, m.contact_primary
    FROM outreach_participants op
    JOIN members m ON op.member_id = m.id
    WHERE op.event_id = $1
    ORDER BY m.first_name, m.surname
  `, [eventId]);

  return result.rows;
}

export async function updateEventAttendance(eventId, memberId, attended, hours) {
  const result = await db.query(`
    UPDATE outreach_participants
    SET attended = $1, hours_contributed = $2
    WHERE event_id = $3 AND member_id = $4
    RETURNING *
  `, [attended, hours, eventId, memberId]);

  return result.rows[0];
}

// Get upcoming events
export async function getUpcomingEvents(churchId, limit = 10) {
  const result = await db.query(`
    SELECT * FROM outreach_events
    WHERE church_id = $1 AND event_date >= CURRENT_DATE AND status != 'cancelled'
    ORDER BY event_date ASC
    LIMIT $2
  `, [churchId, limit]);

  return result.rows;
}

// Get events by type summary
export async function getEventsByTypeSummary(churchId) {
  const result = await db.query(`
    SELECT
      event_type,
      COUNT(*) as total_events,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_events,
      SUM(expected_attendance) as total_expected,
      SUM(actual_attendance) as total_actual
    FROM outreach_events
    WHERE church_id = $1
    GROUP BY event_type
  `, [churchId]);

  return result.rows;
}