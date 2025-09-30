// server/controllers/cellModuleController.js

import * as model from '../models/cellModuleModel.js';
import db from '../config/db.js';
import { createNotification } from '../models/notificationsModel.js';
import { enforceRateLimit } from '../utils/notificationLimiter.js';

// Utility: sanitize arrays to integers
const sanitizeIntArray = (input) => {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => {
      if (typeof v === 'number' && Number.isInteger(v)) return v;
      if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        return Number.isInteger(n) ? n : NaN;
      }
      return NaN;
    })
    .filter((v) => Number.isInteger(v));
};

// Utility: parse integer query param with fallback
const parseIntQuery = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) ? n : fallback;
};

// Generic error responder
const handleError = (res, err, status = 500, userMsg = 'Internal server error') => {
  console.error(err && err.stack ? err.stack : err);
  return res.status(status).json({ error: err.message || userMsg });
};

/** -------------------------
 * ZONES
 * ------------------------- */
export const listZones = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const rows = await model.getZones(church_id);
    return res.json(rows);
  } catch (err) {
    return handleError(res, err);
  }
};

export const createZoneCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const payload = { ...(req.body || {}), church_id };
    const created = await model.createZone(payload);

    // Non-blocking: notify about new zone (no admin query)
    (async () => {
      try {
        try { await enforceRateLimit({ church_id }); } catch (rl) { return; }

        const title = `New zone created: ${created.name || 'Zone'}`;
        const message = `A new zone (${created.name || created.id}) was created.`;

        await createNotification({
          church_id,
          title,
          message,
          channel: 'in_app',
          metadata: { zone_id: created.id, action: 'zone_created' }
        });
      } catch (err) {
        console.warn('Zone create notification failed (non-fatal):', err?.message || err);
      }
    })();

    return res.status(201).json(created);
  } catch (err) {
    return handleError(res, err);
  }
};

export const updateZoneCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const updated = await model.updateZone(req.params.id, req.body, church_id);
    if (!updated) return res.status(404).json({ error: 'Zone not found' });

    // Non-blocking: notify about zone update (no admin query)
    (async () => {
      try {
        try { await enforceRateLimit({ church_id }); } catch (rl) { return; }

        const title = `Zone updated: ${updated.name || req.params.id}`;
        const message = `Zone (${updated.name || updated.id}) was updated.`;

        await createNotification({
          church_id,
          title,
          message,
          channel: 'in_app',
          metadata: { zone_id: updated.id, action: 'zone_updated' }
        });
      } catch (err) {
        console.warn('Zone update notification failed (non-fatal):', err?.message || err);
      }
    })();

    return res.json(updated);
  } catch (err) {
    return handleError(res, err);
  }
};

export const deleteZoneCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    await model.deleteZone(req.params.id, church_id);

    // Non-blocking: notify about zone deletion (no admin query)
    (async () => {
      try {
        try { await enforceRateLimit({ church_id }); } catch (rl) { return; }

        const title = `Zone deleted`;
        const message = `A zone (id: ${req.params.id}) was deleted.`;

        await createNotification({
          church_id,
          title,
          message,
          channel: 'in_app',
          metadata: { zone_id: Number(req.params.id), action: 'zone_deleted' }
        });
      } catch (err) {
        console.warn('Zone delete notification failed (non-fatal):', err?.message || err);
      }
    })();

    return res.status(204).end();
  } catch (err) {
    return handleError(res, err);
  }
};

/** -------------------------
 * STATUS TYPES
 * ------------------------- */
export const listStatusTypes = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const rows = await model.getStatusTypes(church_id);
    return res.json(rows);
  } catch (err) {
    return handleError(res, err);
  }
};

export const createStatusTypeCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const created = await model.createStatusType({ ...(req.body || {}), church_id });

    // Non-blocking: notify about new status type (no admin query)
    (async () => {
      try {
        try { await enforceRateLimit({ church_id }); } catch (rl) { return; }

        const title = `New status type: ${created.name || 'Status'}`;
        const message = `A new status type (${created.name || created.id}) was created.`;

        await createNotification({
          church_id,
          title,
          message,
          channel: 'in_app',
          metadata: { status_type_id: created.id, action: 'status_type_created' }
        });
      } catch (err) {
        console.warn('StatusType create notification failed (non-fatal):', err?.message || err);
      }
    })();

    return res.status(201).json(created);
  } catch (err) {
    return handleError(res, err);
  }
};

