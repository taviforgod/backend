import IORedis from 'ioredis';
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
export default redis;
export const getRedisClient = () => redis;