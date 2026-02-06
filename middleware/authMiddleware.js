import jwt from 'jsonwebtoken';
import * as userModel from '../models/userModel.js';
import db from '../config/db.js';
const jwtSecret = process.env.JWT_SECRET || 'supersecret';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.slice(7).trim();
    }
    // allow token from cookie (if cookie-parser is used), body or query
    token = token || req.cookies?.accessToken || req.body?.token || req.query?.token;

    if (!token) return res.status(401).json({ message: 'No token provided' });

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      // Handle expired token explicitly without logging full stack
      if (err && err.name === 'TokenExpiredError') {
        const expiredAt = err.expiredAt ? err.expiredAt.toISOString() : null;
        return res.status(401).json({ message: 'Token expired', expiredAt });
      }
      // other verification errors
      console.error('Auth middleware error (invalid token):', err.message || err);
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await userModel.getUserById(decoded.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.status !== 'active' || user.locked)
      return res.status(403).json({ message: 'Account deactivated or locked' });

    // Get member information for this user if exists
    const memberRes = await db.query(
      'SELECT id FROM members WHERE user_id = $1 AND church_id = $2 LIMIT 1',
      [decoded.userId, decoded.church_id]
    );
    const member = memberRes.rows[0];

    req.user = {
      userId: decoded.userId,
      church_id: decoded.church_id,
      roles: decoded.roles || [],
      member_id: member?.id || null,
    };
    next();
  } catch (err) {
    console.error('Auth middleware unexpected error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};