export function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Not authenticated' });
  const isAdmin = user.is_admin || (user.role && String(user.role).toLowerCase() === 'admin');
  if (!isAdmin) return res.status(403).json({ message: 'Admin required' });
  next();
}
