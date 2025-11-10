import db from '../config/db.js';
import bcrypt from 'bcrypt';

// ---------------------------
// User CRUD Operations
// ---------------------------

// Create a new user
export const createUser = async ({ name, email, phone, passwordHash, church_id }) => {
  const normalizedEmail = email ? email.trim().toLowerCase() : null;
  const normalizedPhone = phone ? phone.trim() : null;

  const res = await db.query(
    `INSERT INTO users (name, email, phone, password_hash, church_id) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, normalizedEmail, normalizedPhone, passwordHash, church_id]
  );
  return res.rows[0];
};

// Get user by ID
export const getUserById = async (id) => {
  const res = await db.query('SELECT * FROM users WHERE id = $1', [id]);
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

// Get user by email or phone
export const getUserByEmailOrPhone = async (identifier) => {
  if (!identifier) return null;
  const normalized = identifier.trim();
  const res = await db.query(
    'SELECT * FROM users WHERE LOWER(email) = $1 OR phone = $2 LIMIT 1',
    [normalized.toLowerCase(), normalized]
  );
  return res.rows[0];
};

// Update user by ID
export const updateUserById = async (id, fields = {}) => {
  const keys = Object.keys(fields);
  if (!keys.length) return null;

  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const vals = keys.map(k => fields[k]);
  vals.push(id);

  const res = await db.query(
    `UPDATE users SET ${sets}, updated_at = NOW() WHERE id = $${vals.length} RETURNING *`,
    vals
  );
  return res.rows[0];
};

// Delete user by ID with cleanup
export const deleteUserById = async (id) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Unlink related member
    await client.query('UPDATE members SET user_id = NULL WHERE user_id = $1', [id]);

    // Remove dependent records
    await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
    await client.query('DELETE FROM user_verifications WHERE user_id = $1', [id]);

    const { rowCount } = await client.query('DELETE FROM users WHERE id = $1', [id]);
    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return 0;
    }

    await client.query('COMMIT');
    return rowCount;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

// ---------------------------
// Authentication & Passwords
// ---------------------------

// Change password
export const changeUserPasswordById = async (id, password) => {
  const passwordHash = await bcrypt.hash(password, 10);
  await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
};

// Update password hash directly
export const updatePassword = async (userId, passwordHash) => {
  await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
};

// ---------------------------
// User Verification
// ---------------------------

export const setEmailVerified = async (userId, verified = true) => {
  await db.query('UPDATE users SET is_email_verified = $1 WHERE id = $2', [verified, userId]);
};

export const setPhoneVerified = async (userId, verified = true) => {
  await db.query('UPDATE users SET is_phone_verified = $1 WHERE id = $2', [verified, userId]);
};

// ---------------------------
// Roles & Permissions
// ---------------------------

export const assignRole = async (userId, roleId) => {
  await db.query(
    'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, roleId]
  );
};

export const removeRole = async (userId, roleId) => {
  await db.query('DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2', [userId, roleId]);
};

export const getUserRoles = async (userId) => {
  const res = await db.query(
    'SELECT r.* FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1',
    [userId]
  );
  return res.rows;
};

export const getUserPermissions = async (userId) => {
  const res = await db.query(
    `SELECT DISTINCT p.name
     FROM user_roles ur
     JOIN role_permissions rp ON ur.role_id = rp.role_id
     JOIN permissions p ON rp.permission_id = p.id
     WHERE ur.user_id = $1`,
    [userId]
  );
  return res.rows.map(r => r.name);
};

// Assign default role by name
export const assignDefaultRoleByName = async (userId, roleName = 'member') => {
  const res = await db.query('SELECT id FROM roles WHERE LOWER(name) = $1 LIMIT 1', [roleName.toLowerCase()]);
  if (!res.rowCount) return null;
  await assignRole(userId, res.rows[0].id);
  return res.rows[0].id;
};

// ---------------------------
// Status & Lock
// ---------------------------

export const activateUserById = async (id) => {
  await db.query('UPDATE users SET status = $1 WHERE id = $2', ['active', id]);
};

export const deactivateUserById = async (id) => {
  await db.query('UPDATE users SET status = $1 WHERE id = $2', ['inactive', id]);
};

export const lockUserById = async (id) => {
  await db.query('UPDATE users SET locked = true WHERE id = $1', [id]);
};

export const unlockUserById = async (id) => {
  await db.query('UPDATE users SET locked = false WHERE id = $1', [id]);
};

// ---------------------------
// User Queries
// ---------------------------

export const getAllUsers = async (church_id) => {
  const res = church_id
    ? await db.query('SELECT * FROM users WHERE church_id = $1 ORDER BY id', [church_id])
    : await db.query('SELECT * FROM users ORDER BY id');
  return res.rows;
};

export const getUsersWithRoles = async (church_id) => {
  const query = `
    SELECT 
      u.*,
      array_remove(array_agg(r.name), NULL) AS roles,
      array_remove(array_agg(r.id), NULL) AS role_ids
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    ${church_id ? 'WHERE u.church_id = $1' : ''}
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `;
  const res = await db.query(query, church_id ? [church_id] : []);
  return res.rows;
};

// Search users with filters
export const searchUsers = async ({ search, church_id, status, role }) => {
  const params = [];
  const where = [];

  if (church_id) {
    params.push(church_id);
    where.push(`u.church_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where.push(`(LOWER(u.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length} OR u.phone LIKE $${params.length})`);
  }

  if (status) {
    params.push(status);
    where.push(`u.status = $${params.length}`);
  }

  const query = `
    SELECT 
      u.*,
      array_remove(array_agg(r.name), NULL) AS roles,
      array_remove(array_agg(r.id), NULL) AS role_ids
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ${role ? `HAVING array_position(array_agg(r.name), '${role}') IS NOT NULL` : ''}
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `;

  const res = await db.query(query, params);
  return res.rows;
};

// ---------------------------
// Bulk Operations
// ---------------------------

export const bulkDeleteUsers = async (ids, church_id) => {
  const res = await db.query(
    'DELETE FROM users WHERE id = ANY($1) AND church_id = $2 RETURNING id',
    [ids, church_id]
  );
  return res.rows.map(r => r.id);
};

export const bulkActivateUsers = async (ids, church_id) => {
  const res = await db.query(
    `UPDATE users SET status = 'active', updated_at = NOW() WHERE id = ANY($1) AND church_id = $2 RETURNING id`,
    [ids, church_id]
  );
  return res.rows.map(r => r.id);
};

export const bulkDeactivateUsers = async (ids, church_id) => {
  const res = await db.query(
    `UPDATE users SET status = 'inactive', updated_at = NOW() WHERE id = ANY($1) AND church_id = $2 RETURNING id`,
    [ids, church_id]
  );
  return res.rows.map(r => r.id);
};

// ---------------------------
// Statistics
// ---------------------------

export const getUserStats = async (church_id) => {
  const res = await db.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'active') AS active,
       COUNT(*) FILTER (WHERE status = 'inactive') AS inactive,
       COUNT(*) FILTER (WHERE locked = true) AS locked,
       COUNT(*) FILTER (WHERE is_email_verified = true) AS email_verified,
       COUNT(*) FILTER (WHERE is_phone_verified = true) AS phone_verified
     FROM users
     WHERE church_id = $1`,
    [church_id]
  );
  return res.rows[0];
};
