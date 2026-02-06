// backend/config/redis.js
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL is not defined!');
}

export const redis = new Redis(redisUrl, {
  tls: {},               // Required for Upstash rediss://
  maxRetriesPerRequest: 5 // Optional: reduce long retry loops
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('Redis error', err));
