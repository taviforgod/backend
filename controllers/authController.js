import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import {
  createUser,
  getUserByEmail,
  getUserByPhone,
  getUserById,
  setPhoneVerified,
  updatePassword,
  assignRole
} from '../models/userModel.js';
import { sendOTP, verifyOTP } from '../utils/otpUtils.js';

const jwtSecret = process.env.JWT_SECRET || 'supersecret';

// Centralized cookie options for Safari/Chrome/Firefox compatibility
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'None',
  maxAge: 2 * 60 * 60 * 1000 // 2 hours
};

export const register = async (req, res) => {
  const { name, email, phone, password, church_id } = req.body;
  if (!name || !password || !church_id) return res.status(400).json({ message: 'Missing fields' });
  if (!email && !phone) return res.status(400).json({ message: 'Email or phone is required' });

  // Normalize
  const normalizedEmail = email ? email.trim().toLowerCase() : null;
  const normalizedPhone = phone ? phone.trim() : null;

  // Check for existing user by email or phone
  let existing = null;
  if (normalizedEmail) existing = await getUserByEmail(normalizedEmail);
  if (!existing && normalizedPhone) existing = await getUserByPhone(normalizedPhone);
  if (existing) return res.status(400).json({ message: 'User exists' });

  // Check if this is the first user for the church
  const { rows: userCountRows } = await db.query('SELECT COUNT(*) FROM users WHERE church_id = $1', [church_id]);
  const userCount = parseInt(userCountRows[0].count, 10);

  // For all users except the first, require member record
  if (userCount > 0) {
    let memberRows = [];
    if (normalizedEmail) {
      const { rows } = await db.query(
        'SELECT id FROM members WHERE LOWER(email) = $1 AND church_id = $2',
        [normalizedEmail, church_id]
      );
      memberRows = rows;
    }
    if (memberRows.length === 0 && normalizedPhone) {
      const { rows } = await db.query(
        'SELECT id FROM members WHERE contact_primary = $1 AND church_id = $2',
        [normalizedPhone, church_id]
      );
      memberRows = rows;
    }
    if (memberRows.length === 0) {
      return res.status(400).json({ message: 'You must be a registered member to create a user account.' });
    }
  }

  // Proceed to create user...
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser({ name, email: normalizedEmail, phone: normalizedPhone, passwordHash, church_id });

  // If not first user, link user to member
  if (userCount > 0) {
    let memberRows = [];
    if (normalizedEmail) {
      const { rows } = await db.query(
        'SELECT id FROM members WHERE LOWER(email) = $1 AND church_id = $2',
        [normalizedEmail, church_id]
      );
      memberRows = rows;
    }
    if (memberRows.length === 0 && normalizedPhone) {
      const { rows } = await db.query(
        'SELECT id FROM members WHERE contact_primary = $1 AND church_id = $2',
        [normalizedPhone, church_id]
      );
      memberRows = rows;
    }
    if (memberRows.length > 0) {
      await db.query('UPDATE members SET user_id = $1 WHERE id = $2', [user.id, memberRows[0].id]);
    }
  }

  // Get the admin role id (by name)
  const adminRoleRes = await db.query('SELECT id FROM roles WHERE name = $1', ['admin']);
  const adminRoleId = adminRoleRes.rows[0]?.id;

  // Get the default role id (by name)
  const defaultRoleRes = await db.query('SELECT id FROM roles WHERE name = $1', ['member']);
  const defaultRoleId = defaultRoleRes.rows[0]?.id;

  if (userCount === 0 && adminRoleId) {
    await assignRole(user.id, adminRoleId);
  } else if (defaultRoleId) {
    await assignRole(user.id, defaultRoleId);
  }

  if (phone) await sendOTP(user.id, phone);
  res.status(201).json({ id: user.id, email: user.email, phone: user.phone });
};

export const login = async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ message: 'Missing credentials' });

  let user = await getUserByEmail(identifier);
  if (!user) user = await getUserByPhone(identifier);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });

  const roleRes = await db.query(
    `SELECT r.name FROM user_roles ur
     JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id = $1 LIMIT 1`,
    [user.id]
  );
  const role = roleRes.rows[0]?.name || 'member';

  // Include church_id in JWT payload
  const token = jwt.sign(
    { userId: user.id, church_id: user.church_id },
    jwtSecret,
    { expiresIn: '2h' }
  );

  // Set the cookie for the JWT token
  res.cookie('token', token, COOKIE_OPTIONS);

  // Return user info including role
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      phone_verified: user.phone_verified,
      church_id: user.church_id,
      role
    },
    token // fallback for Safari when cookies fail
  });
};

export const forgotPassword = async (req, res) => {
  res.json({ message: 'Reset link sent (not implemented)' });
};

export const resetPassword = async (req, res) => {
  res.json({ message: 'Password reset (not implemented)' });
};

export const phoneVerify = async (req, res) => {
  const { userId, code } = req.body;
  const valid = await verifyOTP(userId, code);
  if (!valid) return res.status(400).json({ message: 'Invalid OTP' });
  await setPhoneVerified(userId, true);
  res.json({ message: 'Phone verified' });
};

export const logout = async (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.json({ success: true });
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await getUserById(req.user.userId); // req.user is set by authenticateToken
    if (!user) return res.status(404).json({ message: 'User not found' });

    const roleRes = await db.query(
      `SELECT r.name FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1 LIMIT 1`,
      [user.id]
    );
    const role = roleRes.rows[0]?.name || 'member';

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      phone_verified: user.phone_verified,
      church_id: user.church_id,
      role,
    });
  } catch (err) {
    console.error('getCurrentUser error:', err);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};


