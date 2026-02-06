import db from '../config/db.js';

// Celebrations & Events CRUD
export async function createCelebrationEvent(data) {
  const {
    church_id,
    title,
    description,
    event_type,
    event_date,
    is_recurring,
    recurrence_pattern,
    end_date,
    primary_member,
    secondary_member,
    involved_members,
    celebration_theme,
    planned_activities,
    special_guests,
    budget_allocated,
    coordinator,
    created_by
  } = data;

  const result = await db.query(`
    INSERT INTO celebration_events (
      church_id, title, description, event_type, event_date, is_recurring,
      recurrence_pattern, end_date, primary_member, secondary_member, involved_members,
      celebration_theme, planned_activities, special_guests, budget_allocated,
      coordinator, created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
    ) RETURNING *
  `, [
    church_id, title, description, event_type, event_date, is_recurring,
    recurrence_pattern, end_date, primary_member, secondary_member,
    JSON.stringify(involved_members || []), celebration_theme, planned_activities,
    special_guests, budget_allocated, coordinator, created_by
  ]);

  return result.rows[0];
}

export async function getCelebrationEvents(churchId, filters = {}) {
  let query = `
    SELECT
      ce.*,
      pm.first_name as primary_first_name, pm.surname as primary_surname,
      sm.first_name as secondary_first_name, sm.surname as secondary_surname,
      c.first_name as coordinator_first_name, c.surname as coordinator_surname,
      jsonb_array_length(ce.involved_members) as involved_count
    FROM celebration_events ce
    LEFT JOIN members pm ON ce.primary_member = pm.id
    LEFT JOIN members sm ON ce.secondary_member = sm.id
    LEFT JOIN members c ON ce.coordinator = c.id
    WHERE ce.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.event_type) {
    query += ` AND ce.event_type = $${paramIndex}`;
    params.push(filters.event_type);
    paramIndex++;
  }

  if (filters.status) {
    query += ` AND ce.planning_status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.upcoming_only) {
    query += ` AND ce.event_date >= CURRENT_DATE`;
  }

  if (filters.date_from) {
    query += ` AND ce.event_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND ce.event_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY ce.event_date DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

export async function getCelebrationEventById(eventId, churchId) {
  const result = await db.query(`
    SELECT
      ce.*,
      pm.first_name as primary_first_name, pm.surname as primary_surname,
      sm.first_name as secondary_first_name, sm.surname as secondary_surname,
      c.first_name as coordinator_first_name, c.surname as coordinator_surname
    FROM celebration_events ce
    LEFT JOIN members pm ON ce.primary_member = pm.id
    LEFT JOIN members sm ON ce.secondary_member = sm.id
    LEFT JOIN members c ON ce.coordinator = c.id
    WHERE ce.id = $1 AND ce.church_id = $2
  `, [eventId, churchId]);

  return result.rows[0];
}

export async function updateCelebrationEvent(eventId, churchId, data) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && key !== 'id' && key !== 'church_id') {
      if (key === 'involved_members') {
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
    UPDATE celebration_events
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
    RETURNING *
  `;

  params.push(eventId, churchId);

  const result = await db.query(query, params);
  return result.rows[0];
}

// Special Dates Management
export async function createSpecialDate(data) {
  const {
    church_id,
    member_id,
    date_type,
    special_date,
    description,
    wants_celebration,
    celebration_preferences,
    gift_suggestions,
    dietary_restrictions
  } = data;

  const result = await db.query(`
    INSERT INTO special_dates (
      church_id, member_id, date_type, special_date, description,
      wants_celebration, celebration_preferences, gift_suggestions, dietary_restrictions
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    church_id, member_id, date_type, special_date, description,
    wants_celebration, celebration_preferences, gift_suggestions, dietary_restrictions
  ]);

  return result.rows[0];
}

export async function getSpecialDates(churchId, filters = {}) {
  let query = `
    SELECT
      sd.*,
      m.first_name, m.surname, m.contact_primary
    FROM special_dates sd
    JOIN members m ON sd.member_id = m.id
    WHERE sd.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.date_type) {
    query += ` AND sd.date_type = $${paramIndex}`;
    params.push(filters.date_type);
    paramIndex++;
  }

  if (filters.upcoming_only) {
    query += ` AND sd.special_date >= CURRENT_DATE`;
  }

  if (filters.month) {
    query += ` AND EXTRACT(MONTH FROM sd.special_date) = $${paramIndex}`;
    params.push(filters.month);
    paramIndex++;
  }

  query += ` ORDER BY sd.special_date ASC`;

  const result = await db.query(query, params);
  return result.rows;
}

export async function updateSpecialDate(dateId, data) {
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
    UPDATE special_dates
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  params.push(dateId);

  const result = await db.query(query, params);
  return result.rows[0];
}

// Achievements Management
export async function createAchievement(data) {
  const {
    church_id,
    member_id,
    achievement_type,
    title,
    description,
    achievement_date,
    awarded_by,
    significance_level,
    recognition_given,
    impact_description
  } = data;

  const result = await db.query(`
    INSERT INTO achievements (
      church_id, member_id, achievement_type, title, description, achievement_date,
      awarded_by, significance_level, recognition_given, impact_description
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    church_id, member_id, achievement_type, title, description, achievement_date,
    awarded_by, significance_level, recognition_given, impact_description
  ]);

  return result.rows[0];
}

export async function getAchievements(churchId, filters = {}) {
  let query = `
    SELECT
      a.*,
      m.first_name, m.surname,
      aw.first_name as awarded_by_first_name, aw.surname as awarded_by_surname
    FROM achievements a
    JOIN members m ON a.member_id = m.id
    LEFT JOIN members aw ON a.awarded_by = aw.id
    WHERE a.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.achievement_type) {
    query += ` AND a.achievement_type = $${paramIndex}`;
    params.push(filters.achievement_type);
    paramIndex++;
  }

  if (filters.member_id) {
    query += ` AND a.member_id = $${paramIndex}`;
    params.push(filters.member_id);
    paramIndex++;
  }

  query += ` ORDER BY a.achievement_date DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

// Get upcoming celebrations and special dates
export async function getUpcomingCelebrations(churchId, days = 30) {
  const result = await db.query(`
    SELECT
      'celebration' as type,
      ce.id,
      ce.title as event_title,
      ce.event_date,
      ce.event_type,
      pm.first_name || ' ' || pm.surname as person_name,
      ce.description
    FROM celebration_events ce
    LEFT JOIN members pm ON ce.primary_member = pm.id
    WHERE ce.church_id = $1 AND ce.event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'

    UNION ALL

    SELECT
      'special_date' as type,
      sd.id,
      sd.date_type as event_title,
      sd.special_date as event_date,
      sd.date_type as event_type,
      m.first_name || ' ' || m.surname as person_name,
      sd.description
    FROM special_dates sd
    JOIN members m ON sd.member_id = m.id
    WHERE sd.church_id = $1 AND sd.special_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${days} days'
    ORDER BY event_date ASC
  `, [churchId]);

  return result.rows;
}

// Get celebration statistics
export async function getCelebrationStats(churchId) {
  const result = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM celebration_events WHERE church_id = $1) as total_events,
      (SELECT COUNT(*) FROM special_dates WHERE church_id = $1) as total_special_dates,
      (SELECT COUNT(*) FROM achievements WHERE church_id = $1) as total_achievements,
      (SELECT COUNT(*) FROM celebration_events WHERE church_id = $1 AND planning_status = 'completed') as completed_events
  `, [churchId]);

  return result.rows[0];
}
