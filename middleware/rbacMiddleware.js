import db from '../config/db.js';

// Directly query permissions for a user based on your schema
async function getUserPermissions(userId) {
  try {
    const res = await db.query(`
      SELECT p.name
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = $1
    `, [userId]);
    return res.rows.map(row => row.name);
  } catch (error) {
    // Optional: log error for debugging
    console.error('Error fetching user permissions:', error);
    throw new Error('Database error while fetching permissions');
  }
}

// Middleware to require a specific permission for the authenticated user
export const requirePermission = (permission) => async (req, res, next) => {
  
  const userId = req.user?.id || req.user?.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: No user ID found' });
  }

  try {
    const permissions = await getUserPermissions(userId);
    
    if (!permissions.includes(permission)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }
    next();
  } catch (err) {
    // Optional: log error for debugging
    console.error('Permission middleware error:', err);
    res.status(500).json({ message: 'Internal server error during permission check', details: err.message });
  }
};

export function requirePermissionOrSelf(permission) {
  return async (req, res, next) => {
    try {
      const actor = req.user;
      if (!actor) return res.status(401).json({ message: 'Not authenticated' });

      const targetId = Number(req.params.id);
      if (!Number.isNaN(targetId) && (actor.id === targetId || actor.userId === targetId)) {
        return next();
      }

      // fall back to regular permission check
      return requirePermission(permission)(req, res, next);
    } catch (err) {
      console.error('requirePermissionOrSelf error', err);
      return res.status(500).json({ message: 'Server error' });
    }
  };
}