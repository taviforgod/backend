import {
  createPrayerRequest,
  getPrayerRequests,
  getPrayerById,
  updatePrayerRequest,
  assignPrayerRequest,
  addFollowUp,
  closePrayerRequest,
  countUrgentOpen,
  avgTimeToFirstContactSeconds,
  trendByCategory
} from '../models/prayerModel.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';

export const listPrayers = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const { limit = 100, offset = 0, status, urgency, assigned_to, q } = req.query;
    const filters = { status, urgency, assigned_to, q };
    const rows = await getPrayerRequests({ church_id, limit: Number(limit), offset: Number(offset), filters });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list prayer requests' });
  }
};

export const getPrayerCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const row = await getPrayerById(id, church_id);
    if (!row) return res.status(404).json({ error: 'Prayer request not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to get prayer request' });
  }
};

export const createPrayerCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const data = {
      member_id: req.body.member_id || null,
      church_id,
      created_by: req.user?.id || null,
      category: req.body.category,
      sub_category: req.body.sub_category,
      urgency: req.body.urgency || 'normal',
      preferred_contact_method: req.body.preferred_contact_method,
      contact_details: req.body.contact_details,
      description: req.body.description,
      confidentiality: req.body.confidentiality !== undefined ? req.body.confidentiality : true
    };

    const created = await createPrayerRequest(data);
    res.status(201).json(created);

    // best-effort notification (non-blocking)
    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const member_id = data.member_id ?? null;
        const title = 'Prayer request created';
        const message = `${data.category ? `${data.category} — ` : ''}${data.description ? String(data.description).slice(0,150) : 'A prayer request was submitted.'}`;
        const metadata = { action: 'prayer_created', prayer_id: created?.id ?? null, category: data.category ?? null };
        const link = `/prayer/${created?.id ?? ''}`;

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

        try {
          const io = getIO();
          if (io) {
            if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
            if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
            if (member_id) io.to(`member:${member_id}`).emit('notification', notification);
          }
        } catch (emitErr) {
          console.warn('Notification emit failed', emitErr?.message || emitErr);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for createPrayerCtrl', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create prayer request' });
  }
};

export const updatePrayerCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const updates = req.body;
    const updated = await updatePrayerRequest(id, church_id, updates);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update prayer request' });
  }
};

export const assignPrayerCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    const { assigned_to } = req.body;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    if (!assigned_to) return res.status(400).json({ error: 'assigned_to (member id) required' });

    const updated = await assignPrayerRequest(id, church_id, assigned_to, req.user?.id || null);
    res.json(updated);

    // best-effort notification to assignee (non-blocking)
    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Prayer request assigned';
        const message = `You have been assigned prayer request #${id}.`;
        const metadata = { action: 'prayer_assigned', prayer_id: id, assigned_to };
        const link = `/prayer/${id}`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: assigned_to,
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
          if (assigned_to) io.to(`member:${assigned_to}`).emit('notification', notification);
          if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for assignPrayerCtrl', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    if (err && err.code === 'INVALID_MEMBER') {
      return res.status(400).json({ error: err.message || 'Invalid assignee' });
    }
    res.status(400).json({ error: err.message || 'Failed to assign prayer request' });
  }
};

export const addFollowupCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    const { note, method, contacted_at } = req.body;
    const prayer = await getPrayerById(id, church_id);
    if (!prayer) return res.status(404).json({ error: 'Prayer request not found' });

    const follow = await addFollowUp(id, note, req.user?.id || null, method || null, contacted_at || null);
    res.status(201).json(follow);

    // best-effort notification to owner/assignee (non-blocking)
    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const targetMember = prayer.assigned_to ?? prayer.member_id ?? null;
        const title = 'Follow-up added';
        const message = `A follow-up was added to prayer request #${id}.`;
        const metadata = { action: 'prayer_followup_added', prayer_id: id, followup_id: follow?.id ?? null };
        const link = `/prayer/${id}`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: targetMember,
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
          if (targetMember) io.to(`member:${targetMember}`).emit('notification', notification);
          if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for addFollowupCtrl', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to add follow-up' });
  }
};

export const closePrayerCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    const { outcome, resolution_notes } = req.body;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const closed = await closePrayerRequest(id, church_id, outcome, resolution_notes, req.user?.id || null);
    res.json(closed);

    // best-effort notification about closure (non-blocking)
    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const targetMember = closed?.assigned_to ?? closed?.member_id ?? null;
        const title = 'Prayer request closed';
        const message = `Prayer request #${id} was closed${outcome ? ` (outcome: ${outcome})` : ''}.`;
        const metadata = { action: 'prayer_closed', prayer_id: id, outcome: outcome ?? null };
        const link = `/prayer/${id}`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: targetMember,
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
          if (targetMember) io.to(`member:${targetMember}`).emit('notification', notification);
          if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for closePrayerCtrl', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to close prayer request' });
  }
};

export const urgentCountCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const cnt = await countUrgentOpen(church_id);
    res.json({ urgent_open: cnt });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to get urgent count' });
  }
};

export const slaCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const seconds = await avgTimeToFirstContactSeconds(church_id);
    res.json({ avg_first_contact_seconds: Number(seconds) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to compute SLA' });
  }
};

export const trendCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const days = Number(req.query.days) || 90;
    const data = await trendByCategory(church_id, days);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to get trends' });
  }
};
