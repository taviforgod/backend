import * as model from '../models/inactiveExitModel.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';
import db from '../config/db.js';
import * as memberModel from '../models/memberModel.js';
import * as mentorshipModel from '../models/mentorshipModel.js';
import * as milestoneModel from '../models/milestoneRecordModel.js';

/**
 * Controller for inactive member exits
 * Expects authenticate middleware to set req.user with at least { id, church_id }
 */

const getChurchId = (req) => req.user?.church_id || req.church_id || null;
const getUserId = (req) => req.user?.id ?? req.user?.userId ?? null;

export async function listExits(req, res) {
  try {
    const church_id = getChurchId(req);
    if (!church_id) return res.status(400).json({ error: 'Missing church_id' });

    const offset = parseInt(req.query.offset || '0', 10) || 0;
    const limit = parseInt(req.query.limit || '50', 10) || 50;
    const search = req.query.search || null;
    const fromDate = req.query.fromDate || null;
    const toDate = req.query.toDate || null;
    const includeInterviews = req.query.includeInterviews === 'true';

    let rows;
    if (includeInterviews) {
      rows = await model.listExitsWithInterviews(church_id, { offset, limit, search, fromDate, toDate });
    } else {
      rows = await model.listExits(church_id, { offset, limit, search, fromDate, toDate });
    }

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to list exits' });
  }
}

export async function getExit(req, res) {
  try {
    const church_id = getChurchId(req);
    const id = req.params.id;
    if (!church_id) return res.status(400).json({ error: 'Missing church_id' });

    const row = await model.getExitById(church_id, id);
    if (!row) return res.status(404).json({ error: 'Exit not found' });
    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to get exit' });
  }
}

export async function createExit(req, res) {
  try {
    const church_id = getChurchId(req);
    const created_by = getUserId(req);
    if (!church_id) return res.status(400).json({ error: 'Missing church_id' });

    const {
      member_id, exit_type, exit_reason, exit_date, processed_by = null,
      is_suggestion = false, suggestion_trigger = null, notes = null
    } = req.body || {};

    if (!member_id) return res.status(400).json({ error: 'member_id is required' });

    // prevent duplicate active exit
    const exists = await model.activeExitExists(church_id, member_id);
    if (exists && !is_suggestion) {
      return res.status(409).json({ error: 'Active exit already exists for this member' });
    }

    // Use DB transaction to keep exit + member updates atomic
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const exitRow = await model.createExit({
        client,
        church_id,
        member_id,
        exit_type,
        exit_reason,
        exit_date: exit_date ? new Date(exit_date) : new Date(),
        processed_by,
        is_suggestion,
        suggestion_trigger,
        notes,
        created_by
      });

      // update member status based on exit type (may be inactive, deceased, moved, transferred, etc.)
      const exitMember = await memberModel.markMemberInactive({
        client,
        church_id,
        member_id,
        exit_id: exitRow?.id ?? null,
        exit_date: exitRow?.exit_date ?? (exit_date ? new Date(exit_date) : new Date()),
        reason: exit_reason,
        updated_by: created_by,
        status_name: exit_type
      });

      if (!exitMember) {
        await client.query('ROLLBACK');
        client.release();
        console.error('[createExit] FAILED: Member status could not be updated', { member_id, exit_type, church_id });
        return res.status(500).json({ error: 'Exit created but member status could not be updated. Please try again.' });
      }

      console.debug('[createExit] member status updated based on exit type', { member_id: exitMember.id, status_id: exitMember.member_status_id, exit_type });

      // optional domain cleanup: end mentorships, handle milestones, remove from groups
      // Implementations should be idempotent and accept client
      await mentorshipModel.endAllAssignmentsForMember?.({
        client,
        church_id,
        member_id,
        reason: 'member_exited',
        updated_by: created_by
      }).catch(() => null);

      await milestoneModel.handleMemberExit?.({
        client,
        church_id,
        member_id,
        exit_id: exitRow?.id ?? null
      }).catch(() => null);

      await client.query('COMMIT');

      res.status(201).json(exitRow);

      // best-effort notification about new inactive exit (do not block)
      (async () => {
        try {
          const user_id = req.user?.userId ?? req.user?.id ?? null;
          const title = 'Inactive exit recorded';
          const message = `Exit recorded for member ${member_id}${exitRow?.exit_reason ? ` (${exitRow.exit_reason})` : ''}.`;
          const metadata = { action: 'inactive_exit_created', exit_id: exitRow?.id ?? null, member_id };
          const link = `/exits/${exitRow?.id ?? ''}`;

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

          const io = getIO();
          if (io) {
            if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
            if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
            if (member_id) io.to(`member:${member_id}`).emit('notification', notification);
            if (member_id) io.to(`member:${member_id}`).emit('member:exited', { member_id, exit_id: exitRow?.id ?? null });
            if (church_id) io.to(`church:${church_id}`).emit('member:exited', { member_id, exit_id: exitRow?.id ?? null });
          }
        } catch (nErr) {
          console.warn('Failed to create notification for createExit', nErr?.message || nErr);
        }
      })();

      return;
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => null);
      client.release();
      throw txErr;
    } finally {
      try { client.release(); } catch (e) {}
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to create exit' });
  }
}

