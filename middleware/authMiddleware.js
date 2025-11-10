import jwt from 'jsonwebtoken';
import * as userModel from '../models/userModel.js';
const jwtSecret = process.env.JWT_SECRET || 'supersecret';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer '))
      token = authHeader.slice(7).trim();
    token = token || req.body?.token || req.query?.token;
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, jwtSecret);
    const user = await userModel.getUserById(decoded.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.status !== 'active' || user.locked)
      return res.status(403).json({ message: 'Account deactivated or locked' });
    req.user = {
      userId: decoded.userId,
      church_id: decoded.church_id,
      roles: decoded.roles || [],
    };
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    if (err?.name === 'TokenExpiredError')
      return res.status(401).json({ message: 'Token expired' });
    return res.status(401).json({ message: 'Invalid token' });
  }
};