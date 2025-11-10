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
  updateProfilePhoto,
  getMembersByUserRole
} from '../models/memberModel.js';

import multer from 'multer';
import { parse as csvParse } from 'csv-parse/sync';
import db from '../config/db.js';
import * as notificationModel from '../models/notificationModel.js';
import { getIO } from '../config/socket.js';
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

    // best-effort notification (do not block response)
    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Member created';
        const message = `${newMember?.first_name || ''} ${newMember?.surname || ''}`.trim() || 'A member was created';
        const metadata = { action: 'member_created', member_id: newMember?.id ?? null };
        const link = `/members/${newMember?.id ?? ''}`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: newMember?.id ?? null,
          user_id,
          title,
          message,
          channel: 'inapp',
          metadata,
          link
        });

        try {
          const io = getIO();
          if (io) {
            if (church_id) io.to(`church:${church_id}`).emit('notification', notification);
            if (notification.user_id) io.to(`user:${notification.user_id}`).emit('notification', notification);
            if (newMember?.id) io.to(`member:${newMember.id}`).emit('notification', notification);
          }
        } catch (emitErr) {
          console.warn('Notification emit failed', emitErr?.message || emitErr);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for createMemberCtrl', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create member' });
  }
};

// Update a member
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

    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Member updated';
        const message = `${updated?.first_name || ''} ${updated?.surname || ''}`.trim() || `Member ${id} updated`;
        const metadata = { action: 'member_updated', member_id: updated?.id ?? id };
        const link = `/members/${updated?.id ?? id}`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: updated?.id ?? id,
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
          if (updated?.id) io.to(`member:${updated.id}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for updateMemberCtrl', nErr?.message || nErr);
      }
    })();
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update member' });
  }
};

// Delete a member
export const deleteMemberCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    const memberId = req.params.id;
    await deleteMember(memberId, church_id);
    res.status(204).end();

    (async () => {
      try {
        const user_id = req.user?.userId ?? req.user?.id ?? null;
        const title = 'Member removed';
        const message = `Member ${memberId} was removed.`;
        const metadata = { action: 'member_deleted', member_id: memberId };
        const link = `/members`;

        const notification = await notificationModel.createNotification({
          church_id,
          member_id: memberId,
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
          if (memberId) io.to(`member:${memberId}`).emit('notification', notification);
        }
      } catch (nErr) {
        console.warn('Failed to create notification for deleteMemberCtrl', nErr?.message || nErr);
      }
    })();
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

// Bulk import members
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

      // best-effort notification about import
      (async () => {
        try {
          const user_id = req.user?.userId ?? req.user?.id ?? null;
          const title = 'Members imported';
          const message = `${inserted.length} member(s) were imported.`;
          const metadata = { action: 'members_imported', count: inserted.length };
          const link = '/members';

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
          console.warn('Failed to create notification for importMembersCtrl', nErr?.message || nErr);
        }
      })();
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to import members' });
    }
  }
];

// Profile photo upload
export const uploadProfilePhotoCtrl = [
  upload.single('profile_photo'),
  async (req, res) => {
    try {
      const church_id = req.user?.church_id;
      const memberId = req.params.id;
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const filePath = req.file.path.replace(/\\/g, '/');
      const publicPath = '/' + filePath;

      const updated = await updateProfilePhoto(memberId, church_id, publicPath);
      res.json({ success: true, profile_photo: publicPath, member: updated });

      (async () => {
        try {
          const user_id = req.user?.userId ?? req.user?.id ?? null;
          const title = 'Profile photo updated';
          const message = `Profile photo updated for member ${memberId}.`;
          const metadata = { action: 'profile_photo_updated', member_id: memberId };
          const link = `/members/${memberId}`;

          const notification = await notificationModel.createNotification({
            church_id,
            member_id: memberId,
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
            if (memberId) io.to(`member:${memberId}`).emit('notification', notification);
          }
        } catch (nErr) {
          console.warn('Failed to create notification for uploadProfilePhotoCtrl', nErr?.message || nErr);
        }
      })();
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to upload profile photo' });
    }
  }
];

// ✅ Leaders by role
export const getLeadersByRoleCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    const role = req.query.role || req.params.role;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });
    if (!role) return res.status(400).json({ error: 'role query required (e.g. ?role=pastor)' });

    // FIX: pass correct parameters
    const rows = await getMembersByUserRole(role, church_id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch leaders' });
  }
};

export const listLeaders = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const { rows } = await db.query(
      `SELECT m.id, m.first_name, m.surname, lr.role, lr.assigned_at
       FROM members m
       JOIN leadership_roles lr ON m.id = lr.member_id
       WHERE lr.church_id = $1
         AND lr.active = TRUE
       ORDER BY m.first_name, m.surname`,
      [church_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching leaders:', err);
    res.status(500).json({ error: 'Failed to fetch leaders' });
  }
};
