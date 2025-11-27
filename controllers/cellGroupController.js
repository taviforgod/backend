// controllers/cellGroupController.js
import * as model from '../models/cellGroupModel.js';
import { getZones } from '../models/lookupModel.js';
import { getStatusTypes } from '../models/lookupModel.js';
import { getAllRoles } from '../models/roleModel.js';
import db from '../config/db.js';
import * as notificationModel from '../models/notificationModel.js'; 
import { getIO } from '../config/socket.js'; 

export const listCellGroups = async (req, res) => {
  try {
    const church_id = req.user?.church_id;

    // Parse ints safely (fallback to null / default)
    const safeInt = (val, fallback = null) => {
      if (val === undefined || val === null) return fallback;
      const n = Number(val);
      return Number.isFinite(n) ? Math.trunc(n) : fallback;
    };

    const limit = safeInt(req.query.limit, 100);
    const offset = safeInt(req.query.offset, 0);
    const orderBy = typeof req.query.orderBy === 'string' && req.query.orderBy.trim() ? req.query.orderBy.trim() : 'name';
    const order = (req.query.order === 'desc') ? 'desc' : 'asc';

    // only use q if non-empty string
    const q = (typeof req.query.q === 'string' && req.query.q.trim()) ? req.query.q.trim() : null;

    // zone/status only if numeric
    const zone_id = safeInt(req.query.zone_id, null);
    const status_id = safeInt(req.query.status_id, null);

    const params = {
      church_id,
      limit,
      offset,
      orderBy,
      order,
      filters: {
        q,
        zone_id,
        status_id
      }
    };

    const groups = await model.getCellGroups(params);
    res.json(groups);
  } catch (err) {
    console.error('listCellGroups error', err);
    res.status(500).json({ error: err.message || 'Failed to list cell groups' });
  }
};

export const getCellGroupCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const id = req.params.id;
    const group = await model.getCellGroupById(id, church_id);
    if (!group) return res.status(404).json({ error: 'Cell group not found' });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch cell group' });
  }
};

export const createCellGroupCtrl = async (req, res) => {
  try {
    
    const church_id = req.user?.church_id;
    const payload = {
      church_id,
      name: req.body.name,
      leader_id: req.body.leader_id ?? null,
      role_id: req.body.role_id ?? null,     // forward role_id
      zone_id: req.body.zone_id ?? null,
      status_id: req.body.status_id ?? null,
      meeting_day: req.body.meeting_day ?? null,
      meeting_time: req.body.meeting_time ?? null,
      meeting_location: req.body.meeting_location ?? null,
      notes: req.body.notes ?? null,
      created_by: req.user?.id ?? null
    };
    const created = await model.createCellGroup(payload);
    res.status(201).json(created);
  } catch (err) {
    console.error('createCellGroup error', err);
    res.status(400).json({ error: err.message || 'Failed to create cell group' });
  }
};

export const updateCellGroupCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const id = req.params.id;
    const updates = { ...req.body, updated_by: req.user?.id || null };

    const updated = await model.updateCellGroup(id, church_id, updates);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update cell group' });
  }
};

