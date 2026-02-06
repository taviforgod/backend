import db from '../config/db.js';
import { Parser as CsvParser } from 'json2csv';
import memberService from '../services/memberService.js';

// Get all members for a specific church (with pagination)
export const getAllMembers = async ({ church_id, limit = 100, offset = 0 }) => {
  const res = await db.query(`
    SELECT m.*, m.exit_id AS exit_id, m.contact_primary AS phone, m.user_id,
      t.name AS title,
      n.name AS nationality,
      g.name AS gender,
      ms.name AS marital_status,
      mt.name AS member_type,
      mstat.name AS status
    FROM members m
    LEFT JOIN titles t ON m.title_id = t.id
    LEFT JOIN nationalities n ON m.nationality_id = n.id
    LEFT JOIN genders g ON m.gender_id = g.id
    LEFT JOIN marital_statuses ms ON m.marital_status_id = ms.id
    LEFT JOIN member_types mt ON m.member_type_id = mt.id
    LEFT JOIN member_statuses mstat ON m.member_status_id = mstat.id
    WHERE m.church_id = $1
    ORDER BY m.first_name, m.surname
    LIMIT $2 OFFSET $3
  `, [church_id, limit, offset]);
  return res.rows;
};

// Get a member by ID (and church)
export const getMemberById = async (id, church_id) => {
  const res = await db.query(`
    SELECT m.*, m.exit_id AS exit_id, m.contact_primary AS phone, m.user_id,
      t.name AS title,
      n.name AS nationality,
      g.name AS gender,
      ms.name AS marital_status,
      mt.name AS member_type,
      mstat.name AS status,
      cg.name AS cell_group_name,
      COALESCE(r.name, cm.role) AS cell_role,
      NULLIF(CONCAT_WS(' ', leader.first_name, leader.surname), '') AS cell_leader,
      COALESCE(leader.contact_primary, leader.contact_secondary, leader.email) AS cell_contact,
      COALESCE(br.baptism_date, bc.baptism_date, m.date_baptized_immersion) AS baptism_date,
      CASE
        WHEN br.baptism_date IS NOT NULL THEN 'baptized'
        WHEN bc.status IS NOT NULL THEN bc.status
        WHEN m.date_baptized_immersion IS NOT NULL OR m.baptized_in_christ_embassy IS TRUE THEN 'baptized'
        ELSE NULL
      END AS baptism_status,
      COALESCE(fs.status, CASE WHEN m.foundation_school_grad_date IS NOT NULL THEN 'completed' END) AS foundation_school_status,
      NULLIF(CONCAT_WS(' ', counselor.first_name, counselor.surname), '') AS counsellor,
      bc.counseling_date AS last_counselling_date,
      CASE
        WHEN bc.counseling_completed IS TRUE THEN 'completed'
        WHEN bc.counseling_date IS NOT NULL THEN 'scheduled'
        WHEN bc.id IS NOT NULL THEN 'in_progress'
        ELSE NULL
      END AS care_status,
      pr.description AS prayer_requests
    FROM members m
    LEFT JOIN titles t ON m.title_id = t.id
    LEFT JOIN nationalities n ON m.nationality_id = n.id
    LEFT JOIN genders g ON m.gender_id = g.id
    LEFT JOIN marital_statuses ms ON m.marital_status_id = ms.id
    LEFT JOIN member_types mt ON m.member_type_id = mt.id
    LEFT JOIN member_statuses mstat ON m.member_status_id = mstat.id
    LEFT JOIN LATERAL (
      SELECT cm.*
      FROM cell_members cm
      WHERE cm.member_id = m.id AND cm.is_active = TRUE
      ORDER BY cm.updated_at DESC NULLS LAST,
               cm.date_joined DESC NULLS LAST,
               cm.joined_at DESC NULLS LAST,
               cm.assigned_at DESC NULLS LAST,
               cm.created_at DESC NULLS LAST,
               cm.id DESC
      LIMIT 1
    ) cm ON TRUE
    LEFT JOIN cell_groups cg ON cg.id = cm.cell_group_id
    LEFT JOIN roles r ON r.id = cm.role_id
    LEFT JOIN members leader ON leader.id = cg.leader_id
    LEFT JOIN LATERAL (
      SELECT bc.*
      FROM baptism_candidates bc
      WHERE bc.member_id = m.id AND bc.church_id = m.church_id
      ORDER BY bc.updated_at DESC NULLS LAST, bc.created_at DESC NULLS LAST, bc.id DESC
      LIMIT 1
    ) bc ON TRUE
    LEFT JOIN LATERAL (
      SELECT br.*
      FROM baptism_records br
      WHERE br.candidate_id = bc.id
      ORDER BY br.baptism_date DESC NULLS LAST, br.id DESC
      LIMIT 1
    ) br ON TRUE
    LEFT JOIN members counselor ON counselor.id = bc.counselor_id
    LEFT JOIN LATERAL (
      SELECT fs.*
      FROM foundation_school_enrollments fs
      WHERE fs.member_id = m.id AND fs.church_id = m.church_id
      ORDER BY fs.completed_at DESC NULLS LAST, fs.enrolled_at DESC NULLS LAST, fs.id DESC
      LIMIT 1
    ) fs ON TRUE
    LEFT JOIN LATERAL (
      SELECT pr.*
      FROM prayer_requests pr
      WHERE pr.member_id = m.id AND pr.church_id = m.church_id
      ORDER BY pr.created_at DESC NULLS LAST, pr.id DESC
      LIMIT 1
    ) pr ON TRUE
    WHERE m.id = $1 AND m.church_id = $2
  `, [id, church_id]);
  return res.rows[0];
};

