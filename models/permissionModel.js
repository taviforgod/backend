import db from '../config/db.js';

export const getAllPermissions = async () => {
  const res = await db.query('SELECT * FROM permissions ORDER BY name');
  return res.rows;
};

export const createPermission = async (name) => {
  const res = await db.query('INSERT INTO permissions (name) VALUES ($1) RETURNING *', [name]);
  return res.rows[0];
};

export const updatePermission = async (id, name) => {
  const res = await db.query('UPDATE permissions SET name=$1 WHERE id=$2 RETURNING *', [name, id]);
  return res.rows[0];
};

export const deletePermission = async (id) => {
  await db.query('DELETE FROM permissions WHERE id=$1', [id]);
};