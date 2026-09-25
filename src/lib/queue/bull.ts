import { Queue } from 'bullmq';
import { redis } from './redis';

export const SCAN_QUEUE_NAME = 'scan-engine';
export const WEB_QUEUE_NAME = 'web-scan-engine';
export const GIT_QUEUE_NAME = 'git-scan-engine';

export const scanQueue = new Queue(SCAN_QUEUE_NAME, {
  connection: redis as any,
});

export const webQueue = new Queue(WEB_QUEUE_NAME, {
  connection: redis as any,
});

export const gitQueue = new Queue(GIT_QUEUE_NAME, {
  connection: redis as any,
});

const attachErrorHandler = (q: Queue, name: string) => {
  q.on('error', (err) => {
    if (process.env.DEBUG_REDIS) {
      console.warn(`[BullMQ] ${name} connection error:`, err.message);
    }
  });
};

attachErrorHandler(scanQueue, 'scanQueue');
attachErrorHandler(webQueue, 'webQueue');
attachErrorHandler(gitQueue, 'gitQueue');
