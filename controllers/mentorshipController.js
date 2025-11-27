import * as model from '../models/mentorshipModel.js';
import db from '../config/db.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';

// Note: keep functions small and synchronous-looking; errors are reported and returned to client

export const assignMentorCtrl = async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const actorId = req.user.id;
    const { mentor_id, mentee_id, notes } = req.body;
    if (!mentor_id || !mentee_id) return res.status(400).json({ error: 'mentor_id and mentee_id required' });

    const assign = await model.assignMentor({ church_id: churchId, mentor_id, mentee_id, notes });

    // best-effort notifications (fire-and-forget)
    (async () => {
      try {
        const { rows } = await db.query(
          `SELECT id, first_name, surname, user_id FROM members WHERE id = ANY($1::int[]) AND church_id = $2`,
          [[mentor_id, mentee_id], churchId]
        );
        const mentor = rows.find(r => r.id === Number(mentor_id));
        const mentee = rows.find(r => r.id === Number(mentee_id));
        const io = getIO();

        if (mentor?.user_id) {
          try {
            const note = await notificationModel.createNotification({
              church_id: churchId,
              user_id: mentor.user_id,
              title: 'New Mentorship Assignment',
              message: `You have been assigned a mentee: ${mentee ? `${mentee.first_name} ${mentee.surname}` : `#${mentee_id}`}.`,
              channel: 'inapp',
              metadata: { type: 'mentorship', event: 'assigned', assignment_id: assign.id, mentee_id },
              link: `/mentorship/assignments/${assign.id}`
            });
            if (io) io.to(`user:${mentor.user_id}`).emit('notification', note);
          } catch (err) { console.error('notify:assignMentor:mentor', err); }
        }

        if (mentee?.user_id) {
          try {
            const note = await notificationModel.createNotification({
              church_id: churchId,
              user_id: mentee.user_id,
              title: 'Assigned a Mentor',
              message: `You have been assigned a mentor: ${mentor ? `${mentor.first_name} ${mentor.surname}` : `#${mentor_id}`}.`,
              channel: 'inapp',
              metadata: { type: 'mentorship', event: 'assigned', assignment_id: assign.id, mentor_id },
              link: `/mentorship/assignments/${assign.id}`
            });
            if (io) io.to(`user:${mentee.user_id}`).emit('notification', note);
          } catch (err) { console.error('notify:assignMentor:mentee', err); }
        }

        try {
          const note = await notificationModel.createNotification({
            church_id: churchId,
            user_id: actorId,
            title: 'Mentorship Assignment Created',
            message: `Mentor assignment created (${mentor_id} → ${mentee_id}).`,
            channel: 'inapp',
            metadata: { type: 'mentorship', event: 'assignment_created', assignment_id: assign.id },
            link: `/mentorship/assignments/${assign.id}`
          });
          if (io) io.to(`user:${actorId}`).emit('notification', note);
        } catch (err) { console.error('notify:assignMentor:actor', err); }
      } catch (notifyErr) {
        console.error('assignMentor notifications error', notifyErr);
      }
    })();

    res.status(201).json(assign);
  } catch (err) {
    console.error('assignMentorCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to create assignment' });
  }
};

export const getMentorAssignments = async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const mentorId = req.params.mentor_id;
    const rows = await model.getAssignmentsForMentor(churchId, mentorId);
    res.json(rows);
  } catch (err) {
    console.error('getMentorAssignments error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch assignments' });
  }
};

export const getMenteeAssignments = async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const menteeId = req.params.mentee_id;
    const rows = await model.getAssignmentsForMentee(churchId, menteeId);
    res.json(rows);
  } catch (err) {
    console.error('getMenteeAssignments error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch assignments' });
  }
};

// NEW: Get mentor assignments for current user
export const getMentorAssignmentsForCurrentUser = async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const userId = req.user.id || req.user.userId;
    const memberRes = await db.query(
      'SELECT id FROM members WHERE user_id = $1 AND church_id = $2 LIMIT 1',
      [userId, churchId]
    );
    const memberId = memberRes.rows[0]?.id;
    if (!memberId) return res.status(404).json({ error: 'No member found for user' });
    const rows = await model.getAssignmentsForMentor(churchId, memberId);
    res.json(rows);
  } catch (err) {
    console.error('getMentorAssignmentsForCurrentUser error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch assignments' });
  }
};

