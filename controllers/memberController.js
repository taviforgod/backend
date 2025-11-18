import {
  getAllMembers,
  getMemberById,
  getMemberByEmail,
  getMemberByPhone,
  createMember,
  updateMember,
  deleteMember,
  searchMembers,
  exportMembersCSV,
  bulkInsertMembers,
  updateProfilePhoto,
  getMembersByUserRole,
  checkDuplicateField
} from '../models/memberModel.js';

import multer from 'multer';
import { parse as csvParse } from 'csv-parse/sync';
import path from 'path';
import fs from 'fs';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';
import db from '../config/db.js';

// ================= Multer setup =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join('uploads', 'profiles');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `member-${req.params.id || 'new'}-${Date.now()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

export const upload = multer({ storage, fileFilter });

// ================= Helper: emit notifications =================
const emitNotification = async (notification, church_id) => {
  const io = getIO();
  if (!io) return;

  if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
  if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
  if (notification.member_id) io.to(`member:${notification.member_id}`).emit('notification', notification);
};

// ================= Member Controllers =================

// List all members
export const listMembers = async (req, res) => {
  try {
    const { church_id } = req.user || {};
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const members = await getAllMembers({ church_id });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list members' });
  }
};

// Get one member
export const getMemberCtrl = async (req, res) => {
  try {
    const { church_id } = req.user || {};
    console.log('🔍 getMemberCtrl: id=', req.params.id, 'church_id=', church_id);
    
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const member = await getMemberById(req.params.id, church_id);
    console.log('✅ Member found:', member ? `${member.first_name} ${member.surname}` : 'NULL');
    
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) {
    console.error('❌ Error in getMemberCtrl:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Failed to get member' });
  }
};

// Create new member
export const createMemberCtrl = async (req, res) => {
  try {
    const { church_id } = req.user || {};
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const data = { ...req.body, church_id };

    if (data.email) {
      const exists = await getMemberByEmail(data.email, church_id);
      if (exists) return res.status(409).json({ error: 'Email already exists' });
    }
    if (data.phone || data.contact_primary) {
      const phone = data.phone || data.contact_primary;
      const exists = await getMemberByPhone(phone, church_id);
      if (exists) return res.status(409).json({ error: 'Phone already exists' });
    }

    const newMember = await createMember(data);
    res.status(201).json(newMember);

    // Notify
    (async () => {
      const notification = await notificationModel.createNotification({
        church_id,
        member_id: newMember.id,
        user_id: req.user?.id ?? req.user?.userId,
        title: 'Member Created',
        message: `${newMember.first_name ?? ''} ${newMember.surname ?? ''}`.trim(),
        channel: 'inapp',
        metadata: { action: 'member_created', member_id: newMember.id },
        link: `/members/${newMember.id}`
      });
      await emitNotification(notification, church_id);
    })();
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create member' });
  }
};

// Update member
export const updateMemberCtrl = async (req, res) => {
  try {
    const { church_id } = req.user || {};
    const id = req.params.id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    if (!id) return res.status(400).json({ error: 'Member ID required' });

    const data = req.body || {};

    // Only check duplicates if field is being updated
    if (data.email) {
      const exists = await getMemberByEmail(data.email, church_id);
      if (exists && exists.id !== Number(id)) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }
    
    if (data.phone || data.contact_primary) {
      const phone = data.phone || data.contact_primary;
      const exists = await getMemberByPhone(phone, church_id);
      if (exists && exists.id !== Number(id)) {
        return res.status(409).json({ error: 'Phone already exists' });
      }
    }

    const updated = await updateMember(id, data, church_id);
    if (!updated) return res.status(404).json({ error: 'Member not found' });
    
    res.json(updated);

    (async () => {
      const notification = await notificationModel.createNotification({
        church_id,
        member_id: updated.id,
        user_id: req.user?.id ?? req.user?.userId,
        title: 'Member Updated',
        message: `${updated.first_name ?? ''} ${updated.surname ?? ''}`.trim(),
        channel: 'inapp',
        metadata: { action: 'member_updated', member_id: updated.id },
        link: `/members/${updated.id}`
      });
      await emitNotification(notification, church_id);
    })();
  } catch (err) {
    console.error('❌ Error in updateMemberCtrl:', err.message);
    res.status(400).json({ error: err.message || 'Failed to update member' });
  }
};

// Delete member
export const deleteMemberCtrl = async (req, res) => {
  try {
    const { church_id } = req.user || {};
    const id = req.params.id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    await deleteMember(id, church_id);
    res.status(204).end();

    (async () => {
      const notification = await notificationModel.createNotification({
        church_id,
        member_id: id,
        user_id: req.user?.id ?? req.user?.userId,
        title: 'Member Deleted',
        message: `Member ${id} removed`,
        channel: 'inapp',
        metadata: { action: 'member_deleted', member_id: id },
        link: '/members'
      });
      await emitNotification(notification, church_id);
    })();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete member' });
  }
};

// Search members
export const searchMembersCtrl = async (req, res) => {
  try {
    const { church_id } = req.user || {};
    const q = req.query.q;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    if (!q || q.length < 2) return res.json([]);

    const results = await searchMembers({ q, church_id });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to search members' });
  }
};

// Export CSV
export const exportMembersCtrl = async (req, res) => {
  try {
    const { church_id } = req.user || {};
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const csv = await exportMembersCSV(church_id);
    res.header('Content-Type', 'text/csv');
    res.attachment('members.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to export members' });
  }
};

// Import CSV
export const importMembersCtrl = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { church_id } = req.user || {};
      if (!church_id) return res.status(400).json({ error: 'Church not specified' });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const content = req.file.buffer
        ? req.file.buffer.toString()
        : fs.readFileSync(req.file.path, 'utf-8');
      const records = csvParse(content, { columns: true, skip_empty_lines: true });

      const inserted = await bulkInsertMembers(records, church_id);
      res.json({ inserted: inserted.length });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to import members' });
    }
  }
];

// Upload profile photo
export const uploadProfilePhotoCtrl = [
  upload.single('profile_photo'),
  async (req, res) => {
    try {
      const { church_id } = req.user || {};
      const memberId = req.params.id;
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const publicPath = '/' + req.file.path.replace(/\\/g, '/');
      const updated = await updateProfilePhoto(memberId, church_id, publicPath);
      res.json({ success: true, profile_photo: publicPath, member: updated });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to upload photo' });
    }
  }
];

// Leaders by role
export const getLeadersByRoleCtrl = async (req, res) => {
  try {
    const { church_id } = req.user || {};
    const role = req.query.role || req.params.role;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    if (!role) return res.status(400).json({ error: 'Role query required' });

    const leaders = await getMembersByUserRole(role, church_id);
    res.json(leaders);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch leaders' });
  }
};

export async function getLeaders(req, res) {
  try {
    const role = req.query.role;
    let q = `
      SELECT m.id AS member_id, m.first_name, m.surname, m.contact_primary, m.email,
             lr.role, lr.assigned_at, lr.active
      FROM leadership_roles lr
      JOIN members m ON m.id = lr.member_id
      WHERE lr.church_id = $1 AND lr.active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM leadership_alerts la
        WHERE la.church_id = $1 AND la.leader_id = lr.member_id AND la.resolved = FALSE AND la.type IN ('burnout','inactivity')
      )
    `;
    const params = [req.user.church_id];
    if (role) {
      q += ` AND lr.role = $2`;
      params.push(role);
    }
    q += ` ORDER BY m.first_name, m.surname LIMIT 1000`;
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
