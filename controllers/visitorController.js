// server/controllers/visitorController.js
import * as visitorModel from '../models/visitorModel.js';
import * as memberModel from '../models/memberModel.js'; // assume exists
import { validationResult } from 'express-validator';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';

function safeInt(val, fallback = null) {
  if (val === undefined || val === null || val === '') return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function listVisitors(req, res) {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ message: 'Missing church context' });

    const filters = {
      q: (typeof req.query.q === 'string' && req.query.q.trim()) ? req.query.q.trim() : null,
      zone_id: safeInt(req.query.zone_id, null),
      status_id: (typeof req.query.status_id === 'string' && req.query.status_id.trim()) ? req.query.status_id.trim() : null
    };

    const pagination = {
      limit: safeInt(req.query.limit, 50),
      offset: safeInt(req.query.offset, 0),
      orderBy: req.query.orderBy ? req.query.orderBy : 'v.created_at',
      order: req.query.order === 'desc' ? 'desc' : 'asc'
    };

    const rows = await visitorModel.listVisitorsForChurch(church_id, filters, pagination);
    res.json(rows);
  } catch (err) {
    console.error('listVisitors error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function getVisitor(req, res) {
  try {
    const id = safeInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    const v = await visitorModel.getVisitorById(id);
    if (!v) return res.status(404).json({ message: 'Visitor not found' });
    res.json(v);
  } catch (err) {
    console.error('getVisitor error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function createVisitor(req, res) {
  try {
    const user = req.user;
    const payload = { ...req.body, created_by: user?.id, church_id: user?.church_id || req.body.church_id };
    if (!payload.church_id) return res.status(400).json({ message: 'church_id required' });

    const v = await visitorModel.createVisitor(payload);
    res.status(201).json(v);

    // best-effort notification (non-blocking)
    (async () => {
      try {
        const church_id = payload.church_id;
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Visitor added';
        const message = `${v?.first_name || ''} ${v?.surname || ''}`.trim() || 'A visitor was added';
        const metadata = { action: 'visitor_created', visitor_id: v?.id ?? null };
        const link = `/visitors/${v?.id ?? ''}`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: null,
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
        }
      } catch (nErr) {
        console.warn('Failed to create notification for createVisitor', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    console.error('createVisitor error:', err);
    res.status(500).json({ message: 'Server error', details: err.message });
  }
}

export async function updateVisitor(req, res) {
  try {
    const id = safeInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });

    const allowed = [
      "first_name","surname","contact_primary","contact_secondary","email","cell_group_id","next_follow_up_date",
      "home_address","age_group","church_affiliation","prayer_requests","invited_by","follow_up_method","member_id",
      "notes","status","follow_up_status","date_of_first_visit","how_heard"
    ];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];

    const updated = await visitorModel.updateVisitor(id, updates);
    if (!updated) return res.status(404).json({ message: 'Visitor not found' });
    res.json(updated);

    // best-effort notification (non-blocking)
    (async () => {
      try {
        const church_id = updated?.church_id ?? req.user?.church_id ?? null;
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Visitor updated';
        const message = `${updated?.first_name || ''} ${updated?.surname || ''}`.trim() || `Visitor ${id} updated`;
        const metadata = { action: 'visitor_updated', visitor_id: id };
        const link = `/visitors/${id}`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: updated?.member_id ?? null,
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
          if (updated?.member_id) io.to(`member:${updated.member_id}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for updateVisitor', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    console.error('updateVisitor error:', err);
    res.status(500).json({ message: 'Server error', details: err.message });
  }
}

export async function deleteVisitor(req, res) {
  try {
    const id = safeInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    await visitorModel.softDeleteVisitor(id);
    res.json({ message: 'Visitor soft deleted' });

    // best-effort notification (non-blocking)
    (async () => {
      try {
        const church_id = req.user?.church_id ?? null;
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Visitor removed';
        const message = `Visitor ${id} was removed.`;
        const metadata = { action: 'visitor_deleted', visitor_id: id };
        const link = `/visitors`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: null,
          user_id,
          title,
          message,
          channel: 'inapp',
          metadata,
          link
        });

        const io = getIO();
        if (io && church_id) io.to(`church:${church_id}`).emit('notification', notification);
      } catch (nErr) {
        console.warn('Failed to create notification for deleteVisitor', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    console.error('deleteVisitor error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

export async function convertVisitor(req, res) {
  try {
    const id = safeInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    const user = req.user;
    const church_id = user?.church_id;
    if (!church_id) return res.status(400).json({ message: 'Missing church context' });

    const visitor = await visitorModel.getVisitorById(id);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });

    // Try to find an existing member by email or phone
    let member = null;
    if (visitor.email) {
      member = await memberModel.getMemberByEmail(visitor.email, church_id);
    }
    if (!member && (visitor.contact_primary || visitor.phone)) {
      const phone = visitor.contact_primary || visitor.phone;
      member = await memberModel.getMemberByPhone(phone, church_id);
    }

    // If no existing member, attempt to create one (safe fields only)
    if (!member) {
      // Get 'active' status ID for new members
      const activeStatus = await memberModel.getMemberStatusByName?.('active') || null;
      
      const payload = {
        church_id,
        first_name: visitor.first_name,
        surname: visitor.surname,
        contact_primary: visitor.contact_primary || visitor.phone || null,
        email: visitor.email || null,
        member_status_id: activeStatus?.id || null,
        created_by: user?.id
      };

      try {
        member = await memberModel.createMember(payload);
        if (!member) {
          return res.status(500).json({ message: 'Failed to create member from visitor' });
        }
        console.debug('[convertVisitor] created new member from visitor', { visitor_id: id, member_id: member.id, status_id: member.member_status_id });
      } catch (err) {
        // handle unique constraint race (duplicate email/phone)
        if (err?.code === '23505') {
          if (visitor.email) {
            member = await memberModel.getMemberByEmail(visitor.email, church_id);
          }
          if (!member && (visitor.contact_primary || visitor.phone)) {
            const phone = visitor.contact_primary || visitor.phone;
            member = await memberModel.getMemberByPhone(phone, church_id);
          }
          if (!member) throw err;
        } else {
          throw err;
        }
      }
    }

    // Mark visitor converted (store converted_member_id / converted_at)
    await visitorModel.markConverted(id, member.id, user?.id);

    res.json({ success: true, member });

    // best-effort notification (non-blocking)
    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Visitor converted';
        const message = `Visitor ${id} was converted to member ${member?.id}.`;
        const metadata = { action: 'visitor_converted', visitor_id: id, member_id: member?.id ?? null };
        const link = `/members/${member?.id ?? ''}`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: member?.id ?? null,
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
          if (member?.id) io.to(`member:${member.id}`).emit('notification', notification);
          if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for convertVisitor', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    console.error('convertVisitor error:', err);
    res.status(500).json({ message: 'Server error', details: err.message || String(err) });
  }
}

export async function createFollowUp(req, res) {
  try {
    const visitorId = safeInt(req.body.visitor_id ?? req.params.id);
    if (!visitorId) return res.status(400).json({ message: 'visitor_id required' });

    const payload = {
      assigned_member_id: req.body.assigned_member_id || null,
      followup_date: req.body.followup_date || new Date(),
      method: req.body.method || null,
      notes: req.body.notes || null,
      outcome: req.body.outcome || null,
      created_by: req.user?.id || null
    };

    const result = await visitorModel.createFollowUp(visitorId, payload);
    res.status(201).json(result);

    // best-effort notification to assignee/visitor owner (non-blocking)
    (async () => {
      try {
        const church_id = req.user?.church_id ?? null;
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const assigned = payload.assigned_member_id ?? null;
        const title = 'Follow-up scheduled';
        const message = `Follow-up for visitor ${visitorId} scheduled${assigned ? ` (assigned to ${assigned})` : ''}.`;
        const metadata = { action: 'visitor_followup_created', visitor_id: visitorId, followup_id: result?.id ?? null };
        const link = `/visitors/${visitorId}/followups/${result?.id ?? ''}`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: assigned,
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
          if (assigned) io.to(`member:${assigned}`).emit('notification', notification);
          if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for createFollowUp', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    console.error('createFollowUp error:', err);
    res.status(500).json({ message: 'Failed to create follow-up' });
  }
}

export async function listFollowUpsForVisitor(req, res) {
  try {
    const id = safeInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    const rows = await visitorModel.listFollowUpsForVisitor(id);
    res.json(rows);
  } catch (err) {
    console.error('listFollowUpsForVisitor error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}
