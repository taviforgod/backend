import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/config.js';

export const authenticateToken = (req, res, next) => {
  let token = null;

  // 1. Try cookie
  if (req.cookies?.token) {
    token = req.cookies.token;
  }

  // 2. Try Authorization header: "Bearer <token>"
  else if (req.headers['authorization']) {
    const authHeader = req.headers['authorization'];
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7, authHeader.length);
    }
  }

  // 3. Try body fallback (for Safari/localStorage usage)
  else if (req.body?.token) {
    token = req.body.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing, please log in.' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;

    if (!req.user.church_id) {
      return res.status(403).json({ message: 'No church assigned to user' });
    }

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token has expired' });
    }
    console.error('JWT verification error:', err.message);
    res.status(403).json({ message: 'Token invalid or expired' });
  }
};
