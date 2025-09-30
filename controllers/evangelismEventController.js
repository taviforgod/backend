// backend/controllers/evangelismEventController.js
import * as model from '../models/evangelismEventModel.js';
import db from '../config/db.js';
import { createNotification } from '../models/notificationModel.js';
//import { emitToChurch } from '../server.js'; 

export const createEvent = async (req, res) => {
  try { const church_id = req.user?.church_id; const ev = await model.createEvent({ ...req.body, church_id }); res.status(201).json(ev); } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

export const listEvents = async (req, res) => {
  try { const church_id = req.user?.church_id; const rows = await model.listEvents(church_id); res.json(rows); } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

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
    contacts.forEach(c => {
      // record notification for each contact/assignment
      try { createNotification({ church_id, user_id: req.user.id, title: `Invited ${c.first_name}`, message: `Invited ${c.first_name} to ${ev?.title || 'event'}`, type: 'Evangelism' }); } catch(e) {}
    });

    try { emitToChurch(church_id, 'evangelism:invite', { event_id, count: rows.length }); } catch(e) {}
    res.json({ invited: rows.length, rows });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

export const updateInvite = async (req, res) => {
  try { const id = Number(req.params.id); const { response } = req.body; const row = await model.updateInviteResponse(id, response); res.json(row); } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

export const updateEvent = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const event_id = Number(req.params.id);
    const updated = await model.updateEvent(event_id, church_id, req.body);
    if (!updated) return res.status(404).json({ error: 'Event not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const event_id = Number(req.params.id);
    const deleted = await model.deleteEvent(church_id, event_id);
    if (!deleted) return res.status(404).json({ error: 'Event not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
