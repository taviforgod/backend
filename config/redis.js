import Redis from "ioredis";

const redisUrl =
  process.env.REDIS_URL ||
  "redis://localhost:6379";

// Create a single shared connection
const redis = new Redis(redisUrl, {
  tls: redisUrl.startsWith("rediss://") ? {} : undefined, 
});

export default redis;

export const getRedisClient = () => redis;
