import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Re-use connection in development to prevent too many connections
const globalForRedis = global as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
  });

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;