export const updateStatusTypeCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const updated = await model.updateStatusType(req.params.id, req.body, church_id);
    if (!updated) return res.status(404).json({ error: 'Status type not found' });

    // Notify about update (no admin query)
    (async () => {
      try {
        try { await enforceRateLimit({ church_id }); } catch (rl) { return; }

        const title = `Status type updated: ${updated.name || req.params.id}`;
        const message = `Status type (${updated.name || updated.id}) was updated.`;

        await createNotification({
          church_id,
          title,
          message,
          channel: 'in_app',
          metadata: { status_type_id: updated.id, action: 'status_type_updated' }
        });
      } catch (err) {
        console.warn('StatusType update notification failed (non-fatal):', err?.message || err);
      }
    })();

    return res.json(updated);
  } catch (err) {
    return handleError(res, err);
  }
};

export const deleteStatusTypeCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    await model.deleteStatusType(req.params.id, church_id);

    // Notify about deletion (no admin query)
    (async () => {
      try {
        try { await enforceRateLimit({ church_id }); } catch (rl) { return; }

        const title = `Status type deleted`;
        const message = `A status type (id: ${req.params.id}) was deleted.`;

        await createNotification({
          church_id,
          title,
          message,
          channel: 'in_app',
          metadata: { status_type_id: Number(req.params.id), action: 'status_type_deleted' }
        });
      } catch (err) {
        console.warn('StatusType delete notification failed (non-fatal):', err?.message || err);
      }
    })();

    return res.status(204).end();
  } catch (err) {
    return handleError(res, err);
  }
};

/** -------------------------
 * CELL GROUPS
 * ------------------------- */
export const listCellGroups = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const rows = await model.getCellGroups(church_id);
    return res.json(rows);
  } catch (err) {
    return handleError(res, err);
  }
};

export const getCellGroupCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const cg = await model.getCellGroupById(req.params.id, church_id);
    if (!cg) return res.status(404).json({ error: 'Cell group not found' });
    return res.json(cg);
  } catch (err) {
    return handleError(res, err);
  }
};

export const createCellGroupCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const created = await model.createCellGroup({ ...(req.body || {}), church_id });

    // Notify about new cell group (no admin query, leader notification unchanged)
    (async () => {
      try {
        try { await enforceRateLimit({ church_id }); } catch (rl) { return; }

        const title = `New cell group created: ${created.name || 'Cell Group'}`;
        const message = `A new cell group (${created.name || created.id}) was created.`;

        await createNotification({
          church_id,
          title,
          message,
          channel: 'in_app',
          metadata: { cell_group_id: created.id, action: 'cell_group_created' }
        });

        // notify leader if present (leader may be a member id)
        const leaderId = req.body.leader_id || created.leader_id;
        if (leaderId) {
          // try to resolve member -> user_id
          const m = await db.query('SELECT user_id FROM members WHERE id = $1 AND church_id = $2 LIMIT 1', [leaderId, church_id]);
          const leaderUserId = m.rows[0]?.user_id;
          if (leaderUserId) {
            await createNotification({
              church_id,
              user_id: leaderUserId,
              member_id: leaderId,
              title: `You're assigned as leader for ${created.name || 'a cell group'}`,
              message: `You were assigned as leader for cell group ${created.name || created.id}.`,
              channel: 'in_app',
              metadata: { cell_group_id: created.id, action: 'leader_assigned' }
            });
          }
        }
      } catch (err) {
        console.warn('Cell group create notification failed (non-fatal):', err?.message || err);
      }
    })();

    return res.status(201).json(created);
  } catch (err) {
    return handleError(res, err);
  }
};

