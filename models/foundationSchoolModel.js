import db from '../config/db.js';

export async function getFoundationClasses(churchId) {
  const result = await db.query(
    'SELECT * FROM foundation_classes WHERE church_id = $1 ORDER BY name',
    [churchId]
  );
  return result.rows;
}

export async function getFoundationEnrollments(churchId, filters = {}) {
  let query = `
    SELECT
      fe.*,
      m.first_name, m.surname, m.contact_primary,
      fc.name as class_name, fc.description as class_description,
      fc.start_date as class_start_date, fc.end_date as class_end_date
    FROM foundation_school_enrollments fe
    JOIN members m ON fe.member_id = m.id
    LEFT JOIN foundation_classes fc ON fe.class_id = fc.id
    WHERE fe.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.class_id) {
    query += ` AND fe.class_id = $${paramIndex}`;
    params.push(filters.class_id);
    paramIndex++;
  }

  if (filters.status) {
    query += ` AND fe.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  query += ` ORDER BY fe.enrolled_at DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
  }

  const result = await db.query(query, params);
  return result.rows;
}

export async function enrollMemberInClass(data) {
  const { church_id, member_id, class_id, level = 1, notes } = data;

  const result = await db.query(`
    INSERT INTO foundation_school_enrollments (
      church_id, member_id, class_id, level, status, enrolled_at, notes
    ) VALUES ($1, $2, $3, $4, 'enrolled', NOW(), $5)
    RETURNING *
  `, [church_id, member_id, class_id, level, notes || null]);

  return result.rows[0];
}

export async function updateEnrollmentProgress(enrollmentId, data) {
  const { level, status, notes } = data;

  let query = 'UPDATE foundation_school_enrollments SET ';
  const params = [];
  let paramIndex = 1;

  if (level !== undefined) {
    query += `level = $${paramIndex}, `;
    params.push(level);
    paramIndex++;
  }

  if (status !== undefined) {
    query += `status = $${paramIndex}, `;
    params.push(status);
    paramIndex++;

    // Set completed_at when status is completed
    if (status === 'completed') {
      query += `completed_at = NOW(), `;
    } else if (status !== 'completed') {
      query += `completed_at = NULL, `;
    }
  }

  if (notes !== undefined) {
    query += `notes = $${paramIndex}, `;
    params.push(notes);
    paramIndex++;
  }

  query = query.slice(0, -2); // Remove trailing comma and space
  query += ` WHERE id = $${paramIndex} RETURNING *`;
  params.push(enrollmentId);

  const result = await db.query(query, params);
  return result.rows[0];
}

export async function addSessionAttendance(data) {
  const { enrollment_id, session_date, module_number, topic, attendance_marked, session_notes, homework_assigned, homework_completed, created_by } = data;

  const result = await db.query(`
    INSERT INTO foundation_school_sessions (
      enrollment_id, session_date, module_number, topic, attendance_marked,
      session_notes, homework_assigned, homework_completed, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [enrollment_id, session_date, module_number, topic || null, attendance_marked, session_notes || null, homework_assigned || null, homework_completed, created_by]);

  return result.rows[0];
}

export async function getEnrollmentSessions(enrollmentId) {
  const result = await db.query(`
    SELECT * FROM foundation_school_sessions
    WHERE enrollment_id = $1
    ORDER BY session_date DESC
  `, [enrollmentId]);

  return result.rows;
}

export async function getFoundationSchoolStats(churchId) {
  const result = await db.query(`
    SELECT
      COUNT(DISTINCT fe.id) as total_enrollments,
      COUNT(DISTINCT CASE WHEN fe.status = 'completed' THEN fe.id END) as completed_courses,
      COUNT(DISTINCT CASE WHEN fe.status = 'enrolled' THEN fe.id END) as active_students,
      COUNT(DISTINCT fe.member_id) as unique_students,
      AVG(fe.level) as avg_level
    FROM foundation_school_enrollments fe
    WHERE fe.church_id = $1
  `, [churchId]);

  return result.rows[0];
}