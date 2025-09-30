// backend/models/evangelismModel.js
import db from '../config/db.js';

export async function createContact(data) {
  const { church_id, first_name, surname, phone, whatsapp, email, area, lat, lon, contact_date, contacted_by_user_id, response, notes, assigned_cell_group_id, next_follow_up_date, assigned_to_user_id, tags, status } = data;
  const howMet = 'evangelism'; // always set to 'evangelism'
  const { rows } = await db.query(
    `INSERT INTO evangelism_contacts (church_id, first_name, surname, phone, whatsapp, email, area, lat, lon, contact_date, contacted_by_user_id, how_met, response, notes, assigned_cell_group_id, next_follow_up_date, assigned_to_user_id, tags, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW(),NOW()) RETURNING *`,
    [church_id, first_name, surname, phone, whatsapp, email, area, lat, lon, contact_date, contacted_by_user_id, howMet, response, notes, assigned_cell_group_id, next_follow_up_date, assigned_to_user_id, tags, status]
  );
  return rows[0];
}

export async function listContacts(church_id, filters = {}) {
  const clauses = ['church_id=$1', 'archived=FALSE'];
  const params = [church_id];
  let idx = 2;
  if (filters.status) { clauses.push(`status = $${idx++}`); params.push(filters.status); }
  if (filters.assigned_to) { clauses.push(`assigned_to_user_id = $${idx++}`); params.push(filters.assigned_to); }
  if (filters.how_met) { clauses.push(`how_met = $${idx++}`); params.push(filters.how_met); }
  if (filters.q) { clauses.push(`(LOWER(first_name) LIKE LOWER($${idx}) OR LOWER(surname) LIKE LOWER($${idx}) OR phone LIKE $${idx})`); params.push('%'+filters.q+'%'); idx++; }
  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const { rows } = await db.query(`SELECT * FROM evangelism_contacts ${where} ORDER BY contact_date DESC LIMIT 100`, params);
  return rows;
}

export async function getById(church_id, id) {
  const { rows } = await db.query(`SELECT * FROM evangelism_contacts WHERE church_id=$1 AND id=$2 LIMIT 1`, [church_id, id]);
  return rows[0];
}

export async function updateContact(id, church_id, data) {
  const set = [];
  const params = [];
  let idx = 1;
  for (const [k, v] of Object.entries(data)) {
    if (k !== 'updated_at') set.push(`${k} = $${idx++}`); // Exclude updated_at
    params.push(v);
  }
  params.push(id, church_id);
  const { rows } = await db.query(
    `UPDATE evangelism_contacts SET ${set.join(', ')}, updated_at = NOW() WHERE id = $${idx++} AND church_id = $${idx++} RETURNING *`,
    params
  );
  return rows[0];
}

export async function updateContactStatus(id, status, church_id) {
  const { rows } = await db.query(`UPDATE evangelism_contacts SET status=$1, updated_at=NOW() WHERE id=$2 AND church_id=$3 RETURNING *`, [status, id, church_id]);
  return rows[0];
}

export async function assignBulk(church_id, ids, assigned_to_user_id) {
  if (!ids || !ids.length) return [];
  const { rows } = await db.query(`UPDATE evangelism_contacts SET assigned_to_user_id=$1, updated_at=NOW() WHERE church_id=$2 AND id = ANY($3::int[]) RETURNING *`, [assigned_to_user_id, church_id, ids]);
  return rows;
}

export async function deleteContact(church_id, id) {
  const { rows } = await db.query(
    `DELETE FROM evangelism_contacts WHERE church_id=$1 AND id=$2 RETURNING *`,
    [church_id, id]
  );
  return rows[0];
}
