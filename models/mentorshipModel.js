import db from '../config/db.js';

export const assignMentor = async ({ church_id, mentor_id, mentee_id, notes }) => {
  const res = await db.query(
    `INSERT INTO mentorship_assignments (church_id, mentor_id, mentee_id, started_at, active, notes)
     VALUES ($1,$2,$3, now(), true, $4)
     RETURNING *`,
    [church_id, mentor_id, mentee_id, notes || null]
  );
  return res.rows[0];
};

export const getAssignmentsForMentor = async (churchId, mentorId) => {
  const res = await db.query(
    'SELECT * FROM mentorship_assignments WHERE church_id=$1 AND mentor_id=$2 ORDER BY started_at DESC',
    [churchId, mentorId]
  );
  const assignments = res.rows;

  // Fetch sessions for each assignment
  for (const assignment of assignments) {
    const sessionsRes = await db.query(
      'SELECT * FROM mentorship_sessions WHERE assignment_id=$1 ORDER BY session_date DESC',
      [assignment.id]
    );
    assignment.sessions = sessionsRes.rows;
  }

  return assignments;
};

export const getAssignmentsForMentee = async (churchId, menteeId) => {
  const res = await db.query('SELECT * FROM mentorship_assignments WHERE church_id=$1 AND mentee_id=$2 ORDER BY started_at DESC', [churchId, menteeId]);
  return res.rows;
};

export const createSession = async ({ assignment_id, session_date, duration_minutes, notes, created_by }) => {
  const res = await db.query(
    `INSERT INTO mentorship_sessions (assignment_id, session_date, duration_minutes, notes, created_by, created_at)
     VALUES ($1,$2,$3,$4,$5, now()) RETURNING *`,
    [assignment_id, session_date || new Date(), duration_minutes || null, notes || null, created_by || null]
  );
  return res.rows[0];
};

export const getSessionsByAssignment = async (assignmentId) => {
  const res = await db.query('SELECT * FROM mentorship_sessions WHERE assignment_id=$1 ORDER BY session_date DESC', [assignmentId]);
  return res.rows;
};

export const removeAssignment = async (churchId, id) => {
  await db.query('DELETE FROM mentorship_assignments WHERE church_id=$1 AND id=$2', [churchId, id]);
};

export const removeSession = async (churchId, sessionId) => {
  await db.query('DELETE FROM mentorship_sessions WHERE id=$1 AND assignment_id IN (SELECT id FROM mentorship_assignments WHERE church_id=$2)', [sessionId, churchId]);
};
