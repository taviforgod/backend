import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/config.js';

// This middleware assumes the JWT payload includes church_id
export const authenticateToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: 'Token missing' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    // Ensure church_id is present in the payload for church-specific access
    req.user = payload;
    if (!req.user.church_id) {
      return res.status(403).json({ message: 'No church assigned to user' });
    }
    next();
  } catch {
    res.status(403).json({ message: 'Token invalid or expired' });
  }
};