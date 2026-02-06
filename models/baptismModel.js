import db from '../config/db.js';

// Baptism Candidates CRUD
export async function createBaptismCandidate(data) {
  const {
    church_id,
    member_id,
    visitor_id,
    first_name,
    surname,
    contact_primary,
    email,
    age,
    address,
    baptism_type,
    preferred_date,
    sponsor_1_id,
    sponsor_1_name,
    sponsor_2_id,
    sponsor_2_name,
    counseling_completed,
    counseling_date,
    counselor_id,
    foundation_class_completed,
    salvation_testimony,
    faith_journey,
    baptized_elsewhere,
    previous_church,
    preparation_notes,
    special_requests,
    created_by
  } = data;

  const result = await db.query(`
    INSERT INTO baptism_candidates (
      church_id, member_id, visitor_id, first_name, surname, contact_primary,
      email, age, address, baptism_type, preferred_date, sponsor_1_id, sponsor_1_name,
      sponsor_2_id, sponsor_2_name, counseling_completed, counseling_date, counselor_id,
      foundation_class_completed, salvation_testimony, faith_journey, baptized_elsewhere,
      previous_church, preparation_notes, special_requests, created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
      $19, $20, $21, $22, $23, $24, $25, $26
    ) RETURNING *
  `, [
    church_id, member_id, visitor_id, first_name, surname, contact_primary,
    email, age, address, baptism_type, preferred_date, sponsor_1_id, sponsor_1_name,
    sponsor_2_id, sponsor_2_name, counseling_completed, counseling_date, counselor_id,
    foundation_class_completed, salvation_testimony, faith_journey, baptized_elsewhere,
    previous_church, preparation_notes, special_requests, created_by
  ]);

  return result.rows[0];
}

export async function getBaptismCandidates(churchId, filters = {}) {
  let query = `
    SELECT
      bc.*,
      m.first_name as member_first_name, m.surname as member_surname, m.contact_primary as member_contact_primary,
      v.first_name as visitor_first_name, v.surname as visitor_surname, v.contact_primary as visitor_contact_primary,
      s1.first_name as sponsor_1_first_name, s1.surname as sponsor_1_surname,
      s2.first_name as sponsor_2_first_name, s2.surname as sponsor_2_surname,
      c.first_name as counselor_first_name, c.surname as counselor_surname
    FROM baptism_candidates bc
    LEFT JOIN members m ON bc.member_id = m.id
    LEFT JOIN visitors v ON bc.visitor_id = v.id
    LEFT JOIN members s1 ON bc.sponsor_1_id = s1.id
    LEFT JOIN members s2 ON bc.sponsor_2_id = s2.id
    LEFT JOIN members c ON bc.counselor_id = c.id
    WHERE bc.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.status) {
    query += ` AND bc.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.baptism_type) {
    query += ` AND bc.baptism_type = $${paramIndex}`;
    params.push(filters.baptism_type);
    paramIndex++;
  }

  if (filters.counseling_completed !== undefined) {
    query += ` AND bc.counseling_completed = $${paramIndex}`;
    params.push(filters.counseling_completed);
    paramIndex++;
  }

  query += ` ORDER BY bc.created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

export async function getBaptismCandidateById(candidateId, churchId) {
  const result = await db.query(`
    SELECT
      bc.*,
      m.first_name as member_first_name, m.surname as member_surname,
      v.first_name as visitor_first_name, v.surname as visitor_surname,
      s1.first_name as sponsor_1_first_name, s1.surname as sponsor_1_surname,
      s2.first_name as sponsor_2_first_name, s2.surname as sponsor_2_surname,
      c.first_name as counselor_first_name, c.surname as counselor_surname
    FROM baptism_candidates bc
    LEFT JOIN members m ON bc.member_id = m.id
    LEFT JOIN visitors v ON bc.visitor_id = v.id
    LEFT JOIN members s1 ON bc.sponsor_1_id = s1.id
    LEFT JOIN members s2 ON bc.sponsor_2_id = s2.id
    LEFT JOIN members c ON bc.counselor_id = c.id
    WHERE bc.id = $1 AND bc.church_id = $2
  `, [candidateId, churchId]);

  return result.rows[0];
}

export async function updateBaptismCandidate(candidateId, churchId, data) {
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
    UPDATE baptism_candidates
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND church_id = $${paramIndex + 1}
    RETURNING *
  `;

  params.push(candidateId, churchId);

  const result = await db.query(query, params);
  return result.rows[0];
}

