import db from '../config/db.js';

export const getMemberRelationships = async (memberId, church_id) => {
  const res = await db.query(
    `SELECT mr.*, rm.first_name AS related_first_name, rm.surname AS related_surname
     FROM member_relationships mr
     JOIN members rm ON rm.id = mr.related_member_id
     WHERE mr.member_id = $1 AND mr.church_id = $2
     ORDER BY mr.is_primary DESC, mr.relationship_type, rm.first_name, rm.surname`,
    [memberId, church_id]
  );
  return res.rows;
};

export const createRelationship = async (data) => {
  const {
    church_id, member_id, related_member_id, relationship_type, is_primary = false, metadata = {}, created_by = null
  } = data;

  const res = await db.query(
    `INSERT INTO member_relationships
     (church_id, member_id, related_member_id, relationship_type, is_primary, metadata, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [church_id, member_id, related_member_id, relationship_type, is_primary, metadata, created_by]
  );
  return res.rows[0];
};

export const deleteRelationship = async (id, church_id) => {
  await db.query(`DELETE FROM member_relationships WHERE id = $1 AND church_id = $2`, [id, church_id]);
};

// Departments
export const getMemberDepartments = async (memberId, church_id) => {
  const res = await db.query(
    `SELECT md.*, d.name AS department_name, d.description AS department_description, d.head_member_id
     FROM member_departments md
     JOIN departments d ON d.id = md.department_id
     WHERE md.member_id = $1 AND md.church_id = $2
     ORDER BY md.assigned_at DESC`,
    [memberId, church_id]
  );
  return res.rows;
};

export const assignMemberToDepartment = async (data) => {
  const { church_id, member_id, department_id, role = null, assigned_at = null, created_by = null } = data;
  const res = await db.query(
    `INSERT INTO member_departments (church_id, member_id, department_id, role, assigned_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [church_id, member_id, department_id, role, assigned_at, created_by]
  );
  return res.rows[0];
};

export const removeMemberDepartment = async (id, church_id) => {
  await db.query(`DELETE FROM member_departments WHERE id = $1 AND church_id = $2`, [id, church_id]);
};

export const getDepartmentsForChurch = async (church_id) => {
  const res = await db.query(`SELECT * FROM departments WHERE church_id = $1 ORDER BY name`, [church_id]);
  return res.rows;
};

export const createDepartment = async (data) => {
  const { church_id, name, description = null, head_member_id = null, created_by = null } = data;
  const res = await db.query(
    `INSERT INTO departments (church_id, name, description, head_member_id, created_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [church_id, name, description, head_member_id, created_by]
  );
  return res.rows[0];
};
