// backend/models/evangelismEventModel.js
import db from '../config/db.js';

export async function createEvent(data) {
  const { church_id, title, description, event_date, location } = data;
  const { rows } = await db.query(`INSERT INTO evangelism_events (church_id, title, description, event_date, location, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) RETURNING *`, [church_id, title, description, event_date, location]);
  return rows[0];
}

export async function listEvents(church_id) {
  const { rows } = await db.query(`SELECT * FROM evangelism_events WHERE church_id=$1 ORDER BY event_date DESC LIMIT 200`, [church_id]);
  return rows;
}

export async function inviteContacts(event_id, contact_ids = [], invited_by_user_id = null) {
  if (!contact_ids || !contact_ids.length) return [];
  const values = contact_ids.map(cid => `(${event_id}, ${cid}, ${invited_by_user_id || 'NULL'}, 'pending', NOW())`).join(', ');
  const sql = `INSERT INTO evangelism_invites (event_id, contact_id, invited_by_user_id, response, created_at) VALUES ${values} RETURNING *`;
  const { rows } = await db.query(sql);
  return rows;
}

export async function updateInviteResponse(invite_id, response) {
  const { rows } = await db.query(`UPDATE evangelism_invites SET response=$1 WHERE id=$2 RETURNING *`, [response, invite_id]);
  return rows[0];
}

export async function updateEvent(event_id, church_id, data) {
  const set = [];
  const params = [];
  let idx = 1;
  for (const [k, v] of Object.entries(data)) {
    set.push(`${k} = $${idx++}`);
    params.push(v);
  }
  params.push(event_id, church_id);
  const { rows } = await db.query(
    `UPDATE evangelism_events SET ${set.join(', ')}, updated_at = NOW() WHERE id = $${idx++} AND church_id = $${idx++} RETURNING *`,
    params
  );
  return rows[0];
}

export async function deleteEvent(church_id, event_id) {
  const { rows } = await db.query(
    `DELETE FROM evangelism_events WHERE church_id=$1 AND id=$2 RETURNING *`,
    [church_id, event_id]
  );
  return rows[0];
}
