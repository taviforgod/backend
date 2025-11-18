// server/models/visitorModel.js
import db from '../config/db.js';

/**
 * Build dynamic filters in SQL safely
 * - filters: { q, zone_id, status_id }
 * - pagination: { limit, offset, orderBy, order }
 */
export async function listVisitorsForChurch(church_id, filters = {}, pagination = {}) {
  const vals = [church_id];
  let where = 'WHERE v.church_id = $1 AND v.deleted_at IS NULL';

  if (filters.zone_id) {
    vals.push(filters.zone_id);
    where += ` AND v.cell_group_id = $${vals.length}`;
  }
  if (filters.status_id) {
    vals.push(filters.status_id);
    where += ` AND v.follow_up_status = $${vals.length}`;
  }
  if (filters.q) {
    vals.push(`%${filters.q.toLowerCase()}%`);
    where += ` AND (LOWER(v.first_name) LIKE $${vals.length} OR LOWER(v.surname) LIKE $${vals.length} OR LOWER(v.email) LIKE $${vals.length})`;
  }

  // defaults
  const limit = Number.isFinite(Number(pagination.limit)) ? Number(pagination.limit) : 100;
  const offset = Number.isFinite(Number(pagination.offset)) ? Number(pagination.offset) : 0;
  const orderBy = pagination.orderBy ? pagination.orderBy : 'v.created_at';
  const order = pagination.order === 'desc' ? 'DESC' : 'ASC';

  vals.push(limit, offset);

  const sql = `
    SELECT
      v.*,
      cg.name AS cell_group_name,
      COALESCE(f.count,0)::int AS followup_count,
      f.last_followup_date,
      CASE
        WHEN COALESCE(f.count,0) >= 3 THEN 'done'
        WHEN COALESCE(f.count,0) > 0 THEN 'in_progress'
        ELSE COALESCE(v.follow_up_status, 'pending')
      END AS follow_up_status_calculated
    FROM visitors v
    LEFT JOIN cell_groups cg ON v.cell_group_id = cg.id
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS count, MAX(fu.followup_date) AS last_followup_date
      FROM visitor_follow_ups fu
      WHERE fu.visitor_id = v.id
    ) f ON TRUE
    ${where}
    ORDER BY ${orderBy} ${order}
    LIMIT $${vals.length-1} OFFSET $${vals.length}
  `;

  const { rows } = await db.query(sql, vals);
  return rows;
}

