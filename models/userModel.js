import db from '../config/db.js';

// Create user with email and/or phone
export const createUser = async ({ name, email, phone, passwordHash, church_id }) => {
  const normalizedEmail = email ? email.trim().toLowerCase() : null;
  const normalizedPhone = phone ? phone.trim() : null;
  const res = await db.query(
    'INSERT INTO users (name, email, phone, password_hash, church_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [name, normalizedEmail, normalizedPhone, passwordHash, church_id]
  );
  return res.rows[0];
};

// Get user by email (case-insensitive)
export const getUserByEmail = async (email) => {
  if (!email) return null;
  const normalizedEmail = email.trim().toLowerCase();
  const res = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
  return res.rows[0];
};

// Get user by phone
export const getUserByPhone = async (phone) => {
  if (!phone) return null;
  const normalizedPhone = phone.trim();
  const res = await db.query('SELECT * FROM users WHERE phone = $1', [normalizedPhone]);
  return res.rows[0];
};

// Get user by either email or phone (case-insensitive for email)
export const getUserByEmailOrPhone = async (identifier) => {
  if (!identifier) return null;
  const normalized = identifier.trim();
  const res = await db.query(
    'SELECT * FROM users WHERE LOWER(email) = $1 OR phone = $2 LIMIT 1',
    [normalized.toLowerCase(), normalized]
  );
  return res.rows[0];
};

export const getUserById = async (id) => {
  const res = await db.query('SELECT * FROM users WHERE id=$1', [id]);
  return res.rows[0];
};

export const assignRole = async (userId, roleId) => {
  await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, roleId]);
};

export const removeRole = async (userId, roleId) => {
  await db.query('DELETE FROM user_roles WHERE user_id=$1 AND role_id=$2', [userId, roleId]);
};

export const getUserRoles = async (userId) => {
  const res = await db.query(
    'SELECT r.* FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=$1', [userId]);
  return res.rows;
};

export const setPhoneVerified = async (userId, verified = true) => {
  await db.query('UPDATE users SET phone_verified=$1 WHERE id=$2', [verified, userId]);
};

export const updatePassword = async (userId, passwordHash) => {
  await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [passwordHash, userId]);
};

// Optionally, filter users by church
export const getAllUsers = async (church_id) => {
  if (church_id) {
    const res = await db.query('SELECT * FROM users WHERE church_id=$1 ORDER BY id', [church_id]);
    return res.rows;
  }
  const res = await db.query('SELECT * FROM users ORDER BY id');
  return res.rows;
};

// Get all permissions for a user by joining user_roles, role_permissions, permissions
export async function getUserPermissions(userId) {
  const { rows } = await db.query(
    `
    SELECT DISTINCT p.name
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = $1
    `,
    [userId]
  );
  return rows.map(r => r.name);
}