export const updateCellGroupCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const updated = await model.updateCellGroup(req.params.id, req.body, church_id);
    if (!updated) return res.status(404).json({ error: 'Cell group not found' });

    // Notify about update (no admin query, leader notification unchanged)
    (async () => {
      try {
        try { await enforceRateLimit({ church_id }); } catch (rl) { return; }

        const title = `Cell group updated: ${updated.name || req.params.id}`;
        const message = `Cell group (${updated.name || updated.id}) was updated.`;

        await createNotification({
          church_id,
          title,
          message,
          channel: 'in_app',
          metadata: { cell_group_id: updated.id, action: 'cell_group_updated' }
        });

        // notify leader if present
        const cg = await model.getCellGroupById(req.params.id, church_id);
        const leaderId = cg?.leader_id;
        if (leaderId) {
          const m = await db.query('SELECT user_id FROM members WHERE id = $1 AND church_id = $2 LIMIT 1', [leaderId, church_id]);
          const leaderUserId = m.rows[0]?.user_id;
          if (leaderUserId) {
            await createNotification({
              church_id,
              user_id: leaderUserId,
              member_id: leaderId,
              title: `Your cell group was updated`,
              message: `Cell group ${updated.name || updated.id} was updated.`,
              channel: 'in_app',
              metadata: { cell_group_id: updated.id, action: 'cell_group_updated' }
            });
          }
        }
      } catch (err) {
        console.warn('Cell group update notification failed (non-fatal):', err?.message || err);
      }
    })();

    return res.json(updated);
  } catch (err) {
    return handleError(res, err);
  }
};

export const deleteCellGroupCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    await model.deleteCellGroup(req.params.id, church_id);

    // Notify about deletion (no admin query)
    (async () => {
      try {
        try { await enforceRateLimit({ church_id }); } catch (rl) { return; }

        const title = `Cell group deleted`;
        const message = `A cell group (id: ${req.params.id}) was deleted.`;

        await createNotification({
          church_id,
          title,
          message,
          channel: 'in_app',
          metadata: { cell_group_id: Number(req.params.id), action: 'cell_group_deleted' }
        });
      } catch (err) {
        console.warn('Cell group delete notification failed (non-fatal):', err?.message || err);
      }
    })();

    return res.status(204).end();
  } catch (err) {
    return handleError(res, err);
  }
};

/** -------------------------
 * CELL GROUP MEMBERS
 * ------------------------- */
export const listCellGroupMembers = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const rows = await model.getCellGroupMembers(req.params.id, church_id);
    return res.json(rows);
  } catch (err) {
    return handleError(res, err);
  }
};

// Batch assign members to a cell group
export const addCellGroupMemberCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const cell_group_id = req.params.id;
    const { member_ids, role } = req.body;
    if (!Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(400).json({ error: 'member_ids array is required' });
    }
    const results = await model.addCellGroupMember({ cell_group_id, member_ids, role, church_id });

    // Non-blocking: notify added members and the group leader
    (async () => {
      try {
        try { await enforceRateLimit({ church_id }); } catch (rl) { return; }

        // notify each member (if member has linked user account, notify the user)
        await Promise.all(member_ids.map(async (mid) => {
          try {
            const mRes = await db.query('SELECT user_id, first_name, surname FROM members WHERE id = $1 AND church_id = $2 LIMIT 1', [mid, church_id]);
            const m = mRes.rows[0];
            const title = `Added to cell group`;
            const message = `You were added to cell group ${cell_group_id}.`;
            if (m?.user_id) {
              await createNotification({
                church_id,
                user_id: m.user_id,
                member_id: mid,
                title,
                message,
                channel: 'in_app',
                metadata: { cell_group_id, member_id: mid, action: 'member_added' }
              });
            } else {
              // fallback church-wide if no user linked
              await createNotification({
                church_id,
                title,
                message: `${m?.first_name || 'A member'} was added to cell group ${cell_group_id}.`,
                channel: 'in_app',
                metadata: { cell_group_id, member_id: mid, action: 'member_added' }
              });
            }
          } catch (err) {
            console.warn('Notification for member add failed (non-fatal):', err?.message || err);
          }
        }));

        // notify the leader of the cell group
        const cg = await model.getCellGroupById(cell_group_id, church_id);
        const leaderId = cg?.leader_id;
        if (leaderId) {
          const ures = await db.query('SELECT user_id FROM members WHERE id = $1 AND church_id = $2 LIMIT 1', [leaderId, church_id]);
          const leaderUserId = ures.rows[0]?.user_id;
          const title = `Members added to your cell group`;
          const message = `${member_ids.length} member(s) were added to cell group ${cg?.name || cell_group_id}.`;
          if (leaderUserId) {
            await createNotification({
              church_id,
              user_id: leaderUserId,
              member_id: leaderId,
              title,
              message,
              channel: 'in_app',
              metadata: { cell_group_id, added_member_ids: member_ids, action: 'members_added' }
            });
          } else {
            await createNotification({
              church_id,
              title,
              message,
              channel: 'in_app',
              metadata: { cell_group_id, added_member_ids: member_ids, action: 'members_added' }
            });
          }
        }
      } catch (err) {
        console.warn('Add members notification failed (non-fatal):', err?.message || err);
      }
    })();

    return res.status(201).json(results);
  } catch (err) {
    return handleError(res, err);
  }
};

