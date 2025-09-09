import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/config.js';

// This middleware assumes the JWT payload includes church_id
export const authenticateToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: 'Authentication token missing, please log in.' });

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;

    // Ensure the church_id is present in the payload for church-specific access
    if (!req.user.church_id) {
      return res.status(403).json({ message: 'No church assigned to user' });
    }
    
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token has expired' });
    }
    console.error('JWT verification error:', err.message); // Log the error for debugging
    res.status(403).json({ message: 'Token invalid or expired' });
  }
};