/* Members endpoints */
export const addCellMemberCtrl = async (req, res) => {
  try {
    const { cell_group_id, member_id, role_id } = req.body;
    if (!cell_group_id || !member_id) return res.status(400).json({ error: 'cell_group_id and member_id required' });

    const added = await model.addCellMember({ cell_group_id, member_id, role_id: role_id || null, added_by: req.user?.id || null });
    res.status(201).json(added);

    // Create notification (best-effort)
    try {
      const church_id = req.user?.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const group = await model.getCellGroupById(cell_group_id, church_id).catch(() => null);

      const title = 'Member assigned to cell group';
      const message = `A member was assigned to ${group?.name || 'a cell group'}.`;
      const metadata = { action: 'member_assigned', cell_group_id, member_id, role_id: role_id || null };
      const link = `/cell-groups/${cell_group_id}`;

      const notification = await notificationModel.createNotification({
        church_id,
        member_id,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      // emit via socket.io to church room and user/ member rooms (if available)
      try {
        const io = getIO();
        if (io) {
          if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
          if (user_id) io.to(`user:${user_id}`).emit('notification', notification);
          if (member_id) io.to(`member:${member_id}`).emit('notification', notification);
        }
      } catch (emitErr) {
        console.warn('Notification emit failed', emitErr?.message || emitErr);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for addCellMember', nErr?.message || nErr);
    }
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to add member' });
  }
};

export const bulkAddCellMembersCtrl = async (req, res) => {
  try {
    const { cell_group_id, member_ids, role_id } = req.body;
    if (!cell_group_id || !member_ids?.length) return res.status(400).json({ error: 'cell_group_id and member_ids required' });

    const added = await model.bulkAddCellMembers({ cell_group_id, member_ids, role_id: role_id || null, added_by: req.user?.id || null });
    res.status(201).json(added);

    // notification (best-effort)
    try {
      const church_id = req.user?.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const group = await model.getCellGroupById(cell_group_id, church_id).catch(() => null);

      const title = 'Members assigned to cell group';
      const message = `${member_ids.length} member(s) were assigned to ${group?.name || 'a cell group'}.`;
      const metadata = { action: 'bulk_member_assigned', cell_group_id, member_ids, role_id: role_id || null };
      const link = `/cell-groups/${cell_group_id}`;

      const notification = await notificationModel.createNotification({
        church_id,
        member_id: null,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      try {
        const io = getIO();
        if (io) {
          if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
          if (user_id) io.to(`user:${user_id}`).emit('notification', notification);
        }
      } catch (emitErr) {
        console.warn('Notification emit failed', emitErr?.message || emitErr);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for bulkAddCellMembers', nErr?.message || nErr);
    }
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to bulk add members' });
  }
};

export const removeCellMemberCtrl = async (req, res) => {
  try {
    const { cell_group_id, member_id } = req.body;
    if (!cell_group_id || !member_id) return res.status(400).json({ error: 'cell_group_id and member_id required' });
    const removed = await model.removeCellMember({ cell_group_id, member_id });
    res.json(removed);

    // notification (best-effort)
    try {
      const church_id = req.user?.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const group = await model.getCellGroupById(cell_group_id, church_id).catch(() => null);

      const title = 'Member removed from cell group';
      const message = `A member was removed from ${group?.name || 'a cell group'}.`;
      const metadata = { action: 'member_removed', cell_group_id, member_id };
      const link = `/cell-groups/${cell_group_id}`;

      const notification = await notificationModel.createNotification({
        church_id,
        member_id,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      try {
        const io = getIO();
        if (io) {
          if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
          if (user_id) io.to(`user:${user_id}`).emit('notification', notification);
          if (member_id) io.to(`member:${member_id}`).emit('notification', notification);
        }
      } catch (emitErr) {
        console.warn('Notification emit failed', emitErr?.message || emitErr);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for removeCellMember', nErr?.message || nErr);
    }
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to remove member' });
  }
};

export const changeCellMemberRoleCtrl = async (req, res) => {
  try {
    const { cell_group_id, member_id, role_id } = req.body;
    if (!cell_group_id || !member_id || !role_id) return res.status(400).json({ error: 'cell_group_id, member_id and role_id required' });
    const updated = await model.changeCellMemberRole({ cell_group_id, member_id, role_id });
    res.json(updated);

    // notification (best-effort)
    try {
      const church_id = req.user?.church_id;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const group = await model.getCellGroupById(cell_group_id, church_id).catch(() => null);

      const title = 'Member role changed in cell group';
      const message = `A member's role was changed in ${group?.name || 'a cell group'}.`;
      const metadata = { action: 'member_role_changed', cell_group_id, member_id, role_id };
      const link = `/cell-groups/${cell_group_id}`;

      const notification = await notificationModel.createNotification({
        church_id,
        member_id,
        user_id,
        title,
        message,
        channel: 'inapp',
        metadata,
        link
      });

      try {
        const io = getIO();
        if (io) {
          if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
          if (user_id) io.to(`user:${user_id}`).emit('notification', notification);
          if (member_id) io.to(`member:${member_id}`).emit('notification', notification);
        }
      } catch (emitErr) {
        console.warn('Notification emit failed', emitErr?.message || emitErr);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for changeCellMemberRole', nErr?.message || nErr);
    }
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to change member role' });
  }
};

/* Lookups / utility endpoints */
export const listCellMembersCtrl = async (req, res) => {
  try {
    const cell_group_id = req.params.id;

    if (!cell_group_id) {
      return res.status(400).json({ error: 'Cell group ID required' });
    }

    // User is authorized, fetch members
    const active = req.query.active;
    const rows = await model.getCellMembers(cell_group_id, { active: active === undefined ? null : active === 'true' });
    res.json(rows);
  } catch (err) {
    console.error('listCellMembersCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to list cell members' });
  }
};

export const listCellLeadersCtrl = async (req, res) => {
  try {
    const cell_group_id = req.params.id;
    const leaders = await model.getCellLeaders(cell_group_id);
    res.json(leaders);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list cell leaders' });
  }
};

export const listUnassignedMembersCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const rows = await model.getUnassignedMembers(church_id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list unassigned members' });
  }
};

export const getCellGroupFormLookups = async (req, res) => {
  try {
    const church_id = req.user?.church_id || null;

    const rolesPromise = getAllRoles();
    const zonesPromise = church_id ? getZones(church_id) : Promise.resolve([]);
    const statusesPromise = church_id ? getStatusTypes(church_id) : Promise.resolve([]);
    // leaders now come from leadership_roles and are unassigned
    const leadersPromise = church_id ? model.getUnassignedLeaders(church_id) : Promise.resolve([]);
    const unassignedMembersPromise = church_id ? model.getUnassignedMembers(church_id) : Promise.resolve([]);

    const [rolesRaw, zones, statuses, leaders, unassignedMembers] = await Promise.all([rolesPromise, zonesPromise, statusesPromise, leadersPromise, unassignedMembersPromise]);

    const roleOptions = Array.isArray(rolesRaw)
      ? rolesRaw.map(r => ({ id: r.id, name: r.name, value: r.id, label: r.name, description: r.description, ...r }))
      : [];

    res.json({ zones, statuses, roles: roleOptions, rolesRaw, leaders, unassignedMembers });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch form lookups' });
  }
};

export const getMyCellGroups = async (req, res) => {
  try {
    const userId = req.user?.userId ?? req.user?.id;
    const church_id = req.user?.church_id ?? req.user?.churchId ?? req.user?.church_id;
    if (!userId || !church_id) return res.status(401).json({ error: 'Not authenticated' });

    // Map userId to memberId
    const memberRes = await db.query(
      'SELECT id FROM members WHERE user_id = $1 AND church_id = $2 LIMIT 1',
      [userId, church_id]
    );
    if (!memberRes.rows.length) return res.status(404).json({ error: 'No member record for this user' });
    const memberId = memberRes.rows[0].id;

    // Fetch cell groups
    const q = `
      SELECT cg.*, z.name AS zone_name, st.name AS status_name,
             m.first_name AS leader_first_name, m.surname AS leader_surname, m.contact_primary AS leader_contact, m.email AS leader_email, m.id AS leader_id,
             (SELECT COUNT(*) FROM cell_members cm WHERE cm.cell_group_id = cg.id AND cm.is_active) AS members_count
      FROM cell_groups cg
      LEFT JOIN zones z ON cg.zone_id = z.id
      LEFT JOIN status_types st ON cg.status_id = st.id
      LEFT JOIN members m ON cg.leader_id = m.id
      LEFT JOIN cell_members cm ON cm.cell_group_id = cg.id AND cm.member_id = $1 AND cm.is_active = TRUE
      WHERE cg.church_id = $2
        AND (cg.leader_id = $1 OR cm.member_id IS NOT NULL)
      ORDER BY cg.name`;

    const { rows } = await db.query(q, [memberId, church_id]);

    // Map leader, zone, and fetch members for each group
    const result = [];
    for (const row of rows) {
      const group = {
        ...row,
        leader: {
          first_name: row.leader_first_name,
          surname: row.leader_surname,
          id: row.leader_id,
          contact_primary: row.leader_contact,
          email: row.leader_email
        },
        zone: row.zone_name,
      };

      // Fetch members for this group
      const membersRes = await db.query(
        `SELECT cm.*, mb.first_name, mb.surname
         FROM cell_members cm
         LEFT JOIN members mb ON cm.member_id = mb.id
         WHERE cm.cell_group_id = $1 AND cm.is_active = TRUE
         ORDER BY mb.first_name, mb.surname`,
        [group.id]
      );
      group.members = membersRes.rows;
      group.members_preview = membersRes.rows.slice(0, 6);

      // Fetch upcoming meetings from weekly_reports
      const meetingsRes = await db.query(
        `SELECT id, meeting_date, topic, next_meeting_date
         FROM weekly_reports
         WHERE cell_group_id = $1 AND meeting_date >= CURRENT_DATE
         ORDER BY meeting_date ASC
         LIMIT 5`,
        [group.id]
      );
      group.upcoming_meetings = meetingsRes.rows;

      result.push(group);
    }

    return res.json(result);
  } catch (err) {
    console.error('getMyCellGroups error', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch my cell groups' });
  }
};
// --- Get last attendance summary for a cell group ---
export async function getLastAttendance(req, res) {
  try {
    const cellId = parseInt(req.params.id);
    if (!cellId) return res.status(400).json({ error: 'cell_id required' });

    const result = await db.query(
      `SELECT 
          COUNT(*) FILTER (WHERE a.present) AS present_count,
          COUNT(*) FILTER (WHERE NOT a.present) AS absent_count,
          COUNT(DISTINCT v.id) AS visitor_count
       FROM attendance a
       LEFT JOIN visitors v 
         ON v.cell_group_id = a.cell_group_id 
        AND v.meeting_date = a.meeting_date
       WHERE a.cell_group_id = $1
       GROUP BY a.cell_group_id
       ORDER BY MAX(a.meeting_date) DESC
       LIMIT 1`,
      [cellId]
    );

    if (!result.rows.length) return res.json({});
    res.json(result.rows[0]);
  } catch (err) {
    console.error('getLastAttendance error', err);
    res.status(500).json({ error: err.message || 'Failed to get last attendance' });
  }
}

// --- Multiplication readiness check ---
export const getMultiplicationReadinessCtrl = async (req, res) => {
  try {
    const churchId = req.user?.church_id;
    if (!churchId) return res.status(400).json({ error: 'Church not specified' });

    // optional query params to tighten results
    const minMembers = parseInt(req.query.min_members, 10) || 6;
    const minExecs = parseInt(req.query.min_execs, 10) || 1;

    const q = `
      SELECT cg.id, cg.name, cg.zone_id, z.name AS zone_name, cg.leader_id,
        (SELECT COUNT(*) FROM cell_members cm WHERE cm.cell_group_id = cg.id AND cm.is_active) AS member_count,
        (SELECT COUNT(*) FROM cell_members cm WHERE cm.cell_group_id = cg.id
           AND cm.role_id IN (
             SELECT id FROM roles WHERE name IN ('cell_exec','cell_assistant','cell_secretary','cell_treasurer')
           ) AND cm.is_active) AS exec_count,
        cg.is_ready_for_multiplication, cg.meeting_day, cg.meeting_time, cg.meeting_location
      FROM cell_groups cg
      LEFT JOIN zones z ON z.id = cg.zone_id
      WHERE cg.church_id = $1
        AND COALESCE(cg.is_ready_for_multiplication, FALSE) = TRUE
        AND (SELECT COUNT(*) FROM cell_members cm WHERE cm.cell_group_id = cg.id AND cm.is_active) >= $2
        AND (SELECT COUNT(*) FROM cell_members cm WHERE cm.cell_group_id = cg.id
           AND cm.role_id IN (SELECT id FROM roles WHERE name IN ('cell_exec','cell_assistant','cell_secretary','cell_treasurer'))
           AND cm.is_active) >= $3
      ORDER BY exec_count DESC, member_count DESC
      LIMIT 500
    `;

    const { rows } = await db.query(q, [churchId, minMembers, minExecs]);
    return res.json(rows);
  } catch (err) {
    console.error('getMultiplicationReadinessCtrl error', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch multiplication readiness' });
  }
};