// Remove a member from a cell group
export const removeCellGroupMemberCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const cell_group_id = req.params.id;
    const { member_id } = req.body;
    if (!member_id) return res.status(400).json({ error: 'member_id is required' });

    await model.removeCellGroupMember(cell_group_id, member_id, church_id);

    // Non-blocking: notify the removed member and leader
    (async () => {
      try {
        try { await enforceRateLimit({ church_id }); } catch (rl) { return; }

        const mRes = await db.query('SELECT user_id, first_name, surname FROM members WHERE id = $1 AND church_id = $2 LIMIT 1', [member_id, church_id]);
        const m = mRes.rows[0];
        const title = `Removed from cell group`;
        const message = `You were removed from cell group ${cell_group_id}.`;

        if (m?.user_id) {
          await createNotification({
            church_id,
            user_id: m.user_id,
            member_id,
            title,
            message,
            channel: 'in_app',
            metadata: { cell_group_id, member_id, action: 'member_removed' }
          });
        } else {
          await createNotification({
            church_id,
            title,
            message: `${m?.first_name || 'A member'} was removed from cell group ${cell_group_id}.`,
            channel: 'in_app',
            metadata: { cell_group_id, member_id, action: 'member_removed' }
          });
        }

        // notify leader
        const cg = await model.getCellGroupById(cell_group_id, church_id);
        const leaderId = cg?.leader_id;
        if (leaderId) {
          const ures = await db.query('SELECT user_id FROM members WHERE id = $1 AND church_id = $2 LIMIT 1', [leaderId, church_id]);
          const leaderUserId = ures.rows[0]?.user_id;
          const lTitle = `Member removed from your cell group`;
          const lMessage = `Member (id: ${member_id}) was removed from cell group ${cg?.name || cell_group_id}.`;
          if (leaderUserId) {
            await createNotification({
              church_id,
              user_id: leaderUserId,
              member_id: leaderId,
              title: lTitle,
              message: lMessage,
              channel: 'in_app',
              metadata: { cell_group_id, member_id, action: 'member_removed' }
            });
          } else {
            await createNotification({
              church_id,
              title: lTitle,
              message: lMessage,
              channel: 'in_app',
              metadata: { cell_group_id, member_id, action: 'member_removed' }
            });
          }
        }
      } catch (err) {
        console.warn('Member remove notification failed (non-fatal):', err?.message || err);
      }
    })();

    return res.status(204).end();
  } catch (err) {
    return handleError(res, err);
  }
};

export const listUnassignedMembers = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const rows = await model.getUnassignedMembers(church_id);
    return res.json(rows);
  } catch (err) {
    return handleError(res, err);
  }
};

/** -------------------------
 * HEALTH HISTORY
 * ------------------------- */