// NEW: Get mentee assignments for current user
export const getMenteeAssignmentsForCurrentUser = async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const userId = req.user.id || req.user.userId;
    const memberRes = await db.query(
      'SELECT id FROM members WHERE user_id = $1 AND church_id = $2 LIMIT 1',
      [userId, churchId]
    );
    const memberId = memberRes.rows[0]?.id;
    if (!memberId) return res.status(404).json({ error: 'No member found for user' });
    const rows = await model.getAssignmentsForMentee(churchId, memberId);
    res.json(rows);
  } catch (err) {
    console.error('getMenteeAssignmentsForCurrentUser error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch assignments' });
  }
};

export const createSessionCtrl = async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const actorId = req.user.id;
    const { assignment_id, session_date, duration_minutes, notes, created_by } = req.body;
    if (!assignment_id) return res.status(400).json({ error: 'assignment_id required' });
    const session = await model.createSession({ assignment_id, session_date, duration_minutes, notes, created_by: created_by || actorId });

    (async () => {
      try {
        const { rows } = await db.query(
          `SELECT a.id, a.mentor_id, a.mentee_id,
                  m1.user_id AS mentor_user_id, m1.first_name AS mentor_first_name, m1.surname AS mentor_surname,
                  m2.user_id AS mentee_user_id, m2.first_name AS mentee_first_name, m2.surname AS mentee_surname
           FROM mentorship_assignments a
           LEFT JOIN members m1 ON m1.id = a.mentor_id
           LEFT JOIN members m2 ON m2.id = a.mentee_id
           WHERE a.id = $1 AND a.church_id = $2
           LIMIT 1`,
          [assignment_id, churchId]
        );
        const a = rows[0];
        if (!a) return;
        const meta = { type: 'mentorship', event: 'session_created', session_id: session.id, assignment_id };
        const io = getIO();

        if (a.mentor_user_id) {
          try {
            const note = await notificationModel.createNotification({
              church_id: churchId,
              user_id: a.mentor_user_id,
              title: 'Mentorship Session Scheduled',
              message: `A session was scheduled for assignment #${assignment_id} on ${session_date || 'a date'}.`,
              channel: 'inapp',
              metadata: meta,
              link: `/mentorship/assignments/${assignment_id}/sessions/${session.id}`
            });
            if (io) io.to(`user:${a.mentor_user_id}`).emit('notification', note);
          } catch (err) { console.error('notify:createSession:mentor', err); }
        }
        if (a.mentee_user_id) {
          try {
            const note = await notificationModel.createNotification({
              church_id: churchId,
              user_id: a.mentee_user_id,
              title: 'Mentorship Session Scheduled',
              message: `A session was scheduled for you on ${session_date || 'a date'}.`,
              channel: 'inapp',
              metadata: meta,
              link: `/mentorship/assignments/${assignment_id}/sessions/${session.id}`
            });
            if (io) io.to(`user:${a.mentee_user_id}`).emit('notification', note);
          } catch (err) { console.error('notify:createSession:mentee', err); }
        }
        try {
          const note = await notificationModel.createNotification({
            church_id: churchId,
            user_id: created_by || actorId,
            title: 'Session Created',
            message: `Session created for assignment #${assignment_id}.`,
            channel: 'inapp',
            metadata: meta,
            link: `/mentorship/assignments/${assignment_id}/sessions/${session.id}`
          });
          if (io) io.to(`user:${created_by || actorId}`).emit('notification', note);
        } catch (err) { console.error('notify:createSession:actor', err); }
      } catch (notifyErr) {
        console.error('createSession notifications error', notifyErr);
      }
    })();

    res.status(201).json(session);
  } catch (err) {
    console.error('createSessionCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to create session' });
  }
};

export const getSessionsForAssignment = async (req, res) => {
  try {
    const assignmentId = req.params.assignment_id;
    const rows = await model.getSessionsByAssignment(assignmentId);
    res.json(rows);
  } catch (err) {
    console.error('getSessionsForAssignment error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch sessions' });
  }
};

