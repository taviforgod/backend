// backend/controllers/evangelismEventController.js
import * as model from '../models/evangelismEventModel.js';
import * as notificationModel from '../models/notificationModel.js';
import db from '../config/db.js';
import { getIO } from '../config/socket.js';

// Example: create event controller - add best-effort notification
export const createEvent = async (req, res) => {
  try {
    const church_id = req.user?.church_id ?? null;
    const user_id = req.user?.userId ?? req.user?.id ?? null;
    const created = await model.createEvent({ ...req.body, church_id });

    res.status(201).json(created);

    // best-effort notification about new event
    try {
      const title = 'New evangelism event';
      const message = `Event "${created?.title || 'Untitled'}" was created.`;
      const metadata = { action: 'evangelism_event_created', event_id: created?.id ?? null };
      const link = `/evangelism/events/${created?.id ?? ''}`;

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
      console.warn('Failed to create notification for createEvent', nErr?.message || nErr);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Example: list events controller
export const listEvents = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const rows = await model.listEvents(church_id);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Example: invite contacts controller
export const inviteContacts = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const event_id = Number(req.params.id);
    const { contact_ids = [], via = { sms: true, email: false }, sms_template, email_template } = req.body;
    if (!contact_ids.length) return res.status(400).json({ error: 'No contact ids provided' });
    const rows = await model.inviteContacts(event_id, contact_ids, req.user.id);

    // fetch event
    const ev = (await model.listEvents(church_id)).find(e => e.id === event_id);

    // fetch contacts for sending (basic)
    const { rows: contacts } = await db.query(`SELECT id, first_name, surname, phone, email FROM evangelism_contacts WHERE id = ANY($1::int[])`, [contact_ids]);

    // placeholder: implement Twilio / SendGrid / SMTP sending here based on env vars
    // notifications removed - only record of invitations returned
    res.json({ invited: rows.length, rows, event: ev });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Example: update invite controller
export const updateInvite = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { response } = req.body;
    const row = await model.updateInviteResponse(id, response);
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Example: update event controller - add best-effort notification
export const updateEvent = async (req, res) => {
  try {
    const church_id = req.user?.church_id ?? null;
    const user_id = req.user?.userId ?? req.user?.id ?? null;
    const updated = await model.updateEvent(event_id, church_id, req.body);
    if (!updated) return res.status(404).json({ error: 'Event not found' });
    res.json(updated);

    // best-effort notification about updated event
    try {
      const title = 'Evangelism event updated';
      const message = `Event "${updated?.title || req.params.id}" was updated.`;
      const metadata = { action: 'evangelism_event_updated', event_id: updated?.id ?? req.params.id };
      const link = `/evangelism/events/${updated?.id ?? req.params.id ?? ''}`;

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
      console.warn('Failed to create notification for updateEvent', nErr?.message || nErr);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Example: delete event controller - add best-effort notification
export const deleteEvent = async (req, res) => {
  try {
    const church_id = req.user?.church_id ?? null;
    const user_id = req.user?.userId ?? req.user?.id ?? null;
    const deleted = await model.deleteEvent(church_id, event_id);
    if (!deleted) return res.status(404).json({ error: 'Event not found' });
    res.json({ deleted: true });

    // best-effort notification about deleted event
    try {
      const title = 'Evangelism event deleted';
      const message = `An event was deleted.`;
      const metadata = { action: 'evangelism_event_deleted', event_id: req.params.id ?? null };
      const link = '/evangelism/events';

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
      console.warn('Failed to create notification for deleteEvent', nErr?.message || nErr);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
