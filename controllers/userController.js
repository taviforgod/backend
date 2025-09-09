import { getUserById, getUserRoles as getUserRolesFromDb, assignRole, removeRole, getAllUsers } from '../models/userModel.js';

export const getProfile = async (req, res) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch user's role(s)
    const roles = await getUserRolesFromDb(user.id);
    // Use the first role or default to 'member'
    const role = Array.isArray(roles) && roles.length > 0 ? roles[0].name : 'member';

    res.json({
      ...user,
      email: user.email || null,
      phone: user.phone || null,
      role // <-- add role here
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
  }
};

export const assignRoleToUser = async (req, res) => {
  try {
    await assignRole(req.params.id, req.body.roleId);
    res.json({ message: 'Role assigned' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign role', details: error.message });
  }
};

export const removeRoleFromUser = async (req, res) => {
  try {
    await removeRole(req.params.id, req.body.roleId);
    res.json({ message: 'Role removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove role', details: error.message });
  }
};

export const listUsers = async (req, res) => {
  try {
    // Only list users for the current user's church
    const church_id = req.user?.church_id;
    const users = await getAllUsers(church_id);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
};

export const getUserRoles = async (req, res) => {
  try {
    const roles = await getUserRolesFromDb(req.params.id);
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user roles', details: error.message });
  }
};