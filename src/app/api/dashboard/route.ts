import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/agents/base';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Bypass RLS to fetch scans and targets
    const { data: scans } = await supabaseAdmin
      .from('scans')
      .select(`
        id,
        status,
        started_at,
        targets ( domain )
      `)
      .order('started_at', { ascending: false });

    // Fetch discovered technologies
    const { data: technologies } = await supabaseAdmin
      .from('discovered_technologies')
      .select('id, technology, confidence');

    // Fetch candidate findings
    const { data: findings } = await supabaseAdmin
      .from('candidate_findings')
      .select('id, title, severity, confidence, reasoning, created_at')
      .order('created_at', { ascending: false });

    // Fetch confirmed findings
    const { data: confirmedFindings } = await supabaseAdmin
      .from('confirmed_findings')
      .select(`
        id,
        severity,
        confirmed,
        created_at,
        candidate_findings (
          title,
          reasoning
        )
      `)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      scans: scans || [],
      technologies: technologies || [],
      findings: findings || [],
      confirmedFindings: confirmedFindings || []
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