export async function updateExit(req, res) {
  try {
    const church_id = getChurchId(req);
    const updated_by = getUserId(req);
    const id = req.params.id;
    if (!church_id) return res.status(400).json({ error: 'Missing church_id' });

    const patch = req.body || {};
    const updated = await model.updateExit({ church_id, id, patch, updated_by });
    res.json(updated);

    // best-effort notification about exit update
    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const memberId = updated?.member_id ?? patch.member_id ?? null;
        const title = 'Inactive exit updated';
        const message = `Exit ${id} was updated${memberId ? ` for member ${memberId}` : ''}.`;
        const metadata = { action: 'inactive_exit_updated', exit_id: id };
        const link = `/exits/${id}`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: memberId,
          user_id,
          title,
          message,
          channel: 'inapp',
          metadata,
          link
        });

        const io = getIO();
        if (io) {
          if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
          if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
          if (memberId) io.to(`member:${memberId}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for updateExit', nErr?.message || nErr);
      }
    })();
    return;
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to update exit' });
  }
}

export async function deleteExit(req, res) {
  try {
    const church_id = getChurchId(req);
    const updated_by = getUserId(req);
    const id = req.params.id;
    if (!church_id) return res.status(400).json({ error: 'Missing church_id' });

    const deleted = await model.softDeleteExit(church_id, id, updated_by);
    if (!deleted) return res.status(404).json({ error: 'Exit not found' });
    res.json(deleted);

    // best-effort notification about exit deletion
    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const memberId = deleted?.member_id ?? null;
        const title = 'Inactive exit removed';
        const message = `Exit ${id} was removed${memberId ? ` for member ${memberId}` : ''}.`;
        const metadata = { action: 'inactive_exit_deleted', exit_id: id };
        const link = memberId ? `/members/${memberId}` : `/exits`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: memberId,
          user_id,
          title,
          message,
          channel: 'inapp',
          metadata,
          link
        });

        const io = getIO();
        if (io) {
          if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
          if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
          if (memberId) io.to(`member:${memberId}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for deleteExit', nErr?.message || nErr);
      }
    })();
    return;
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to delete exit' });
  }
}

export async function reinstate(req, res) {
  try {
    const church_id = getChurchId(req);
    const reinstated_by = getUserId(req);
    const id = req.params.id;
    console.debug('[reinstate] incoming', { user: req.user, church_id, id, reinstated_by });
    if (!church_id) return res.status(400).json({ error: 'Missing church_id' });

    // Use transaction to reinstate exit and update member atomically
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const reinstated = await model.reinstateMember({
        client,
        church_id,
        id,
        reinstated_by
      });
      console.debug('[reinstate] reinstated result', { reinstated });

      if (!reinstated) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ error: 'Exit not found or could not reinstate' });
      }

      // restore member to active status
      console.debug('[reinstate] restoring member to active status', { member_id: reinstated.member_id, church_id, reinstated_by });
      const updatedMember = await memberModel.reinstateMemberStatus({
        client,
        church_id,
        member_id: reinstated.member_id,
        reinstated_by,
      });

      if (!updatedMember) {
        await client.query('ROLLBACK');
        client.release();
        console.error('[reinstate] FAILED: Member status could not be restored to active', { member_id: reinstated.member_id, church_id });
        return res.status(500).json({ error: 'Exit reinstated but member status update failed. Please try again.' });
      }

      console.debug('[reinstate] member successfully restored to active', { member_id: updatedMember.id, status_id: updatedMember.member_status_id });

      // optional domain restore: reinstate mentorships, milestones etc.
      await mentorshipModel.reinstateAssignmentsForMember?.({
        client,
        church_id,
        member_id: reinstated.member_id,
        reinstated_by
      }).catch(() => null);

      await milestoneModel.handleMemberReinstate?.({
        client,
        church_id,
        member_id: reinstated.member_id
      }).catch(() => null);

      await client.query('COMMIT');

      res.json(reinstated);

      // best-effort notification about reinstatement
      (async () => {
        try {
          const user_id = req.user?.userId ?? req.user?.id ?? null;
          const memberId = reinstated?.member_id ?? null;
          const title = 'Member reinstated';
          const message = `Member ${memberId ?? ''} was reinstated from exit ${id}.`;
          const metadata = { action: 'inactive_exit_reinstated', exit_id: id, member_id: memberId };
          const link = memberId ? `/members/${memberId}` : `/exits/${id}`;

          const notification = await notificationModel.createNotification({
            church_id,
            member_id: memberId,
            user_id,
            title,
            message,
            channel: 'inapp',
            metadata,
            link
          });

          const io = getIO();
          if (io) {
            if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
            if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
            if (memberId) io.to(`member:${memberId}`).emit('notification', notification);
            if (memberId) io.to(`member:${memberId}`).emit('member:reinstated', { member_id: memberId, exit_id: id });
            if (church_id) io.to(`church:${church_id}`).emit('member:reinstated', { member_id: memberId, exit_id: id });
          }
        } catch (nErr) {
          console.warn('Failed to create notification for reinstate', nErr?.message || nErr);
        }
      })();

      return;
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => null);
      client.release();
      throw txErr;
    } finally {
      try { client.release(); } catch (e) {}
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to reinstate member' });
  }
}

