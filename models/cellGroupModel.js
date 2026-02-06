import db from '../config/db.js'

/**
 * Helper: fetch role_name for a member using precedence:
 * 1) explicit cell_members.role_id -> roles.name
 * 2) leadership_roles.role (text)
 * 3) user's role via user_roles -> roles.name (first match)
 */
const MEMBER_ROLE_SELECT = `
  COALESCE(
    r.name,
    lr.role,
    (SELECT ro.name
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles ro ON ro.id = ur.role_id
      WHERE u.id = mb.user_id
      LIMIT 1)
  ) AS role_name,
  r.description AS role_description
`;

/**
 * Helper: resolve fallback role_id if none supplied
 * - If for leader, prefer cell_leader, cell_exec, cell_assistant
 * - else, prefer cell_member, cell_assistant, cell_exec, cell_leader, etc.
 * Returns role_id or null
 */
async function resolveFallbackRoleId(isLeader = false) {
  const { rows } = await db.query('SELECT id, name FROM roles');
  if (!rows.length) return null;
  // Adjust order of preference
  if (isLeader) {
    const pref = ['cell_leader', 'cell_exec', 'cell_assistant'];
    for (const pn of pref) {
      const found = rows.find(r => r.name === pn);
      if (found) return found.id;
    }
  }
  const pref = ['cell_member', 'cell_assistant', 'cell_exec', 'cell_leader'];
  for (const pn of pref) {
    const found = rows.find(r => r.name === pn);
    if (found) return found.id;
  }
  // fallback to first
  return rows[0].id;
}

/* ---------- Cell groups listing / detail ---------- */
export async function getCellGroups({ church_id, limit = 100, offset = 0, filters = {}, orderBy = 'name', order = 'asc' }) {
  const vals = [church_id];
  let where = 'WHERE cg.church_id = $1';

  if (filters.status_id) {
    vals.push(filters.status_id);
    where += ` AND cg.status_id = $${vals.length}`;
  }
  if (filters.zone_id) {
    vals.push(filters.zone_id);
    where += ` AND cg.zone_id = $${vals.length}`;
  }
  if (filters.q) {
    vals.push(`%${filters.q}%`);
    where += ` AND (LOWER(cg.name) LIKE LOWER($${vals.length}))`;
  }

  vals.push(limit, offset);

  // whitelist/order mapping to avoid SQL errors and injection
  const orderDir = (String(order || '').toLowerCase() === 'desc') ? 'DESC' : 'ASC';
  const orderKey = String(orderBy || 'name').toLowerCase();

  const ORDER_MAP = {
    name: 'cg.name',
    zone_name: 'z.name',
    status_name: 'st.name',
    created_at: 'cg.created_at',
    member_count: `(SELECT COUNT(*) FROM cell_members cm WHERE cm.cell_group_id = cg.id AND cm.is_active)`,
    exec_count: `(SELECT COUNT(*) FROM cell_members cm WHERE cm.cell_group_id = cg.id AND cm.role_id IN (
           SELECT id FROM roles WHERE name IN ('cell_exec','cell_assistant','cell_secretary','cell_treasurer')
         ) AND cm.is_active)`
  };

  const orderExpr = ORDER_MAP[orderKey] || 'cg.name';

  const { rows } = await db.query(
    `SELECT cg.*, z.name AS zone_name, st.name AS status_name,
       m.first_name AS leader_first_name, m.surname AS leader_surname,
       (SELECT COUNT(*) FROM cell_members cm WHERE cm.cell_group_id = cg.id AND cm.is_active) AS member_count,
       (SELECT COUNT(*) FROM cell_members cm WHERE cm.cell_group_id = cg.id AND cm.role_id IN (
           SELECT id FROM roles WHERE name IN ('cell_exec','cell_assistant','cell_secretary','cell_treasurer')
         ) AND cm.is_active) AS exec_count
     FROM cell_groups cg
     LEFT JOIN zones z ON cg.zone_id = z.id
     LEFT JOIN status_types st ON cg.status_id = st.id
     LEFT JOIN members m ON cg.leader_id = m.id
     ${where}
     ORDER BY ${orderExpr} ${orderDir}
     LIMIT $${vals.length-1} OFFSET $${vals.length}`,
    vals
  );
  return rows;
}