// Get member by email (case-insensitive)
export const getMemberByEmail = async (email, church_id) => {
  const res = await db.query(
    `SELECT m.*, m.contact_primary AS phone, m.user_id
     FROM members m
     WHERE LOWER(m.email) = $1 AND m.church_id = $2
     LIMIT 1`,
    [email.trim().toLowerCase(), church_id]
  );
  return res.rows[0];
};

// Get member by phone
export const getMemberByPhone = async (phone, church_id) => {
  const res = await db.query(
    `SELECT m.*, m.contact_primary AS phone, m.user_id
     FROM members m
     WHERE m.contact_primary = $1 AND m.church_id = $2
     LIMIT 1`,
    [phone.trim(), church_id]
  );
  return res.rows[0];
};

// Get member by user_id
export const getMemberByUserId = async (user_id, church_id) => {
  const res = await db.query(
    `SELECT m.*, m.contact_primary AS phone, m.user_id
     FROM members m
     WHERE m.user_id = $1 AND m.church_id = $2
     LIMIT 1`,
    [user_id, church_id]
  );
  return res.rows[0];
};

// Create a new member (expects lookup IDs and church_id)
export const createMember = async (memberData) => {
  const {
    profile_photo, title_id, first_name, surname, date_of_birth,
    contact_primary, contact_secondary, email, nationality_id, gender_id,
    marital_status_id, num_children, physical_address, profession, occupation,
    work_address, date_joined_church, date_born_again, date_baptized_immersion,
    baptized_in_christ_embassy, date_received_holy_ghost, foundation_school_grad_date,
    member_status_id, member_type_id, rfid_tag, church_id, user_id
  } = memberData || {};

  const normalizedEmail = email ? email.trim().toLowerCase() : null;
  const normalizedPhone = contact_primary ? contact_primary.trim() : null;

  const res = await db.query(
    `INSERT INTO members (
      profile_photo, title_id, first_name, surname, date_of_birth,
      contact_primary, contact_secondary, email, nationality_id, gender_id,
      marital_status_id, num_children, physical_address, profession, occupation,
      work_address, date_joined_church, date_born_again, date_baptized_immersion,
      baptized_in_christ_embassy, date_received_holy_ghost, foundation_school_grad_date,
      member_status_id, member_type_id, rfid_tag, church_id, user_id
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15,
      $16, $17, $18, $19,
      $20, $21, $22,
      $23, $24, $25, $26, $27
    ) RETURNING *`,
    [
      profile_photo, title_id, first_name, surname, date_of_birth,
      normalizedPhone, contact_secondary, normalizedEmail, nationality_id, gender_id,
      marital_status_id, num_children, physical_address, profession, occupation,
      work_address, date_joined_church, date_born_again, date_baptized_immersion,
      baptized_in_christ_embassy, date_received_holy_ghost, foundation_school_grad_date,
      member_status_id, member_type_id, rfid_tag, church_id, user_id
    ]
  );

  const member = res.rows[0];

  // If member has a user_id, update notification preferences to link member
  if (user_id && church_id) {
    try {
      await db.query(
        `UPDATE user_notification_preferences
         SET member_id = $1, updated_at = NOW()
         WHERE user_id = $2 AND church_id = $3`,
        [member.id, user_id, church_id]
      );
    } catch (error) {
      console.warn('Failed to link member to notification preferences:', member.id, error);
      // Don't fail member creation if preferences update fails
    }
  }

  // Trigger automated processes for new member
  try {
    // Get church info for notifications
    const churchRes = await db.query('SELECT * FROM churches WHERE id = $1', [church_id]);
    const church = churchRes.rows[0];

    if (church) {
      // Run all automated member processes (welcome notifications, birthday reminders, etc.)
      await memberService.handleNewMember(member, church);
    }
  } catch (error) {
    console.warn('Failed to run automated member processes:', error);
    // Don't fail member creation if automated processes fail
  }

  return member;
};

