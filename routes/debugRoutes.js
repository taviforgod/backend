import express from 'express';
import db from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Returns permissions for the authenticated user
router.get('/permissions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const q = `
      SELECT p.name
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = $1
    `;
    const r = await db.query(q, [userId]);
    return res.json({ permissions: r.rows.map(row => row.name) });
  } catch (err) {
    console.error('Debug permissions error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Returns whether a given permission exists and which roles have it
router.get('/permission-info', authenticateToken, async (req, res) => {
  try {
    const name = req.query.name || 'manage_exit_mappings';
    const permRes = await db.query('SELECT * FROM permissions WHERE name=$1', [name]);
    const perm = permRes.rows[0] || null;

    const rolesRes = await db.query(
      `SELECT r.name FROM roles r
       JOIN role_permissions rp ON r.id=rp.role_id
       JOIN permissions p ON p.id=rp.permission_id
       WHERE p.name=$1`,
      [name]
    );
    const roles = rolesRes.rows.map(r => r.name);

    return res.json({ permission: perm, roles });
  } catch (err) {
    console.error('Debug permission-info error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
