import db from '../config/db.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';

export const listZones = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name FROM zones WHERE church_id=$1 ORDER BY name ASC',
      [req.user.church_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching zones:', err);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
};

export const createZone = async (req, res) => {
  try {
    const church_id = req.user?.church_id || req.body.church_id;
    if (!church_id) return res.status(400).json({ error: 'church_id required' });
    const name = req.body.name;
    if (!name) return res.status(400).json({ error: 'name required' });

    const { rows } = await db.query(
      'INSERT INTO zones (church_id, name) VALUES ($1, $2) RETURNING *',
      [church_id, name]
    );
    const row = rows[0];
    res.status(201).json(row);

    // best-effort notification (non-blocking)
    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Zone created';
        const message = `Zone "${row?.name || name}" was created.`;
        const metadata = { action: 'zone_created', zone_id: row?.id ?? null };
        const link = `/zones/${row?.id ?? ''}`;

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

        const io = getIO();
        if (io) {
          if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
          if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for createZone', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    console.error('Error creating zone:', err);
    res.status(500).json({ error: 'Failed to create zone' });
  }
};

export const editZone = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const church_id = req.user?.church_id || req.body.church_id;
    const name = req.body.name;
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    if (!church_id) return res.status(400).json({ error: 'church_id required' });
    if (!name) return res.status(400).json({ error: 'name required' });

    const { rows } = await db.query(
      'UPDATE zones SET name=$1 WHERE id=$2 AND church_id=$3 RETURNING *',
      [name, id, church_id]
    );
    const updated = rows[0];
    if (!updated) return res.status(404).json({ error: 'Zone not found' });
    res.json(updated);

    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Zone updated';
        const message = `Zone "${updated?.name || name}" was updated.`;
        const metadata = { action: 'zone_updated', zone_id: id };
        const link = `/zones/${id}`;

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

        const io = getIO();
        if (io) {
          if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
          if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for editZone', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    console.error('Error updating zone:', err);
    res.status(500).json({ error: 'Failed to update zone' });
  }
};

export const removeZone = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const church_id = req.user?.church_id || req.body.church_id;
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    if (!church_id) return res.status(400).json({ error: 'church_id required' });

    const { rows } = await db.query(
      'DELETE FROM zones WHERE id=$1 AND church_id=$2 RETURNING *',
      [id, church_id]
    );
    const deleted = rows[0];
    if (!deleted) return res.status(404).json({ error: 'Zone not found' });
    res.json(deleted);

    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Zone removed';
        const message = `Zone ${id} was removed.`;
        const metadata = { action: 'zone_deleted', zone_id: id };
        const link = `/zones`;

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

        const io = getIO();
        if (io && church_id) io.to(`church:${church_id}`).emit('notification', notification);
      } catch (nErr) {
        console.warn('Failed to create notification for removeZone', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    console.error('Error deleting zone:', err);
    res.status(500).json({ error: 'Failed to delete zone' });
  }
};
