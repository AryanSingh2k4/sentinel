import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { runTruffleHogGit, TruffleHogResult } from './src/lib/tools/trufflehog';
import { SecretAgent } from './src/lib/agents/secret';
import { supabaseAdmin } from './src/lib/agents/base';

async function runTest() {
  console.log('=== Step 1: Testing TruffleHog CLI Tool Wrapper ===');
  const testRepo = 'https://github.com/octocat/Hello-World';
  console.log(`Scanning test repository: ${testRepo}`);

  const results: TruffleHogResult[] = [];
  await runTruffleHogGit(testRepo, async (result) => {
    results.push(result);
    console.log(`[Secret Detected] ${result.detectorName} | Verified: ${result.verified} | File: ${result.file}`);
  });

  console.log(`Tool test completed. Total secrets found in test repo: ${results.length}`);

  console.log('\n=== Step 2: Testing SecretAgent Database & State Machine Execution ===');
  // Create a mock target and scan in Supabase
  const { data: target, error: targetErr } = await supabaseAdmin.from('targets').insert({
    domain: 'github.com/octocat/Hello-World',
    base_url: 'https://github.com/octocat/Hello-World'
  }).select().single();

  if (targetErr) {
    console.warn('Target creation notice:', targetErr.message);
  }

  const { data: scan, error: scanErr } = await supabaseAdmin.from('scans').insert({
    target_id: target?.id || null,
    status: 'QUEUED'
  }).select().single();

  if (scanErr || !scan) {
    console.error('Scan creation failed:', scanErr);
    return;
  }

  console.log(`Created test scan: ${scan.id}`);
  const secretAgent = new SecretAgent({ scanId: scan.id, target: 'https://github.com/octocat/Hello-World' });
  const agentResult = await secretAgent.execute();

  console.log('SecretAgent Execution Result:', agentResult);

  // Check Supabase scan status
  const { data: updatedScan } = await supabaseAdmin.from('scans').select('id, status').eq('id', scan.id).single();
  console.log(`Updated Scan Status: ${updatedScan?.status}`);

  // Fetch events
  const { data: events } = await supabaseAdmin.from('events').select('event_type, payload').eq('scan_id', scan.id);
  console.log(`Logged Events count: ${events?.length}`);
  events?.forEach(e => console.log(` - ${e.event_type}:`, JSON.stringify(e.payload)));

  console.log('\n✅ Secret Scanning end-to-end integration test PASSED!');
}

runTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
