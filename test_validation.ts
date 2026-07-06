import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { ValidationAgent } from './src/lib/agents/validation';
import { supabaseAdmin } from './src/lib/agents/base';

async function testValidation() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Please add OPENAI_API_KEY to your .env.local file first!");
    process.exit(1);
  }

  // Get the most recent scan
  const { data: scans } = await supabaseAdmin.from('scans').select('id, targets(domain)').order('started_at', { ascending: false }).limit(1);
  
  if (!scans || scans.length === 0) {
    console.error("No scans found.");
    return;
  }

  const scan = scans[0];
  const targetDomain = scan.targets?.domain || 'unknown';
  console.log(`Starting Validation Agent for scan ${scan.id} on ${targetDomain}`);

  const agent = new ValidationAgent({ scanId: scan.id, target: targetDomain });
  const result = await agent.execute();

  console.log("Validation Agent Result:", result);
}

testValidation().catch(console.error);
