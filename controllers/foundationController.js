import * as model from '../models/foundationModel.js';
import db from '../config/db.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';

export const getByMember = async (req, res) => {
  const churchId = req.user.church_id;
  const rows = await model.getEnrollmentByMember(churchId, req.params.member_id);
  res.json(rows);
};

export const createEnrollment = async (req, res) => {
  const churchId = req.user.church_id;
  const { member_id, level, status, notes } = req.body;
  if (!member_id) return res.status(400).json({ error: 'member_id required' });
  const e = await model.createEnrollment({ church_id: churchId, member_id, level, status, notes });
  res.status(201).json(e);

  // best-effort in-app notification (do not block response)
  (async () => {
    try {
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const title = 'Foundation enrollment created';
      const message = `Enrollment recorded for member ${member_id} (level: ${level ?? 'N/A'}).`;
      const metadata = { action: 'foundation_enrollment_created', enrollment_id: e?.id ?? null };
      const link = `/members/${member_id}/foundation`;

      const notification = await notificationModel.createNotification({
        church_id: churchId,
        member_id: member_id ?? null,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      const io = getIO();
      if (io) {
        if (churchId) io.to(`church:${churchId}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        if (member_id) io.to(`member:${member_id}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for createEnrollment', nErr?.message || nErr);
    }
  })();
};

export const updateEnrollment = async (req, res) => {
  const churchId = req.user.church_id;
  const id = req.params.id;
  const updated = await model.updateEnrollment(churchId, id, req.body);
  res.json(updated);

  // best-effort notification about update
  (async () => {
    try {
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const memberId = updated?.member_id ?? req.body.member_id ?? null;
      const title = 'Foundation enrollment updated';
      const message = `Enrollment ${id} was updated${memberId ? ` for member ${memberId}` : ''}.`;
      const metadata = { action: 'foundation_enrollment_updated', enrollment_id: id };
      const link = memberId ? `/members/${memberId}/foundation` : `/foundation/enrollments/${id}`;

      const notification = await notificationModel.createNotification({
        church_id: churchId,
        member_id: memberId ?? null,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      const io = getIO();
      if (io) {
        if (churchId) io.to(`church:${churchId}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        if (memberId) io.to(`member:${memberId}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for updateEnrollment', nErr?.message || nErr);
    }
  })();
};

export const deleteEnrollment = async (req, res) => {
  const churchId = req.user.church_id;
  // try to fetch existing enrollment to include member info in notification
  let memberId = null;
  try {
    if (typeof model.getEnrollmentById === 'function') {
      const existing = await model.getEnrollmentById(churchId, req.params.id);
      memberId = existing?.member_id ?? null;
    }
  } catch (fetchErr) {
    // ignore
  }
  await model.deleteEnrollment(churchId, req.params.id);
  res.status(204).send();

  // best-effort notification about deletion
  (async () => {
    try {
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const title = 'Foundation enrollment removed';
      const message = `Enrollment ${req.params.id} was removed${memberId ? ` for member ${memberId}` : ''}.`;
      const metadata = { action: 'foundation_enrollment_deleted', enrollment_id: req.params.id };
      const link = memberId ? `/members/${memberId}/foundation` : `/foundation/enrollments`;

      const notification = await notificationModel.createNotification({
        church_id: churchId,
        member_id: memberId ?? null,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      const io = getIO();
      if (io) {
        if (churchId) io.to(`church:${churchId}`).emit('notification', notification);
        if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        if (memberId) io.to(`member:${memberId}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for deleteEnrollment', nErr?.message || nErr);
    }
  })();
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
