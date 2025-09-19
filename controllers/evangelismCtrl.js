import * as model from '../models/evangelismModel.js';
import { findMemberByContact } from '../models/evangelismModel.js';

export const listContacts = async (req, res) => {
  const church_id = req.user?.church_id;
  res.json(await model.listContacts(church_id));
};

export const createContact = async (req, res) => {
  const church_id = req.user?.church_id;
  res.status(201).json(await model.createContact({ church_id, ...req.body }));
};

export const getContact = async (req, res) => {
  const church_id = req.user?.church_id;
  const id = parseInt(req.params.id, 10);
  res.json(await model.getContactById(id, church_id));
};

export const updateContact = async (req, res) => {
  const church_id = req.user?.church_id;
  const id = parseInt(req.params.id || req.body.id, 10);
  res.json(await model.updateContact(id, church_id, req.body));
};

export const deleteContact = async (req, res) => {
  const church_id = req.user?.church_id;
  const id = parseInt(req.params.id || req.body.id, 10);
  await model.deleteContact(id, church_id);
  res.status(204).end();
};

export const promoteToVisitor = async (req, res) => {
  const church_id = req.user?.church_id;
  const { contactId } = req.body;
  const contact = await model.getContactById(contactId, church_id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  // Check if this contact is already a member
  const member = await findMemberByContact({
    contact_primary: contact.contact_primary,
    email: contact.email,
    church_id
  });

  if (member) {
    // Mark the contact as deleted and update status
    await model.updateContact(contact.id, church_id, { 
      status: 'visitor', // or 'converted', or whatever status you want
      deleted: true      // make sure your table has a 'deleted' boolean column
    });
    return res.json({ member, contactConverted: true, flow: 'existing_member' });
  }

  // Use findMemberByContact for visitor logic as well
  const existingVisitor = await findMemberByContact({
    contact_primary: contact.contact_primary,
    email: contact.email,
    church_id
  });

  let visitor = null;
  let flow = 'new';

  if (existingVisitor) {
    visitor = await model.updateContact(existingVisitor.id, church_id, {
      evangelism_contact_id: contact.id,
      notes: (existingVisitor.notes || '') + `\nLinked to evangelism_contact_id=${contact.id}`
    });
    flow = 'existing_visitor';
  } else {
    visitor = await model.createContact({
      church_id,
      cell_group_id: cell_group_id || null,
      first_name: contact.first_name,
      surname: contact.surname,
      contact_primary: contact.contact_primary,
      contact_secondary: contact.contact_secondary,
      email: contact.email,
      home_address: contact.area || null,
      date_of_first_visit: new Date().toISOString().slice(0, 10),
      how_heard: 'Evangelism',
      church_affiliation: 'Non-Member',
      prayer_requests: contact.notes || null,
      invited_by: contact.assigned_to_user_id || null,
      notes: `Promoted from evangelism_contact_id=${contact.id}`,
      status: 'new',
      follow_up_status: 'pending',
      evangelism_contact_id: contact.id
    });
    flow = 'new_visitor';
  }

  await model.updateStatus(contact.id, church_id, 'converted_to_visitor');
  res.json({ visitor, contactConverted: true, flow });
};