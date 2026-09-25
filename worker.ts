import fs from 'fs';
import path from 'path';

// Automatically load .env.local if not already loaded into process.env
if (typeof (process as any).loadEnvFile === 'function') {
  const envLocal = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envLocal)) {
    try {
      (process as any).loadEnvFile(envLocal);
    } catch {}
  }
}

import { Worker, Job } from 'bullmq';
import { redis } from './src/lib/queue/redis';
import {
  SCAN_QUEUE_NAME,
  WEB_QUEUE_NAME,
  GIT_QUEUE_NAME,
  scanQueue,
  webQueue,
  gitQueue,
} from './src/lib/queue/bull';
import { ReconAgent } from './src/lib/agents/recon';
import { AttackAgent } from './src/lib/agents/attack';
import { ValidationAgent } from './src/lib/agents/validation';
import { ReportAgent } from './src/lib/agents/reporting';
import { SecretAgent } from './src/lib/agents/secret';
import { PatchAgent } from './src/lib/agents/patch';
import { supabaseAdmin } from './src/lib/agents/base';

// Role can be 'web', 'git', or 'all' (default: 'all' for local dev)
const workerRole = process.env.WORKER_ROLE || 'all';

async function processJob(job: Job) {
  const { scanId, target, step, targetType } = job.data;
  console.log(`[BullMQ:${job.queueName}] Processing job ${job.id} for scan ${scanId}, step: ${step}`);

  // Heartbeat: Periodically update job progress every 30 seconds to extend the lock and signal health
  const heartbeatInterval = setInterval(async () => {
    try {
      await job.updateProgress({ timestamp: Date.now(), step });
    } catch {}
  }, 30000);

  try {
    // 1. Guard: Check if scan was cancelled by operator before beginning step
    const { data: scanRecord } = await supabaseAdmin
      .from('scans')
      .select('status')
      .eq('id', scanId)
      .maybeSingle();

    if (scanRecord?.status === 'CANCELLED') {
      console.log(`[BullMQ] Scan ${scanId} is CANCELLED. Skipping step: ${step}`);
      return;
    }

    let result: { success: boolean; nextStep?: string; error?: string };

    if (step === 'recon') {
      const agent = new ReconAgent({ scanId, target });
      result = await agent.execute();
    } else if (step === 'SECRETS' || step === 'secrets') {
      const agent = new SecretAgent({ scanId, target });
      result = await agent.execute();
    } else if (step === 'ATTACK') {
      const agent = new AttackAgent({ scanId, target });
      result = await agent.execute();
    } else if (step === 'VALIDATE') {
      const agent = new ValidationAgent({ scanId, target });
      result = await agent.execute();
    } else if (step === 'PATCH' || step === 'patch') {
      const agent = new PatchAgent({ scanId, target });
      result = await agent.execute();
    } else if (step === 'REPORT') {
      const agent = new ReportAgent({ scanId, target });
      result = await agent.execute();
    } else {
      throw new Error(`Unknown pipeline step: ${step}`);
    }

    // 2. Advance the State Machine if step succeeded and returned a nextStep
    if (result.success && result.nextStep) {
      // Re-check cancellation before enqueuing next step
      const { data: latestScan } = await supabaseAdmin
        .from('scans')
        .select('status')
        .eq('id', scanId)
        .maybeSingle();

      if (latestScan?.status !== 'CANCELLED') {
        const isGit =
          targetType === 'git' ||
          job.queueName === GIT_QUEUE_NAME ||
          step === 'SECRETS' ||
          step === 'secrets';

        const nextQueue = isGit
          ? gitQueue
          : job.queueName === SCAN_QUEUE_NAME
          ? scanQueue
          : webQueue;

        await nextQueue.add(result.nextStep, {
          scanId,
          target,
          step: result.nextStep,
          targetType: isGit ? 'git' : 'web',
        });
      } else {
        console.log(`[BullMQ] Scan ${scanId} was CANCELLED during ${step}. Not enqueuing ${result.nextStep}`);
      }
    }
  } catch (error) {
    console.error(`[BullMQ] Error processing job ${job.id}:`, error);
    throw error;
  } finally {
    clearInterval(heartbeatInterval);
  }
}

// Determine which queues to listen to based on WORKER_ROLE
const queuesToListen: string[] = [];
if (workerRole === 'web') {
  queuesToListen.push(WEB_QUEUE_NAME);
} else if (workerRole === 'git') {
  queuesToListen.push(GIT_QUEUE_NAME);
} else {
  // 'all' listens to all queues (local dev or unified single container)
  queuesToListen.push(WEB_QUEUE_NAME, GIT_QUEUE_NAME, SCAN_QUEUE_NAME);
}

const workerOptions = {
  connection: redis as any,
  concurrency: 1, // Restrict to 1 concurrent scan per worker container to avoid OOM
  lockDuration: 900000, // 15 minutes (ensures deep crawls & large repos never drop lock)
  stalledInterval: 30000, // Check for stalled jobs every 30 seconds
  maxStalledCount: 2,
};

const activeWorkers = queuesToListen.map((queueName) => {
  const worker = new Worker(queueName, processJob, workerOptions);

  worker.on('ready', () => {
    console.log(`[Worker] Connected to Redis and ready on queue: ${queueName}`);
  });

  worker.on('active', (job) => {
    console.log(`[Worker:${queueName}] Started job ${job.id} (Scan ID: ${job.data.scanId}) - Step: ${job.data.step}`);
  });

  worker.on('completed', (job) => {
    console.log(`[Worker:${queueName}] Completed job ${job.id} successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.log(`[Worker:${queueName}] Failed job ${job?.id} with error: ${err.message}`);
  });

  return worker;
});

console.log(`Sentinel - Background Worker initialized [Role: ${workerRole.toUpperCase()}].`);
console.log(`Listening on queue(s): ${queuesToListen.join(', ')}`);
console.log(`Connecting to Redis at ${process.env.REDIS_URL ? 'URL configured' : 'Localhost'}...`);

process.on('SIGINT', async () => {
  console.log('\n[Worker] Gracefully shutting down...');
  await Promise.all(activeWorkers.map((w) => w.close()));
  process.exit(0);
});
