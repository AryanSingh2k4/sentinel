import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/agents/base';
import { createClient } from '@/lib/supabase/server';
import { resolveScanTarget } from '@/lib/utils/target-resolver';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: In production, filter by authenticated user's operator_id to prevent cross-user data leakage
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

    const normalizedReports = (reports || []).map((r) => {
      const resolved = resolveScanTarget(
        r.scans ? { ...r.scans, summary: r.summary } : { summary: r.summary },
        r.title
      );
      return {
        ...r,
        target: resolved.display,
        target_raw: resolved.raw,
        target_type: resolved.targetType,
        scans: r.scans
          ? {
              ...r.scans,
              target: resolved.display,
              targets: {
                domain: resolved.display,
                base_url: resolved.baseUrl,
              },
            }
          : null,
      };
    });

    return NextResponse.json({ reports: normalizedReports });
  } catch (error: any) {
    console.error('Failed to list reports:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
