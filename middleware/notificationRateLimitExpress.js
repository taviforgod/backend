import { enforceRateLimit } from '../utils/notificationLimiter.js';

export async function notificationRateLimitExpress(req, res, next) {
  try {
    const body = req.body || {};
    const church_id = body.church_id ?? (req.user && req.user.church_id);
    const user_id = body.user_id ?? (req.user && req.user.user_id);

    if (!church_id) return res.status(400).json({ ok: false, message: 'church_id required for rate limiting' });

    if (body.force && req.user && (req.user.is_admin || (req.user.role && String(req.user.role).toLowerCase() === 'admin'))) {
      return next();
    }

    await enforceRateLimit({ church_id, user_id });
    return next();
  } catch (err) {
    if (err && (err.code === 'RATE_LIMIT_USER' || err.code === 'RATE_LIMIT_CHURCH')) {
      return res.status(429).json({
        ok: false,
        message: err.message || 'Rate limit exceeded',
        code: err.code,
        limit: err.limit,
        count: err.count
      });
    }
    return next(err);
  }
}
