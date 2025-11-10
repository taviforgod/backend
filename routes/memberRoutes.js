import express from 'express';
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
import { checkDuplicateField } from '../models/memberModel.js';  // ✅ import from model

const router = express.Router();

// List all members
router.get(
  '/',
  authenticateToken,
  requirePermission('view_members'),
  listMembers
);

// Search members
router.get(
  '/search',
  authenticateToken,
  requirePermission('view_members'),
  searchMembersCtrl
);

// Check for duplicate email/phone
router.get(
  '/check-duplicate',
  authenticateToken,
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

// Leaders route
router.get(
  '/leaders',
  authenticateToken,
  requirePermission('view_members'),
  getLeadersByRoleCtrl
);

// Get single member
router.get(
  '/:id',
  authenticateToken,
  requirePermission('view_members'),
  getMemberCtrl
);

// Create member
router.post(
  '/',
  authenticateToken,
  requirePermission('create_member'),
  express.json(),
  createMemberCtrl
);

// Update member
router.put(
  '/:id',
  authenticateToken,
  requirePermission('update_member'),
  express.json(),
  updateMemberCtrl
);

// Delete member
router.delete(
  '/:id',
  authenticateToken,
  requirePermission('delete_member'),
  deleteMemberCtrl
);

// Export members
router.get(
  '/export',
  authenticateToken,
  requirePermission('view_members'),
  exportMembersCtrl
);

// Import members
router.post(
  '/import',
  authenticateToken,
  requirePermission('create_member'),
  ...importMembersCtrl
);

// Upload profile photo
router.post(
  '/:id/profile-photo',
  authenticateToken,
  requirePermission('update_member'),
  ...uploadProfilePhotoCtrl
);

export default router;
