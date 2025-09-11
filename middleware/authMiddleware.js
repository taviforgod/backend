// FILE: middleware/authenticateToken.js
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/config.js';


// This middleware accepts the token either via the httpOnly cookie OR the Authorization header
export const authenticateToken = (req, res, next) => {
let token = req.cookies?.token;


const authHeader = req.headers.authorization;
if (!token && authHeader && authHeader.startsWith('Bearer ')) {
token = authHeader.split(' ')[1];
}


if (!token) return res.status(401).json({ message: 'Authentication token missing, please log in.' });


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
