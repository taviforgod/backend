import * as userModel from '../models/userModel.js';
import bcrypt from 'bcrypt';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';

export const getProfile = async (req, res) => {
  try {
    

    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await userModel.getUserById(req.user.userId); // Changed from req.user.id to req.user.userId
    if (!user) {
      return res.status(404).json({ 
        message: 'Profile not found',
        debug: process.env.NODE_ENV === 'development' ? `User ID: ${req.user.userId}` : undefined
      });
    }

    // Get user roles and permissions
    const roles = await userModel.getUserRoles(user.id);
    const permissions = await userModel.getUserPermissions(user.id);
    const role = roles.length > 0 ? roles[0].name : 'member';

    // Format response consistently
    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      email_verified: !!user.is_email_verified,
      phone_verified: !!user.is_phone_verified,
      church_id: user.church_id,
      status: user.status || 'active',
      locked: !!user.locked,
      roles: roles.map(r => r.name),
      role,
      permissions 
    };

    return res.json(profile);

  } catch (err) {
    console.error('getProfile error:', err);
    return res.status(500).json({ 
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { search, status, role } = req.query;
    const users = await userModel.searchUsers({
      search,
      status,
      role,
      church_id: req.user.church_id
    });
    return res.json(users);
  } catch (err) {
    console.error('searchUsers error:', err);
    return res.status(500).json({ message: 'Failed to search users' });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const stats = await userModel.getUserStats(req.user.church_id);
    return res.json(stats);
  } catch (err) {
    console.error('getUserStats error:', err);
    return res.status(500).json({ message: 'Failed to get user stats' });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await userModel.getUsersWithRoles(req.user.church_id);
    return res.json(users);
  } catch (err) {
    console.error('getUsers error:', err);
    return res.status(500).json({ message: 'Failed to fetch users' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userModel.createUser({
      name,
      email,
      phone,
      passwordHash,
      church_id: req.user.church_id
    });
    res.status(201).json(user);

    // best-effort notification (non-blocking)
    (async () => {
      try {
        const church_id = req.user?.church_id ?? null;
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'User created';
        const message = `User "${user?.name || user?.email || 'New user'}" was created.`;
        const metadata = { action: 'user_created', user_id: user?.id ?? null };
        const link = `/users/${user?.id ?? ''}`;

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
        console.warn('Failed to create notification for createUser', nErr?.message || nErr);
      }
    })();
    return;
  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ message: 'Failed to create user' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fields = {};
    // Only allow updating these fields
    ['name', 'email', 'phone'].forEach(field => {
      if (field in req.body) fields[field] = req.body[field];
    });
    
    const updated = await userModel.updateUserById(id, fields);
    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(updated);

    (async () => {
      try {
        const church_id = req.user?.church_id ?? null;
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'User updated';
        const message = `User "${updated?.name || id}" was updated.`;
        const metadata = { action: 'user_updated', user_id: id };
        const link = `/users/${id}`;

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
        console.warn('Failed to create notification for updateUser', nErr?.message || nErr);
      }
    })();
    return;
  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ message: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await userModel.deleteUserById(Number(req.params.id));
    res.json({ success: true });

    (async () => {
      try {
        const church_id = req.user?.church_id ?? null;
        const actor_id = req.user?.userId ?? req.user?.id ?? null;
        const deletedUserId = Number(req.params.id);
        const title = 'User deleted';
        const message = `User ${deletedUserId} was deleted.`;
        const metadata = { action: 'user_deleted', user_id: deletedUserId };
        const link = '/users';

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: null,
          user_id: actor_id,
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
        console.warn('Failed to create notification for deleteUser', nErr?.message || nErr);
      }
    })();
    return;
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ message: 'Failed to delete user' });
  }
};

export const activateUser = async (req, res) => {
  try {
    await userModel.activateUserById(Number(req.params.id));
    res.json({ success: true });

    (async () => {
      try {
        const church_id = req.user?.church_id ?? null;
        const actor_id = req.user?.userId ?? req.user?.id ?? null;
        const uid = Number(req.params.id);
        const title = 'User activated';
        const message = `User ${uid} was activated.`;
        const metadata = { action: 'user_activated', user_id: uid };
        const link = `/users/${uid}`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: null,
          user_id: actor_id,
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
        console.warn('Failed to create notification for activateUser', nErr?.message || nErr);
      }
    })();
    return;
  } catch (err) {
    console.error('activateUser error:', err);
    return res.status(500).json({ message: 'Failed to activate user' });
  }
};

export const deactivateUser = async (req, res) => {
  try {
    await userModel.deactivateUserById(Number(req.params.id));
    res.json({ success: true });

    (async () => {
      try {
        const church_id = req.user?.church_id ?? null;
        const actor_id = req.user?.userId ?? req.user?.id ?? null;
        const uid = Number(req.params.id);
        const title = 'User deactivated';
        const message = `User ${uid} was deactivated.`;
        const metadata = { action: 'user_deactivated', user_id: uid };
        const link = `/users/${uid}`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: null,
          user_id: actor_id,
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
        console.warn('Failed to create notification for deactivateUser', nErr?.message || nErr);
      }
    })();
    return;
  } catch (err) {
    console.error('deactivateUser error:', err);
    return res.status(500).json({ message: 'Failed to deactivate user' });
  }
};

export const lockUser = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid user id' });

  try {
    // ensure user exists
    const user = await userModel.getUserById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await userModel.lockUserById(id);
    res.json({ success: true });

    (async () => {
      try {
        const church_id = req.user?.church_id ?? null;
        const actor_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'User locked';
        const message = `User ${id} account was locked.`;
        const metadata = { action: 'user_locked', user_id: id };
        const link = `/users/${id}`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: null,
          user_id: actor_id,
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
        console.warn('Failed to create notification for lockUser', nErr?.message || nErr);
      }
    })();
    return;
  } catch (err) {
    console.error('lockUser error:', err);
    return res.status(500).json({
      message: 'Failed to lock user',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const unlockUser = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid user id' });

  try {
    const user = await userModel.getUserById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await userModel.unlockUserById(id);
    res.json({ success: true });
  } catch (err) {
    console.error('unlockUser error:', err);
    return res.status(500).json({
      message: 'Failed to unlock user',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    await userModel.changeUserPasswordById(Number(req.params.id), password);
    return res.json({ success: true });
  } catch (err) {
    console.error('changePassword error:', err);
    return res.status(500).json({ message: 'Failed to change password' });
  }
};

export const bulkDeleteUsers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }
    const deleted = await userModel.bulkDeleteUsers(ids, req.user.church_id);
    return res.json({ deleted });
  } catch (err) {
    console.error('bulkDeleteUsers error:', err);
    return res.status(500).json({ message: 'Failed to delete users' });
  }
};

export const bulkActivateUsers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }
    const activated = await userModel.bulkActivateUsers(ids, req.user.church_id);
    return res.json({ activated });
  } catch (err) {
    console.error('bulkActivateUsers error:', err);
    return res.status(500).json({ message: 'Failed to activate users' });
  }
};

