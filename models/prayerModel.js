import db from '../config/db.js';

const generateRequestNo = () => `PR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*900 + 100)}`;

export const createPrayerRequest = async (data) => {
  const { member_id = null, church_id, created_by = null, category = 'prayer', sub_category = null, urgency = 'normal', preferred_contact_method = null, contact_details = null, description = null, confidentiality = true } = data;
  const request_no = generateRequestNo();
  const res = await db.query(
    `INSERT INTO prayer_requests (request_no, member_id, church_id, created_by, category, sub_category, urgency, preferred_contact_method, contact_details, description, confidentiality, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now(), now()) RETURNING *`,
    [request_no, member_id, church_id, created_by, category, sub_category, urgency, preferred_contact_method, contact_details, description, confidentiality]
  );
  return res.rows[0];
};

export const getPrayerRequests = async ({ church_id, limit = 100, offset = 0, filters = {} }) => {
  const vals = [church_id];
  let where = `WHERE pr.church_id = $1`;
  if (filters.status) { vals.push(filters.status); where += ` AND pr.status = $${vals.length}`; }
  if (filters.urgency) { vals.push(filters.urgency); where += ` AND pr.urgency = $${vals.length}`; }
  if (filters.assigned_to) { vals.push(filters.assigned_to); where += ` AND pr.assigned_to = $${vals.length}`; }
  if (filters.q) { 
    vals.push(`%${filters.q}%`); 
    where += ` AND (pr.description ILIKE $${vals.length} OR m.first_name ILIKE $${vals.length} OR m.surname ILIKE $${vals.length})`; 
  }
  vals.push(limit, offset);
  const res = await db.query(
    `SELECT pr.*,
          u.name AS requester_name,
          am.first_name AS assigned_first_name,
          am.surname AS assigned_surname,
          am.email AS assigned_email,
          (
            SELECT ARRAY_REMOVE(ARRAY_AGG(DISTINCT r2.name), NULL)
            FROM users u2
            JOIN user_roles ur2 ON ur2.user_id = u2.id
            JOIN roles r2 ON r2.id = ur2.role_id
            WHERE
              (am.user_id IS NOT NULL AND u2.id = am.user_id)
              OR (am.email IS NOT NULL AND LOWER(u2.email) = LOWER(am.email))
              OR (am.contact_primary IS NOT NULL AND u2.phone = am.contact_primary)
          ) AS assigned_roles
   FROM prayer_requests pr
   LEFT JOIN users u ON pr.created_by = u.id
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
            u.name AS requester_name,
            am.first_name AS assigned_first_name,
            am.surname AS assigned_surname,
            am.email AS assigned_email,
            (
              SELECT ARRAY_REMOVE(ARRAY_AGG(DISTINCT r2.name), NULL)
              FROM users u2
              JOIN user_roles ur2 ON ur2.user_id = u2.id
              JOIN roles r2 ON r2.id = ur2.role_id
              WHERE
                (am.user_id IS NOT NULL AND u2.id = am.user_id)
                OR (am.email IS NOT NULL AND LOWER(u2.email) = LOWER(am.email))
                OR (am.contact_primary IS NOT NULL AND u2.phone = am.contact_primary)
            ) AS assigned_roles
     FROM prayer_requests pr
     LEFT JOIN users u ON pr.created_by = u.id
     LEFT JOIN members am ON pr.assigned_to = am.id
     WHERE pr.id = $1 AND pr.church_id = $2`,
    [id, church_id]
  );
  if (!res.rows[0]) return null;

  const followups = await db.query(
    `SELECT f.*, u.id AS contacted_by_user_id, u.email AS contacted_by_email,
            COALESCE(mu.first_name, u.name) AS contacted_by_first_name,
            mu.surname AS contacted_by_surname,
            mu.contact_primary AS contacted_by_contact_primary
     FROM prayer_followups f
     LEFT JOIN users u ON f.contacted_by = u.id
     LEFT JOIN members mu ON mu.user_id = u.id
        OR (mu.email IS NOT NULL AND LOWER(mu.email) = LOWER(u.email))
        OR (mu.contact_primary IS NOT NULL AND u.phone = mu.contact_primary)
     WHERE f.prayer_request_id = $1
     ORDER BY f.contacted_at DESC`,
    [id]
  );
  const audits = await db.query(
    `SELECT a.id, a.action, a.details, a.performed_by,
          COALESCE(ma.first_name, ua.name) AS performed_by_first_name,
          ma.surname AS performed_by_surname,
          ma.contact_primary AS performed_by_contact_primary,
          a.performed_at
     FROM prayer_audit_logs a
     LEFT JOIN users ua ON a.performed_by = ua.id
     LEFT JOIN members ma ON ma.user_id = ua.id
        OR (ma.email IS NOT NULL AND LOWER(ma.email) = LOWER(ua.email))
        OR (ma.contact_primary IS NOT NULL AND ua.phone = ma.contact_primary)
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
  const vals = []; const set = fields.map((k, idx) => { vals.push(updates[k]); return `${k} = $${idx + 1}`; }).join(', ');
  vals.push(id, church_id);
  const query = `UPDATE prayer_requests SET ${set}, updated_at = now() WHERE id = $${vals.length-1} AND church_id = $${vals.length} RETURNING *`;
  const res = await db.query(query, vals);
  return res.rows[0];
};

export const memberExistsInChurch = async (member_id, church_id) => {
  if (!member_id) return false;
  const res = await db.query(`SELECT 1 FROM members WHERE id = $1 AND church_id = $2 LIMIT 1`, [member_id, church_id]);
  return res.rowCount > 0;
};

export const insertPrayerAudit = async (prayer_request_id, action, details = null, performed_by = null) => {
  const res = await db.query(`INSERT INTO prayer_audit_logs (prayer_request_id, action, details, performed_by, performed_at) VALUES ($1, $2, $3, $4, now()) RETURNING *`, [prayer_request_id, action, details ? JSON.stringify(details) : null, performed_by]);
  return res.rows[0];
};

export const assignPrayerRequest = async (id, church_id, assigned_to, assigned_by = null) => {
  const memberOk = await memberExistsInChurch(assigned_to, church_id);
  if (!memberOk) { const err = new Error('Assignee invalid'); err.code = 'INVALID_MEMBER'; throw err; }
  const res = await db.query(`UPDATE prayer_requests SET assigned_to = $1, status = 'in_progress', updated_at = now() WHERE id = $2 AND church_id = $3 RETURNING *`, [assigned_to, id, church_id]);
  try { await insertPrayerAudit(id, 'assigned', { assigned_to }, assigned_by); } catch(e){}
  return res.rows[0];
};

export const addFollowUp = async (prayer_request_id, note, contacted_by = null, method = null, contacted_at = null) => {
  const res = await db.query(`INSERT INTO prayer_followups (prayer_request_id, note, contacted_by, method, contacted_at, created_at) VALUES ($1,$2,$3,$4, COALESCE($5, now()), now()) RETURNING *`, [prayer_request_id, note, contacted_by, method, contacted_at]);
  await db.query(`UPDATE prayer_requests SET last_contacted_at = COALESCE($1, now()), updated_at = now() WHERE id = $2`, [contacted_at || new Date(), prayer_request_id]);
  try { await insertPrayerAudit(prayer_request_id, 'followup_added', { note, method, contacted_at }, contacted_by); } catch(e){}
  return res.rows[0];
};

export const closePrayerRequest = async (id, church_id, outcome = null, resolution_notes = null, closed_by = null) => {
  const res = await db.query(`UPDATE prayer_requests SET status = 'closed', outcome = $1, resolution_notes = $2, updated_at = now() WHERE id = $3 AND church_id = $4 RETURNING *`, [outcome, resolution_notes, id, church_id]);
  try { await insertPrayerAudit(id, 'closed', { outcome, resolution_notes }, closed_by); } catch(e){}
  return res.rows[0];
};

export const countUrgentOpen = async (church_id) => {
  const res = await db.query(`SELECT COUNT(*)::int AS urgent_open FROM prayer_requests WHERE church_id = $1 AND urgency = 'urgent' AND status != 'closed'`, [church_id]);
  return res.rows[0].urgent_open;
};

export const avgTimeToFirstContactSeconds = async (church_id) => {
  const res = await db.query(`SELECT AVG(EXTRACT(EPOCH FROM (first_contacted - pr.created_at))) AS avg_seconds FROM (SELECT pr.id, pr.created_at, (SELECT MIN(contacted_at) FROM prayer_followups pf WHERE pf.prayer_request_id = pr.id) AS first_contacted FROM prayer_requests pr WHERE pr.church_id = $1) t JOIN prayer_requests pr ON pr.id = t.id WHERE t.first_contacted IS NOT NULL`, [church_id]);
  return res.rows[0].avg_seconds || 0;
};

export const trendByCategory = async (church_id, days = 90) => {
  const res = await db.query(`SELECT category, COUNT(*)::int AS cnt FROM prayer_requests WHERE church_id = $1 AND created_at >= now() - ($2::int || ' days')::interval GROUP BY category ORDER BY cnt DESC`, [church_id, days]);
  return res.rows;
};

export async function resolveMemberId({ user_id, email, contact_primary }) {
  // Try to find a member by user_id, then email, then contact_primary
  let res;
  if (user_id) {
    res = await db.query('SELECT id FROM members WHERE user_id = $1 LIMIT 1', [user_id]);
    if (res.rows[0]) return res.rows[0].id;
  }
  if (email) {
    res = await db.query('SELECT id FROM members WHERE email IS NOT NULL AND LOWER(email) = LOWER($1) LIMIT 1', [email]);
    if (res.rows[0]) return res.rows[0].id;
  }
  if (contact_primary) {
    res = await db.query('SELECT id FROM members WHERE contact_primary IS NOT NULL AND contact_primary = $1 LIMIT 1', [contact_primary]);
    if (res.rows[0]) return res.rows[0].id;
  }
  return null;
}
