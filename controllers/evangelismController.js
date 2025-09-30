// backend/controllers/evangelismController.js
import * as model from '../models/evangelismModel.js';
import db from '../config/db.js';

export const createContact = async (req, res) => {
  try { const church_id = req.user?.church_id; const contact = await model.createContact({ ...req.body, church_id }); res.status(201).json(contact); } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

export const listContacts = async (req, res) => {
  try { const church_id = req.user?.church_id; const filters = { status: req.query.status, assigned_to: req.query.assigned_to, how_met: req.query.how_met, q: req.query.q }; const rows = await model.listContacts(church_id, filters); res.json(rows); } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

export const updateContact = async (req, res) => {
  try { const church_id = req.user?.church_id; const id = Number(req.params.id); const row = await model.updateContact(id, church_id, req.body); res.json(row); } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

export const updateContactStatus = async (req, res) => {
  try { const church_id = req.user?.church_id; const id = Number(req.params.id); const { status } = req.body; const updated = await model.updateContactStatus(id, status, church_id); res.json(updated); } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

export const assignBulkContacts = async (req, res) => {
  try { const church_id = req.user?.church_id; const { ids, assigned_to_user_id } = req.body; const rows = await model.assignBulk(church_id, ids, assigned_to_user_id); if (rows.length) { await db.query(`INSERT INTO notifications (church_id,user_id,title,message,type,created_at) VALUES ($1,$2,$3,$4,$5,NOW())`, [church_id, assigned_to_user_id, 'New Evangelism Assignments', `You have been assigned ${rows.length} evangelism contact(s).`, 'Evangelism']); } res.json({ updated: rows.length }); } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

export const convertToVisitor = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = Number(req.params.id);
    const contact = await model.getById(church_id, id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    // Always use lowercase 'evangelism' for how_heard
    const allowedHowHeard = ['friend', 'church', 'outreach', 'online', 'other', 'evangelism'];
    let howHeard = (contact.how_met && typeof contact.how_met === 'string')
      ? contact.how_met.toLowerCase()
      : 'evangelism';

    if (!allowedHowHeard.includes(howHeard)) {
      howHeard = 'evangelism';
    }

    const { rows } = await db.query(
      `INSERT INTO visitors (church_id, cell_group_id, first_name, surname, contact_primary, email, home_address, date_of_first_visit, how_heard, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING *`,
      [
        church_id,
        contact.assigned_cell_group_id || null,
        contact.first_name,
        contact.surname,
        contact.phone,
        contact.email,
        contact.area || null,
        contact.contact_date || new Date(),
        howHeard // always allowed by your constraint
      ]
    );

    await model.updateContact(id, church_id, { status: 'converted', archived: true });
    res.json({ visitor: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

export const markAttended = async (req, res) => {
  try {
    const church_id = req.user.church_id;
    const id = Number(req.params.id);
    const { createVisitor = true, autoConvertToMember = false } = req.body;
    const contact = await model.getById(church_id, id);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    if (createVisitor) {
      // Always use lowercase 'evangelism' for how_heard
      const allowedHowHeard = ['friend', 'church', 'outreach', 'online', 'other', 'evangelism'];
      let howHeard = (contact.how_met && typeof contact.how_met === 'string')
        ? contact.how_met.toLowerCase()
        : 'evangelism';

      if (!allowedHowHeard.includes(howHeard)) {
        howHeard = 'evangelism';
      }

      const { rows } = await db.query(
        `INSERT INTO visitors (church_id, cell_group_id, first_name, surname, contact_primary, email, home_address, date_of_first_visit, how_heard, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()) RETURNING *`,
        [
          church_id,
          contact.assigned_cell_group_id || null,
          contact.first_name,
          contact.surname,
          contact.phone,
          contact.email,
          contact.area || null,
          req.body.attended_date || contact.contact_date || new Date(),
          howHeard // always allowed by your constraint
        ]
      );
      const visitor = rows[0];
      await model.updateContact(id, church_id, { status: 'attended', archived: true });

      if (autoConvertToMember) {
        const { rows: mrows } = await db.query(
          `INSERT INTO members (church_id, first_name, surname, email, contact_primary, contact_secondary, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id`,
          [
            church_id,
            visitor.first_name,
            visitor.surname,
            visitor.email || '',
            visitor.contact_primary || '',
            visitor.contact_secondary || ''
          ]
        );
        const memberId = mrows[0].id;
        await db.query(`UPDATE visitors SET member_id=$1 WHERE id=$2`, [memberId, visitor.id]);
        await model.updateContact(id, church_id, { status: 'converted' });
        return res.json({ visitor, member_id: memberId });
      }

      return res.json({ visitor });
    }

    await model.updateContact(id, church_id, { status: 'attended', archived: true });
    res.json({ updated: true });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

export const deleteContact = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = Number(req.params.id);
    const deleted = await model.deleteContact(church_id, id);
    if (!deleted) return res.status(404).json({ error: 'Contact not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