// Bulk insert members from array (for CSV import)
export const bulkInsertMembers = async (members, church_id) => {
  if (!Array.isArray(members) || members.length === 0) return [];
  const inserted = [];
  for (const m of members) {
    const memberData = {
      ...m,
      church_id,
      email: m.email ? m.email.trim().toLowerCase() : null,
      contact_primary: m.phone ? m.phone.trim() : null,
    };
    const created = await createMember(memberData);
    inserted.push(created);
  }
  return inserted;
};

// Update a member (expects lookup IDs and church_id)
// Normalizes date fields and re-fetches the enriched member after update
export const updateMember = async (id, memberData, church_id) => {
  if (!id || !memberData || typeof memberData !== 'object') {
    throw new Error('Valid id and memberData required');
  }

  // Get current enriched member (includes joined lookup fields)
  const current = await getMemberById(id, church_id);
  if (!current) throw new Error('Member not found');

  // support alias from client (phone -> contact_primary)
  if (memberData.phone && !memberData.contact_primary) {
    memberData.contact_primary = memberData.phone;
  }

  // helper: normalize values for comparison
  const DATE_KEYS = new Set([
    'date_of_birth','date_joined_church','date_born_again','date_baptized_immersion',
    'date_received_holy_ghost','foundation_school_grad_date'
  ]);

  const toDateOnly = (v) => {
    if (v === undefined || v === null) return null;
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0,10);
    if (typeof v === 'string') {
      // prefer already YYYY-MM-DD strings (avoid timezone shift from Date parsing)
      const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) return m[1];
      // fallback: try parsing ISO and extract date part
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0,10);
      return String(v).trim();
    }
    return String(v).trim();
  };

  const normalizeForCompare = (key, val) => {
    if (val === undefined || val === null) return null;
    if (key === 'email') return String(val).trim().toLowerCase();
    if (key === 'contact_primary') return String(val).trim();
    if (DATE_KEYS.has(key)) return toDateOnly(val);
    if (typeof val === 'string') return val.trim();
    return val;
  };

  // DEBUG: show incoming payload and current DB values for each incoming key
  console.debug('updateMember start:', { id, church_id });
  console.debug('incoming payload keys:', Object.keys(memberData));
  for (const k of Object.keys(memberData)) {
    const incoming = normalizeForCompare(k, memberData[k]);
    const existing = normalizeForCompare(k, current[k]);
    console.debug(`compare field='${k}' incoming='${incoming}' current='${existing}'`);
  }
  // determine changed fields after normalization
  const fields = Object.keys(memberData).filter(key => {
    if (key === 'updated_at') return false;
    if (memberData[key] === undefined || memberData[key] === null) return false;
    const newVal = normalizeForCompare(key, memberData[key]);
    const curVal = normalizeForCompare(key, current[key]);
    return String(newVal) !== String(curVal);
  });

  if (fields.length === 0) return current;

  const setClause = fields.map((key, idx) => `${key}=$${idx + 1}`).join(', ');
  const values = fields.map(key => {
    const v = memberData[key];
    if (key === 'email') return String(v).trim().toLowerCase();
    if (key === 'contact_primary') return String(v).trim();
    if (DATE_KEYS.has(key)) return toDateOnly(v);
    return v;
  });

  // debug: log the actual values being written (remove in production)
  console.debug('updateMember: id=', id, 'fields=', fields, 'values=', values);

  // add id and church_id for WHERE and updated_at
  const sql = `UPDATE members SET ${setClause}, updated_at=now() WHERE id=$${fields.length+1} AND church_id=$${fields.length+2} RETURNING *`;
  values.push(id, church_id);

  const result = await db.query(sql, values);
  console.debug('updateMember SQL:', sql);
  console.debug('updateMember values:', values);
  console.debug('updateMember result rowCount:', result.rowCount, 'returned:', result.rows[0]);
  if (!result || result.rowCount === 0) {
    throw new Error('Update failed or no matching member (check id/church_id)');
  }

  // Re-fetch enriched member (with joins) and return it so frontend sees joined lookup fields
  const updatedMember = await getMemberById(id, church_id);

  // Trigger automated processes for member updates (milestone notifications, etc.)
  try {
    // Get church info for notifications
    const churchRes = await db.query('SELECT * FROM churches WHERE id = $1', [church_id]);
    const church = churchRes.rows[0];

    if (church) {
      // Check for important updates (baptism, born again, contact changes)
      await memberService.handleMemberUpdate(current, updatedMember, church);
    }
  } catch (error) {
    console.warn('Failed to run automated member update processes:', error);
    // Don't fail member update if automated processes fail
  }

  return updatedMember;
};

