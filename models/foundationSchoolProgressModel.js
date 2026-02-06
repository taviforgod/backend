import db from '../config/db.js';

// Foundation School Progress CRUD
export async function createProgressEntry(data) {
  const {
    church_id,
    enrollment_id,
    module_number,
    module_title,
    module_description
  } = data;

  const result = await db.query(`
    INSERT INTO foundation_school_progress (
      church_id, enrollment_id, module_number, module_title, module_description
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [church_id, enrollment_id, module_number, module_title, module_description]);

  return result.rows[0];
}

export async function getProgressByEnrollment(enrollmentId) {
  const result = await db.query(`
    SELECT * FROM foundation_school_progress
    WHERE enrollment_id = $1
    ORDER BY module_number ASC
  `, [enrollmentId]);

  return result.rows;
}

export async function updateProgressEntry(progressId, data) {
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
    UPDATE foundation_school_progress
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  params.push(progressId);

  const result = await db.query(query, params);
  return result.rows[0];
}

export async function getModuleProgress(enrollmentId, moduleNumber) {
  const result = await db.query(`
    SELECT * FROM foundation_school_progress
    WHERE enrollment_id = $1 AND module_number = $2
    LIMIT 1
  `, [enrollmentId, moduleNumber]);

  return result.rows[0];
}

// Foundation School Modules CRUD
export async function getFoundationModules(churchId, level = null) {
  let query = `
    SELECT * FROM foundation_school_modules
    WHERE church_id = $1 AND is_active = true
  `;
  const params = [churchId];

  if (level) {
    query += ` AND level = $2`;
    params.push(level);
  }

  query += ` ORDER BY level ASC, sort_order ASC`;

  const result = await db.query(query, params);
  return result.rows;
}

export async function createFoundationModule(data) {
  const {
    church_id,
    level,
    module_number,
    module_title,
    module_description,
    objectives,
    key_scriptures,
    main_topics,
    assignments,
    assessment_criteria,
    estimated_weeks,
    required_reading,
    additional_resources,
    created_by
  } = data;

  const result = await db.query(`
    INSERT INTO foundation_school_modules (
      church_id, level, module_number, module_title, module_description,
      objectives, key_scriptures, main_topics, assignments, assessment_criteria,
      estimated_weeks, required_reading, additional_resources, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `, [
    church_id, level, module_number, module_title, module_description,
    objectives, key_scriptures, main_topics, assignments, assessment_criteria,
    estimated_weeks, required_reading, additional_resources, created_by
  ]);

  return result.rows[0];
}

// Initialize progress for new enrollment
export async function initializeStudentProgress(enrollmentId, churchId) {
  // Get all modules for the enrollment level
  const enrollmentResult = await db.query(`
    SELECT level FROM foundation_school_enrollments WHERE id = $1
  `, [enrollmentId]);

  if (enrollmentResult.rows.length === 0) return [];

  const level = enrollmentResult.rows[0].level;
  const modules = await getFoundationModules(churchId, level);

  // Create progress entries for each module
  const progressEntries = [];
  for (const module of modules) {
    const progressData = {
      church_id: churchId,
      enrollment_id: enrollmentId,
      module_number: module.module_number,
      module_title: module.module_title,
      module_description: module.module_description
    };

    const progressEntry = await createProgressEntry(progressData);
    progressEntries.push(progressEntry);
  }

  return progressEntries;
}

// Get student progress summary
export async function getStudentProgressSummary(enrollmentId) {
  const result = await db.query(`
    SELECT
      COUNT(*) as total_modules,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_modules,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_modules,
      ROUND(AVG(assessment_score), 2) as average_score,
      MAX(completed_date) as last_completed_date
    FROM foundation_school_progress
    WHERE enrollment_id = $1
  `, [enrollmentId]);

  return result.rows[0];
}

// Foundation School Certificates
export async function createCertificate(data) {
  const {
    church_id,
    enrollment_id,
    certificate_type,
    certificate_number,
    issued_date,
    issued_by,
    student_name,
    level_completed,
    completion_date,
    gpa_score
  } = data;

  const result = await db.query(`
    INSERT INTO foundation_school_certificates (
      church_id, enrollment_id, certificate_type, certificate_number,
      issued_date, issued_by, student_name, level_completed, completion_date, gpa_score
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    church_id, enrollment_id, certificate_type, certificate_number,
    issued_date, issued_by, student_name, level_completed, completion_date, gpa_score
  ]);

  return result.rows[0];
}

export async function getCertificatesByEnrollment(enrollmentId) {
  const result = await db.query(`
    SELECT * FROM foundation_school_certificates
    WHERE enrollment_id = $1
    ORDER BY issued_date DESC
  `, [enrollmentId]);

  return result.rows;
}