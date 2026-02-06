// config/redis.js
import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL, { tls: {} });

redisClient.on('connect', () => console.log('✅ Redis connected'));
redisClient.on('error', (err) => console.error('Redis error', err));

export function getRedisClient() {
  return redisClient;
}

