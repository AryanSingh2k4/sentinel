const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: scans } = await supabaseAdmin.from('scans').select('id, status, targets(domain)');
  const { count: findings } = await supabaseAdmin.from('candidate_findings').select('*', { count: 'exact', head: true });
  
  console.log('Current Scans:', JSON.stringify(scans, null, 2));
  console.log('Total Findings Found So Far:', findings);
}

check().catch(console.error);