export const listCellHealthHistory = async (req, res) => {
  try {
    const cell_group_id = req.params.cell_group_id;
    if (!cell_group_id) return res.status(400).json({ error: 'cell_group_id required' });
    const rows = await model.getCellHealthHistory(cell_group_id);
    return res.json(rows);
  } catch (err) {
    return handleError(res, err);
  }
};

export const addCellHealthHistoryCtrl = async (req, res) => {
  try {
    const created = await model.addCellHealthHistory(req.body);
    return res.status(201).json(created);
  } catch (err) {
    return handleError(res, err);
  }
};

/** -------------------------
 * WEEKLY REPORTS
 * ------------------------- */
export const listWeeklyReports = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const rows = await model.getWeeklyCellReports(church_id, req.query);
    return res.json(rows);
  } catch (err) {
    return handleError(res, err);
  }
};

export const getLastWeeklyReportCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const { id } = req.params;
    const last = await model.getLastWeeklyReport(id, church_id);
    if (!last) return res.status(404).json({ error: 'No report found' });
    return res.json(last);
  } catch (err) {
    return handleError(res, err);
  }
};

// Full, robust createWeeklyReportCtrl (validated, sanitized, notification-aware)
export const createWeeklyReportCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const user_id = req.user?.id;

    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const {
      cell_group_id,
      leader_id: postedLeaderId,
      date_of_meeting,
      topic_taught,
      attendees,
      attendee_names, 
      absentees,
      absenteeReasons, 
      visitors,
      testimonies,
      prayer_requests,
      follow_ups,
      challenges,
      support_needed,
    } = req.body || {};

    // Basic required validations
    if (!cell_group_id) return res.status(400).json({ error: 'cell_group_id is required' });
    if (!date_of_meeting) return res.status(400).json({ error: 'date_of_meeting is required' });

    // fallback leader_id to authenticated user if not posted
    const leader_id = postedLeaderId || user_id;
    if (!leader_id) return res.status(400).json({ error: 'leader_id is required (or authenticate user)' });

    // Sanitize arrays
    const attendeeIds = sanitizeIntArray(attendees);
    const absenteeIds = sanitizeIntArray(absentees);
    const visitorIds = sanitizeIntArray(visitors);

    // derive attendance
    const attendance = attendeeIds.length;

    // parse absentee_threshold query param robustly (default 3)
    const absentee_threshold = parseIntQuery(req.query?.absentee_threshold, 3);

    // Create report via model
    const report = await model.createWeeklyCellReport({
      cell_group_id: Number(cell_group_id),
      leader_id: Number(leader_id),
      date_of_meeting,
      topic_taught,
      attendance,
      visitors: visitorIds,
      testimonies,
      attendees: attendeeIds,
      attendee_names,
      absentees: absenteeIds,
      absenteeReasons, 
      prayer_requests,
      follow_ups,
      challenges,
      support_needed,
      church_id,
    });

    // notify leader about report submission (no admin query)
    (async () => {
      try {
        try { await enforceRateLimit({ church_id, user_id }); } catch (rl) { return; }

        // notify leader (resolve member -> user_id)
        let leaderUserId = null;
        try {
          const lRes = await db.query('SELECT user_id FROM members WHERE id = $1 AND church_id = $2 LIMIT 1', [leader_id, church_id]);
          leaderUserId = lRes.rows[0]?.user_id;
        } catch (e) { /* ignore */ }

        const title = `Weekly report submitted for cell ${cell_group_id}`;
        const message = `${req.user?.name || 'A leader'} submitted a weekly report for cell ${cell_group_id} on ${report.date_of_meeting}. Attendance: ${report.attendance}`;

        if (leaderUserId) {
          await createNotification({
            church_id,
            user_id: leaderUserId,
            member_id: leader_id,
            title,
            message,
            channel: 'in_app',
            metadata: { report_id: report.id, cell_group_id, action: 'weekly_report_submitted' }
          });
        } else {
          await createNotification({
            church_id,
            title,
            message,
            channel: 'in_app',
            metadata: { report_id: report.id, cell_group_id, action: 'weekly_report_submitted' }
          });
        }
      } catch (err) {
        console.warn('Weekly report notifications failed (non-fatal):', err?.message || err);
      }
    })();

    if ((report.attendance ?? 0) < absentee_threshold) {
      try {
        await model.queueNotification({
          church_id,
          user_id: report.leader_id || leader_id,
          type: 'alert',
          title: 'Low attendance warning',
          message: `Attendance for your cell group (${report.cell_group_id}) was ${report.attendance} on ${report.date_of_meeting}. Threshold: ${absentee_threshold}`,
          link: `/cell-groups/${report.cell_group_id}/reports`,
          priority: 'high',
        });
      } catch (notifyErr) {
        // don't fail the request if notification queueing fails; log and continue
        console.error('Failed to queue low-attendance notification', notifyErr && notifyErr.stack ? notifyErr.stack : notifyErr);
      }
    }

    return res.status(201).json(report);
  } catch (err) {
    return handleError(res, err);
  }
};

