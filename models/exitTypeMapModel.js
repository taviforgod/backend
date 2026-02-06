import db from '../config/db.js';

export const listMappings = async () => {
  const res = await db.query('SELECT * FROM exit_type_status_map ORDER BY exit_type');
  return res.rows;
};

export const getMapping = async (exit_type) => {
  const res = await db.query('SELECT * FROM exit_type_status_map WHERE exit_type = $1 LIMIT 1', [exit_type]);
  return res.rows[0] || null;
};

export const createOrUpdateMapping = async ({ exit_type, member_status_id }) => {
  const res = await db.query(
    `INSERT INTO exit_type_status_map (exit_type, member_status_id)
     VALUES ($1, $2)
     ON CONFLICT (exit_type) DO UPDATE SET member_status_id = EXCLUDED.member_status_id, updated_at = now()
     RETURNING *`,
    [exit_type, member_status_id]
  );
  return res.rows[0];
};

export const deleteMapping = async (exit_type) => {
  const res = await db.query('DELETE FROM exit_type_status_map WHERE exit_type = $1 RETURNING *', [exit_type]);
  return res.rows[0] || null;
};

export default { listMappings, getMapping, createOrUpdateMapping, deleteMapping };
