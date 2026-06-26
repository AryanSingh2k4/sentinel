import { scanWorker } from './src/lib/queue/bull';

console.log('Starting Sentinel AI Background Worker...');

scanWorker.on('ready', () => {
    console.log('✅ BullMQ Worker is listening for jobs on scan-engine queue');
});

scanWorker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} (scan: ${job.data.scanId}) completed successfully`);
});

scanWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed with error:`, err);
});
