import * as model from '../models/milestoneRecordModel.js';
// import { sendNotification } from '../services/notificationService.js';
import db from '../config/db.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';
import * as memberModel from '../models/memberModel.js';

export const getByMember = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const member_id = req.params.member_id;
    if (!church_id || !member_id) return res.status(400).json({ message: 'church_id and member_id required' });
    const rows = await model.getByMember(church_id, member_id);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const createRecordCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const payload = { ...req.body, church_id };
    if (!church_id) return res.status(400).json({ message: 'church_id required' });
    if (!payload.member_id) return res.status(400).json({ message: 'member_id required' });
    if (!payload.template_id && !payload.milestone_name) {
      return res.status(400).json({ message: 'template_id or milestone_name required' });
    }
    const rec = await model.createRecord(payload);
    // sendNotification removed intentionally
    res.status(201).json({ ok: true, record: rec });

    // best-effort in-app notification (non-blocking)
    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        
        // Get member details for notification
        const member = await memberModel.getMemberById(payload.member_id);
        const memberDisplayName = member ? `${member.first_name} ${member.surname}`.trim() : `Member ${payload.member_id}`;
        
        const title = 'Milestone recorded';
        const message = `${payload.milestone_name || 'A milestone'} was recorded for ${memberDisplayName}.`;
        const metadata = { action: 'milestone_record_created', record_id: rec?.id ?? null, template_id: payload.template_id ?? null };
        const link = `/members/${payload.member_id}/milestones/${rec?.id ?? ''}`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: payload.member_id,
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
          if (payload.member_id) io.to(`member:${payload.member_id}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for createRecordCtrl', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteRecordCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    if (!church_id || !id) return res.status(400).json({ message: 'church_id and id required' });
    const record = await model.deleteRecord(church_id, id);
    if (!record) return res.status(404).json({ message: 'not found' });
    res.json({ ok: true, deleted: record });

    // best-effort in-app notification (non-blocking)
    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const memberId = record?.member_id ?? null;
        
        // Get member details for notification if memberId exists
        let memberDisplayName = '';
        if (memberId) {
          const member = await memberModel.getMemberById(memberId);
          memberDisplayName = member ? ` for member ${member.first_name} ${member.surname}`.trim() : ` for member ${memberId}`;
        }
        
        const title = 'Milestone removed';
        const message = `Milestone record ${id} was removed${memberDisplayName}.`;
        const metadata = { action: 'milestone_record_deleted', record_id: id };
        const link = memberId ? `/members/${memberId}/milestones` : '/milestones';

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: memberId,
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
          if (memberId) io.to(`member:${memberId}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for deleteRecordCtrl', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getAllRecords = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ message: 'church_id required' });
    const all = await model.getAllRecords(church_id);
    res.json(all);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
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