export const removeAssignmentCtrl = async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const actorId = req.user.id;
    const assignmentId = req.params.assignment_id;
    if (!assignmentId) return res.status(400).json({ error: 'assignment_id required' });

    const { rows } = await db.query('SELECT id, mentor_id, mentee_id FROM mentorship_assignments WHERE id=$1 AND church_id=$2 LIMIT 1', [assignmentId, churchId]);
    const assignment = rows[0];
    await model.removeAssignment(churchId, assignmentId);

    (async () => {
      try {
        const io = getIO();
        if (assignment?.mentor_id) {
          const { rows: mrows } = await db.query('SELECT user_id FROM members WHERE id=$1 AND church_id=$2 LIMIT 1', [assignment.mentor_id, churchId]);
          const userId = mrows[0]?.user_id;
          if (userId) {
            try {
              const note = await notificationModel.createNotification({
                church_id: churchId,
                user_id: userId,
                title: 'Mentorship Assignment Removed',
                message: `An assignment involving you was removed.`,
                channel: 'inapp',
                metadata: { type: 'mentorship', event: 'assignment_removed', assignment_id },
                link: `/mentorship`
              });
              if (io) io.to(`user:${userId}`).emit('notification', note);
            } catch (err) { console.error('notify:removeAssignment:mentor', err); }
          }
        }
        if (assignment?.mentee_id) {
          const { rows: mrows } = await db.query('SELECT user_id FROM members WHERE id=$1 AND church_id=$2 LIMIT 1', [assignment.mentee_id, churchId]);
          const userId = mrows[0]?.user_id;
          if (userId) {
            try {
              const note = await notificationModel.createNotification({
                church_id: churchId,
                user_id: userId,
                title: 'Mentorship Assignment Removed',
                message: `An assignment involving you was removed.`,
                channel: 'inapp',
                metadata: { type: 'mentorship', event: 'assignment_removed', assignment_id },
                link: `/mentorship`
              });
              if (io) io.to(`user:${userId}`).emit('notification', note);
            } catch (err) { console.error('notify:removeAssignment:mentee', err); }
          }
        }
        try {
          const note = await notificationModel.createNotification({
            church_id: churchId,
            user_id: actorId,
            title: 'Assignment Removed',
            message: `Mentorship assignment ${assignmentId} removed.`,
            channel: 'inapp',
            metadata: { type: 'mentorship', event: 'assignment_removed', assignment_id },
            link: `/mentorship`
          });
          if (io) io.to(`user:${actorId}`).emit('notification', note);
        } catch (err) { console.error('notify:removeAssignment:actor', err); }
      } catch (notifyErr) {
        console.error('removeAssignment notifications error', notifyErr);
      }
    })();

    res.json({ success: true });
  } catch (err) {
    console.error('removeAssignmentCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to remove assignment' });
  }
};

export const removeSessionCtrl = async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const actorId = req.user.id;
    const sessionId = req.params.session_id;
    if (!sessionId) return res.status(400).json({ error: 'session_id required' });

    const { rows } = await db.query(
      `SELECT s.id, s.assignment_id, a.mentor_id, a.mentee_id
       FROM mentorship_sessions s
       LEFT JOIN mentorship_assignments a ON a.id = s.assignment_id
       WHERE s.id = $1 AND a.church_id = $2
       LIMIT 1`,
      [sessionId, churchId]
    );
    const s = rows[0];
    await model.removeSession(churchId, sessionId);

    (async () => {
      try {
        const io = getIO();
        if (s?.mentor_id) {
          const { rows: mrows } = await db.query('SELECT user_id FROM members WHERE id=$1 AND church_id=$2 LIMIT 1', [s.mentor_id, churchId]);
          const userId = mrows[0]?.user_id;
          if (userId) {
            try {
              const note = await notificationModel.createNotification({
                church_id: churchId,
                user_id: userId,
                title: 'Mentorship Session Removed',
                message: `A mentorship session was removed.`,
                channel: 'inapp',
                metadata: { type: 'mentorship', event: 'session_removed', session_id },
                link: `/mentorship/assignments/${s.assignment_id}/sessions`
              });
              if (io) io.to(`user:${userId}`).emit('notification', note);
            } catch (err) { console.error('notify:removeSession:mentor', err); }
          }
        }
        if (s?.mentee_id) {
          const { rows: mrows } = await db.query('SELECT user_id FROM members WHERE id=$1 AND church_id=$2 LIMIT 1', [s.mentee_id, churchId]);
          const userId = mrows[0]?.user_id;
          if (userId) {
            try {
              const note = await notificationModel.createNotification({
                church_id: churchId,
                user_id: userId,
                title: 'Mentorship Session Removed',
                message: `A mentorship session was removed.`,
                channel: 'inapp',
                metadata: { type: 'mentorship', event: 'session_removed', session_id },
                link: `/mentorship/assignments/${s.assignment_id}/sessions`
              });
              if (io) io.to(`user:${userId}`).emit('notification', note);
            } catch (err) { console.error('notify:removeSession:mentee', err); }
          }
        }

        try {
          const note = await notificationModel.createNotification({
            church_id: churchId,
            user_id: actorId,
            title: 'Session Removed',
            message: `Session ${sessionId} removed.`,
            channel: 'inapp',
            metadata: { type: 'mentorship', event: 'session_removed', session_id },
            link: `/mentorship/assignments/${s?.assignment_id || ''}/sessions`
          });
          if (io) io.to(`user:${actorId}`).emit('notification', note);
        } catch (err) { console.error('notify:removeSession:actor', err); }
      } catch (notifyErr) {
        console.error('removeSession notifications error', notifyErr);
      }
    })();

    res.json({ success: true });
  } catch (err) {
    console.error('removeSessionCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to remove session' });
  }
};

