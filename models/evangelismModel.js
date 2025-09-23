import db from '../config/db.js';
import * as memberModel from '../models/memberModel.js';

export async function createContact(payload) {
  const {
    church_id, first_name, surname, contact_primary, contact_secondary, email,
    area, latitude = null, longitude = null, date_contacted = null,
    response = 'pending', assigned_to_user_id = null, notes = null
  } = payload;

  const { rows } = await db.query(
    `INSERT INTO evangelism_contacts
     (church_id, first_name, surname, contact_primary, contact_secondary, email, area, latitude, longitude, date_contacted, response, assigned_to_user_id, notes, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,NOW()),$11,$12,$13,NOW(),NOW())
     RETURNING *`,
    [church_id, first_name, surname, contact_primary, contact_secondary, email, area, latitude, longitude, date_contacted, response, assigned_to_user_id, notes]
  );
  return rows[0];
}

export async function listContacts(church_id) {
  const { rows } = await db.query(`SELECT * FROM evangelism_contacts WHERE church_id=$1 ORDER BY created_at DESC`, [church_id]);
  return rows;
}

export async function getContactById(id, church_id) {
  const res = await db.query(`SELECT * FROM evangelism_contacts WHERE id=$1 AND church_id=$2`, [id, church_id]);
  return res.rows[0];
}

export async function updateContact(id, church_id, patch = {}) {
  // Prevent user from setting updated_at directly
  delete patch.updated_at;

  const keys = Object.keys(patch);
  if (!keys.length) return null;
  const sets = [];
  const vals = [];
  let idx = 1;
  for (const k of keys) {
    sets.push(`${k} = $${idx++}`);
    vals.push(patch[k]);
  }
  vals.push(id, church_id);
  const q = `UPDATE evangelism_contacts SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx++} AND church_id = $${idx} RETURNING *`;
  const res = await db.query(q, vals);
  return res.rows[0];
}

export async function updateStatus(id, church_id, status) {
  const { rows } = await db.query(
    `UPDATE evangelism_contacts SET status=$1, updated_at=NOW() WHERE id=$2 AND church_id=$3 RETURNING *`,
    [status, id, church_id]
  );
  return rows[0];
}

export async function deleteContact(id, church_id) {
  await db.query(`DELETE FROM evangelism_contacts WHERE id=$1 AND church_id=$2`, [id, church_id]);
}

/**
 * Find a member by contact_primary or email for a given church.
 * Returns the member if found, otherwise null.
 */
export async function findMemberByContact({ contact_primary, email, church_id }) {
  let member = null;
  if (contact_primary) {
    member = await memberModel.getMemberByPhone(contact_primary, church_id);
  }
  if (!member && email) {
    member = await memberModel.getMemberByEmail(email, church_id);
  }
  return member;
}