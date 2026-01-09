import { getAllPermissions, createPermission, deletePermission, updatePermission } from '../models/permissionModel.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';

export const listPermissions = async (req, res) => {
  res.json(await getAllPermissions());
};

export const createPermissionCtrl = async (req, res) => {
  const row = await createPermission(req.body.name);
  res.status(201).json(row);

  // best-effort notification (non-blocking)
  (async () => {
    try {
      const church_id = req.user?.church_id ?? null;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const title = 'Permission created';
      const message = `Permission "${row?.name ?? req.body.name}" was created.`;
      const metadata = { action: 'permission_created', permission_id: row?.id ?? null };
      const link = `/permissions/${row?.id ?? ''}`;

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
      console.warn('Failed to create notification for createPermissionCtrl', nErr?.message || nErr);
    }
  })();
};

export const updatePermissionCtrl = async (req, res) => {
  const updated = await updatePermission(req.params.id, req.body.name);
  res.json(updated);

  (async () => {
    try {
      const church_id = req.user?.church_id ?? null;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const title = 'Permission updated';
      const message = `Permission "${req.body.name || updated?.name || req.params.id}" was updated.`;
      const metadata = { action: 'permission_updated', permission_id: req.params.id };
      const link = `/permissions/${req.params.id}`;

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
      console.warn('Failed to create notification for updatePermissionCtrl', nErr?.message || nErr);
    }
  })();
};

export const deletePermissionCtrl = async (req, res) => {
  await deletePermission(req.params.id);
  res.status(204).send();

  (async () => {
    try {
      const church_id = req.user?.church_id ?? null;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const title = 'Permission removed';
      const message = `Permission ${req.params.id} was removed.`;
      const metadata = { action: 'permission_deleted', permission_id: req.params.id };
      const link = `/permissions`;

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
      console.warn('Failed to create notification for deletePermissionCtrl', nErr?.message || nErr);
    }
  })();
};