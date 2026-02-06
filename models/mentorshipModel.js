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
    `SELECT ma.*, m.first_name AS mentee_first_name, m.surname AS mentee_surname
     FROM mentorship_assignments ma
     JOIN members m ON m.id = ma.mentee_id
     WHERE ma.church_id=$1 AND ma.mentor_id=$2
     ORDER BY ma.started_at DESC`,
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
  const res = await db.query(
    `SELECT ma.*, m.first_name AS mentor_first_name, m.surname AS mentor_surname
     FROM mentorship_assignments ma
     JOIN members m ON m.id = ma.mentor_id
     WHERE ma.church_id=$1 AND ma.mentee_id=$2
     ORDER BY ma.started_at DESC`,
    [churchId, menteeId]
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

// New: summary for mentorship
export const getSummary = async (churchId) => {
  const params = [churchId];

  // totals
  const totalsQ = `
    SELECT
      (SELECT COUNT(*) FROM mentorship_assignments ma WHERE ma.church_id = $1)::int AS total_assignments,
      (SELECT COUNT(*) FROM mentorship_assignments ma WHERE ma.church_id = $1 AND ma.active)::int AS active_assignments,
      (SELECT COUNT(*) FROM mentorship_sessions ms WHERE ms.assignment_id IN (SELECT id FROM mentorship_assignments WHERE church_id = $1))::int AS total_sessions
  `;
  const totalsRes = await db.query(totalsQ, params);

  const total_assignments = totalsRes.rows[0]?.total_assignments || 0;
  const total_sessions = totalsRes.rows[0]?.total_sessions || 0;

  // recent assignments
  const recentAssignmentsQ = `
    SELECT ma.*, mentor.first_name AS mentor_first_name, mentor.surname AS mentor_surname,
           mentee.first_name AS mentee_first_name, mentee.surname AS mentee_surname
    FROM mentorship_assignments ma
    LEFT JOIN members mentor ON mentor.id = ma.mentor_id
    LEFT JOIN members mentee ON mentee.id = ma.mentee_id
    WHERE ma.church_id = $1
    ORDER BY ma.started_at DESC
    LIMIT 10
  `;
  const recentAssignmentsRes = await db.query(recentAssignmentsQ, params);

  // recent sessions
  const recentSessionsQ = `
    SELECT ms.*, ma.mentor_id, ma.mentee_id,
           mentor.first_name AS mentor_first_name, mentor.surname AS mentor_surname,
           mentee.first_name AS mentee_first_name, mentee.surname AS mentee_surname
    FROM mentorship_sessions ms
    JOIN mentorship_assignments ma ON ma.id = ms.assignment_id
    LEFT JOIN members mentor ON mentor.id = ma.mentor_id
    LEFT JOIN members mentee ON mentee.id = ma.mentee_id
    WHERE ma.church_id = $1
    ORDER BY ms.session_date DESC
    LIMIT 10
  `;
  const recentSessionsRes = await db.query(recentSessionsQ, params);

  return {
    totals: {
      totalAssignments: Number(total_assignments),
      activeAssignments: Number(totalsRes.rows[0]?.active_assignments || 0),
      totalSessions: Number(total_sessions)
    },
    stats: {
      avgSessionsPerAssignment: total_assignments === 0 ? 0 : Number((total_sessions / total_assignments).toFixed(2))
    },
    recentAssignments: recentAssignmentsRes.rows || [],
    recentSessions: recentSessionsRes.rows || []
  };
};

export const getAssignmentById = async (churchId, assignmentId) => {
  const res = await db.query(
    `SELECT ma.*, 
            mentor.id AS mentor_member_id, mentor.user_id AS mentor_user_id, mentor.first_name AS mentor_first_name, mentor.surname AS mentor_surname,
            mentee.id AS mentee_member_id, mentee.user_id AS mentee_user_id, mentee.first_name AS mentee_first_name, mentee.surname AS mentee_surname
     FROM mentorship_assignments ma
     LEFT JOIN members mentor ON mentor.id = ma.mentor_id
     LEFT JOIN members mentee ON mentee.id = ma.mentee_id
     WHERE ma.church_id = $1 AND ma.id = $2
     LIMIT 1`,
    [churchId, assignmentId]
  );
  const assignment = res.rows[0];
  if (!assignment) return null;

  const sessionsRes = await db.query(
    'SELECT * FROM mentorship_sessions WHERE assignment_id = $1 ORDER BY session_date DESC',
    [assignment.id]
  );
  assignment.sessions = sessionsRes.rows || [];
  return assignment;
};

export const getSessionById = async (churchId, sessionId) => {
  const res = await db.query(
    `SELECT ms.*, ma.id AS assignment_id, ma.mentor_id, ma.mentee_id
     FROM mentorship_sessions ms
     JOIN mentorship_assignments ma ON ma.id = ms.assignment_id
     WHERE ms.id = $1 AND ma.church_id = $2
     LIMIT 1`,
    [sessionId, churchId]
  );
  return res.rows[0] || null;
};

export const updateAssignment = async (churchId, id, changes = {}) => {
  const allowed = ['mentor_id', 'mentee_id', 'notes', 'active', 'started_at'];
  const keys = Object.keys(changes).filter(k => allowed.includes(k));
  if (keys.length === 0) return null;

  const sets = keys.map((k, i) => `${k} = $${i + 3}`);
  const params = [churchId, id, ...keys.map(k => changes[k])];

  const q = `UPDATE mentorship_assignments SET ${sets.join(', ')}
             WHERE church_id = $1 AND id = $2 RETURNING *`;
  const res = await db.query(q, params);
  return res.rows[0] || null;
};

export const updateSession = async (churchId, sessionId, changes = {}) => {
  // ensure the session belongs to an assignment in this church
  const allowed = ['session_date', 'duration_minutes', 'notes', 'updated_by'];
  const keys = Object.keys(changes).filter(k => allowed.includes(k));
  if (keys.length === 0) return null;

  // Build dynamic update but restrict by church via sub-select
  const sets = keys.map((k, i) => `${k} = $${i + 1}`);
  const params = keys.map(k => changes[k]);
  params.push(sessionId, churchId);

  const q = `UPDATE mentorship_sessions
             SET ${sets.join(', ')}, updated_at = now()
             WHERE id = $${keys.length + 1}
               AND assignment_id IN (SELECT id FROM mentorship_assignments WHERE church_id = $${keys.length + 2})
             RETURNING *`;
  const res = await db.query(q, params);
  return res.rows[0] || null;
};