export async function getCellGroupById(id, church_id) {
  const { rows } = await db.query(
    `SELECT cg.*, z.name AS zone_name, st.name AS status_name,
       m.first_name AS leader_first_name, m.surname AS leader_surname,
       (SELECT COUNT(*) FROM cell_members cm WHERE cm.cell_group_id = cg.id AND cm.is_active) AS member_count
     FROM cell_groups cg
     LEFT JOIN zones z ON cg.zone_id = z.id
     LEFT JOIN status_types st ON cg.status_id = st.id
     LEFT JOIN members m ON cg.leader_id = m.id
     WHERE cg.id = $1 AND cg.church_id = $2`,
    [id, church_id]
  );
  if (!rows[0]) return null;

  const members = await db.query(
    `SELECT cm.*, mb.first_name, mb.surname, mb.contact_primary, mb.email, ${MEMBER_ROLE_SELECT}
     FROM cell_members cm
     LEFT JOIN members mb ON cm.member_id = mb.id
     LEFT JOIN roles r ON cm.role_id = r.id
     LEFT JOIN leadership_roles lr ON lr.member_id = mb.id AND lr.church_id = $2 AND lr.active
     WHERE cm.cell_group_id = $1
     ORDER BY cm.is_active DESC, cm.date_joined`,
    [id, church_id]
  );

  const row = rows[0];
  row.members = members.rows;
  return row;
}

/* ---------- Create / Update cell groups ---------- */
export async function createCellGroup(data) {
  const {
    church_id, name, leader_id = null, role_id = null, zone_id = null, status_id = null,
    meeting_day = null, meeting_time = null, meeting_location = null, notes = null, created_by = null
  } = data;

  // leader validation (if provided) — must be in leadership_roles and active
  if (leader_id) {
    const leaderCheck = await db.query(
      `SELECT 1 FROM leadership_roles lr WHERE lr.member_id = $1 AND lr.church_id = $2 AND lr.active LIMIT 1`,
      [leader_id, church_id]
    );
    if (!leaderCheck.rows.length) throw new Error('Selected leader does not have an active leadership role');

    const existing = await db.query(
      `SELECT 1 FROM cell_groups WHERE church_id = $1 AND leader_id = $2 LIMIT 1`,
      [church_id, leader_id]
    );
    if (existing.rows.length) throw new Error('Selected leader is already leader of another cell');
  }

  // create group
  const { rows } = await db.query(
    `INSERT INTO cell_groups
      (church_id, name, leader_id, zone_id, status_id, meeting_day, meeting_time, meeting_location, notes, created_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now(),now())
     RETURNING *`,
    [church_id, name, leader_id, zone_id, status_id, meeting_day, meeting_time, meeting_location, notes, created_by]
  );
  const created = rows[0];

  // --- Always ensure leader is a member in this cell group ---
  if (leader_id) {
    // check if already active in another cell (not this one)
    const activeElsewhere = await db.query(
      `SELECT cell_group_id FROM cell_members WHERE member_id = $1 AND is_active AND cell_group_id <> $2`,
      [leader_id, created.id]
    );
    if (activeElsewhere.rows.length) {
      await db.query(`DELETE FROM cell_groups WHERE id = $1`, [created.id]);
      throw new Error('Selected leader is already active in another cell');
    }

    // Ensure leader is member in this cell group, active, with leader role
    const member = await db.query(
      `SELECT * FROM cell_members WHERE cell_group_id = $1 AND member_id = $2`,
      [created.id, leader_id]
    );
    const leaderRoleId = role_id ?? await resolveFallbackRoleId(true);

    if (!member.rows.length) {
      // Not present: add as member
      await db.query(
        `INSERT INTO cell_members (cell_group_id, member_id, role_id, date_joined, is_active, added_by, created_at, updated_at)
         VALUES ($1,$2,$3, now(), TRUE, $4, now(), now())`,
        [created.id, leader_id, leaderRoleId, created_by]
      );
    } else if (!member.rows[0].is_active) {
      // Present but inactive: reactivate and update role
      await db.query(
        `UPDATE cell_members SET is_active = TRUE, date_left = NULL, role_id = $1, updated_at = now()
         WHERE cell_group_id = $2 AND member_id = $3`,
        [leaderRoleId, created.id, leader_id]
      );
    } else {
      // Already active: just ensure correct role
      await db.query(
        `UPDATE cell_members SET role_id = $1, updated_at = now()
         WHERE cell_group_id = $2 AND member_id = $3 AND is_active`,
        [leaderRoleId, created.id, leader_id]
      );
    }
  }
  // --- End leader membership enforcement ---

  return created;
}

