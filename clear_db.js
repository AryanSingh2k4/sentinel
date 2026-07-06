const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const { Queue } = require('bullmq');
const Redis = require('ioredis');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const redisUrl = process.env.REDIS_URL;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function clearData() {
  console.log('Clearing old data from Supabase...');
  
  const tables = [
    'agent_logs',
    'discovered_technologies',
    'discovered_urls',
    'candidate_findings',
    'confirmed_findings',
    'scans',
    'targets'
  ];

  for (const table of tables) {
    console.log(`Clearing ${table}...`);
    const { error } = await supabaseAdmin.from(table).delete().not('id', 'is', null);
    if (error) {
      console.error(`Error clearing ${table}:`, error.message);
    } else {
      console.log(`Successfully cleared ${table}.`);
    }
  }

  console.log('\nClearing BullMQ Redis Queue...');
  if (redisUrl) {
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    const q = new Queue('scan-engine', { connection });
    await q.obliterate({ force: true });
    console.log('Successfully cleared Redis Queue.');
    connection.disconnect();
  } else {
    console.log('No REDIS_URL found, skipping queue clear.');
  }

  console.log('\nDone! The database and queues are completely clean.');
}

clearData().catch(console.error);
