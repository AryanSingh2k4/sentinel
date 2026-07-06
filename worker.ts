import { Worker, Job } from 'bullmq';
import { redis } from './src/lib/queue/redis';
import { SCAN_QUEUE_NAME, scanQueue } from './src/lib/queue/bull';
import { ReconAgent } from './src/lib/agents/recon';
import { AttackAgent } from './src/lib/agents/attack';
import { ValidationAgent } from './src/lib/agents/validation';

// The worker processes jobs from the queue and drives the State Machine
const scanWorker = new Worker(
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
      } else if (step === 'ATTACK') {
        const agent = new AttackAgent({ scanId, target });
        const result = await agent.execute();

        if (result.success && result.nextStep) {
           await scanQueue.add(result.nextStep, { scanId, target, step: result.nextStep });
        }
      } else if (step === 'VALIDATE') {
        const agent = new ValidationAgent({ scanId, target });
        const result = await agent.execute();

        if (result.success && result.nextStep) {
           await scanQueue.add(result.nextStep, { scanId, target, step: result.nextStep });
        }
      }
      
    } catch (error) {
      console.error(`[BullMQ] Error processing job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection: redis as any,
    lockDuration: 300000, // 5 minutes
  }
);
console.log('Sentinel AI - Background Worker initialized.');
console.log(`Connecting to Redis at ${process.env.REDIS_URL ? 'URL configured' : 'Localhost'}...`);

scanWorker.on('ready', () => {
  console.log('[Worker] Connected to Redis and ready to process jobs.');
});

scanWorker.on('active', (job) => {
  console.log(`[Worker] Started job ${job.id} (Scan ID: ${job.data.scanId}) - Step: ${job.data.step}`);
});

scanWorker.on('completed', (job) => {
  console.log(`[Worker] Completed job ${job.id} successfully.`);
});

scanWorker.on('failed', (job, err) => {
  console.log(`[Worker] Failed job ${job?.id} with error: ${err.message}`);
});

process.on('SIGINT', async () => {
  console.log('\n[Worker] Gracefully shutting down...');
  await scanWorker.close();
  process.exit(0);
});