export const updateWeeklyReportCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const user_id = req.user?.id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const {
      cell_group_id,
      leader_id: postedLeaderId,
      date_of_meeting,
      topic_taught,
      attendees,
      attendee_names,
      absentees,
      absenteeReasons,
      visitors,
      testimonies,
      prayer_requests,
      follow_ups,
      challenges,
      support_needed,
    } = req.body || {};

    // Basic required validations
    if (!cell_group_id) return res.status(400).json({ error: 'cell_group_id is required' });
    if (!date_of_meeting) return res.status(400).json({ error: 'date_of_meeting is required' });

    // fallback leader_id to authenticated user if not posted
    const leader_id = postedLeaderId || user_id;
    if (!leader_id) return res.status(400).json({ error: 'leader_id is required (or authenticate user)' });

    // Sanitize arrays
    const attendeeIds = sanitizeIntArray(attendees);
    const absenteeIds = sanitizeIntArray(absentees);
    const visitorIds = sanitizeIntArray(visitors);

    // derive attendance
    const attendance = attendeeIds.length;

    // Update report via model
    const updated = await model.updateWeeklyCellReport(
      req.params.id,
      {
        cell_group_id: Number(cell_group_id),
        leader_id: Number(leader_id),
        date_of_meeting,
        topic_taught,
        attendance,
        visitors: visitorIds,
        testimonies,
        attendees: attendeeIds,
        attendee_names,
        absentees: absenteeIds,
        absenteeReasons,
        prayer_requests,
        follow_ups,
        challenges,
        support_needed,
        church_id,
      },
      church_id
    );

    if (!updated) return res.status(404).json({ error: 'Weekly report not found' });

    return res.json(updated);
  } catch (err) {
    return handleError(res, err);
  }
};

export const deleteWeeklyReportCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    await model.deleteWeeklyReport(req.params.id, church_id);
    return res.status(204).end();
  } catch (err) {
    return handleError(res, err);
  }
};

/** -------------------------
 * CONSOLIDATED / DASHBOARD
 * ------------------------- */
export const consolidatedReportCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const { month, year } = req.query;
    const rows = await model.getConsolidatedReport(church_id, month, year);
    return res.json(rows);
  } catch (err) {
    return handleError(res, err);
  }
};

export const cellHealthDashboardCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const rows = await model.getCellGroupHealthDashboard(church_id);
    return res.json(rows);
  } catch (err) {
    return handleError(res, err);
  }
};

/** -------------------------
 * NOTIFICATIONS
 * ------------------------- */
export const listUserNotifications = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const user_id = req.user?.id;
    if (!church_id || !user_id) return res.status(400).json({ error: 'Invalid request' });
    const rows = await model.getUserNotifications(user_id, church_id);
    return res.json(rows);
  } catch (err) {
    return handleError(res, err);
  }
};

export const markNotificationReadCtrl = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const { id } = req.params;
    if (!user_id) return res.status(400).json({ error: 'Invalid request' });
    await model.markNotificationRead(id, user_id);
    return res.status(204).end();
  } catch (err) {
    return handleError(res, err);
  }
};

/** -------------------------
 * EXPORTS
 * ------------------------- */
