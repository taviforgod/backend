import db from '../config/db.js';

export const getEnrollmentByMember = async (churchId, memberId) => {
  const res = await db.query(
    'SELECT * FROM foundation_school_enrollments WHERE church_id=$1 AND member_id=$2 ORDER BY enrolled_at DESC',
    [churchId, memberId]
  );
  return res.rows;
};

/** Check if member is actively enrolled at level */
export const activeEnrollmentInLevel = async (churchId, memberId, level) => {
  const res = await db.query(
    `SELECT 1 FROM foundation_school_enrollments
     WHERE church_id=$1 AND member_id=$2 AND level=$3 AND status NOT IN ('completed', 'dropped')
     LIMIT 1`,
    [churchId, memberId, level]
  );
  return res.rows.length > 0;
};

export const createEnrollment = async ({ church_id, member_id, level = 1, status = 'enrolled', notes, class_id }) => {
  const completed_at = status === 'completed' ? new Date() : null;
  const res = await db.query(
    `INSERT INTO foundation_school_enrollments (church_id, member_id, level, status, enrolled_at, completed_at, notes, class_id)
     VALUES ($1,$2,$3,$4, now(), $5, $6, $7)
     RETURNING *`,
    [church_id, member_id, level, status, completed_at, notes || null, class_id || null]
  );
  return res.rows[0];
};

export const updateEnrollment = async (churchId, id, { level, status, completed_at, notes, class_id }) => {
  const res = await db.query(
    `UPDATE foundation_school_enrollments
     SET level = COALESCE($1, level),
         status = COALESCE($2, status),
         completed_at = COALESCE($3, completed_at),
         notes = COALESCE($4, notes),
         class_id = COALESCE($5, class_id)
     WHERE church_id=$6 AND id = $7 RETURNING *`,
    [level, status, completed_at, notes, class_id, churchId, id]
  );
  return res.rows[0];
};

export const deleteEnrollment = async (churchId, id) => {
  await db.query('DELETE FROM foundation_school_enrollments WHERE church_id=$1 AND id=$2', [churchId, id]);
};

/** Get by enrollment id */
export const getEnrollmentById = async (churchId, id) => {
  const res = await db.query(
    'SELECT * FROM foundation_school_enrollments WHERE church_id=$1 AND id=$2',
    [churchId, id]
  );
  return res.rows[0];
};

/** Get all enrollments for a church */
export const getAllEnrollments = async (churchId) => {
  const res = await db.query(
    'SELECT * FROM foundation_school_enrollments WHERE church_id=$1 ORDER BY enrolled_at DESC',
    [churchId]
  );
  return res.rows;
};

/** List available classes in the church. Replace table and fields to match your structure. */
export const getAvailableClasses = async (churchId) => {
  const res = await db.query(
    'SELECT * FROM foundation_classes WHERE church_id=$1 ORDER BY name ASC',
    [churchId]
  );
  return res.rows;
};
