import db from '../config/db.js';

// Helper to generate request number
const generateRequestNo = () => `PR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*900 + 100)}`;

// Insert prayer request
export const createPrayerRequest = async (data) => {
  const {
    member_id = null,
    church_id,
    created_by = null,
    category = 'prayer',
    sub_category = null,
    urgency = 'normal',
    preferred_contact_method = null,
    contact_details = null,
    description = null,
    confidentiality = true
  } = data;

  const request_no = generateRequestNo();

  const res = await db.query(
    `INSERT INTO prayer_requests (
      request_no, member_id, church_id, created_by, category, sub_category,
      urgency, preferred_contact_method, contact_details, description, confidentiality, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now(), now()) RETURNING *`,
    [request_no, member_id, church_id, created_by, category, sub_category, urgency, preferred_contact_method, contact_details, description, confidentiality]
  );
  return res.rows[0];
};

export const getPrayerRequests = async ({ church_id, limit = 100, offset = 0, filters = {} }) => {
  const vals = [church_id];
  let where = `WHERE pr.church_id = $1`;

  if (filters.status) {
    vals.push(filters.status);
    where += ` AND pr.status = $${vals.length}`;
  }
  if (filters.urgency) {
    vals.push(filters.urgency);
    where += ` AND pr.urgency = $${vals.length}`;
  }
  if (filters.assigned_to) {
    vals.push(filters.assigned_to);
    where += ` AND pr.assigned_to = $${vals.length}`;
  }
  if (filters.q) {
    vals.push(`%${filters.q}%`);
    where += ` AND (LOWER(pr.request_no) LIKE LOWER($${vals.length}) OR LOWER(pr.description) LIKE LOWER($${vals.length}))`;
  }

  vals.push(limit, offset);

  const res = await db.query(
    `SELECT pr.*,
            m.first_name, m.surname, m.email AS member_email,
            CASE WHEN pr.confidentiality = FALSE THEN m.contact_primary ELSE NULL END AS member_phone,
            am.first_name AS assigned_first_name, am.surname AS assigned_surname, am.email AS assigned_email
     FROM prayer_requests pr
     LEFT JOIN members m ON pr.member_id = m.id
     LEFT JOIN members am ON pr.assigned_to = am.id
     ${where}
     ORDER BY pr.created_at DESC
     LIMIT $${vals.length-1} OFFSET $${vals.length}`,
    vals
  );
  return res.rows;
};

export const getPrayerById = async (id, church_id) => {
  const res = await db.query(
    `SELECT pr.*,
            m.first_name, m.surname, m.email AS member_email,
            CASE WHEN pr.confidentiality = FALSE THEN m.contact_primary ELSE NULL END AS member_phone,
            am.first_name AS assigned_first_name, am.surname AS assigned_surname, am.email AS assigned_email
     FROM prayer_requests pr
     LEFT JOIN members m ON pr.member_id = m.id
     LEFT JOIN members am ON pr.assigned_to = am.id
     WHERE pr.id = $1 AND pr.church_id = $2`,
    [id, church_id]
  );
  if (!res.rows[0]) return null;

  const followups = await db.query(
    `SELECT f.*,
            m.first_name AS contacted_by_first_name,
            m.surname AS contacted_by_surname
     FROM prayer_followups f
     LEFT JOIN users u ON f.contacted_by = u.id
     LEFT JOIN members m
       ON m.user_id = u.id
       OR (LOWER(m.email) = LOWER(u.email))
       OR (m.contact_primary = u.phone)
     WHERE f.prayer_request_id = $1
     ORDER BY f.contacted_at DESC`,
    [id]
  );

  const audits = await db.query(
    `SELECT a.id, a.action, a.details, a.performed_by,
            m.first_name AS performed_by_first_name,
            m.surname AS performed_by_surname,
            a.performed_at
     FROM prayer_audit_logs a
     LEFT JOIN users u ON a.performed_by = u.id
     LEFT JOIN members m
       ON m.user_id = u.id
       OR (LOWER(m.email) = LOWER(u.email))
       OR (m.contact_primary = u.phone)
     WHERE a.prayer_request_id = $1
     ORDER BY a.performed_at DESC`,
    [id]
  );

  const row = res.rows[0];
  row.followups = followups.rows;
  row.audit = audits.rows;
  return row;
};

export const updatePrayerRequest = async (id, church_id, updates) => {
  const allowed = ['category','sub_category','urgency','preferred_contact_method','contact_details','description','confidentiality','status','outcome','resolution_notes','assigned_to','last_contacted_at'];
  const fields = Object.keys(updates).filter(k => allowed.includes(k));
  if (fields.length === 0) throw new Error('No valid fields to update');

  const vals = [];
  const set = fields.map((k, idx) => {
    vals.push(updates[k]);
    return `${k} = $${idx + 1}`;
  }).join(', ');

  vals.push(id, church_id);
  const query = `UPDATE prayer_requests SET ${set}, updated_at = now() WHERE id = $${vals.length-1} AND church_id = $${vals.length} RETURNING *`;
  const res = await db.query(query, vals);
  return res.rows[0];
};

