import { getRedisClient } from '../config/redis.js';
const WINDOW = 60;
const LIMIT = 20;
export async function notificationRateLimiter(req, res, next) {
  const redis = getRedisClient();
  const userKey = `notifLimit:${req.user?.userId}`;
  const count = await redis.incr(userKey);
  if (count === 1) await redis.expire(userKey, WINDOW);
  if (count > LIMIT) return res.status(429).json({ error: "Rate limit exceeded" });
  next();
}