export async function updateCellGroup(id, church_id, updates) {
  const allowed = [
    'name','zone_id','leader_id','status_id',
    'is_ready_for_multiplication','meeting_day','meeting_time','meeting_location',
    'notes'
  ];
  const fields = Object.keys(updates).filter(k => allowed.includes(k));
  if (fields.length === 0) throw new Error('No valid fields to update');

  // if leader change, enforce constraints
  if (updates.leader_id !== undefined) {
    const newLeaderId = updates.leader_id;
    if (newLeaderId) {
      const leaderCheck = await db.query(
        `SELECT 1 FROM leadership_roles lr WHERE lr.member_id = $1 AND lr.church_id = $2 AND lr.active LIMIT 1`,
        [newLeaderId, church_id]
      );
      if (!leaderCheck.rows.length) throw new Error('Selected leader does not have an active leadership role');

      const existing = await db.query(
        `SELECT 1 FROM cell_groups WHERE church_id = $1 AND leader_id = $2 AND id <> $3 LIMIT 1`,
        [church_id, newLeaderId, id]
      );
      if (existing.rows.length) throw new Error('Selected leader is already leader of another cell');
    }
  }

  const vals = [];
  const set = fields.map((k, idx) => {
    vals.push(updates[k]);
    return `${k} = $${idx + 1}`;
  }).join(', ');

  vals.push(id, church_id);
  const query = `UPDATE cell_groups SET ${set}, updated_at = now() WHERE id = $${vals.length-1} AND church_id = $${vals.length} RETURNING *`;
  const { rows } = await db.query(query, vals);
  const updated = rows[0];

  // --- Always ensure leader is a member in this cell group (on leader change or set) ---
  if (updates.leader_id !== undefined && updates.leader_id) {
    const newLeaderId = updates.leader_id;

    // check if already active in another cell (not this group)
    const activeElsewhere = await db.query(
      `SELECT cell_group_id FROM cell_members WHERE member_id = $1 AND is_active AND cell_group_id <> $2`,
      [newLeaderId, id]
    );
    if (activeElsewhere.rows.length) {
      throw new Error('Selected leader is already active in another cell');
    }

    // Ensure leader is member in this cell group, active, with leader role
    const member = await db.query(
      `SELECT * FROM cell_members WHERE cell_group_id = $1 AND member_id = $2`,
      [id, newLeaderId]
    );
    const leaderRoleId = updates.role_id ?? await resolveFallbackRoleId(true);
    if (!member.rows.length) {
      // Not present: add as member
      await db.query(
        `INSERT INTO cell_members (cell_group_id, member_id, role_id, date_joined, is_active, added_by, created_at, updated_at)
         VALUES ($1,$2,$3, now(), TRUE, $4, now(), now())`,
        [id, newLeaderId, leaderRoleId, updates.updated_by || null]
      );
    } else if (!member.rows[0].is_active) {
      // Present but inactive: reactivate and update role
      await db.query(
        `UPDATE cell_members SET is_active = TRUE, date_left = NULL, role_id = $1, updated_at = now()
         WHERE cell_group_id = $2 AND member_id = $3`,
        [leaderRoleId, id, newLeaderId]
      );
    } else {
      // Already active: just ensure correct role
      await db.query(
        `UPDATE cell_members SET role_id = $1, updated_at = now()
         WHERE cell_group_id = $2 AND member_id = $3 AND is_active`,
        [leaderRoleId, id, newLeaderId]
      );
    }
  }
  // --- End leader membership enforcement ---

  return updated;
}

/* ---------- Members management ---------- */
export async function addCellMember({ cell_group_id, member_id, role_id = null, added_by = null }) {
  // ensure the member is not active in another cell
  const check = await db.query(`SELECT 1 FROM cell_members WHERE member_id = $1 AND is_active LIMIT 1`, [member_id]);
  if (check.rows.length) throw new Error('Member is already active in another cell');

  let finalRoleId = role_id;
  if (!finalRoleId) {
    finalRoleId = await resolveFallbackRoleId(false); // prefer generic member
  }
  if (!finalRoleId) throw new Error('No roles available; cannot add cell member. Please create roles first.');

  const { rows } = await db.query(
    `INSERT INTO cell_members (cell_group_id, member_id, role_id, date_joined, is_active, added_by, created_at, updated_at)
     VALUES ($1,$2,$3, now(), TRUE, $4, now(), now()) RETURNING *`,
    [cell_group_id, member_id, finalRoleId, added_by]
  );
  return rows[0];
}

