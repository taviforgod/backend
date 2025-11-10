// backend/config/redis.js
import IORedis from 'ioredis';

let redis;
if (process.env.REDIS_URL) {
  redis = new IORedis(process.env.REDIS_URL);
  redis.on('error', (err) => console.warn('[redis] connection error:', err.message));
} else {
  console.warn('[redis] REDIS_URL not set, skipping Redis connection');
}

export default redis;
export const getRedisClient = () => redis;
