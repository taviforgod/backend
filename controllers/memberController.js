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
  checkDuplicateField,
  getChurchOverviewStats,
  getMemberStatusByName
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

    // Ensure member has a status (default to 'active' if not specified)
    if (!data.member_status_id) {
      const activeStatus = await getMemberStatusByName?.('active') || null;
      if (activeStatus) {
        data.member_status_id = activeStatus.id;
      }
    }

    const newMember = await createMember(data);
    if (!newMember) {
      return res.status(500).json({ error: 'Failed to create member' });
    }
    
    res.status(201).json(newMember);
    console.debug('[createMember] created new member', { member_id: newMember.id, status_id: newMember.member_status_id });

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
    console.debug('updateMemberCtrl: params=', req.params, 'body=', req.body);
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
    console.debug('updateMemberCtrl: model returned updated.id=', updated?.id);
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

    // Get member details BEFORE deletion for notification
    let memberDisplayName = `Member ${id}`;
    try {
      const member = await getMemberById(id, church_id);
      if (member) {
        memberDisplayName = `${member.first_name} ${member.surname}`.trim();
      }
    } catch (err) {
      console.debug('Could not fetch member details before deletion:', err.message);
    }

    // Create notification BEFORE deleting the member to avoid foreign key constraint issues
    try {
      const adminMemberId = req.user?.member_id ?? req.user?.memberId ?? null;
      const notification = await notificationModel.createNotification({
        church_id,
        member_id: adminMemberId, // Notification for the admin who deleted, not the deleted member
        user_id: req.user?.id ?? req.user?.userId,
        title: 'Member Deleted',
        message: `${memberDisplayName} has been removed from the system`,
        channel: 'inapp',
        metadata: { action: 'member_deleted', deleted_member_id: id },
        link: '/members'
      });
      await emitNotification(notification, church_id);
    } catch (notificationErr) {
      console.error('Failed to create deletion notification:', notificationErr);
      // Don't fail the deletion if notification fails
    }

    // Now delete the member
    await deleteMember(id, church_id);
    res.status(204).end();
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

// Get celebrations (birthdays, anniversaries)
export const getCelebrationsCtrl = async (req, res) => {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    let range = parseInt(req.query.range, 10);
    if (Number.isNaN(range) || range <= 0) range = 7;
    range = Math.min(range, 90); // safety cap

    const { rows } = await db.query(
      `SELECT id, first_name, surname, date_of_birth, date_joined_church, contact_primary AS phone
       FROM members
       WHERE church_id = $1
         AND (date_of_birth IS NOT NULL OR date_joined_church IS NOT NULL)`,
      [church_id]
    );

    // Use UTC-normalized "today" to avoid timezone shifts when comparing dates
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const normalizeNextOccurrence = (srcDate) => {
      if (!srcDate) return null;
      const d = new Date(srcDate);
      if (isNaN(d)) return null;
      // use UTC month/day to avoid local TZ issues
      const month = d.getUTCMonth();
      const day = d.getUTCDate();

      const build = (y) => {
        // handle Feb 29 on non-leap years -> use Mar 1
        if (month === 1 && day === 29) {
          const isLeap = (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0));
          return isLeap ? new Date(Date.UTC(y, month, day)) : new Date(Date.UTC(y, 2, 1));
        }
        return new Date(Date.UTC(y, month, day));
      };

      let year = todayUTC.getUTCFullYear();
      let candidate = build(year); // already at UTC midnight
      if (candidate.getTime() < todayUTC.getTime()) {
        year += 1;
        candidate = build(year);
      }
      return candidate;
    };

    const birthdays = [];
    const anniversaries = [];

    // debug: log how many rows returned by query
    console.debug(`getCelebrationsCtrl: rows returned=${rows.length}, range=${range}`);
    for (const m of rows) {
      if (m.date_of_birth) {
        const nextB = normalizeNextOccurrence(m.date_of_birth);
        if (nextB) {
          const daysAway = Math.round((nextB.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24));
          console.debug(`celebration: id=${m.id} dob=${m.date_of_birth} next=${nextB.toISOString()} daysAway=${daysAway}`);
          if (daysAway <= range) {
            const turning = nextB.getUTCFullYear() - new Date(m.date_of_birth).getUTCFullYear();
            birthdays.push({
              id: m.id,
              first_name: m.first_name,
              surname: m.surname,
              phone: m.phone,
              date: nextB.toISOString().slice(0, 10),
              daysAway,
              turning
            });
          }
        }
      }

      if (m.date_joined_church) {
        const nextA = normalizeNextOccurrence(m.date_joined_church);
        if (nextA) {
          const daysAway = Math.round((nextA.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24));
          console.debug(`celebration: id=${m.id} joined=${m.date_joined_church} next=${nextA.toISOString()} daysAway=${daysAway}`);
          if (daysAway <= range) {
            const years = nextA.getUTCFullYear() - new Date(m.date_joined_church).getUTCFullYear();
            anniversaries.push({
              id: m.id,
              first_name: m.first_name,
              surname: m.surname,
              phone: m.phone,
              date: nextA.toISOString().slice(0, 10),
              daysAway,
              years
            });
          }
        }
      }
    }

    birthdays.sort((a, b) => a.daysAway - b.daysAway);
    anniversaries.sort((a, b) => a.daysAway - b.daysAway);

    res.json({ birthdays, anniversaries });
  } catch (err) {
    console.error('getCelebrationsCtrl error', err);
    res.status(500).json({ error: err.message || 'Failed to fetch celebrations' });
  }
};