// New controllers: fetch single assignment/session, update assignment/session, summary

export const getAssignmentCtrl = async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const assignmentId = req.params.assignment_id;
    if (!assignmentId) return res.status(400).json({ error: 'assignment_id required' });
    const assignment = await model.getAssignmentById(churchId, assignmentId);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    res.json(assignment);
  } catch (err) {
    console.error('getAssignmentCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch assignment' });
  }
};

export const getSessionCtrl = async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const sessionId = req.params.session_id;
    if (!sessionId) return res.status(400).json({ error: 'session_id required' });
    const session = await model.getSessionById(churchId, sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    console.error('getSessionCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch session' });
  }
};

export const updateAssignmentCtrl = async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const assignmentId = req.params.assignment_id;
    if (!assignmentId) return res.status(400).json({ error: 'assignment_id required' });

    const allowed = ['mentor_id', 'mentee_id', 'notes', 'active', 'started_at'];
    const changes = {};
    for (const k of allowed) if (Object.prototype.hasOwnProperty.call(req.body, k)) changes[k] = req.body[k];

    if (Object.keys(changes).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    const updated = await model.updateAssignment(churchId, assignmentId, changes);
    if (!updated) return res.status(404).json({ error: 'Assignment not found or not updated' });
    res.json(updated);
  } catch (err) {
    console.error('updateAssignmentCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to update assignment' });
  }
};

export const updateSessionCtrl = async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const sessionId = req.params.session_id;
    if (!sessionId) return res.status(400).json({ error: 'session_id required' });

    const allowed = ['session_date', 'duration_minutes', 'notes', 'updated_by'];
    const changes = {};
    for (const k of allowed) if (Object.prototype.hasOwnProperty.call(req.body, k)) changes[k] = req.body[k];

    if (Object.keys(changes).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    const updated = await model.updateSession(churchId, sessionId, changes);
    if (!updated) return res.status(404).json({ error: 'Session not found or not updated' });
    res.json(updated);
  } catch (err) {
    console.error('updateSessionCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to update session' });
  }
};

export const getSummaryCtrl = async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const summary = await model.getSummary(churchId);
    res.json(summary);
  } catch (err) {
    console.error('getSummaryCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch summary' });
  }
};

export const getMentors = async (req, res) => {
  try {
    const churchId = req.user?.church_id;
    if (!churchId) return res.status(400).json({ error: 'Church not specified' });

    const activeOnly = String(req.query.active || '').toLowerCase() === 'true';

    const q = `
      SELECT m.id, m.first_name, m.surname, m.contact_primary AS phone, m.email,
             COUNT(ma.id) AS assignments_count,
             MAX(ma.started_at) AS last_assigned_at
      FROM mentorship_assignments ma
      JOIN members m ON m.id = ma.mentor_id
      WHERE ma.church_id = $1
      ${activeOnly ? 'AND ma.active = TRUE' : ''}
      GROUP BY m.id, m.first_name, m.surname, m.contact_primary, m.email
      ORDER BY assignments_count DESC, m.surname, m.first_name
    `;

    const { rows } = await db.query(q, [churchId]);
    // Fallback to member_type 'mentor' if no assignment-based mentors found
    if (!rows || rows.length === 0) {
      const fallbackQ = `
        SELECT m.id, m.first_name, m.surname, m.contact_primary AS phone, m.email
        FROM members m
        LEFT JOIN member_types mt ON mt.id = m.member_type_id
        WHERE m.church_id = $1 AND LOWER(mt.name) = 'mentor'
        ORDER BY m.first_name, m.surname
      `;
      const fb = await db.query(fallbackQ, [churchId]);
      return res.json(fb.rows);
    }
    return res.json(rows);
  } catch (err) {
    console.error('getMentors error', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch mentors' });
  }
};