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

    const { data: reports, error } = await supabaseAdmin
      .from('reports')
      .select(`
        id,
        scan_id,
        title,
        summary,
        created_at,
        scans (
          id,
          status,
          started_at,
          completed_at,
          targets ( domain, base_url )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ reports: reports || [] });
  } catch (error: any) {
    console.error('Failed to list reports:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
