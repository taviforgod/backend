// controllers/exitInterviewCtrl.js
import * as model from '../models/exitInterviewModel.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';

export const createInterview = async (req, res) => {
  try {
    const church_id = req.user.church_id;
    const interviewer_id = req.user.id;
    const payload = { church_id, interviewer_id, ...req.body }; // expects: exit_id, member_id, summary, answers
    const row = await model.createInterview(payload);
    res.status(201).json(row);

    // best-effort notification about the recorded interview
    try {
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const member_id = payload.member_id ?? null;
      const title = 'Exit interview recorded';
      const message = `An exit interview was recorded${member_id ? ` for member ${member_id}` : ''}.`;
      const metadata = { action: 'exit_interview_created', interview_id: row?.id ?? null, member_id };
      const link = member_id ? `/members/${member_id}/exit-interviews/${row?.id ?? ''}` : `/exit-interviews/${row?.id ?? ''}`;

      const notification = await notificationModel.createNotification({
        church_id,
        member_id,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      const io = getIO();
      if (io) {
        if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        if (member_id) io.to(`member:${member_id}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for createInterview', nErr?.message || nErr);
    }
  } catch (err) {
    console.error('createInterview', err);
    res.status(500).json({ error: 'Failed to save interview' });
  }
};

export const getInterview = async (req, res) => {
  try {
    const church_id = req.user.church_id;
    const id = parseInt(req.params.id);
    const row = await model.getInterviewById(church_id, id);
    if (!row) return res.status(404).json({ error: 'Interview not found' });
    res.json(row);
  } catch (err) {
    console.error('getInterview', err);
    res.status(500).json({ error: 'Failed to fetch interview' });
  }
};

export const listInterviews = async (req, res) => {
  try {
    const church_id = req.user.church_id;
    const member_id = req.query.member_id || null;
    const rows = await model.listInterviews(church_id, member_id);
    res.json(rows);
  } catch (err) {
    console.error('listInterviews', err);
    res.status(500).json({ error: 'Failed to list interviews' });
  }
};

export default { createInterview, getInterview, listInterviews };
