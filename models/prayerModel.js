import db from '../config/db.js';

/* leadership validation */
export async function isActiveLeader(churchId, memberId) {
  const q = `
    SELECT 1 FROM leadership_roles lr
    WHERE lr.church_id = $1
      AND lr.member_id = $2
      AND lr.active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM leadership_alerts la
        WHERE la.church_id = $1
          AND la.leader_id = $2
          AND la.resolved = FALSE
          AND la.type IN ('burnout','inactivity')
      )
    LIMIT 1;
  `;
  const res = await db.query(q, [churchId, memberId]);
  return res.rowCount > 0;
}

export async function createPrayerRequest(data) {
  const {
    church_id, created_by_member_id, category, sub_category, urgency,
    preferred_contact_method, contact_details, description, confidential, anonymous, metadata
  } = data;
  
  // If anonymous, set created_by_member_id to null
  const memberId = anonymous ? null : created_by_member_id;
  
  const q = `
    INSERT INTO prayer_requests
      (church_id, created_by_member_id, category, sub_category, urgency, preferred_contact_method,
       contact_details, description, confidential, anonymous, metadata, status, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'open', now(), now())
    RETURNING *;
  `;
  const vals = [
    church_id, memberId, category, sub_category, urgency || 'normal',
    preferred_contact_method, contact_details || {}, description || '', !!confidential, !!anonymous, metadata || {}
  ];
  const { rows } = await db.query(q, vals);
  const prayer = rows[0];
  await addAudit(prayer.id, 'created', { by: memberId, anonymous: !!anonymous });

  return prayer;
}

export async function getPrayerById(id, churchId) {
  const q = `
    SELECT pr.*, m.first_name, m.surname,
      a.first_name AS assigned_first_name, a.surname AS assigned_surname
    FROM prayer_requests pr
    LEFT JOIN members m ON pr.created_by_member_id = m.id
    LEFT JOIN members a ON pr.assigned_to = a.id
    WHERE pr.id = $1 AND pr.church_id = $2
  `;
  const { rows } = await db.query(q, [id, churchId]);
  if (!rows[0]) return null;
  const pr = rows[0];
  const f = await db.query('SELECT pf.*, m.first_name, m.surname FROM prayer_followups pf LEFT JOIN members m ON m.id = pf.created_by_member_id WHERE pf.prayer_id=$1 ORDER BY pf.created_at ASC', [pr.id]);
  const a = await db.query('SELECT pa.*, m.first_name AS performed_by_first, m.surname AS performed_by_surname FROM prayer_audits pa LEFT JOIN members m ON m.id = pa.performed_by_member_id WHERE pa.prayer_id=$1 ORDER BY pa.created_at ASC', [pr.id]);
  pr.followups = f.rows || [];
  pr.audit = a.rows || [];
  return pr;
}

export async function getPrayers(churchId, limit = 50, offset = 0, filters = {}) {
  const params = [churchId];
  let where = 'WHERE pr.church_id = $1';

  if (filters.status) {
    params.push(String(filters.status));
    where += ` AND pr.status = $${params.length}`;
  }

  if (filters.start_date) {
    params.push(filters.start_date);
    where += ` AND pr.created_at >= $${params.length}`;
  }

  if (filters.end_date) {
    params.push(filters.end_date);
    where += ` AND pr.created_at <= $${params.length}`;
  }

  const q = `
    SELECT pr.*, m.first_name, m.surname,
      a.first_name AS assigned_first_name, a.surname AS assigned_surname
    FROM prayer_requests pr
    LEFT JOIN members m ON pr.created_by_member_id = m.id
    LEFT JOIN members a ON pr.assigned_to = a.id
    ${where}
    ORDER BY pr.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  params.push(limit, offset);
  const { rows } = await db.query(q, params);
  return rows;
}

export async function getUrgentCount(churchId) {
  const q = `
    SELECT COUNT(*) FILTER (WHERE urgency='urgent' AND status IN ('open','in_progress'))::int AS urgent_open
    FROM prayer_requests
    WHERE church_id = $1;
  `;
  const { rows } = await db.query(q, [churchId]);
  return rows[0] || { urgent_open: 0 };
}

export async function assignPrayer(churchId, prayerId, assignedTo, actorId) {
  const ok = await isActiveLeader(churchId, assignedTo);
  if (!ok) {
    const err = new Error('Assignee must be an active leader (not flagged with burnout/inactivity).');
    err.status = 403;
    throw err;
  }
  const q = `UPDATE prayer_requests SET assigned_to = $1, status = 'in_progress', updated_at = now() WHERE id = $2 AND church_id = $3 RETURNING *`;
  const { rows } = await db.query(q, [assignedTo, prayerId, churchId]);
  const prayer = rows[0];
  await addAudit(prayerId, 'assigned', { to: assignedTo, by: actorId });
  return prayer;
}

export async function addFollowup(churchId, prayerId, memberId, note, method) {
  const q = `INSERT INTO prayer_followups (church_id, prayer_id, created_by_member_id, note, method) VALUES ($1,$2,$3,$4,$5) RETURNING *`;
  const { rows } = await db.query(q, [churchId, prayerId, memberId, note, method || 'phone']);
  await addAudit(prayerId, 'followup_added', { note, by: memberId });
  return rows[0];
}

export async function closePrayer(churchId, prayerId, memberId, outcome, notes) {
  const q = `UPDATE prayer_requests SET status = 'closed', closed_at = now(), updated_at = now() WHERE id = $1 AND church_id = $2 RETURNING *`;
  const { rows } = await db.query(q, [prayerId, churchId]);
  await addAudit(prayerId, 'closed', { outcome, notes, by: memberId });
  return rows[0];
}

export async function addAudit(prayerId, action, payload) {
  const q = `INSERT INTO prayer_audits (prayer_id, action, payload, performed_by_member_id, created_at) VALUES ($1,$2,$3,$4, now()) RETURNING *`;
  await db.query(q, [prayerId, action, payload, payload && payload.by ? payload.by : null]);
}
