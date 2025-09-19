import db from '../config/db.js';

export const getAllRoles = async () => {
  const res = await db.query('SELECT * FROM roles ORDER BY name');
  return res.rows;
};

export const createRole = async (name) => {
  const res = await db.query('INSERT INTO roles (name) VALUES ($1) RETURNING *', [name]);
  return res.rows[0];
};

export const updateRole = async (id, name) => {
  const res = await db.query('UPDATE roles SET name=$1 WHERE id=$2 RETURNING *', [name, id]);
  return res.rows[0];
};

export const deleteRole = async (id) => {
  await db.query('DELETE FROM roles WHERE id=$1', [id]);
};

export const assignPermission = async (roleId, permId) => {
  await db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [roleId, permId]);
};

export const removePermission = async (roleId, permId) => {
  await db.query('DELETE FROM role_permissions WHERE role_id=$1 AND permission_id=$2', [roleId, permId]);
};

export const getRolePermissions = async (roleId) => {
  const res = await db.query(
    'SELECT p.* FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id WHERE rp.role_id=$1', [roleId]);
  return res.rows;
};

// Add this function to return the RBAC matrix
export const getPermissionsMatrixData = async () => {
  // Get all roles
  const rolesRes = await db.query('SELECT * FROM roles ORDER BY id');
  const roles = rolesRes.rows;

  // Get all permissions
  const permsRes = await db.query('SELECT * FROM permissions ORDER BY id');
  const permissions = permsRes.rows;

  // Get all role-permission assignments
  const matrixRes = await db.query('SELECT * FROM role_permissions');
  const assignments = matrixRes.rows;

  // Return as a matrix object
  return {
    roles,
    permissions,
    assignments // [{role_id, permission_id}]
  };
};