// Baptism Records
export async function createBaptismRecord(data) {
  const {
    church_id,
    candidate_id,
    baptism_date,
    baptism_time,
    location,
    officiator_id,
    baptism_method,
    water_temperature,
    weather_conditions,
    witnesses,
    photographer_id,
    scripture_reading,
    prayer_offered,
    special_music,
    ceremony_notes,
    certificate_issued,
    certificate_number,
    created_by
  } = data;

  const result = await db.query(`
    INSERT INTO baptism_records (
      church_id, candidate_id, baptism_date, baptism_time, location, officiator_id,
      baptism_method, water_temperature, weather_conditions, witnesses, photographer_id,
      scripture_reading, prayer_offered, special_music, ceremony_notes,
      certificate_issued, certificate_number, created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
    ) RETURNING *
  `, [
    church_id, candidate_id, baptism_date, baptism_time, location, officiator_id,
    baptism_method, water_temperature, weather_conditions, JSON.stringify(witnesses || []),
    photographer_id, scripture_reading, prayer_offered, special_music, ceremony_notes,
    certificate_issued, certificate_number, created_by
  ]);

  return result.rows[0];
}

export async function getBaptismRecords(churchId, filters = {}) {
  let query = `
    SELECT
      br.*,
      bc.first_name, bc.surname, bc.contact_primary,
      m.contact_primary as member_contact_primary, v.contact_primary as visitor_contact_primary,
      o.first_name as officiator_first_name, o.surname as officiator_surname,
      p.first_name as photographer_first_name, p.surname as photographer_surname
    FROM baptism_records br
    JOIN baptism_candidates bc ON br.candidate_id = bc.id
    LEFT JOIN members o ON br.officiator_id = o.id
    LEFT JOIN members p ON br.photographer_id = p.id
    LEFT JOIN members m ON bc.member_id = m.id
    LEFT JOIN visitors v ON bc.visitor_id = v.id
    WHERE br.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.date_from) {
    query += ` AND br.baptism_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND br.baptism_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY br.baptism_date DESC, br.baptism_time DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

export async function getBaptismRecordById(recordId, churchId) {
  const result = await db.query(`
    SELECT
      br.*,
      bc.first_name, bc.surname, bc.contact_primary, bc.salvation_testimony,
      m.contact_primary as member_contact_primary, v.contact_primary as visitor_contact_primary,
      o.first_name as officiator_first_name, o.surname as officiator_surname,
      p.first_name as photographer_first_name, p.surname as photographer_surname
    FROM baptism_records br
    JOIN baptism_candidates bc ON br.candidate_id = bc.id
    LEFT JOIN members o ON br.officiator_id = o.id
    LEFT JOIN members p ON br.photographer_id = p.id
    LEFT JOIN members m ON bc.member_id = m.id
    LEFT JOIN visitors v ON bc.visitor_id = v.id
    WHERE br.id = $1 AND br.church_id = $2
  `, [recordId, churchId]);

  return result.rows[0];
}

// Convert candidate to baptized and create record
export async function performBaptism(candidateId, churchId, baptismData) {
  // Get candidate info first
  const candidateResult = await db.query(`
    SELECT member_id, visitor_id FROM baptism_candidates
    WHERE id = $1 AND church_id = $2
  `, [candidateId, churchId]);

  if (candidateResult.rows.length === 0) {
    throw new Error('Baptism candidate not found');
  }

  const candidate = candidateResult.rows[0];

  // Update candidate status
  await db.query(`
    UPDATE baptism_candidates
    SET status = 'completed', baptism_date = $1, updated_at = NOW()
    WHERE id = $2 AND church_id = $3
  `, [baptismData.baptism_date, candidateId, churchId]);

  // Create baptism record
  const recordData = {
    church_id: churchId,
    candidate_id: candidateId,
    ...baptismData
  };

  const record = await createBaptismRecord(recordData);

  // Add candidate member info to the returned record for integration
  record.candidate_member_id = candidate.member_id;
  record.candidate_visitor_id = candidate.visitor_id;

  return record;
}

// Get baptism statistics
export async function getBaptismStats(churchId) {
  const result = await db.query(`
    SELECT
      COUNT(*) as total_candidates,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as baptized,
      COUNT(CASE WHEN status = 'preparing' THEN 1 END) as preparing,
      COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready,
      COUNT(CASE WHEN counseling_completed = true THEN 1 END) as counseling_completed,
      COUNT(CASE WHEN foundation_class_completed = true THEN 1 END) as foundation_completed,
      AVG(age) as average_age
    FROM baptism_candidates
    WHERE church_id = $1
  `, [churchId]);

  return result.rows[0];
}

// Get upcoming baptisms
export async function getUpcomingBaptisms(churchId, limit = 10) {
  const result = await db.query(`
    SELECT
      bc.*,
      m.first_name as member_first_name, m.surname as member_surname
    FROM baptism_candidates bc
    LEFT JOIN members m ON bc.member_id = m.id
    WHERE bc.church_id = $1 AND bc.baptism_date >= CURRENT_DATE AND bc.status = 'scheduled'
    ORDER BY bc.baptism_date ASC
    LIMIT $2
  `, [churchId, limit]);

  return result.rows;
}