import { Queue } from 'bullmq';
import { redis } from './redis';

export const SCAN_QUEUE_NAME = 'scan-engine';

export const scanQueue = new Queue(SCAN_QUEUE_NAME, {
  connection: redis as any,
});

// Suppress unhandled error logs when building or before Redis is started
scanQueue.on('error', (err) => {
  if (process.env.DEBUG_REDIS) {
    console.warn('[BullMQ] Queue connection error:', err.message);
  }
});
