import db from '../config/db.js';

export const getAllTemplates = async (churchId) => {
  const res = await db.query(
    'SELECT * FROM milestone_templates WHERE church_id=$1 ORDER BY name',
    [churchId]
  );
  return res.rows;
};

export const getTemplateById = async (churchId, id) => {
  const res = await db.query('SELECT * FROM milestone_templates WHERE church_id=$1 AND id=$2', [churchId, id]);
  return res.rows[0];
};

export const createTemplate = async ({ church_id, name, description, required_for_promotion }) => {
  const res = await db.query(
    `INSERT INTO milestone_templates (church_id, name, description, required_for_promotion, created_at, updated_at)
     VALUES ($1,$2,$3,$4, now(), now()) RETURNING *`,
    [church_id, name, description || null, !!required_for_promotion]
  );
  return res.rows[0];
};

export const updateTemplate = async (churchId, id, { name, description, required_for_promotion }) => {
  const res = await db.query(
    `UPDATE milestone_templates
     SET name=$1, description=$2, required_for_promotion=$3, updated_at=now()
     WHERE church_id=$4 AND id=$5 RETURNING *`,
    [name, description || null, !!required_for_promotion, churchId, id]
  );
  return res.rows[0];
};

export const deleteTemplate = async (churchId, id) => {
  await db.query('DELETE FROM milestone_templates WHERE church_id=$1 AND id=$2', [churchId, id]);
};
