import db from '../config/db.js';

export const getByMember = async (churchId, memberId) => {
  const res = await db.query(
    `SELECT mr.*, mt.name as template_name
     FROM milestone_records mr
     LEFT JOIN milestone_templates mt ON mr.template_id = mt.id
     WHERE mr.church_id=$1 AND mr.member_id=$2
     ORDER BY mr.completed_at DESC`,
    [churchId, memberId]
  );
  return res.rows;
};

export const createRecord = async ({ church_id, member_id, template_id, milestone_name, created_by, notes }) => {
  if (template_id) {
    const res = await db.query(
      `INSERT INTO milestone_records (church_id, member_id, template_id, milestone_name, created_by, notes, completed_at, created_at)
       SELECT $1, $2, $3, name, $4, $5, now(), now()
       FROM milestone_templates WHERE id=$3 AND church_id=$1
       RETURNING *`,
      [church_id, member_id, template_id, created_by || null, notes || null]
    );
    return res.rows[0];
  } else {
    const res = await db.query(
      `INSERT INTO milestone_records (church_id, member_id, milestone_name, created_by, notes, completed_at, created_at)
       VALUES ($1,$2,$3,$4,$5, now(), now()) RETURNING *`,
      [church_id, member_id, milestone_name, created_by || null, notes || null]
    );
    return res.rows[0];
  }
};

export const deleteRecord = async (churchId, id) => {
  const res = await db.query('DELETE FROM milestone_records WHERE church_id=$1 AND id=$2 RETURNING *', [churchId, id]);
  return res.rows[0];
};

export const getAllRecords = async (churchId) => {
  const res = await db.query(
    `SELECT mr.*, mt.name as template_name FROM milestone_records mr
     LEFT JOIN milestone_templates mt ON mr.template_id=mt.id
     WHERE mr.church_id=$1
     ORDER BY mr.completed_at DESC`,
    [churchId]
  );
  return res.rows;
};
