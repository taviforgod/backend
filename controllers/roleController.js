import { 
  getAllRoles, 
  createRole, 
  updateRole,
  deleteRole, 
  assignPermission, 
  removePermission, 
  getRolePermissions,
  getPermissionsMatrixData
} from '../models/roleModel.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';

export const listRoles = async (req, res) => {
  res.json(await getAllRoles());
};

export const createRoleCtrl = async (req, res) => {
  const row = await createRole(req.body.name);
  res.status(201).json(row);
  
  // best-effort notification (non-blocking)
  (async () => {
    try {
      const church_id = req.user?.church_id ?? null;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const title = 'Role created';
      const message = `Role "${row?.name ?? req.body.name}" was created.`;
      const metadata = { action: 'role_created', role_id: row?.id ?? null };
      const link = `/roles/${row?.id ?? ''}`;

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
        if (row?.id) io.to(`role:${row.id}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for createRoleCtrl', nErr?.message || nErr);
    }
  })();
};

export const updateRoleCtrl = async (req, res) => {
  const updated = await updateRole(req.params.id, req.body.name);
  res.json(updated);
  
  (async () => {
    try {
      const church_id = req.user?.church_id ?? null;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const title = 'Role updated';
      const message = `Role "${req.body.name || updated?.name || req.params.id}" was updated.`;
      const metadata = { action: 'role_updated', role_id: req.params.id };
      const link = `/roles/${req.params.id}`;

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
        io.to(`role:${req.params.id}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for updateRoleCtrl', nErr?.message || nErr);
    }
  })();
};

export const deleteRoleCtrl = async (req, res) => {
  await deleteRole(req.params.id);
  res.status(204).send();
  
  (async () => {
    try {
      const church_id = req.user?.church_id ?? null;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const title = 'Role removed';
      const message = `Role ${req.params.id} was removed.`;
      const metadata = { action: 'role_deleted', role_id: req.params.id };
      const link = `/roles`;

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
        io.to(`role:${req.params.id}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for deleteRoleCtrl', nErr?.message || nErr);
    }
  })();
};

export const assignPermissionCtrl = async (req, res) => {
  await assignPermission(req.params.id, req.body.permissionId);
  res.json({ message: 'Permission assigned' });
  
  (async () => {
    try {
      const church_id = req.user?.church_id ?? null;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const permId = req.body.permissionId;
      const roleId = req.params.id;
      const title = 'Permission assigned';
      const message = `Permission ${permId} was assigned to role ${roleId}.`;
      const metadata = { action: 'permission_assigned_to_role', role_id: roleId, permission_id: permId };
      const link = `/roles/${roleId}/permissions`;

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
        io.to(`role:${roleId}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for assignPermissionCtrl', nErr?.message || nErr);
    }
  })();
};

export const removePermissionCtrl = async (req, res) => {
  await removePermission(req.params.id, req.body.permissionId);
  res.json({ message: 'Permission removed' });
  
  (async () => {
    try {
      const church_id = req.user?.church_id ?? null;
      const user_id = req.user?.userId ?? req.user?.id ?? null;
      const permId = req.body.permissionId;
      const roleId = req.params.id;
      const title = 'Permission removed';
      const message = `Permission ${permId} was removed from role ${roleId}.`;
      const metadata = { action: 'permission_removed_from_role', role_id: roleId, permission_id: permId };
      const link = `/roles/${roleId}/permissions`;

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
        io.to(`role:${roleId}`).emit('notification', notification);
      }
    } catch (nErr) {
      console.warn('Failed to create notification for removePermissionCtrl', nErr?.message || nErr);
    }
  })();
};

export const getRolePermissionsCtrl = async (req, res) => {
  res.json(await getRolePermissions(req.params.id));
};

export const getPermissionsMatrix = async (req, res) => {
  const matrix = await getPermissionsMatrixData();
  res.json(matrix);
};