export async function bulkAddCellMembers({ cell_group_id, member_ids = [], role_id = null, added_by = null }) {
  if (!member_ids || !member_ids.length) return [];

  // check duplicates first
  const dupCheck = await db.query(
    `SELECT member_id FROM cell_members WHERE member_id = ANY($1::int[]) AND is_active`,
    [member_ids]
  );
  if (dupCheck.rows.length) {
    const ids = dupCheck.rows.map(r => r.member_id).join(',');
    throw new Error(`Some members are already active in other cells: ${ids}`);
  }

  // prepare values
  const values = member_ids.map((id, i) =>
    `($1, $${i + 2}, $${member_ids.length + 2}, now(), TRUE, $${member_ids.length + 3}, now(), now())`
  ).join(',');
  const params = [cell_group_id, ...member_ids, role_id, added_by];

  const { rows } = await db.query(
    `INSERT INTO cell_members (cell_group_id, member_id, role_id, date_joined, is_active, added_by, created_at, updated_at)
     VALUES ${values}
     RETURNING *`,
    params
  );
  return rows;
}

export async function removeCellMember({ cell_group_id, member_id }) {
  const { rows } = await db.query(
    `UPDATE cell_members SET is_active = FALSE, date_left = now(), updated_at = now()
     WHERE cell_group_id = $1 AND member_id = $2 AND is_active RETURNING *`,
    [cell_group_id, member_id]
  );
  return rows[0];
}

export async function changeCellMemberRole({ cell_group_id, member_id, role_id }) {
  const { rows } = await db.query(
    `UPDATE cell_members SET role_id = $1, updated_at = now()
     WHERE cell_group_id = $2 AND member_id = $3 AND is_active RETURNING *`,
    [role_id, cell_group_id, member_id]
  );
  return rows[0];
}

/* ---------- Query helpers ---------- */
export async function getCellMembers(cell_group_id, { active = null } = {}) {
  let where = 'WHERE cm.cell_group_id = $1';
  const vals = [cell_group_id];
  if (active !== null) {
    where += ' AND cm.is_active = $2';
    vals.push(!!active);
  }

  const { rows } = await db.query(
    `SELECT cm.*, mb.first_name, mb.surname, mb.contact_primary, mb.email, ${MEMBER_ROLE_SELECT}
     FROM cell_members cm
     LEFT JOIN members mb ON cm.member_id = mb.id
     LEFT JOIN roles r ON cm.role_id = r.id
     LEFT JOIN leadership_roles lr ON lr.member_id = mb.id AND lr.active
     ${where}
     ORDER BY cm.is_active DESC, cm.date_joined`,
    vals
  );
  return rows;
}

export async function getCellLeaders(cell_group_id) {
  const { rows } = await db.query(
    `SELECT cm.*, m.first_name, m.surname, r.name AS role_name, r.description AS role_description
     FROM cell_members cm
     JOIN members m ON cm.member_id = m.id
     LEFT JOIN roles r ON cm.role_id = r.id
     WHERE cm.cell_group_id = $1 AND cm.is_active
       AND (r.name IN ('cell_leader', 'cell_exec', 'cell_assistant', 'cell_secretary', 'cell_treasurer') OR r.name IS NOT NULL)
     ORDER BY r.id ASC, m.first_name, m.surname`,
    [cell_group_id]
  );
  return rows;
}

/* ---------- Unassigned lists ---------- */
export async function getUnassignedMembers(church_id) {
  // Members who are not active in ANY cell (in any church) — if you want to scope by church further, adjust as needed
  const { rows } = await db.query(
    `SELECT m.* FROM members m
     WHERE m.church_id = $1
       AND NOT EXISTS (SELECT 1 FROM cell_members cm WHERE cm.member_id = m.id AND cm.is_active)`,
    [church_id]
  );
  return rows;
}

export async function getUnassignedLeaders(church_id) {
  // leaders are members that have leadership_roles.active = true in the church
  // filter out those who are already leader in cell_groups or are active members in other groups
  const { rows } = await db.query(
    `SELECT m.*, lr.role AS leadership_role
     FROM members m
     JOIN leadership_roles lr ON lr.member_id = m.id AND lr.church_id = $1 AND lr.active
     WHERE NOT EXISTS (
       SELECT 1 FROM cell_groups cg WHERE cg.church_id = $1 AND cg.leader_id = m.id
     )
     AND NOT EXISTS (
       SELECT 1 FROM cell_members cm WHERE cm.member_id = m.id AND cm.is_active
     )
     ORDER BY m.first_name, m.surname`,
    [church_id]
  );
  return rows;
}

/* ---------- Exports ---------- */
export default {
  getCellGroups,
  getCellGroupById,
  createCellGroup,
  updateCellGroup,
  addCellMember,
  bulkAddCellMembers,
  removeCellMember,
  changeCellMemberRole,
  getCellMembers,
  getCellLeaders,
  getUnassignedMembers,
  getUnassignedLeaders
};