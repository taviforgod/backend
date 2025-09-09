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
  uploadProfilePhotoCtrl
} from '../controllers/memberController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

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
    if (!['email', 'contact_primary', 'phone'].includes(field)) {
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

// Get a single member
router.get(
  '/:id',
  authenticateToken,
  requirePermission('view_members'),
  getMemberCtrl
);

// Create a member (JSON only)
router.post(
  '/',
  authenticateToken,
  requirePermission('create_member'),
  express.json(),
  createMemberCtrl
);

// Update a member (JSON only)
router.put(
  '/:id',
  authenticateToken,
  requirePermission('update_member'),
  express.json(),
  updateMemberCtrl
);

// Delete a member
router.delete(
  '/:id',
  authenticateToken,
  requirePermission('delete_member'),
  deleteMemberCtrl
);

// Export members as CSV
router.get(
  '/export',
  authenticateToken,
  requirePermission('view_members'),
  exportMembersCtrl
);

// Bulk import members from CSV
router.post(
  '/import',
  authenticateToken,
  requirePermission('create_member'),
  ...importMembersCtrl  // Spread array with multer + handler
);

// Profile photo upload
router.post(
  '/:id/profile-photo',
  authenticateToken,
  requirePermission('update_member'),
  ...uploadProfilePhotoCtrl  // Spread array with multer + handler
);



export default router;
