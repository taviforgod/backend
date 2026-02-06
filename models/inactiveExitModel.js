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

const insertExitAudit = async (client, { church_id, exit_id, member_id, action, old_data = null, new_data = null, changed_by = null, notes = null }) => {
  await client.query(
    `INSERT INTO exit_audit_log
       (church_id, exit_id, member_id, action, old_data, new_data, changed_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [church_id, exit_id, member_id, action, JSON.stringify(old_data), JSON.stringify(new_data), changed_by, notes]
  );
};

/* ---------- core functions ---------- */

export const createExit = async ({ client = null, church_id, member_id, exit_type, exit_reason, exit_date = new Date(), processed_by = null, is_suggestion = false, suggestion_trigger = null, notes = null, created_by = null } = {}) => {
  // If a client is provided the caller manages the transaction and membership updates.
  const ownClient = client ? null : await db.connect();
  const runner = client || ownClient;
  try {
    if (!client) await runner.query('BEGIN');

    const insertQ = `INSERT INTO inactive_member_exits
      (church_id, member_id, exit_type, exit_reason, exit_date, processed_by, is_suggestion, suggestion_trigger, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`;
    const res = await runner.query(insertQ, [church_id, member_id, exit_type, exit_reason, exit_date, processed_by, is_suggestion, suggestion_trigger, notes, created_by]);
    const exitRow = res.rows[0];

    // Only update members when this function is running its own transaction.
    // Callers that provide `client` (shared transaction) should update members themselves
    // to keep membership changes atomic with their other operations.
    if (!is_suggestion && !client) {
      const mRes = await runner.query(`SELECT member_status_id, active FROM members WHERE id = $1 FOR UPDATE`, [member_id]);
      const oldStatusId = mRes.rowCount ? mRes.rows[0].member_status_id : null;
      const newStatusId = await findStatusIdByName(runner, exit_type || 'exited');

      await runner.query(
        `UPDATE members
           SET member_status_id = $1, active = false, status_changed_at = NOW(), status_changed_by = $2, exit_id = $4
         WHERE id = $3`,
        [newStatusId, created_by, member_id, exitRow.id]
      );

      await insertStatusHistory(runner, {
        church_id,
        member_id,
        old_status_id: oldStatusId,
        new_status_id: newStatusId,
        reason: exit_reason || `Exit recorded (${exit_type || 'exited'})`,
        changed_by: created_by
      });

      // Log the exit creation in audit trail
      await insertExitAudit(runner, {
        church_id,
        exit_id: exitRow.id,
        member_id,
        action: 'created',
        new_data: {
          exit_type,
          exit_reason,
          exit_date,
          processed_by,
          is_suggestion,
          suggestion_trigger,
          notes
        },
        changed_by: created_by,
        notes: 'Exit record created'
      });
    }

    if (!client) await runner.query('COMMIT');
    return exitRow;
  } catch (err) {
    if (!client) await runner.query('ROLLBACK').catch(() => null);
    throw err;
  } finally {
    if (ownClient) ownClient.release();
  }
};

export const getExitById = async (church_id, id) => {
  const res = await db.query(
    `SELECT e.*, e.id AS exit_id, m.first_name, m.surname, m.exit_id AS member_exit_id, u.email as processed_by_email
     FROM inactive_member_exits e
     LEFT JOIN members m ON m.id = e.member_id
     LEFT JOIN users u ON u.id = e.processed_by
     WHERE e.church_id = $1 AND e.id = $2 AND e.soft_deleted = false`,
    [church_id, id]
  );
  return res.rows[0];
};

export const listExits = async (church_id, { offset = 0, limit = 50, search = null, fromDate = null, toDate = null, includeReinstated = false } = {}) => {
  const clauses = ['e.church_id = $1', 'e.soft_deleted = false'];
  const params = [church_id];
  let idx = 2;

  // By default, exclude reinstated exits unless explicitly requested
  if (!includeReinstated) {
    clauses.push('e.reinstated_at IS NULL');
  }

  if (search) {
    clauses.push(`(m.first_name ILIKE $${idx} OR m.surname ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (fromDate) { clauses.push(`e.exit_date >= $${idx}`); params.push(fromDate); idx++; }
  if (toDate) { clauses.push(`e.exit_date <= $${idx}`); params.push(toDate); idx++; }

  params.push(limit, offset);

  const q = `
    SELECT e.*, e.id AS exit_id, m.first_name, m.surname, m.exit_id AS member_exit_id, ms.name as member_status_name,
           CASE WHEN e.reinstated_at IS NOT NULL THEN 'reinstated' ELSE 'inactive' END as exit_status
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

export const updateExit = async ({ client = null, church_id, id, patch = {}, updated_by = null } = {}) => {
  const ownClient = client ? null : await db.connect();
  const runner = client || ownClient;
  try {
    if (!client) await runner.query('BEGIN');

    const eRes = await runner.query(`SELECT * FROM inactive_member_exits WHERE id = $1 AND church_id = $2 FOR UPDATE`, [id, church_id]);
    if (eRes.rowCount === 0) throw new Error('Exit not found');
    const existing = eRes.rows[0];

    const keys = Object.keys(patch);
    if (keys.length > 0) {
      // Log the update in audit trail before making changes
      await insertExitAudit(runner, {
        church_id,
        exit_id: id,
        member_id: existing.member_id,
        action: 'updated',
        old_data: existing,
        new_data: patch,
        changed_by: updated_by,
        notes: 'Exit record updated'
      });

      const params = [church_id, id];
      const sets = keys.map((k, i) => {
        params.push(patch[k]);
        return `${k} = $${i + 3}`;
      });
      params.push(updated_by);
      const q = `UPDATE inactive_member_exits SET ${sets.join(', ')}, updated_by = $${params.length}, updated_at = NOW() WHERE church_id = $1 AND id = $2 RETURNING *`;
      await runner.query(q, params);
    }

    const newIsSuggestion = patch.hasOwnProperty('is_suggestion') ? patch.is_suggestion : existing.is_suggestion;
    const newExitType = patch.exit_type || existing.exit_type;
      // If the exit type changed, or a suggestion was confirmed (is_suggestion -> false),
      // update the member's status to match the exit type.
      const shouldUpdateMember = (existing.exit_type !== newExitType) || (existing.is_suggestion && newIsSuggestion === false);
      if (shouldUpdateMember) {
        // Only perform member updates when this function manages its own transaction.
        const mRes = await runner.query(`SELECT member_status_id, active FROM members WHERE id = $1 FOR UPDATE`, [existing.member_id]);
        const oldStatusId = mRes.rowCount ? mRes.rows[0].member_status_id : null;
        const newStatusId = await findStatusIdByName(runner, newExitType || 'exited');

        if (!client) {
          await runner.query(
            `UPDATE members SET member_status_id = $1, active = false, status_changed_at = NOW(), status_changed_by = $2, exit_id = $4 WHERE id = $3`,
            [newStatusId, updated_by, existing.member_id, id]
          );

          await insertStatusHistory(runner, {
            church_id,
            member_id: existing.member_id,
            old_status_id: oldStatusId,
            new_status_id: newStatusId,
            reason: patch.exit_reason || existing.exit_reason || `Exit confirmed (${newExitType})`,
            changed_by: updated_by
          });
        }
      }

    if (!client) await runner.query('COMMIT');

    const fresh = await db.query(`SELECT * FROM inactive_member_exits WHERE id = $1 AND church_id = $2`, [id, church_id]);
    return fresh.rows[0];
  } catch (err) {
    if (!client) await runner.query('ROLLBACK').catch(() => null);
    throw err;
  } finally {
    if (ownClient) ownClient.release();
  }
};

export const findActiveSuggestionForMember = async (church_id, member_id) => {
  const res = await db.query(
    `SELECT * FROM inactive_member_exits WHERE church_id = $1 AND member_id = $2 AND is_suggestion = true AND soft_deleted = false AND reinstated_at IS NULL LIMIT 1`,
    [church_id, member_id]
  );
  return res.rows[0] || null;
};

export const softDeleteExit = async (church_id, id, updated_by) => {
  const existingRes = await db.query(`SELECT * FROM inactive_member_exits WHERE church_id = $1 AND id = $2`, [church_id, id]);
  const existing = existingRes.rows[0];

  if (existing) {
    // Use transaction for audit logging
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Log the deletion in audit trail
      await insertExitAudit(client, {
        church_id,
        exit_id: id,
        member_id: existing.member_id,
        action: 'deleted',
        old_data: existing,
        changed_by: updated_by,
        notes: 'Exit record soft deleted'
      });

      const res = await client.query(
        `UPDATE inactive_member_exits SET soft_deleted = true, updated_by = $3, updated_at = NOW() WHERE church_id = $1 AND id = $2 RETURNING *`,
        [church_id, id, updated_by]
      );

      await client.query('COMMIT');
      return res.rows[0];
    } catch (err) {
      await client.query('ROLLBACK').catch(() => null);
      throw err;
    } finally {
      client.release();
    }
  }

  return null;
};

export async function reinstateMember({ client = null, church_id, id, reinstated_by = null } = {}) {
  if (!church_id || !id) return null;

  const runner = client || db;

  // Get existing data for audit logging
  const existingRes = await runner.query(`SELECT * FROM inactive_member_exits WHERE id = $1 AND church_id = $2`, [id, church_id]);
  const existing = existingRes.rows[0];

  if (existing) {
    const q = `
      UPDATE inactive_member_exits
      SET reinstated_at = now(),
          reinstated_by = $3,
          soft_deleted = false
      WHERE id = $1 AND church_id = $2
      RETURNING *;
    `;
    const vals = [id, church_id, reinstated_by];
    const { rows } = await runner.query(q, vals);
    const updated = rows[0];

    if (updated && !client) {
      // Log the reinstatement in audit trail
      await insertExitAudit(runner, {
        church_id,
        exit_id: id,
        member_id: existing.member_id,
        action: 'reinstated',
        old_data: existing,
        new_data: updated,
        changed_by: reinstated_by,
        notes: 'Member reinstated from exit'
      });
    }

    return updated || null;
  }

  return null;
}

// Bulk operations
export const bulkDeleteExits = async (church_id, ids, updated_by) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Get existing data for audit logging
    const existingRes = await client.query(
      `SELECT * FROM inactive_member_exits WHERE church_id = $1 AND id = ANY($2::int[])`,
      [church_id, ids]
    );

    // Log deletions in audit trail
    for (const existing of existingRes.rows) {
      await insertExitAudit(client, {
        church_id,
        exit_id: existing.id,
        member_id: existing.member_id,
        action: 'bulk_deleted',
        old_data: existing,
        changed_by: updated_by,
        notes: 'Exit record bulk deleted'
      });
    }

    const res = await client.query(
      `UPDATE inactive_member_exits SET soft_deleted = true, updated_by = $3, updated_at = NOW()
       WHERE church_id = $1 AND id = ANY($4::int[]) RETURNING *`,
      [church_id, updated_by, ids]
    );

    await client.query('COMMIT');
    return res.rows;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    throw err;
  } finally {
    client.release();
  }
};

export const bulkReinstateExits = async (church_id, ids, reinstated_by) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Get existing data for audit logging
    const existingRes = await client.query(
      `SELECT * FROM inactive_member_exits WHERE church_id = $1 AND id = ANY($2::int[])`,
      [church_id, ids]
    );

    const res = await client.query(
      `UPDATE inactive_member_exits SET reinstated_at = now(), reinstated_by = $3, soft_deleted = false
       WHERE church_id = $1 AND id = ANY($4::int[]) RETURNING *`,
      [church_id, reinstated_by, ids]
    );

    // Log reinstatements in audit trail
    for (const updated of res.rows) {
      const existing = existingRes.rows.find(e => e.id === updated.id);
      if (existing) {
        await insertExitAudit(client, {
          church_id,
          exit_id: updated.id,
          member_id: existing.member_id,
          action: 'bulk_reinstated',
          old_data: existing,
          new_data: updated,
          changed_by: reinstated_by,
          notes: 'Exit record bulk reinstated'
        });
      }
    }

    await client.query('COMMIT');
    return res.rows;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    throw err;
  } finally {
    client.release();
  }
};

// Advanced filtering and statistics
export const getExitStatistics = async (church_id, fromDate = null, toDate = null) => {
  let q = `
    SELECT
      exit_type,
      COUNT(*) as total_count,
      COUNT(CASE WHEN reinstated_at IS NULL THEN 1 END) as active_count,
      COUNT(CASE WHEN reinstated_at IS NOT NULL THEN 1 END) as reinstated_count
    FROM inactive_member_exits
    WHERE church_id = $1 AND soft_deleted = false
  `;
  const params = [church_id];
  let idx = 2;

  if (fromDate) {
    q += ` AND exit_date >= $${idx}`;
    params.push(fromDate);
    idx++;
  }
  if (toDate) {
    q += ` AND exit_date <= $${idx}`;
    params.push(toDate);
    idx++;
  }

  q += ` GROUP BY exit_type ORDER BY total_count DESC`;

  const res = await db.query(q, params);
  return res.rows;
};

export const listExitsWithInterviews = async (church_id, { offset = 0, limit = 50, search = null, fromDate = null, toDate = null, includeReinstated = false } = {}) => {
  const clauses = ['e.church_id = $1', 'e.soft_deleted = false'];
  const params = [church_id];
  let idx = 2;

  // By default, exclude reinstated exits unless explicitly requested
  if (!includeReinstated) {
    clauses.push('e.reinstated_at IS NULL');
  }

  if (search) {
    clauses.push(`(m.first_name ILIKE $${idx} OR m.surname ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (fromDate) { clauses.push(`e.exit_date >= $${idx}`); params.push(fromDate); idx++; }
  if (toDate) { clauses.push(`e.exit_date <= $${idx}`); params.push(toDate); idx++; }

  params.push(limit, offset);

  const q = `
    SELECT e.*, e.id AS exit_id, m.first_name, m.surname, m.exit_id AS member_exit_id,
           ms.name as member_status_name,
           CASE WHEN e.reinstated_at IS NOT NULL THEN 'reinstated' ELSE 'inactive' END as exit_status,

           -- Include total count for pagination (same value on each row)
           COUNT(*) OVER() AS total_count,

           -- Aggregate interview info: overall flag + counts and last dates for visits & follow-ups
           CASE WHEN i.id IS NOT NULL THEN true ELSE false END as has_interview,
           COUNT(i.id) FILTER (WHERE i.interview_type = 'visit') as visit_count,
           MAX(i.created_at) FILTER (WHERE i.interview_type = 'visit') as last_visit_date,
           COUNT(i.id) FILTER (WHERE i.interview_type = 'followup') as followup_count,
           MAX(i.created_at) FILTER (WHERE i.interview_type = 'followup') as last_followup_date,

           i.summary as interview_summary,
           json_agg(DISTINCT ia.*) FILTER (WHERE ia.id IS NOT NULL) as interview_answers
    FROM inactive_member_exits e
    LEFT JOIN members m ON m.id = e.member_id
    LEFT JOIN member_statuses ms ON ms.id = m.member_status_id
    LEFT JOIN exit_interviews i ON i.exit_id = e.id AND i.church_id = e.church_id
    LEFT JOIN exit_interview_answers ia ON ia.interview_id = i.id
    WHERE ${clauses.join(' AND ')}
    GROUP BY e.id, m.id, ms.id, i.id, i.summary
    ORDER BY e.exit_date DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `;

  const res = await db.query(q, params);
  return res.rows;
};

// Data integrity and cleanup functions
export const findInconsistentExits = async (church_id) => {
  const q = `
    SELECT m.id as member_id, m.first_name, m.surname, ms.name as member_status,
           e.id as exit_id, e.exit_type, e.reinstated_at, e.soft_deleted
    FROM members m
    LEFT JOIN member_statuses ms ON m.member_status_id = ms.id
    LEFT JOIN inactive_member_exits e ON m.exit_id = e.id
    WHERE m.church_id = $1
    AND ms.name = 'active'
    AND e.reinstated_at IS NULL
    AND e.id IS NOT NULL
    AND e.soft_deleted = false
    ORDER BY m.id DESC
  `;
  const res = await db.query(q, [church_id]);
  return res.rows;
};

export const fixInconsistentExit = async (church_id, exit_id, updated_by) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Mark the exit as reinstated
    const reinstateRes = await client.query(
      `UPDATE inactive_member_exits SET reinstated_at = now(), reinstated_by = $3, soft_deleted = false
       WHERE id = $1 AND church_id = $2 RETURNING *`,
      [exit_id, church_id, updated_by]
    );

    if (reinstateRes.rowCount === 0) {
      throw new Error('Exit not found');
    }

    const exit = reinstateRes.rows[0];

    // Log the fix in audit trail
    await insertExitAudit(client, {
      church_id,
      exit_id,
      member_id: exit.member_id,
      action: 'consistency_fix',
      old_data: { reinstated_at: null, soft_deleted: exit.soft_deleted },
      new_data: { reinstated_at: new Date(), soft_deleted: false },
      changed_by: updated_by,
      notes: 'Fixed inconsistent exit record - member active but exit not reinstated'
    });

    await client.query('COMMIT');
    return exit;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    throw err;
  } finally {
    client.release();
  }
};

export const getExitHistoryForMember = async (church_id, member_id) => {
  const q = `
    SELECT e.*, e.id AS exit_id,
           CASE WHEN e.reinstated_at IS NOT NULL THEN 'reinstated' ELSE 'exited' END as status,
           i.summary as interview_summary,
           json_agg(DISTINCT ia.*) FILTER (WHERE ia.id IS NOT NULL) as interview_answers
    FROM inactive_member_exits e
    LEFT JOIN exit_interviews i ON i.exit_id = e.id AND i.church_id = e.church_id
    LEFT JOIN exit_interview_answers ia ON ia.interview_id = i.id
    WHERE e.church_id = $1 AND e.member_id = $2 AND e.soft_deleted = false
    GROUP BY e.id, i.id, i.summary
    ORDER BY e.exit_date DESC
  `;
  const res = await db.query(q, [church_id, member_id]);
  return res.rows;
};

export default {
  createExit, getExitById, listExits, activeExitExists, updateExit, softDeleteExit, reinstateMember,
  bulkDeleteExits, bulkReinstateExits, getExitStatistics, listExitsWithInterviews,
  findInconsistentExits, fixInconsistentExit, getExitHistoryForMember
};
