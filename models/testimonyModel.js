import db from '../config/db.js';

// Testimony Log CRUD
export async function createTestimony(data) {
  const {
    church_id,
    member_id,
    testifier_name,
    contact_info,
    testimony_date,
    testimony_type,
    title,
    testimony_text,
    circumstance,
    how_god_intervened,
    life_impact,
    lessons_learned,
    shared_in_service,
    service_date,
    shared_online,
    shared_in_cell,
    photos,
    videos,
    audio_recording,
    is_approved,
    approved_by,
    approved_date,
    is_published,
    published_date,
    follow_up_needed,
    follow_up_date,
    follow_up_notes,
    recorded_by
  } = data;

  const result = await db.query(`
    INSERT INTO testimony_log (
      church_id, member_id, testifier_name, contact_info, testimony_date,
      testimony_type, title, testimony_text, circumstance, how_god_intervened,
      life_impact, lessons_learned, shared_in_service, service_date,
      shared_online, shared_in_cell, photos, videos, audio_recording,
      is_approved, approved_by, approved_date, is_published, published_date,
      follow_up_needed, follow_up_date, follow_up_notes, recorded_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
    ) RETURNING *
  `, [
    church_id, member_id, testifier_name, contact_info, testimony_date,
    testimony_type, title, testimony_text, circumstance, how_god_intervened,
    life_impact, lessons_learned, shared_in_service, service_date,
    shared_online, shared_in_cell, JSON.stringify(photos || []), JSON.stringify(videos || []),
    audio_recording, is_approved, approved_by, approved_date, is_published,
    published_date, follow_up_needed, follow_up_date, follow_up_notes, recorded_by
  ]);

  return result.rows[0];
}

export async function getTestimonies(churchId, filters = {}) {
  let query = `
    SELECT
      tl.*,
      m.first_name, m.surname, m.contact_primary,
      ab.first_name as approved_by_first_name, ab.surname as approved_by_surname,
      rb.first_name as recorded_by_first_name, rb.surname as recorded_by_surname
    FROM testimony_log tl
    LEFT JOIN members m ON tl.member_id = m.id
    LEFT JOIN members ab ON tl.approved_by = ab.id
    LEFT JOIN members rb ON tl.recorded_by = rb.id
    WHERE tl.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.testimony_type) {
    query += ` AND tl.testimony_type = $${paramIndex}`;
    params.push(filters.testimony_type);
    paramIndex++;
  }

  if (filters.is_approved !== undefined) {
    query += ` AND tl.is_approved = $${paramIndex}`;
    params.push(filters.is_approved);
    paramIndex++;
  }

  if (filters.is_published !== undefined) {
    query += ` AND tl.is_published = $${paramIndex}`;
    params.push(filters.is_published);
    paramIndex++;
  }

  if (filters.member_id) {
    query += ` AND tl.member_id = $${paramIndex}`;
    params.push(filters.member_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND tl.testimony_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND tl.testimony_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY tl.testimony_date DESC, tl.created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

export async function getTestimonyById(testimonyId, churchId) {
  const result = await db.query(`
    SELECT
      tl.*,
      m.first_name, m.surname, m.contact_primary,
      ab.first_name as approved_by_first_name, ab.surname as approved_by_surname,
      rb.first_name as recorded_by_first_name, rb.surname as recorded_by_surname
    FROM testimony_log tl
    LEFT JOIN members m ON tl.member_id = m.id
    LEFT JOIN members ab ON tl.approved_by = ab.id
    LEFT JOIN members rb ON tl.recorded_by = rb.id
    WHERE tl.id = $1 AND tl.church_id = $2
  `, [testimonyId, churchId]);

  return result.rows[0];
}

export async function updateTestimony(testimonyId, churchId, data) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && key !== 'id' && key !== 'church_id') {
      if (['photos', 'videos'].includes(key)) {
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
    UPDATE testimony_log
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
    RETURNING *
  `;

  params.push(testimonyId, churchId);

  const result = await db.query(query, params);
  return result.rows[0];
}

// Approve and publish testimony
export async function approveTestimony(testimonyId, churchId, approverId) {
  const result = await db.query(`
    UPDATE testimony_log
    SET is_approved = TRUE, approved_by = $1, approved_date = CURRENT_DATE, updated_at = NOW()
    WHERE id = $2 AND church_id = $3
    RETURNING *
  `, [approverId, testimonyId, churchId]);

  return result.rows[0];
}

export async function publishTestimony(testimonyId, churchId) {
  const result = await db.query(`
    UPDATE testimony_log
    SET is_published = TRUE, published_date = CURRENT_DATE, updated_at = NOW()
    WHERE id = $1 AND church_id = $2
    RETURNING *
  `, [testimonyId, churchId]);

  return result.rows[0];
}

// Get testimony statistics
export async function getTestimonyStats(churchId) {
  const result = await db.query(`
    SELECT
      COUNT(*) as total_testimonies,
      COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_testimonies,
      COUNT(CASE WHEN is_published = true THEN 1 END) as published_testimonies,
      COUNT(CASE WHEN follow_up_needed = true THEN 1 END) as needs_followup,
      COUNT(DISTINCT member_id) as unique_testifiers,
      AVG(LENGTH(testimony_text)) as avg_testimony_length
    FROM testimony_log
    WHERE church_id = $1
  `, [churchId]);

  return result.rows[0];
}

// Get testimonies by type
export async function getTestimoniesByType(churchId) {
  const result = await db.query(`
    SELECT
      testimony_type,
      COUNT(*) as count,
      COUNT(CASE WHEN is_published = true THEN 1 END) as published_count
    FROM testimony_log
    WHERE church_id = $1
    GROUP BY testimony_type
    ORDER BY count DESC
  `, [churchId]);

  return result.rows;
}

// Get recent published testimonies for display
export async function getPublishedTestimonies(churchId, limit = 10) {
  const result = await db.query(`
    SELECT
      tl.*,
      m.first_name, m.surname
    FROM testimony_log tl
    LEFT JOIN members m ON tl.member_id = m.id
    WHERE tl.church_id = $1 AND tl.is_published = TRUE
    ORDER BY tl.published_date DESC, tl.testimony_date DESC
    LIMIT $2
  `, [churchId, limit]);

  return result.rows;
}

// Get testimonies needing follow-up
export async function getTestimoniesNeedingFollowup(churchId) {
  const result = await db.query(`
    SELECT
      tl.*,
      m.first_name, m.surname, m.contact_primary
    FROM testimony_log tl
    LEFT JOIN members m ON tl.member_id = m.id
    WHERE tl.church_id = $1 AND tl.follow_up_needed = TRUE
    AND (tl.follow_up_date IS NULL OR tl.follow_up_date <= CURRENT_DATE)
    ORDER BY tl.follow_up_date ASC, tl.testimony_date DESC
  `, [churchId]);

  return result.rows;
}