import * as prayerModel from '../models/prayerModel.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';

// helper: safe integer parser
const parseIntId = (v) => {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) && Number.isInteger(n) ? n : null;
};

export async function create(req, res) {
  try {
    // Ensure contact_details is an object, not a string
    let contact_details = req.body.contact_details;
    if (typeof contact_details === 'string') {
      try {
        contact_details = JSON.parse(contact_details);
      } catch {
        contact_details = { value: contact_details };
      }
    } else if (contact_details == null) {
      contact_details = {};
    }

    // Accept both 'confidential' and 'confidentiality' from frontend
    const confidential = req.body.confidential ?? req.body.confidentiality ?? false;
    
    // Handle anonymous flag - if confidentiality is true, treat as anonymous
    const anonymous = req.body.anonymous ?? confidential ?? false;

    const prayer = await prayerModel.createPrayerRequest({
      church_id: req.user.church_id,
      created_by_member_id: req.user.member_id,
      category: req.body.category,
      sub_category: req.body.sub_category,
      urgency: req.body.urgency,
      preferred_contact_method: req.body.preferred_contact_method,
      contact_details,
      description: req.body.description,
      confidential,
      anonymous,
      metadata: req.body.metadata
    });
    res.status(201).json(prayer);

    // Notification (non-blocking)
    (async () => {
      try {
        const notification = await notificationModel.createNotification({
          church_id: req.user.church_id,
          member_id: req.user.member_id,
          user_id: req.user.userId ?? req.user.id ?? null,
          title: 'New Prayer Request',
          message: `Prayer request "${prayer.category}" created.`,
          channel: 'inapp',
          metadata: { action: 'prayer_created', prayer_id: prayer.id },
          link: `/prayers/${prayer.id}`
        });
        const io = getIO();
        if (io) {
          if (req.user.church_id) io.to(`church:${req.user.church_id}`).emit('notification', notification);
          if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for prayer create', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function list(req, res) {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const status = req.query.status ? String(req.query.status).trim() : null;
    const startDate = req.query.start_date ? String(req.query.start_date).trim() : null;
    const endDate = req.query.end_date ? String(req.query.end_date).trim() : null;

    // debug log to ensure correct route handler is invoked
    console.debug('prayer.list path=', req.path, 'params=', req.params, 'query=', req.query);

    const filters = { status };
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;

    const prayers = await prayerModel.getPrayers(req.user.church_id, limit, offset, filters);
    res.json(prayers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getById(req, res) {
  try {
    const id = parseIntId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Invalid id' });

    const prayer = await prayerModel.getPrayerById(id, req.user.church_id);
    if (!prayer) return res.status(404).json({ error: 'Not found' });
    res.json(prayer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function assign(req, res) {
  try {
    const id = parseIntId(req.params.id);
    const assignedTo = parseIntId(req.body.assigned_to);
    if (id === null || assignedTo === null) return res.status(400).json({ error: 'Invalid id or assigned_to' });

    const result = await prayerModel.assignPrayer(
      req.user.church_id,
      id,
      assignedTo,
      req.user.member_id
    );
    res.json(result);

    // Notification (non-blocking)
    (async () => {
      try {
        const notification = await notificationModel.createNotification({
          church_id: req.user.church_id,
          member_id: req.body.assigned_to,
          user_id: null,
          title: 'Prayer Request Assigned',
          message: `You have been assigned a prayer request (${result.category}).`,
          channel: 'inapp',
          metadata: { action: 'prayer_assigned', prayer_id: result.id },
          link: `/prayers/${result.id}`
        });
        const io = getIO();
        if (io) {
          if (req.user.church_id) io.to(`church:${req.user.church_id}`).emit('notification', notification);
          if (notification.member_id) io.to(`member:${notification.member_id}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for prayer assign', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function addFollowup(req, res) {
  try {
    const id = parseIntId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Invalid id' });

    const result = await prayerModel.addFollowup(
      req.user.church_id,
      id,
      req.user.member_id,
      req.body.note,
      req.body.method
    );
    res.status(201).json(result);

    // Notification (non-blocking)
    (async () => {
      try {
        const notification = await notificationModel.createNotification({
          church_id: req.user.church_id,
          member_id: req.user.member_id,
          user_id: req.user.userId ?? req.user.id ?? null,
          title: 'Prayer Follow-up Added',
          message: `A follow-up was added to prayer request #${req.params.id}.`,
          channel: 'inapp',
          metadata: { action: 'prayer_followup', prayer_id: req.params.id },
          link: `/prayers/${req.params.id}`
        });
        const io = getIO();
        if (io) {
          if (req.user.church_id) io.to(`church:${req.user.church_id}`).emit('notification', notification);
          if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for prayer followup', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function close(req, res) {
  try {
    const id = parseIntId(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Invalid id' });

    const result = await prayerModel.closePrayer(
      req.user.church_id,
      id,
      req.user.member_id,
      req.body.outcome,
      req.body.resolution_notes
    );
    res.json(result);

    // Notification (non-blocking)
    (async () => {
      try {
        const notification = await notificationModel.createNotification({
          church_id: req.user.church_id,
          member_id: req.user.member_id,
          user_id: req.user.userId ?? req.user.id ?? null,
          title: 'Prayer Request Closed',
          message: `Prayer request #${req.params.id} was closed.`,
          channel: 'inapp',
          metadata: { action: 'prayer_closed', prayer_id: req.params.id },
          link: `/prayers/${req.params.id}`
        });
        const io = getIO();
        if (io) {
          if (req.user.church_id) io.to(`church:${req.user.church_id}`).emit('notification', notification);
          if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for prayer close', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getUrgentCount(req, res) {
  try {
    const count = await prayerModel.getUrgentCount(req.user.church_id);
    res.json(count);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Member-specific function - allows members to view their own prayer requests
export async function listMyPrayers(req, res) {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const status = req.query.status ? String(req.query.status).trim() : null;
    const startDate = req.query.start_date ? String(req.query.start_date).trim() : null;
    const endDate = req.query.end_date ? String(req.query.end_date).trim() : null;

    console.debug('prayer.listMyPrayers path=', req.path, 'params=', req.params, 'query=', req.query);

    const filters = { 
      status,
      created_by_member_id: req.user.member_id // Only show prayers created by this member
    };
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;

    const prayers = await prayerModel.getPrayers(req.user.church_id, limit, offset, filters);
    res.json(prayers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