// Overview stats
export const getOverviewCtrl = async (req, res) => {
  try {
    const { church_id } = req.user || {};
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const stats = await getChurchOverviewStats(church_id);
    // include any other overview fields you already compute (attendance, giving, etc.)
    return res.json({ data: stats });
  } catch (err) {
    console.error('getOverviewCtrl error', err);
    return res.status(500).json({ error: 'Failed to load overview' });
  }
};

// Member Analytics Endpoints
export async function getMembersSummaryCtrl(req, res) {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const stats = await getChurchOverviewStats(church_id);
    return res.json({
      total_members: stats.members_total || 0,
      active_members: stats.active_members || 0,
      new_members_this_month: stats.new_members_this_month || 0,
      baptisms: stats.baptisms || 0,
      avg_attendance: stats.avg_attendance || 0
    });
  } catch (err) {
    console.error('getMembersSummaryCtrl error', err);
    return res.status(500).json({ error: 'Failed to fetch member summary' });
  }
}

export async function getMembersGenderCtrl(req, res) {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const result = await db.query(
      `SELECT gender, COUNT(*) as count 
       FROM members 
       WHERE church_id = $1 AND gender IS NOT NULL 
       GROUP BY gender`,
      [church_id]
    );
    
    const genderData = result.rows.map(row => ({
      gender: row.gender,
      count: parseInt(row.count)
    }));
    
    return res.json(genderData);
  } catch (err) {
    console.error('getMembersGenderCtrl error', err);
    return res.status(500).json({ error: 'Failed to fetch gender demographics' });
  }
}

export async function getAgeDemographicsCtrl(req, res) {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const result = await db.query(
      `SELECT 
        CASE 
          WHEN age < 18 THEN 'Under 18'
          WHEN age BETWEEN 18 AND 25 THEN '18-25'
          WHEN age BETWEEN 26 AND 35 THEN '26-35'
          WHEN age BETWEEN 36 AND 50 THEN '36-50'
          WHEN age > 50 THEN 'Over 50'
          ELSE 'Unknown'
        END as age_group,
        COUNT(*) as count
       FROM (
         SELECT 
           CASE 
             WHEN date_of_birth IS NOT NULL 
             THEN DATE_PART('year', AGE(NOW(), date_of_birth))
             ELSE NULL
           END as age
         FROM members 
         WHERE church_id = $1 AND date_of_birth IS NOT NULL
       ) aged_members
       WHERE age IS NOT NULL
       GROUP BY age_group
       ORDER BY age_group`,
      [church_id]
    );
    
    const ageData = result.rows.map(row => ({
      age_group: row.age_group,
      count: parseInt(row.count)
    }));
    
    return res.json(ageData);
  } catch (err) {
    console.error('getAgeDemographicsCtrl error', err);
    return res.status(500).json({ error: 'Failed to fetch age demographics' });
  }
}

export async function getGrowthTrendCtrl(req, res) {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const result = await db.query(
      `SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_members
       FROM members 
       WHERE church_id = $1 
         AND created_at >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month ASC`,
      [church_id]
    );
    
    const growthData = result.rows.map(row => ({
      month: row.month,
      new_members: parseInt(row.new_members)
    }));
    
    return res.json(growthData);
  } catch (err) {
    console.error('getGrowthTrendCtrl error', err);
    return res.status(500).json({ error: 'Failed to fetch growth trend' });
  }
}

export async function getUpcomingBirthdaysCtrl(req, res) {
  try {
    const church_id = req.user?.church_id;
    if (!church_id) return res.status(400).json({ error: 'Church not specified' });

    const result = await db.query(
      `SELECT 
        id, first_name, surname, date_of_birth,
        DATE_PART('day', date_of_birth) as day,
        DATE_PART('month', date_of_birth) as month
       FROM members 
       WHERE church_id = $1 
         AND date_of_birth IS NOT NULL
         AND (
           (DATE_PART('day', date_of_birth) = DATE_PART('day', NOW()) 
            AND DATE_PART('month', date_of_birth) = DATE_PART('month', NOW()))
           OR
           (DATE_PART('day', date_of_birth) = DATE_PART('day', NOW() + INTERVAL '7 days') 
            AND DATE_PART('month', date_of_birth) = DATE_PART('month', NOW() + INTERVAL '7 days'))
         )
       ORDER BY 
         DATE_PART('month', date_of_birth), 
         DATE_PART('day', date_of_birth)
       LIMIT 10`,
      [church_id]
    );
    
    const birthdays = result.rows.map(row => ({
      id: row.id,
      first_name: row.first_name,
      surname: row.surname,
      date_of_birth: row.date_of_birth,
      days_until_birthday: row.day === DATE_PART('day', new Date()) && row.month === DATE_PART('month', new Date()) ? 0 : 7
    }));
    
    return res.json(birthdays);
  } catch (err) {
    console.error('getUpcomingBirthdaysCtrl error', err);
    return res.status(500).json({ error: 'Failed to fetch upcoming birthdays' });
  }
}
