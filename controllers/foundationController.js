import * as model from '../models/foundationModel.js';
import db from '../config/db.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';
import * as foundationModel from '../models/foundationModel.js';
import * as memberModel from '../models/memberModel.js';

/** Helper to send notifications */
async function sendNotification({ churchId, memberId, userId, action, enrollmentId, title, message, link }) {
  try {
    const notification = await notificationModel.createNotification({
      church_id: churchId,
      member_id: memberId ?? null,
      user_id: userId,
      title,
      message,
      channel: 'inapp',
      metadata: { action, enrollment_id: enrollmentId },
      link
    });
    const io = getIO();
    if (io) {
      if (churchId) io.to(`church:${churchId}`).emit('notification', notification);
      if (userId) io.to(`user:${userId}`).emit('notification', notification);
      if (memberId) io.to(`member:${memberId}`).emit('notification', notification);
    }
  } catch (err) {
    console.warn('Failed to send notification:', err);
  }
}

/** Helper to send notifications with member name fetching */
async function sendNotificationWithMemberName({ churchId, memberId, userId, action, enrollmentId, title, messageTemplate, link }) {
  try {
    // Get member details for notification
    let memberDisplayName = '';
    if (memberId) {
      const member = await memberModel.getMemberById(memberId);
      memberDisplayName = member ? `${member.first_name} ${member.surname}`.trim() : `Member ${memberId}`;
    }
    
    const message = messageTemplate.replace('{member}', memberDisplayName);
    
    await sendNotification({ churchId, memberId, userId, action, enrollmentId, title, message, link });
  } catch (err) {
    console.warn('Failed to send notification with member name:', err);
  }
}

export const getByMember = async (req, res) => {
  const churchId = req.user.church_id;
  const rows = await model.getEnrollmentByMember(churchId, req.params.member_id);
  res.json(rows);
};

export const getEnrollmentById = async (req, res) => {
  const id = parseIntId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid id' });
  try {
    const row = await foundationModel.getEnrollmentById(req.user.church_id, id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** Get all enrollments for this church */
export const getAllEnrollments = async (req, res) => {
  const churchId = req.user.church_id;
  const rows = await model.getAllEnrollments(churchId);
  res.json(rows);
};

/** Get classes available in church */
export const getAvailableClasses = async (req, res) => {
  const churchId = req.user.church_id;
  const classes = await model.getAvailableClasses(churchId);
  res.json(classes);
};

export const createEnrollment = async (req, res) => {
  const churchId = req.user.church_id;
  const { member_id, level, status, notes, class_id } = req.body;
  if (!member_id) return res.status(400).json({ error: 'member_id required' });

  // Prevent member from enrolling in a level already active (not dropped/completed)
  const exists = await model.activeEnrollmentInLevel(churchId, member_id, level);
  if (exists) {
    return res.status(409).json({ error: 'Already enrolled in this level, cannot repeat.' });
  }
  // Create enrollment
  const e = await model.createEnrollment({ church_id: churchId, member_id, level, status, notes, class_id });
  res.status(201).json(e);

  // Notification
  await sendNotificationWithMemberName({
    churchId: req.user.church_id,
    memberId: member_id,
    userId: req.user?.userId ?? req.user?.id ?? null,
    action: 'foundation_enrollment_created',
    enrollmentId: e?.id ?? null,
    title: 'Foundation enrollment created',
    messageTemplate: `Enrollment recorded for {member} (level: ${level ?? 'N/A'}).`,
    link: `/members/${member_id}/foundation`
  });
};

export const updateEnrollment = async (req, res) => {
  const churchId = req.user.church_id;
  const id = req.params.id;
  const updated = await model.updateEnrollment(churchId, id, req.body);
  res.json(updated);

  // Notification
  await sendNotificationWithMemberName({
    churchId: req.user.church_id,
    memberId: updated?.member_id,
    userId: req.user?.userId ?? req.user?.id ?? null,
    action: 'foundation_enrollment_updated',
    enrollmentId: id,
    title: 'Foundation enrollment updated',
    messageTemplate: updated?.member_id 
      ? `Enrollment ${id} was updated for {member}.`
      : `Enrollment ${id} was updated.`,
    link: updated?.member_id ? `/members/${updated.member_id}/foundation` : `/foundation/enrollments/${id}`
  });
};

export const deleteEnrollment = async (req, res) => {
  const churchId = req.user.church_id;
  let memberId = null;
  try {
    if (typeof model.getEnrollmentById === 'function') {
      const existing = await model.getEnrollmentById(churchId, req.params.id);
      memberId = existing?.member_id ?? null;
    }
  } catch {}
  await model.deleteEnrollment(churchId, req.params.id);
  res.status(204).send();

  // Notification
  await sendNotificationWithMemberName({
    churchId: req.user.church_id,
    memberId: memberId,
    userId: req.user?.userId ?? req.user?.id ?? null,
    action: 'foundation_enrollment_deleted',
    enrollmentId: req.params.id,
    title: 'Foundation enrollment removed',
    messageTemplate: memberId 
      ? `Enrollment ${req.params.id} was removed for {member}.`
      : `Enrollment ${req.params.id} was removed.`,
    link: memberId ? `/members/${memberId}/foundation` : `/foundation/enrollments`
  });
};

export const getByCurrentUser = async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const churchId = req.user.church_id;
  const memberRes = await db.query(
    'SELECT id FROM members WHERE user_id = $1 AND church_id = $2 LIMIT 1',
    [userId, churchId]
  );
  const memberId = memberRes.rows[0]?.id;
  if (!memberId) return res.status(404).json({ error: 'No member found for user' });
  return getByMember({ ...req, params: { member_id: memberId } }, res);
};

// helper: safe integer parser
const parseIntId = (v) => {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) && Number.isInteger(n) ? n : null;
};

export async function getProgress(req, res) {
  try {
    const opts = {
      level: req.query.level ? Number(req.query.level) : undefined,
      class_id: req.query.class_id ? Number(req.query.class_id) : undefined,
      since_date: req.query.since_date,
      until_date: req.query.until_date
    };
    const data = await foundationModel.getProgress(req.user.church_id, opts);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}