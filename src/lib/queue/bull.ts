import { Queue, Worker, Job } from 'bullmq';
import { redis } from './redis';
import { ReconAgent } from '../agents/recon';

export const SCAN_QUEUE_NAME = 'scan-engine';

export const scanQueue = new Queue(SCAN_QUEUE_NAME, {
  connection: redis as any,
});


