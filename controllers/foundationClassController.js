import db from '../config/db.js';

// List classes for church
export const getAvailableClasses = async (req, res) => {
  const churchId = req.user.church_id;
  const q = (req.query.q || '').trim().toLowerCase();
  let sql = 'SELECT * FROM foundation_classes WHERE church_id = $1';
  let params = [churchId];

  if (q) {
    sql += " AND (LOWER(name) LIKE $2 OR LOWER(description) LIKE $2)";
    params.push(`%${q}%`);
  }

  sql += " ORDER BY start_date DESC, name ASC";
  const result = await db.query(sql, params);
  res.json(result.rows);
};

// Create new class
export const addFoundationClass = async (req, res) => {
  const churchId = req.user.church_id;
  const { name, description, start_date, end_date } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  // Prevent duplicate name per church
  const exists = await db.query('SELECT 1 FROM foundation_classes WHERE church_id=$1 AND name=$2', [churchId, name]);
  if (exists.rows.length > 0) return res.status(409).json({ error: "Class with that name already exists." });

  const result = await db.query(`
    INSERT INTO foundation_classes (church_id, name, description, start_date, end_date)
    VALUES ($1,$2,$3,$4,$5) RETURNING *
  `, [churchId, name, description, start_date, end_date]);
  res.status(201).json(result.rows[0]);
};

// Edit class
export const updateFoundationClass = async (req, res) => {
  const churchId = req.user.church_id;
  const { id } = req.params;
  const { name, description, start_date, end_date } = req.body;
  const result = await db.query(`
    UPDATE foundation_classes SET
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      start_date = COALESCE($3, start_date),
      end_date = COALESCE($4, end_date)
    WHERE church_id=$5 AND id=$6
    RETURNING *
  `, [name, description, start_date, end_date, churchId, id]);
  if (result.rows.length === 0) return res.status(404).json({ error: "Class not found" });
  res.json(result.rows[0]);
};

// Delete class
export const deleteFoundationClass = async (req, res) => {
  const churchId = req.user.church_id;
  const { id } = req.params;
  const result = await db.query('DELETE FROM foundation_classes WHERE church_id=$1 AND id=$2 RETURNING *', [churchId, id]);
  if (result.rows.length === 0) return res.status(404).json({ error: "Class not found" });
  res.status(204).end();
};