import { Queue, Worker, Job } from 'bullmq';
import { redis } from './redis';
import { ReconAgent } from '../agents/recon-agent';

export const SCAN_QUEUE_NAME = 'scan-engine';

export const scanQueue = new Queue(SCAN_QUEUE_NAME, {
  connection: redis as any,
});

// The worker processes jobs from the queue and drives the State Machine
export const scanWorker = new Worker(
  SCAN_QUEUE_NAME,
  async (job: Job) => {
    const { scanId, target, step } = job.data;
    console.log(`[BullMQ] Processing job ${job.id} for scan ${scanId}, step: ${step}`);

    try {
      if (step === 'recon') {
        const agent = new ReconAgent({ scanId, target });
        const result = await agent.execute();
        
        if (result.success && result.nextStep) {
          // Advance the State Machine by enqueuing the next step
          await scanQueue.add(result.nextStep, { scanId, target, step: result.nextStep });
        }
      }
      // Other steps (attack, validate, report) would be implemented here as new Agents
      
    } catch (error) {
      console.error(`[BullMQ] Error processing job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection: redis as any,
  }
);
