import express from 'express';
import db from '../config/db.js';
import {
  listMembers,
  getMemberCtrl,
  createMemberCtrl,
  updateMemberCtrl,
  deleteMemberCtrl,
  searchMembersCtrl,
  exportMembersCtrl,
  importMembersCtrl,
  uploadProfilePhotoCtrl,
  getLeadersByRoleCtrl
} from '../controllers/memberController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import { checkDuplicateField } from '../models/memberModel.js';

const router = express.Router();

router.use(authenticateToken);

// --- Custom /leaders endpoint ---
router.get('/leaders', requirePermission('view_members'), async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const role = req.query.role;
    const limit = Number(req.query.limit) || 200;

    let q, vals;
    if (role) {
      const names = role.split(',').map(s => s.trim().toLowerCase());
      q = `SELECT DISTINCT m.* FROM members m JOIN users u ON (u.id = m.user_id OR LOWER(u.email) = LOWER(m.email) OR u.phone = m.contact_primary) JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id WHERE m.church_id = $1 AND LOWER(r.name) = ANY($2::text[]) LIMIT $3`;
      vals = [church_id, names, limit];
    } else {
      q = `SELECT * FROM members WHERE church_id = $1 LIMIT $2`;
      vals = [church_id, limit];
    }

    const result = await db.query(q, vals);
    res.json(result.rows);
  } catch (err) {
    console.error('leaders endpoint error', err);
    res.status(500).json({ error: 'Failed to fetch leaders' });
  }
});

// --- Custom /search endpoint ---
router.get('/search', requirePermission('view_members'), async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const q = req.query.q || '';
    if (!q || q.length < 2) return res.json([]);
    const like = `%${q}%`;
    const sql = `SELECT * FROM members WHERE church_id = $1 AND (LOWER(first_name) LIKE LOWER($2) OR LOWER(surname) LIKE LOWER($2) OR LOWER(email) LIKE LOWER($2) OR contact_primary LIKE $2) LIMIT 200`;
    const result = await db.query(sql, [church_id, like]);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Search failed' }); }
});

// List all members
router.get(
  '/',
  requirePermission('view_members'),
  listMembers
);

// Check for duplicate email/phone
router.get(
  '/check-duplicate',
  requirePermission('create_member'),
  async (req, res) => {
    const { field, value } = req.query;
    const church_id = req.user?.church_id;
    if (!['email', 'phone'].includes(field)) {
      return res.status(400).json({ error: 'Invalid field' });
    }
    if (!church_id) {
      return res.status(400).json({ error: 'Church not specified' });
    }
    try {
      const exists = await checkDuplicateField(field, value, church_id);
      res.json({ exists });
    } catch (err) {
      res.status(500).json({ error: 'Failed to check duplicate' });
    }
  }
);

// Get single member
router.get(
  '/:id',
  requirePermission('view_members'),
  getMemberCtrl
);

// Create member
router.post(
  '/',
  requirePermission('create_member'),
  express.json(),
  createMemberCtrl
);

// Update member
router.put(
  '/:id',
  requirePermission('update_member'),
  express.json(),
  updateMemberCtrl
);

// Delete member
router.delete(
  '/:id',
  requirePermission('delete_member'),
  deleteMemberCtrl
);

// Export members
router.get(
  '/export',
  requirePermission('view_members'),
  exportMembersCtrl
);

// Import members
router.post(
  '/import',
  requirePermission('create_member'),
  ...importMembersCtrl
);

// Upload profile photo
router.post(
  '/:id/profile-photo',
  requirePermission('update_member'),
  ...uploadProfilePhotoCtrl
);

export default router;
