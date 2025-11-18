import { Router } from 'express';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getMemberByUserId,
  updateMember,
  updateProfilePhoto,
  syncMemberContactToUser
} from '../models/memberModel.js';
import {
  listMembers,
  searchMembersCtrl,
  getMemberCtrl,
  createMemberCtrl,
  updateMemberCtrl,
  deleteMemberCtrl,
  uploadProfilePhotoCtrl,
  getLeadersByRoleCtrl,
  exportMembersCtrl,
  importMembersCtrl
} from '../controllers/memberController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';

const router = Router();

// Configure multer for profile photo uploads (single definition)
const uploadDir = 'uploads/profiles';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  }
});

// ============ /me routes MUST come BEFORE /:id routes ============

// GET current user's member profile (no permission check - users view their own profile)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const churchId = req.user.church_id;
    const member = await getMemberByUserId(userId, churchId);
    
    if (!member) {
      return res.status(404).json({ error: 'Member profile not found' });
    }
    
    return res.json(member);
  } catch (err) {
    console.error('Error fetching member profile:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// UPDATE current user's member profile (no permission check - users edit their own profile)
router.put('/me', authenticateToken, express.json(), async (req, res) => {
  try {
    const userId = req.user.userId;
    const churchId = req.user.church_id;
    
    const member = await getMemberByUserId(userId, churchId);
    if (!member) {
      return res.status(404).json({ error: 'Member profile not found' });
    }

    // Define editable fields only
    const editableFields = [
      'first_name',
      'surname',
      'date_of_birth',
      'contact_primary',
      'contact_secondary',
      'email',
      'nationality_id',
      'gender_id',
      'marital_status_id',
      'num_children',
      'physical_address',
      'profession',
      'occupation',
      'work_address'
    ];

    const updateData = {};
    for (const field of editableFields) {
      if (req.body && req.body.hasOwnProperty(field) && req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updated = await updateMember(member.id, updateData, churchId);
    
    // Sync contact info to users table if changed
    if (updateData.email || updateData.contact_primary) {
      try {
        await syncMemberContactToUser(member.id, churchId);
      } catch (syncErr) {
        console.warn('Failed to sync contact info:', syncErr.message);
      }
    }

    return res.json({ success: true, member: updated });
  } catch (err) {
    console.error('Error updating member profile:', err);
    if (err.message.includes('No fields to update')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// UPLOAD profile photo (no permission check - users upload their own photo)
router.post('/me/photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const churchId = req.user.church_id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const member = await getMemberByUserId(userId, churchId);
    if (!member) {
      return res.status(404).json({ error: 'Member profile not found' });
    }

    // Rename file with timestamp and original extension
    const ext = path.extname(req.file.originalname);
    const newFilename = `${Date.now()}-${member.id}${ext}`;
    const newPath = path.join(uploadDir, newFilename);
    fs.renameSync(req.file.path, newPath);

    const filePath = `/uploads/profiles/${newFilename}`;
    const updated = await updateProfilePhoto(member.id, churchId, filePath);
    
    return res.json({ success: true, member: updated, photoUrl: filePath });
  } catch (err) {
    console.error('Error uploading profile photo:', err);
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) { }
    }
    return res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// ============ General routes ============

// All members
router.get('/', authenticateToken, requirePermission('view_members'), listMembers);

// Search
router.get('/search', authenticateToken, requirePermission('view_members'), searchMembersCtrl);

// Check duplicates
router.get('/check-duplicate', authenticateToken, requirePermission('create_member'), async (req, res) => {
  const { field, value } = req.query;
  const { church_id } = req.user || {};

  if (!['email', 'phone'].includes(field))
    return res.status(400).json({ error: 'Invalid field' });
  if (!church_id)
    return res.status(400).json({ error: 'Church not specified' });

  try {
    res.json({ exists: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check duplicate' });
  }
});

// Leaders
router.get('/leaders', authenticateToken, requirePermission('view_members'), getLeadersByRoleCtrl);

// Export CSV
router.get('/export', authenticateToken, requirePermission('view_members'), exportMembersCtrl);

// Import CSV
router.post('/import', authenticateToken, requirePermission('create_member'), importMembersCtrl);

// Profile photo upload (existing endpoint for admin)
router.post('/:id/profile-photo', authenticateToken, requirePermission('update_member'), uploadProfilePhotoCtrl);

// ============ CRUD (/:id routes MUST come LAST) ============

router.get('/:id', authenticateToken, requirePermission('view_members'), getMemberCtrl);
router.post('/', authenticateToken, requirePermission('create_member'), createMemberCtrl);
router.put('/:id', authenticateToken, requirePermission('update_member'), updateMemberCtrl);
router.delete('/:id', authenticateToken, requirePermission('delete_member'), deleteMemberCtrl);

export default router;
