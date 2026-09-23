import { Redis, RedisOptions } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Enable TLS for cloud Redis providers (e.g. Upstash, Redis Cloud) using rediss://
if (REDIS_URL.startsWith('rediss://')) {
  redisOptions.tls = {
    rejectUnauthorized: false,
  };
}

// Re-use connection in development to prevent too many connections
const globalForRedis = global as unknown as { redis: Redis };

export const redis =
  globalForRedis.redis ||
  new Redis(REDIS_URL, redisOptions);

// Gracefully log connection errors without crashing Next.js build or SSR
redis.on('error', (err) => {
  // Silent during build / non-fatal logging
  if (process.env.DEBUG_REDIS) {
    console.warn('[Redis] Connection warning:', err.message);
  }
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;
