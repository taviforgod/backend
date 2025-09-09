import {
  getAllMembers,
  getMemberById,
  getMemberByEmail,
  getMemberByPhone,
  getMemberByUserId,
  createMember,
  updateMember,
  deleteMember,
  searchMembers,
  exportMembersCSV,
  bulkInsertMembers,
  updateProfilePhoto
} from '../models/memberModel.js';

import multer from 'multer';
import { parse as csvParse } from 'csv-parse/sync';
const upload = multer({ dest: 'uploads/profiles/' });

// List all members
export const listMembers = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const members = await getAllMembers({ church_id });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list members' });
  }
};

// Get a single member
export const getMemberCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const member = await getMemberById(req.params.id, church_id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to get member' });
  }
};

// Create a member
export const createMemberCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const memberData = { ...(req.body || {}), church_id };

    if (memberData.email) {
      const existing = await getMemberByEmail(memberData.email, church_id);
      if (existing) return res.status(409).json({ error: 'Email already exists for a member' });
    }
    if (memberData.phone || memberData.contact_primary) {
      const phone = memberData.phone || memberData.contact_primary;
      const existing = await getMemberByPhone(phone, church_id);
      if (existing) return res.status(409).json({ error: 'Phone already exists for a member' });
    }

    const newMember = await createMember(memberData);
    res.status(201).json(newMember);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create member' });
  }
};

// Update a member (JSON only; do not use multer here)
export const updateMemberCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const id = req.params.id;
    const memberData = req.body;

    if (memberData.email) {
      const existing = await getMemberByEmail(memberData.email, church_id);
      if (existing && existing.id !== Number(id)) {
        return res.status(409).json({ error: 'Email already exists for another member' });
      }
    }
    if (memberData.phone || memberData.contact_primary) {
      const phone = memberData.phone || memberData.contact_primary;
      const existing = await getMemberByPhone(phone, church_id);
      if (existing && existing.id !== Number(id)) {
        return res.status(409).json({ error: 'Phone already exists for another member' });
      }
    }

    const updated = await updateMember(id, memberData, church_id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update member' });
  }
};

// Delete a member
export const deleteMemberCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    await deleteMember(req.params.id, church_id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete member' });
  }
};

// Search members
export const searchMembersCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const q = req.query.q;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    if (!q || q.length < 2) return res.json([]);
    const results = await searchMembers({ q, church_id });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to search members' });
  }
};

// Export members as CSV
export const exportMembersCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const csv = await exportMembersCSV(church_id);
    res.header('Content-Type', 'text/csv');
    res.attachment('members.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to export members' });
  }
};

// Bulk import members from CSV
export const importMembersCtrl = [
  upload.single('file'),
  async (req, res) => {
    try {
      const church_id = req.user?.church_id;
      if (!church_id) return res.status(400).json({ error: 'Church not specified' });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const csv = req.file.buffer ? req.file.buffer.toString() : req.file.path;
      const records = csvParse(csv, { columns: true, skip_empty_lines: true });
      const inserted = await bulkInsertMembers(records, church_id);
      res.json({ inserted: inserted.length });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to import members' });
    }
  }
];

// Profile photo upload (multipart/form-data, file field: profile_photo)
export const uploadProfilePhotoCtrl = [
  upload.single('profile_photo'),
  async (req, res) => {
    try {
      const church_id = req.user?.church_id;
      const memberId = req.params.id;
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      // Ensure path is web-accessible
      const filePath = req.file.path.replace(/\\/g, '/');
      const publicPath = '/' + filePath;

      // Save file path to DB
      const updated = await updateProfilePhoto(memberId, church_id, publicPath);
      res.json({ success: true, profile_photo: publicPath, member: updated });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to upload profile photo' });
    }
  }
];