// models/inactiveExitModel.js
import db from '../config/db.js';

/* ---------- helpers ---------- */

const findStatusIdByName = async (client, name) => {
  if (!name) return null;
  const r = await client.query('SELECT id FROM member_statuses WHERE name = $1 LIMIT 1', [name]);
  return r.rowCount ? r.rows[0].id : null;
};

const insertStatusHistory = async (client, { church_id, member_id, old_status_id, new_status_id, reason = null, changed_by = null }) => {
  await client.query(
    `INSERT INTO member_status_history
       (church_id, member_id, old_member_status_id, new_member_status_id, reason, changed_by)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [church_id, member_id, old_status_id, new_status_id, reason, changed_by]
  );
};

/* ---------- core functions ---------- */

export const createExit = async ({ church_id, member_id, exit_type, exit_reason, exit_date = new Date(), processed_by = null, is_suggestion = false, suggestion_trigger = null, notes = null, created_by = null }) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const insertQ = `INSERT INTO inactive_member_exits
      (church_id, member_id, exit_type, exit_reason, exit_date, processed_by, is_suggestion, suggestion_trigger, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`;
    const res = await client.query(insertQ, [church_id, member_id, exit_type, exit_reason, exit_date, processed_by, is_suggestion, suggestion_trigger, notes, created_by]);
    const exitRow = res.rows[0];

    if (!is_suggestion) {
      const mRes = await client.query(`SELECT member_status_id, active FROM members WHERE id = $1 FOR UPDATE`, [member_id]);
      const oldStatusId = mRes.rowCount ? mRes.rows[0].member_status_id : null;
      const newStatusId = await findStatusIdByName(client, exit_type || 'exited');

      await client.query(
        `UPDATE members
           SET member_status_id = $1, active = false, status_changed_at = NOW(), status_changed_by = $2
         WHERE id = $3`,
        [newStatusId, created_by, member_id]
      );

      await insertStatusHistory(client, {
        church_id,
        member_id,
        old_status_id: oldStatusId,
        new_status_id: newStatusId,
        reason: exit_reason || `Exit recorded (${exit_type || 'exited'})`,
        changed_by: created_by
      });
    }

    await client.query('COMMIT');

    // Notifications removed intentionally.
 
    return exitRow;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getExitById = async (church_id, id) => {
  const res = await db.query(
    `SELECT e.*, m.first_name, m.surname, u.email as processed_by_email
     FROM inactive_member_exits e
     LEFT JOIN members m ON m.id = e.member_id
     LEFT JOIN users u ON u.id = e.processed_by
     WHERE e.church_id = $1 AND e.id = $2 AND e.soft_deleted = false`,
    [church_id, id]
  );
  return res.rows[0];
};

export const listExits = async (church_id, { offset = 0, limit = 50, search = null, fromDate = null, toDate = null } = {}) => {
  const clauses = ['e.church_id = $1', 'e.soft_deleted = false'];
  const params = [church_id];
  let idx = 2;

  if (search) {
    clauses.push(`(m.first_name ILIKE $${idx} OR m.surname ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (fromDate) { clauses.push(`e.exit_date >= $${idx}`); params.push(fromDate); idx++; }
  if (toDate) { clauses.push(`e.exit_date <= $${idx}`); params.push(toDate); idx++; }

  params.push(limit, offset);

  const q = `
    SELECT e.*, m.first_name, m.surname, ms.name as member_status_name
    FROM inactive_member_exits e
    LEFT JOIN members m ON m.id = e.member_id
    LEFT JOIN member_statuses ms ON ms.id = m.member_status_id
    WHERE ${clauses.join(' AND ')}
    ORDER BY e.exit_date DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  const res = await db.query(q, params);
  return res.rows;
};

export const activeExitExists = async (church_id, member_id) => {
  const res = await db.query(
    `SELECT 1 FROM inactive_member_exits WHERE church_id = $1 AND member_id = $2 AND soft_deleted = false AND reinstated_at IS NULL LIMIT 1`,
    [church_id, member_id]
  );
  return res.rowCount > 0;
};

export const updateExit = async ({ church_id, id, patch = {}, updated_by = null }) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const eRes = await client.query(`SELECT * FROM inactive_member_exits WHERE id = $1 AND church_id = $2 FOR UPDATE`, [id, church_id]);
    if (eRes.rowCount === 0) throw new Error('Exit not found');
    const existing = eRes.rows[0];

    const keys = Object.keys(patch);
    if (keys.length > 0) {
      const params = [church_id, id];
      const sets = keys.map((k, i) => {
        params.push(patch[k]);
        return `${k} = $${i + 3}`;
      });
      params.push(updated_by);
      const q = `UPDATE inactive_member_exits SET ${sets.join(', ')}, updated_by = $${params.length}, updated_at = NOW() WHERE church_id = $1 AND id = $2 RETURNING *`;
      await client.query(q, params);
    }

    const newIsSuggestion = patch.hasOwnProperty('is_suggestion') ? patch.is_suggestion : existing.is_suggestion;
    const newExitType = patch.exit_type || existing.exit_type;
    if (existing.is_suggestion && newIsSuggestion === false) {
      const mRes = await client.query(`SELECT member_status_id, active FROM members WHERE id = $1 FOR UPDATE`, [existing.member_id]);
      const oldStatusId = mRes.rowCount ? mRes.rows[0].member_status_id : null;
      const newStatusId = await findStatusIdByName(client, newExitType || 'exited');

      await client.query(
        `UPDATE members SET member_status_id = $1, active = false, status_changed_at = NOW(), status_changed_by = $2 WHERE id = $3`,
        [newStatusId, updated_by, existing.member_id]
      );

      await insertStatusHistory(client, {
        church_id,
        member_id: existing.member_id,
        old_status_id: oldStatusId,
        new_status_id: newStatusId,
        reason: patch.exit_reason || existing.exit_reason || `Exit confirmed (${newExitType})`,
        changed_by: updated_by
      });
    }

    await client.query('COMMIT');

    const fresh = await db.query(`SELECT * FROM inactive_member_exits WHERE id = $1 AND church_id = $2`, [id, church_id]);
    return fresh.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const softDeleteExit = async (church_id, id, updated_by) => {
  const res = await db.query(
    `UPDATE inactive_member_exits SET soft_deleted = true, updated_by = $3, updated_at = NOW() WHERE church_id = $1 AND id = $2 RETURNING *`,
    [church_id, id, updated_by]
  );
  return res.rows[0];
};

export const reinstateMember = async (church_id, id, reinstated_by) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const eRes = await client.query(`SELECT * FROM inactive_member_exits WHERE id = $1 AND church_id = $2 FOR UPDATE`, [id, church_id]);
    if (eRes.rowCount === 0) throw new Error('Exit not found');
    const exit = eRes.rows[0];

    await client.query(`UPDATE inactive_member_exits SET reinstated_at = NOW(), updated_by = $1, updated_at = NOW() WHERE id = $2`, [reinstated_by, id]);

    const mRes = await client.query(`SELECT member_status_id FROM members WHERE id = $1 FOR UPDATE`, [exit.member_id]);
    const oldStatusId = mRes.rowCount ? mRes.rows[0].member_status_id : null;
    const activeStatusId = await findStatusIdByName(client, 'active');

    await client.query(
      `UPDATE members SET member_status_id = $1, active = true, status_changed_at = NOW(), status_changed_by = $2 WHERE id = $3`,
      [activeStatusId, reinstated_by, exit.member_id]
    );

    await insertStatusHistory(client, {
      church_id,
      member_id: exit.member_id,
      old_status_id: oldStatusId,
      new_status_id: activeStatusId,
      reason: `Reinstated via exit id ${id}`,
      changed_by: reinstated_by
    });

    await client.query('COMMIT');
    const up = await db.query(`SELECT * FROM inactive_member_exits WHERE id = $1`, [id]);
    return up.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export default {
  createExit, getExitById, listExits, activeExitExists, updateExit, softDeleteExit, reinstateMember
};