export const exportCellGroupsCSVCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const csv = await model.exportCellGroupsCSV(church_id);
    res.header('Content-Type', 'text/csv');
    res.attachment('cell_groups.csv');
    return res.send(csv);
  } catch (err) {
    return handleError(res, err);
  }
};

export const exportCellHealthPDFCtrl = async (req, res) => {
  try {
    const cell_group_id = req.params.cell_group_id;
    if (!cell_group_id) return res.status(400).json({ error: 'cell_group_id required' });

    const doc = await model.exportCellHealthPDF(cell_group_id);
    res.header('Content-Type', 'application/pdf');
    res.attachment('cell_health_history.pdf');
    // pdfkit streams; pipe to response
    doc.pipe(res);
    // doc.end() is called in the model; if not, ensure it's called there
  } catch (err) {
    return handleError(res, err);
  }
};

/** -------------------------
 * ABSENTEES ANALYTICS & DASHBOARD
 * ------------------------- */

// Absentee Trends Dashboard
export const absenteeTrendsCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const rows = await model.getAbsenteeTrends(church_id);
    return res.json(rows);
  } catch (err) {
    return handleError(res, err);
  }
};

// At Risk Member List
export const atRiskMembersCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const rows = await model.getAtRiskMembers(church_id);
    return res.json(rows);
  } catch (err) {
    return handleError(res, err);
  }
};

// Absentee Retention Rate
export const absenteeRetentionRateCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const stats = await model.getAbsenteeRetentionRate(church_id);
    return res.json(stats);
  } catch (err) {
    return handleError(res, err);
  }
};

// Get my cell group (for the authenticated user)
export const getMyCellGroupCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const user_id = req.user?.id || req.user?.userId;
    if (!church_id || !user_id) return res.status(400).json({ error: 'Invalid request' });

    // 1. Find member_id for this user
    const memberRes = await db.query(
      'SELECT id FROM members WHERE user_id = $1 AND church_id = $2 LIMIT 1',
      [user_id, church_id]
    );
    const member_id = memberRes.rows[0]?.id;
    if (!member_id) return res.status(404).json({ error: 'No member found for user' });

    // 2. Use member_id to get cell group
    const cellGroup = await model.getMyCellGroup(member_id, church_id);
    if (!cellGroup) return res.status(404).json({ error: 'No cell group found for member' });

    return res.json(cellGroup);
  } catch (err) {
    return handleError(res, err);
  }
};

// Get my attendance history (for the authenticated user)
export const getMyAttendanceHistoryCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const user_id = req.user?.id || req.user?.userId;
    if (!church_id || !user_id) return res.status(400).json({ error: 'Invalid request' });

    // Find member_id for this user
    const memberRes = await db.query(
      'SELECT id FROM members WHERE user_id = $1 AND church_id = $2 LIMIT 1',
      [user_id, church_id]
    );
    const member_id = memberRes.rows[0]?.id;
    if (!member_id) return res.status(404).json({ error: 'No member found for user' });

    // Find the user's cell group
    const cellRes = await db.query(
      'SELECT cell_group_id FROM cell_group_members WHERE member_id = $1 AND removed_at IS NULL LIMIT 1',
      [member_id]
    );
    const cell_group_id = cellRes.rows[0]?.cell_group_id;
    if (!cell_group_id) return res.status(404).json({ error: 'No cell group found for member' });

    // Get last 5 cell leader reports for this cell group
    const reportsRes = await db.query(
      `SELECT id, date_of_meeting, absentees
         FROM cell_leader_reports
        WHERE cell_group_id = $1 AND church_id = $2
        ORDER BY date_of_meeting DESC
        LIMIT 5`,
      [cell_group_id, church_id]
    );

    // Map to attendance history for this member
    const history = reportsRes.rows.map(r => ({
      id: r.id,
      meeting_date: r.date_of_meeting,
      present: !(Array.isArray(r.absentees) && r.absentees.includes(member_id))
    }));

    return res.json(history);
  } catch (err) {
    console.error('Attendance history error:', err);
    return res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
};