export const bulkDeactivateUsers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }
    const deactivated = await userModel.bulkDeactivateUsers(ids, req.user.church_id);
    return res.json({ deactivated });
  } catch (err) {
    console.error('bulkDeactivateUsers error:', err);
    return res.status(500).json({ message: 'Failed to deactivate users' });
  }
};

export const getUserRolesHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid user id' });

    const roles = await userModel.getUserRoles(id);
    // return array of role objects { id, name, ... }
    return res.json(Array.isArray(roles) ? roles : []);
  } catch (err) {
    console.error('getUserRoles error:', err);
    return res.status(500).json({ message: 'Failed to fetch roles' });
  }
};

export const assignRoleHandler = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const roleId = Number(req.body.role_id ?? req.body.roleId ?? req.body.id);
    if (!Number.isFinite(userId) || !Number.isFinite(roleId)) {
      return res.status(400).json({ message: 'Invalid user or role id' });
    }

    await userModel.assignRole(userId, roleId);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('assignRole error:', err);
    return res.status(500).json({ message: 'Failed to assign role' });
  }
};

export const removeRoleHandler = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const roleId = Number(req.params.roleId ?? req.body.role_id ?? req.body.roleId);
    if (!Number.isFinite(userId) || !Number.isFinite(roleId)) {
      return res.status(400).json({ message: 'Invalid user or role id' });
    }

    await userModel.removeRole(userId, roleId);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('removeRole error:', err);
    return res.status(500).json({ message: 'Failed to remove role' });
  }
};