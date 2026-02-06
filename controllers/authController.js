import db from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  getUserByEmailOrPhone,
  getUserByEmail,
  getUserById,
  setEmailVerified,
  setPhoneVerified,
  assignDefaultRoleByName,
  updatePassword
} from '../models/userModel.js';
import { sendOTP, verifyOTP } from '../utils/otpUtils.js';
import { getUserZones } from '../utils/zoneUtils.js';

// --- Secrets ---
const jwtSecret = process.env.JWT_SECRET ?? 'supersecret';
const ACCESS_EXPIRES = '15m';         
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// --- Refresh token store ---
const refreshStore = new Map(); // For multi-server use Redis

// --- JWT creation ---
function createAccessToken(userId, church_id) {
  return jwt.sign({ userId, church_id }, jwtSecret, { expiresIn: ACCESS_EXPIRES });
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

function saveRefreshToken(token, userId) {
  const expiresAt = Date.now() + REFRESH_TTL_MS;
  refreshStore.set(token, { userId, expiresAt });
}

function revokeRefreshToken(token) {
  refreshStore.delete(token);
}

function rotateRefreshToken(oldToken, userId) {
  revokeRefreshToken(oldToken);
  const newToken = generateRefreshToken();
  saveRefreshToken(newToken, userId);
  return newToken;
}

function formatUserResponse(user, role) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    is_email_verified: !!user.is_email_verified,
    is_phone_verified: !!user.is_phone_verified,
    church_id: user.church_id,
    role,
  };
}

const getUserRole = async (userId) => {
  const { rows: [roleRow] } = await db.query(
    `SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 LIMIT 1`,
    [userId]
  );
  return roleRow?.name || 'member';
};

// --- Controllers ---