export const memberExistsInChurch = async (member_id, church_id) => {
  if (!member_id) return false;
  const res = await db.query(
    `SELECT 1 FROM members WHERE id = $1 AND church_id = $2 LIMIT 1`,
    [member_id, church_id]
  );
  return res.rowCount > 0;
};

export const insertPrayerAudit = async (prayer_request_id, action, details = null, performed_by = null) => {
  const res = await db.query(
    `INSERT INTO prayer_audit_logs (prayer_request_id, action, details, performed_by, performed_at)
     VALUES ($1, $2, $3, $4, now()) RETURNING *`,
    [prayer_request_id, action, details ? JSON.stringify(details) : null, performed_by]
  );
  return res.rows[0];
};

export const assignPrayerRequest = async (id, church_id, assigned_to, assigned_by = null) => {
  const memberOk = await memberExistsInChurch(assigned_to, church_id);
  if (!memberOk) {
    const err = new Error('Assignee is not a valid member of this church');
    err.code = 'INVALID_MEMBER';
    throw err;
  }

  const res = await db.query(
    `UPDATE prayer_requests
     SET assigned_to = $1, status = 'in_progress', updated_at = now()
     WHERE id = $2 AND church_id = $3
     RETURNING *`,
    [assigned_to, id, church_id]
  );
  const updated = res.rows[0];

  try {
    await insertPrayerAudit(id, 'assigned', { assigned_to }, assigned_by);
  } catch (e) {
    console.error('Failed to insert audit record for assignment', e);
  }

  return updated;
};

export const addFollowUp = async (prayer_request_id, note, contacted_by = null, method = null, contacted_at = null) => {
  const res = await db.query(
    `INSERT INTO prayer_followups (prayer_request_id, note, contacted_by, method, contacted_at, created_at)
     VALUES ($1,$2,$3,$4, COALESCE($5, now()), now()) RETURNING *`,
    [prayer_request_id, note, contacted_by, method, contacted_at]
  );

  await db.query(`UPDATE prayer_requests SET last_contacted_at = COALESCE($1, now()), updated_at = now() WHERE id = $2`, [contacted_at || new Date(), prayer_request_id]);

  try {
    await insertPrayerAudit(prayer_request_id, 'followup_added', { note, method, contacted_at }, contacted_by);
  } catch (e) {
    console.error('Failed to insert audit for followup', e);
  }

  return res.rows[0];
};

export const closePrayerRequest = async (id, church_id, outcome = null, resolution_notes = null, closed_by = null) => {
  const res = await db.query(
    `UPDATE prayer_requests
     SET status = 'closed', outcome = $1, resolution_notes = $2, updated_at = now()
     WHERE id = $3 AND church_id = $4
     RETURNING *`,
    [outcome, resolution_notes, id, church_id]
  );
  const updated = res.rows[0];

  try {
    await insertPrayerAudit(id, 'closed', { outcome, resolution_notes }, closed_by);
  } catch (e) {
    console.error('Failed to insert audit record for close', e);
  }

  return updated;
};

export const countUrgentOpen = async (church_id) => {
  const res = await db.query(
    `SELECT COUNT(*)::int AS urgent_open FROM prayer_requests WHERE church_id = $1 AND urgency = 'urgent' AND status != 'closed'`,
    [church_id]
  );
  return res.rows[0].urgent_open;
};

export const avgTimeToFirstContactSeconds = async (church_id) => {
  const res = await db.query(`
    SELECT AVG(EXTRACT(EPOCH FROM (first_contacted - pr.created_at))) AS avg_seconds
    FROM (
      SELECT pr.id, pr.created_at,
        (SELECT MIN(contacted_at) FROM prayer_followups pf WHERE pf.prayer_request_id = pr.id) AS first_contacted
      FROM prayer_requests pr
      WHERE pr.church_id = $1
    ) t
    JOIN prayer_requests pr ON pr.id = t.id
    WHERE t.first_contacted IS NOT NULL
  `, [church_id]);
  return res.rows[0].avg_seconds || 0;
};

export const trendByCategory = async (church_id, days = 90) => {
  const res = await db.query(
    `SELECT category, COUNT(*)::int AS cnt
     FROM prayer_requests
     WHERE church_id = $1 AND created_at >= now() - ($2::int || ' days')::interval
     GROUP BY category ORDER BY cnt DESC`,
    [church_id, days]
  );
  return res.rows;
};
