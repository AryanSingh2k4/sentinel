import { scanWorker } from './src/lib/queue/bull';

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
