import db from '../config/db.js';
import { Parser as CsvParser } from 'json2csv';

// Get all members for a specific church (with pagination)
export const getAllMembers = async ({ church_id, limit = 100, offset = 0 }) => {
  const res = await db.query(`
    SELECT m.*, m.contact_primary AS phone, m.user_id,
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
    SELECT m.*, m.contact_primary AS phone, m.user_id,
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
  return res.rows[0];
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
    // Optionally: check for duplicates here
    const created = await createMember(memberData);
    inserted.push(created);
  }
  return inserted;
};

// Update a member (expects lookup IDs and church_id)
export const updateMember = async (id, memberData, church_id) => {
  if (!id || !memberData || typeof memberData !== 'object') {
    throw new Error('Valid id and memberData required');
  }

  // Get current member data
  const current = await getMemberById(id, church_id);
  if (!current) throw new Error('Member not found');

  // Only include fields that are different, not undefined/null, and not 'updated_at'
  const fields = Object.keys(memberData).filter(
    key =>
      key !== 'updated_at' &&
      memberData[key] !== undefined &&
      memberData[key] !== null &&
      memberData[key] !== current[key]
  );

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  // Build SET clause and values array
  const setClause = fields.map((key, idx) => `${key}=$${idx + 1}`).join(', ');
  const values = fields.map(key => {
    if (key === 'email') return memberData[key].trim().toLowerCase();
    if (key === 'contact_primary') return memberData[key].trim();
    return memberData[key];
  });

  // Add updated_at field only once
  const setClauseWithUpdatedAt = setClause + ', updated_at=now()';
  values.push(id);
  values.push(church_id);

  const query = `UPDATE members SET ${setClauseWithUpdatedAt} WHERE id=$${values.length - 1} AND church_id=$${values.length} RETURNING *`;

  const res = await db.query(query, values);
  return res.rows[0];
};

// Delete a member (by id and church)
export const deleteMember = async (id, church_id) => {
  await db.query('DELETE FROM members WHERE id=$1 AND church_id=$2', [id, church_id]);
};

// Export members as CSV
export const exportMembersCSV = async (church_id) => {
  const res = await db.query(
    `SELECT member_no, first_name, surname, email, contact_primary AS phone, gender_id, member_status_id, member_type_id
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

// Search members by name, member_no, or phone (for autocomplete)
export const searchMembers = async ({ q, church_id }) => {
  if (!q || !church_id) return [];
  const res = await db.query(
    `SELECT id, member_no, first_name, surname, email, contact_primary AS phone
     FROM members
     WHERE church_id = $1
       AND (
         LOWER(first_name) LIKE LOWER($2) OR
         LOWER(surname) LIKE LOWER($2) OR
         CAST(member_no AS TEXT) LIKE $2 OR
         contact_primary LIKE $2
       )
     ORDER BY first_name, surname
     LIMIT 20`,
    [church_id, `%${q}%`]
  );
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