// Bulk operations
export async function bulkDelete(req, res) {
  try {
    const church_id = getChurchId(req);
    const updated_by = getUserId(req);
    const { ids } = req.body;
    if (!church_id) return res.status(400).json({ error: 'Missing church_id' });
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });

    const deleted = await model.bulkDeleteExits(church_id, ids, updated_by);
    res.json({ deleted: deleted.length, ids: deleted.map(d => d.id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to bulk delete exits' });
  }
}

export async function bulkReinstate(req, res) {
  try {
    const church_id = getChurchId(req);
    const reinstated_by = getUserId(req);
    const { ids } = req.body;
    if (!church_id) return res.status(400).json({ error: 'Missing church_id' });
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });

    // Use transaction for bulk reinstatement
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const reinstated = await model.bulkReinstateExits(church_id, ids, reinstated_by);

      // Bulk update member statuses
      for (const exit of reinstated) {
        await memberModel.reinstateMemberStatus({
          client,
          church_id,
          member_id: exit.member_id,
          reinstated_by,
        });

        // Restore mentorships and milestones
        await mentorshipModel.reinstateAssignmentsForMember?.({
          client,
          church_id,
          member_id: exit.member_id,
          reinstated_by
        }).catch(() => null);

        await milestoneModel.handleMemberReinstate?.({
          client,
          church_id,
          member_id: exit.member_id
        }).catch(() => null);
      }

      await client.query('COMMIT');

      res.json({ reinstated: reinstated.length, ids: reinstated.map(r => r.id) });

      // Bulk notifications
      (async () => {
        for (const exit of reinstated) {
          try {
            const user_id = req.user?.userId ?? req.user?.id ?? null;
            const memberId = exit.member_id;
            const title = 'Member reinstated';
            const message = `Member ${memberId} was reinstated from exit ${exit.id}.`;
            const metadata = { action: 'inactive_exit_bulk_reinstated', exit_id: exit.id, member_id: memberId };

            const notification = await notificationModel.createNotification({
              church_id,
              member_id: memberId,
              user_id,
              title,
              message,
              channel: 'inapp',
              metadata,
              link: `/members/${memberId}`
            });

            const io = getIO();
            if (io) {
              if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
              if (memberId) io.to(`member:${memberId}`).emit('notification', notification);
              if (memberId) io.to(`member:${memberId}`).emit('member:reinstated', { member_id: memberId, exit_id: exit.id });
              if (church_id) io.to(`church:${church_id}`).emit('member:reinstated', { member_id: memberId, exit_id: exit.id });
            }
          } catch (nErr) {
            console.warn('Failed to create notification for bulk reinstate', nErr?.message || nErr);
          }
        }
      })();

    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => null);
      client.release();
      throw txErr;
    } finally {
      try { client.release(); } catch (e) {}
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to bulk reinstate exits' });
  }
}

// Statistics
export async function getStatistics(req, res) {
  try {
    const church_id = getChurchId(req);
    if (!church_id) return res.status(400).json({ error: 'Missing church_id' });

    const fromDate = req.query.fromDate || null;
    const toDate = req.query.toDate || null;

    const stats = await model.getExitStatistics(church_id, fromDate, toDate);
    res.json(stats);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to get exit statistics' });
  }
}

// Data integrity functions
export async function findInconsistent(req, res) {
  try {
    const church_id = getChurchId(req);
    if (!church_id) return res.status(400).json({ error: 'Missing church_id' });

    const inconsistencies = await model.findInconsistentExits(church_id);
    res.json(inconsistencies);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to find inconsistent exits' });
  }
}

export async function fixInconsistent(req, res) {
  try {
    const church_id = getChurchId(req);
    const updated_by = getUserId(req);
    const { exit_id } = req.body;
    if (!church_id) return res.status(400).json({ error: 'Missing church_id' });
    if (!exit_id) return res.status(400).json({ error: 'exit_id is required' });

    const fixed = await model.fixInconsistentExit(church_id, exit_id, updated_by);
    res.json(fixed);

    // Notification
    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Exit record consistency fixed';
        const message = `Exit ${exit_id} for member ${fixed.member_id} was marked as reinstated to fix data inconsistency.`;
        const metadata = { action: 'exit_consistency_fixed', exit_id, member_id: fixed.member_id };

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: fixed.member_id,
          user_id,
          title,
          message,
          channel: 'inapp',
          metadata,
          link: `/exits/${exit_id}`
        });

        const io = getIO();
        if (io) {
          if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
          if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for fixInconsistent', nErr?.message || nErr);
      }
    })();

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to fix inconsistent exit' });
  }
}

export async function getMemberHistory(req, res) {
  try {
    const church_id = getChurchId(req);
    const member_id = parseInt(req.params.memberId);
    if (!church_id) return res.status(400).json({ error: 'Missing church_id' });

    const history = await model.getExitHistoryForMember(church_id, member_id);
    res.json(history);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to get member exit history' });
  }
}