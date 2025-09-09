import db from '../config/db.js';

export const getEnrollmentByMember = async (churchId, memberId) => {
  const res = await db.query('SELECT * FROM foundation_school_enrollments WHERE church_id=$1 AND member_id=$2 ORDER BY enrolled_at DESC', [churchId, memberId]);
  return res.rows;
};

export const createEnrollment = async ({ church_id, member_id, level = 1, status = 'enrolled', notes }) => {
  const completed_at = status === 'completed' ? new Date() : null;
  const res = await db.query(
    `INSERT INTO foundation_school_enrollments (church_id, member_id, level, status, enrolled_at, completed_at, notes)
     VALUES ($1,$2,$3,$4, now(), $5, $6)
     RETURNING *`,
    [church_id, member_id, level, status, completed_at, notes || null]
  );
  return res.rows[0];
};

export const updateEnrollment = async (churchId, id, { level, status, completed_at, notes }) => {
  const res = await db.query(
    `UPDATE foundation_school_enrollments
     SET level = COALESCE($1, level),
         status = COALESCE($2, status),
         completed_at = COALESCE($3, completed_at),
         notes = COALESCE($4, notes)
     WHERE church_id=$5 AND id = $6 RETURNING *`,
    [level, status, completed_at, notes, churchId, id]
  );
  return res.rows[0];
};

export const deleteEnrollment = async (churchId, id) => {
  await db.query('DELETE FROM foundation_school_enrollments WHERE church_id=$1 AND id=$2', [churchId, id]);
};