// Delete a member (by id and church)
export const deleteMember = async (id, church_id) => {
  await db.query('DELETE FROM members WHERE id=$1 AND church_id=$2', [id, church_id]);
};

// Export members as CSV
export const exportMembersCSV = async (church_id) => {
  const res = await db.query(
    `SELECT id, first_name, surname, email, contact_primary AS phone, gender_id, member_status_id, member_type_id
     FROM members WHERE church_id = $1 ORDER BY first_name, surname`, [church_id]);
  const parser = new CsvParser();
  return parser.parse(res.rows);
};

// Check for duplicate email or contact_primary within a church
export const checkDuplicateField = async (field, value, church_id) => {
  const allowedFields = ['email', 'contact_primary', 'phone'];
  let queryField = field === 'phone' ? 'contact_primary' : field;
  if (!allowedFields.includes(field)) return false;
  const res = await db.query(
    `SELECT 1 FROM members WHERE ${queryField} = $1 AND church_id = $2 LIMIT 1`,
    [value.trim(), church_id]
  );
  return res.rowCount > 0;
};

// Get all members for autocomplete (minimal data)
export const getAllMembersForAutocomplete = async (churchId) => {
  console.log('Getting all members for autocomplete:', churchId);
  
  const sql = `
    SELECT id, first_name, surname, email, contact_primary AS phone
    FROM members
    WHERE church_id = $1
    ORDER BY first_name, surname
    LIMIT 1000
  `;
  
  console.log('Executing autocomplete query for church:', churchId);
  const res = await db.query(sql, [churchId]);
  console.log('Autocomplete query result:', res.rows.length, 'members found');
  
  return res.rows;
};

// Search members by name, member_no, or phone (for autocomplete)
export const searchMembers = async ({ q, church_id }) => {
  console.log('searchMembers called with:', { q, church_id });
  if (!q || !church_id) return [];
  
  const searchQuery = `
    SELECT id, first_name, surname, email, contact_primary AS phone
    FROM members
    WHERE church_id = $1
      AND (
        LOWER(first_name) LIKE LOWER($2) OR
        LOWER(surname) LIKE LOWER($2) OR
        contact_primary LIKE $2
      )
    ORDER BY first_name, surname
    LIMIT 20`;
  
  console.log('Executing search query with params:', [church_id, `%${q}%`]);
  const res = await db.query(searchQuery, [church_id, `%${q}%`]);
  console.log('Search query result:', res.rows.length, 'rows found');
  
  return res.rows;
};

// Profile photo upload: update member's profile_photo field
export const updateProfilePhoto = async (memberId, church_id, filePath) => {
  const res = await db.query(
    `UPDATE members SET profile_photo = $1, updated_at = now() WHERE id = $2 AND church_id = $3 RETURNING *`,
    [filePath, memberId, church_id]
  );
  return res.rows[0];
};

// Get members by user role for a church
export const getMembersByUserRole = async (role, church_id) => {
  const res = await db.query(
    `SELECT m.*, r.name AS role, u.email AS user_email, u.phone AS user_phone
     FROM members m
     JOIN users u
       ON u.id = m.user_id
       OR (LOWER(u.email) = LOWER(m.email))
       OR (u.phone = m.contact_primary)
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE r.name = $1 AND m.church_id = $2`,
    [role, church_id]
  );
  return res.rows;
};

