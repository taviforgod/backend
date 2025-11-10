import db from '../config/db.js';

export async function createFollowUp(data) {
  const { visitor_id, assigned_member_id, followup_date, method, notes, outcome, created_by } = data;
  const { rows } = await db.query(`INSERT INTO visitor_follow_ups (visitor_id, assigned_member_id, followup_date, method, notes, outcome, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [visitor_id, assigned_member_id || null, followup_date || null, method || null, notes || null, outcome || null, created_by || null]);
  return rows[0];
}

export async function listFollowUpsForVisitor(visitor_id) {
  const { rows } = await db.query(`SELECT f.*, m.first_name AS assigned_first_name, m.surname AS assigned_surname FROM visitor_follow_ups f LEFT JOIN members m ON f.assigned_member_id = m.id WHERE f.visitor_id=$1 ORDER BY f.followup_date DESC`, [visitor_id]);
  return rows;
}

export async function listDueFollowUps(church_id, cutoff) {
  const { rows } = await db.query(`SELECT f.id, f.visitor_id, v.first_name, v.surname, v.next_follow_up_date, f.followup_date, f.assigned_member_id FROM visitor_follow_ups f INNER JOIN visitors v ON f.visitor_id = v.id WHERE v.church_id=$1 AND COALESCE(v.next_follow_up_date, f.followup_date) <= $2 ORDER BY COALESCE(v.next_follow_up_date, f.followup_date) ASC`, [church_id, cutoff]);
  return rows;
}