export async function getVisitorById(id) {
  const { rows } = await db.query(
    `SELECT v.*, cg.name AS cell_group_name,
      COALESCE(f.count,0)::int AS followup_count,
      f.last_followup_date,
      CASE
        WHEN COALESCE(f.count,0) >= 3 THEN 'done'
        WHEN COALESCE(f.count,0) > 0 THEN 'in_progress'
        ELSE COALESCE(v.follow_up_status, 'pending')
      END AS follow_up_status_calculated
     FROM visitors v
     LEFT JOIN cell_groups cg ON v.cell_group_id = cg.id
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS count, MAX(fu.followup_date) AS last_followup_date
       FROM visitor_follow_ups fu WHERE fu.visitor_id = v.id
     ) f ON TRUE
     WHERE v.id = $1 AND v.deleted_at IS NULL
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function createVisitor(data) {
  const cols = [
    'church_id','cell_group_id','first_name','surname','contact_primary','contact_secondary',
    'email','home_address','date_of_first_visit','how_heard','age_group','church_affiliation',
    'prayer_requests','invited_by','follow_up_method','member_id','next_follow_up_date',
    'notes','status','follow_up_status','created_by'
  ];
  const vals = [
    data.church_id,
    data.cell_group_id || null,
    data.first_name || null,
    data.surname || null,
    data.contact_primary || null,
    data.contact_secondary || null,
    data.email || null,
    data.home_address || null,
    data.date_of_first_visit || null,
    data.how_heard || null,
    data.age_group || null,
    data.church_affiliation || null,
    data.prayer_requests || null,
    data.invited_by || null,
    data.follow_up_method || null,
    data.member_id || null,
    data.next_follow_up_date || null,
    data.notes || null,
    data.status || 'new',
    data.follow_up_status || 'pending',
    data.created_by || null
  ];
  const placeholders = vals.map((_,i)=>`$${i+1}`).join(',');
  const { rows } = await db.query(`INSERT INTO visitors (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`, vals);
  return rows[0];
}

export async function updateVisitor(id, updates) {
  const fields = [];
  const vals = [];
  let i = 1;
  for (const k of Object.keys(updates)) {
    fields.push(`${k} = $${i}`);
    vals.push(updates[k]);
    i++;
  }
  if (fields.length === 0) return null;
  vals.push(id);
  const sql = `UPDATE visitors SET ${fields.join(',')}, updated_at = NOW() WHERE id=$${i} AND deleted_at IS NULL RETURNING *`;
  const { rows } = await db.query(sql, vals);
  return rows[0] || null;
}

export async function softDeleteVisitor(id) {
  await db.query(`UPDATE visitors SET deleted_at = NOW() WHERE id=$1`, [id]);
  return true;
}

export async function createFollowUp(visitorId, payload) {
  const { assigned_member_id, followup_date, method, notes, outcome, created_by } = payload;
  const { rows } = await db.query(
    `INSERT INTO visitor_follow_ups (visitor_id, assigned_member_id, followup_date, method, notes, outcome, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [visitorId, assigned_member_id || null, followup_date || new Date(), method || null, notes || null, outcome || null, created_by || null]
  );

  // update visitor follow_up_status and next_follow_up_date (simple rules)
  await db.query(
    `UPDATE visitors SET
       follow_up_status = CASE WHEN (SELECT COUNT(*) FROM visitor_follow_ups WHERE visitor_id = $1) >= 3 THEN 'done' ELSE 'in_progress' END,
       next_follow_up_date = NOW() + interval '7 days',
       updated_at = NOW()
     WHERE id = $1`,
    [visitorId]
  );

  return rows[0];
}

export async function listFollowUpsForVisitor(visitorId) {
  const { rows } = await db.query(
    `SELECT fu.*, m.first_name AS assigned_first_name, m.surname AS assigned_surname
     FROM visitor_follow_ups fu
     LEFT JOIN members m ON fu.assigned_member_id = m.id
     WHERE fu.visitor_id = $1
     ORDER BY fu.followup_date DESC`, [visitorId]
  );
  return rows;
}

export async function markConverted(visitorId, memberId, convertedBy) {
  await db.query(`UPDATE visitors SET converted_member_id=$1, status='converted', updated_at = NOW() WHERE id=$2`, [memberId, visitorId]);
  await db.query(`UPDATE visitors SET deleted_at = NOW() WHERE id=$1`, [visitorId]);
  // optionally return updated visitor
  const v = await getVisitorById(visitorId);
  return v;
}

/**
 * Get recent visitors invited by a specific member
 * Uses invited_by field to find visitors this member brought
 */
export async function getVisitorsInvitedByMember(memberId, churchId, recent = 30) {
  const { rows } = await db.query(
    `SELECT
      v.id,
      v.first_name,
      v.surname,
      CONCAT(v.first_name, ' ', COALESCE(v.surname, '')) as full_name,
      v.contact_primary,
      v.contact_secondary,
      v.email,
      v.home_address,
      v.status,
      v.follow_up_status,
      v.created_at,
      v.date_of_first_visit,
      v.how_heard,
      v.age_group,
      v.church_affiliation,
      v.prayer_requests,
      v.notes,
      cg.name AS cell_group_name,
      COALESCE(f.count, 0)::int AS followup_count,
      f.last_followup_date,
      CASE
        WHEN COALESCE(f.count, 0) >= 3 THEN 'done'
        WHEN COALESCE(f.count, 0) > 0 THEN 'in_progress'
        ELSE COALESCE(v.follow_up_status, 'pending')
      END AS follow_up_status_calculated
    FROM visitors v
    LEFT JOIN cell_groups cg ON v.cell_group_id = cg.id
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS count, MAX(fu.followup_date) AS last_followup_date
      FROM visitor_follow_ups fu
      WHERE fu.visitor_id = v.id
    ) f ON TRUE
    WHERE v.church_id = $1
    AND v.invited_by = $2
    AND v.deleted_at IS NULL
    AND v.created_at >= NOW() - INTERVAL '${recent} days'
    ORDER BY v.created_at DESC
    LIMIT 10`,
    [churchId, memberId]
  );
  return rows;
}