// Registration
export const register = async (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid request body' });
  const { name, email, phone, password, church_id, roles } = req.body;
  if (!church_id) return res.status(400).json({ message: 'Church is required' });
  if (!email && !phone) return res.status(400).json({ message: 'Email or phone is required' });

  const normalizedEmail = email?.trim().toLowerCase() || null;
  const normalizedPhone = phone?.trim() || null;

  try {
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Ensure member exists
      let queryText = '', queryParams = [];
      if (normalizedEmail && normalizedPhone) {
        queryText = `SELECT id FROM members WHERE LOWER(email) = LOWER($1) OR contact_primary = $2 LIMIT 1`;
        queryParams = [normalizedEmail, normalizedPhone];
      } else if (normalizedEmail) {
        queryText = `SELECT id FROM members WHERE LOWER(email) = LOWER($1) LIMIT 1`;
        queryParams = [normalizedEmail];
      } else {
        queryText = `SELECT id FROM members WHERE contact_primary = $1 LIMIT 1`;
        queryParams = [normalizedPhone];
      }
      const { rows: memberRows } = await client.query(queryText, queryParams);
      if (memberRows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ message: 'Only existing members can register' });
      }
      const memberId = memberRows[0].id;

      // Duplicate email/phone check
      if (normalizedEmail) {
        const { rowCount } = await client.query('SELECT 1 FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [normalizedEmail]);
        if (rowCount > 0) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'Email already in use' }); }
      }
      if (normalizedPhone) {
        const { rowCount } = await client.query('SELECT 1 FROM users WHERE phone=$1 LIMIT 1', [normalizedPhone]);
        if (rowCount > 0) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'Phone already in use' }); }
      }

      // Create user
      const { rows: [user] } = await client.query(
        `INSERT INTO users (name, email, phone, password_hash, church_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [name || normalizedEmail || normalizedPhone || 'user', normalizedEmail, normalizedPhone, passwordHash, church_id]
      );

      await client.query('UPDATE members SET user_id=$1 WHERE id=$2', [user.id, memberId]);

      // Attach roles
      if (Array.isArray(roles) && roles.length > 0) {
        let roleIds = [];
        if (roles.every(r => typeof r === 'number' || /^\d+$/.test(String(r)))) roleIds = roles.map(Number);
        else {
          const { rows: found } = await client.query('SELECT id FROM roles WHERE name = ANY($1)', [roles.map(String)]);
          roleIds = found.map(r => r.id);
        }
        for (const rid of roleIds) {
          await client.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [user.id, rid]);
        }
      }

      await client.query('COMMIT');

      // Send verification OTP
      let verificationSent = false;
      try {
        if (normalizedEmail) verificationSent = await sendOTP(user.id, normalizedEmail, 'email');
        else if (normalizedPhone) verificationSent = await sendOTP(user.id, normalizedPhone, 'phone');
      } catch { verificationSent = false; }

      return res.status(201).json({
        message: `Registered. Please verify your ${normalizedEmail ? 'email' : 'phone'}.`,
        userId: user.id,
        user,
        verificationSent
      });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Register error:', err);
      return res.status(500).json({ message: 'Registration failed' });
    } finally { client.release(); }
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Registration failed' });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ message: 'Missing credentials' });

    const user = await getUserByEmailOrPhone(identifier);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const role = await getUserRole(user.id);
    const zones = await getUserZones(user.id, user.church_id);
    
    const accessToken = createAccessToken(user.id, user.church_id);
    const refreshToken = generateRefreshToken();
    saveRefreshToken(refreshToken, user.id);

    const userResponse = formatUserResponse(user, role);
    if (zones.length > 0) {
      userResponse.zones = zones;
    }

    return res.json({ user: userResponse, accessToken, refreshToken, expiresIn: ACCESS_EXPIRES });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Login failed' });
  }
};

// Refresh
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Missing refresh token' });

    const entry = refreshStore.get(refreshToken);
    if (!entry) return res.status(401).json({ message: 'Invalid refresh token' });
    if (Date.now() > entry.expiresAt) { refreshStore.delete(refreshToken); return res.status(401).json({ message: 'Expired' }); }

    const user = await getUserById(entry.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const zones = await getUserZones(user.id, user.church_id);
    const newRefreshToken = rotateRefreshToken(refreshToken, user.id);
    const accessToken = createAccessToken(user.id, user.church_id);
    const role = await getUserRole(user.id);

    const userResponse = formatUserResponse(user, role);
    if (zones.length > 0) {
      userResponse.zones = zones;
    }

    return res.json({ user: userResponse, accessToken, refreshToken: newRefreshToken, expiresIn: ACCESS_EXPIRES });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ message: 'Could not refresh tokens' });
  }
};

// Email / Phone Verification
export const emailVerify = async (req, res) => verifyAccount(req, res, 'email');
export const phoneVerify = async (req, res) => verifyAccount(req, res, 'phone');

const verifyAccount = async (req, res, method) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ message: 'Missing required fields' });

    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await verifyOTP(userId, code, method, method === 'email' ? user.email : user.phone);
    if (!valid) return res.status(400).json({ message: 'Invalid verification code' });

    if (method === 'email') await setEmailVerified(userId, true);
    else await setPhoneVerified(userId, true);

    await assignDefaultRoleByName(userId, 'member');

    const refreshedUser = await getUserById(userId);
    const role = await getUserRole(userId);
    const accessToken = createAccessToken(userId, refreshedUser.church_id);
    const refreshToken = generateRefreshToken();
    saveRefreshToken(refreshToken, userId);

    return res.json({ user: formatUserResponse(refreshedUser, role), accessToken, refreshToken, expiresIn: ACCESS_EXPIRES });
  } catch (err) {
    console.error(`${method} verify error:`, err);
    return res.status(500).json({ message: 'Verification failed' });
  }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const user = await getUserByEmail(email);
    if (!user) return res.json({ message: 'If an account exists, a reset code was sent' });

    const sent = await sendOTP(user.id, email, 'reset');
    if (!sent) return res.status(500).json({ message: 'Failed to send reset code' });

    return res.json({ message: 'If an account exists, a reset code was sent', userId: user.id });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Failed to process request' });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { userId, code, password } = req.body;
    if (!userId || !code || !password) return res.status(400).json({ message: 'Missing required fields' });

    const valid = await verifyOTP(userId, code, 'reset');
    if (!valid) return res.status(400).json({ message: 'Invalid or expired reset code' });

    const passwordHash = await bcrypt.hash(password, 10);
    await updatePassword(userId, passwordHash);

    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Failed to reset password' });
  }
};

// Logout
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) revokeRefreshToken(refreshToken);
    return res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: 'Logout failed' });
  }
};

// Resend Verification
export const resendVerification = async (req, res) => {
  try {
    const { userId, identifier, method } = req.body;
    if (!userId || !identifier || !method) return res.status(400).json({ message: 'Missing required fields' });

    const ok = await sendOTP(userId, identifier, method);
    if (ok) return res.json({ message: 'Verification sent' });

    return res.status(500).json({ message: 'Failed to send verification' });
  } catch (err) {
    console.error('resendVerification error', err);
    return res.status(500).json({ message: 'Failed to send verification' });
  }
};

// Me - profile
export const me = async (req, res) => {
  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : req.body?.token || req.query?.token;

  if (!token) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const user = await getUserById(decoded.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.is_email_verified && !user.is_phone_verified)
      return res.status(401).json({ message: 'Account not verified' });

    const role = await getUserRole(user.id);
    return res.json(formatUserResponse(user, role));
  } catch (err) {
    console.error('me error', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
