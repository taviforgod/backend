import * as model from '../models/inactiveExitModel.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';

/**
 * Controller for inactive member exits
 * Expects authenticate middleware to set req.user with at least { id, church_id }
 */

const getChurchId = (req) => req.user?.church_id || req.church_id || null;
const getUserId = (req) => req.user?.id || null;

export async function listExits(req, res) {
  try {
    const church_id = getChurchId(req);
    if (!church_id) return res.status(400).json({ error: 'Missing church_id' });

    const offset = parseInt(req.query.offset || '0', 10) || 0;
    const limit = parseInt(req.query.limit || '50', 10) || 50;
    const search = req.query.search || null;
    const fromDate = req.query.fromDate || null;
    const toDate = req.query.toDate || null;

    const rows = await model.listExits(church_id, { offset, limit, search, fromDate, toDate });
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

    const exitRow = await model.createExit({
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

    res.status(201).json(exitRow);

    // best-effort notification about new inactive exit
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
        }
      } catch (nErr) {
        console.warn('Failed to create notification for createExit', nErr?.message || nErr);
      }
    })();
    return;
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
    if (!church_id) return res.status(400).json({ error: 'Missing church_id' });

    const reinstated = await model.reinstateMember(church_id, id, reinstated_by);
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
        }
      } catch (nErr) {
        console.warn('Failed to create notification for reinstate', nErr?.message || nErr);
      }
    })();
    return;
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to reinstate member' });
  }
}