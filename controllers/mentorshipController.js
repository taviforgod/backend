import * as model from '../models/mentorshipModel.js';

export const assignMentorCtrl = async (req, res) => {
  const churchId = req.user.church_id;
  const { mentor_id, mentee_id, notes } = req.body;
  if (!mentor_id || !mentee_id) return res.status(400).json({ error: 'mentor_id and mentee_id required' });
  const assign = await model.assignMentor({ church_id: churchId, mentor_id, mentee_id, notes });
  res.status(201).json(assign);
};

export const getMentorAssignments = async (req, res) => {
  const churchId = req.user.church_id;
  const mentorId = req.params.mentor_id;
  const rows = await model.getAssignmentsForMentor(churchId, mentorId);
  res.json(rows);
};

export const getMenteeAssignments = async (req, res) => {
  const churchId = req.user.church_id;
  const menteeId = req.params.mentee_id;
  const rows = await model.getAssignmentsForMentee(churchId, menteeId);
  res.json(rows);
};

export const createSessionCtrl = async (req, res) => {
  const { assignment_id, session_date, duration_minutes, notes, created_by } = req.body;
  if (!assignment_id) return res.status(400).json({ error: 'assignment_id required' });
  const session = await model.createSession({ assignment_id, session_date, duration_minutes, notes, created_by });
  res.status(201).json(session);
};

export const getSessionsForAssignment = async (req, res) => {
  const assignmentId = req.params.assignment_id;
  const rows = await model.getSessionsByAssignment(assignmentId);
  res.json(rows);
};

export const removeAssignmentCtrl = async (req, res) => {
  const churchId = req.user.church_id;
  const assignmentId = req.params.assignment_id;
  if (!assignmentId) return res.status(400).json({ error: 'assignment_id required' });
  await model.removeAssignment(churchId, assignmentId);
  res.json({ success: true });
};

export const removeSessionCtrl = async (req, res) => {
  const churchId = req.user.church_id;
  const sessionId = req.params.session_id;
  if (!sessionId) return res.status(400).json({ error: 'session_id required' });
  await model.removeSession(churchId, sessionId);
  res.json({ success: true });
};