// Sync member contact info to user record
export const syncMemberContactToUser = async (memberId, church_id) => {
  try {
    const member = await db.query(
      `SELECT user_id, email, contact_primary FROM members WHERE id = $1 AND church_id = $2`,
      [memberId, church_id]
    );

    if (!member.rows[0] || !member.rows[0].user_id) return null;

    const m = member.rows[0];
    const updates = {};

    if (m.email) updates.email = m.email;
    if (m.contact_primary) updates.phone = m.contact_primary;

    if (Object.keys(updates).length === 0) return null;

    // Update users table
    const fields = Object.keys(updates);
    const setClause = fields.map((key, idx) => {
      const userKey = key === 'contact_primary' ? 'phone' : key;
      return `${userKey}=$${idx + 1}`;
    }).join(', ');

    const values = fields.map(key => updates[key]);
    values.push(m.user_id);

    const res = await db.query(
      `UPDATE users SET ${setClause}, updated_at=now() WHERE id=$${values.length} RETURNING *`,
      values
    );

    return res.rows[0];
  } catch (err) {
    console.error('Sync error:', err);
    throw err;
  }
};

// Get church overview statistics
export const getChurchOverviewStats = async (church_id) => {
  const res = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE active IS TRUE) AS members_total,
      COUNT(*) FILTER (WHERE date_baptized_immersion IS NOT NULL OR baptized_in_christ_embassy IS TRUE) AS baptisms
    FROM members
    WHERE church_id = $1
  `, [church_id]);

  return res.rows[0] || { members_total: 0, baptisms: 0 };
};

// Mark a member inactive by setting member_status_id -> 'inactive'
// Accepts optional client for transaction support.
export async function markMemberInactive({
  client = null,
  church_id,
  member_id,
  exit_id = null,
  exit_date = null,
  reason = null,
  updated_by = null,
  status_name = null
} = {}) {
  if (!church_id || !member_id) return null;
  const runner = client || db;
  // Resolve member_status_id from mapping table first, then by name, then default to 'inactive'.
  let memberStatusId = null;
  if (status_name) {
    // 1) try mapping table
    const mapRes = await runner.query(`SELECT member_status_id FROM exit_type_status_map WHERE exit_type = $1 LIMIT 1`, [status_name]);
    if (mapRes.rowCount && mapRes.rows[0].member_status_id) memberStatusId = mapRes.rows[0].member_status_id;

    // 2) if no mapping or mapping null, try to find member_status by same name
    if (!memberStatusId) {
      const sRes = await runner.query(`SELECT id FROM member_statuses WHERE name = $1 LIMIT 1`, [status_name]);
      if (sRes.rowCount) memberStatusId = sRes.rows[0].id;
    }
  }

  // 3) fallback to 'inactive'
  if (!memberStatusId) {
    const defRes = await runner.query(`SELECT id FROM member_statuses WHERE name = 'inactive' LIMIT 1`);
    memberStatusId = defRes.rowCount ? defRes.rows[0].id : null;
  }

  const q = `
    UPDATE members
    SET member_status_id = $1,
    exit_id = $2,
    updated_at = now(),
    status_changed_at = NOW(),
    status_changed_by = $4
    WHERE id = $3 AND church_id = $5
    RETURNING *;
  `;
  const vals = [memberStatusId, exit_id, member_id, updated_by, church_id];
  const { rows } = await runner.query(q, vals);
  return rows[0] || null;
}

export async function reinstateMemberStatus({
  client = null,
  church_id,
  member_id,
  reinstated_by = null
} = {}) {
  if (!church_id || !member_id) return null;
  const runner = client || db;
  const q = `
    UPDATE members
    SET member_status_id = (
      SELECT id FROM member_statuses WHERE name = 'active' LIMIT 1
    ),
    exit_id = NULL,
    updated_at = now(),
    status_changed_at = NOW(),
    status_changed_by = $3
    WHERE id = $1 AND church_id = $2
    RETURNING *;
  `;
  const vals = [member_id, church_id, reinstated_by];
  const { rows } = await runner.query(q, vals);
  return rows[0] || null;
}

// Helper: Get member status by name
export async function getMemberStatusByName(statusName) {
  if (!statusName) return null;
  const res = await db.query(`SELECT id, name FROM member_statuses WHERE name = $1 LIMIT 1`, [statusName]);
  return res.rows[0] || null;
}

export default {
  getAllMembers,
  getMemberById,
  getMemberByEmail,
  getMemberByPhone,
  getMemberByUserId,
  createMember,
  bulkInsertMembers,
  updateMember,
  deleteMember,
  exportMembersCSV,
  checkDuplicateField,
  searchMembers,
  updateProfilePhoto,
  getMembersByUserRole,
  syncMemberContactToUser,
  getChurchOverviewStats,
  markMemberInactive,
  reinstateMemberStatus,
  getMemberStatusByName
};
