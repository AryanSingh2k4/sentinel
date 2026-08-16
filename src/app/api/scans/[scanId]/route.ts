import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/agents/base';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  // TODO: In production, verify scan ownership via authenticated user's operator_id
  try {
    const { scanId } = await params;

    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Bypassed if running locally without auth setup
    if (!user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch scan metadata and linked target
    const { data: scan, error: scanErr } = await supabaseAdmin
      .from('scans')
      .select(`
        id,
        status,
        started_at,
        completed_at,
        profile,
        target_id,
        targets (
          id,
          domain,
          base_url,
          status,
          created_at
        )
      `)
      .eq('id', scanId)
      .single();

    if (scanErr || !scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // 2. Fetch event history ordered by created_at ascending
    const { data: events, error: eventsErr } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: true });

    if (eventsErr) {
      console.error('Failed to fetch events:', eventsErr);
    }

    // 3. Fetch discovered URLs
    const { data: discoveredUrls, error: urlsErr } = await supabaseAdmin
      .from('discovered_urls')
      .select('*')
      .eq('scan_id', scanId)
      .order('id', { ascending: true });

    if (urlsErr) {
      console.error('Failed to fetch discovered urls:', urlsErr);
    }

    // 4. Fetch discovered technologies
    const { data: discoveredTechs, error: techsErr } = await supabaseAdmin
      .from('discovered_technologies')
      .select('*')
      .eq('scan_id', scanId)
      .order('id', { ascending: true });

    if (techsErr) {
      console.error('Failed to fetch technologies:', techsErr);
    }

    // 5. Fetch candidate findings
    const { data: candidateFindings, error: candErr } = await supabaseAdmin
      .from('candidate_findings')
      .select('*')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: false });

    if (candErr) {
      console.error('Failed to fetch candidate findings:', candErr);
    }

    // 6. Fetch confirmed findings
    const candidateIds = (candidateFindings || []).map((f) => f.id);
    let confirmedFindings: any[] = [];

    if (candidateIds.length > 0) {
      const { data: confFindings, error: confErr } = await supabaseAdmin
        .from('confirmed_findings')
        .select(`
          id,
          severity,
          confirmed,
          created_at,
          candidate_finding_id,
          candidate_findings (
            id,
            title,
            reasoning,
            confidence
          )
        `)
        .in('candidate_finding_id', candidateIds)
        .order('created_at', { ascending: false });

      if (confErr) {
        console.error('Failed to fetch confirmed findings:', confErr);
      } else if (confFindings) {
        confirmedFindings = confFindings;
      }
    }

    // Determine target type (git vs web)
    const targetDomain = scan.targets?.domain || scan.targets?.base_url || 'Unknown Target';
    const isGitTarget =
      scan.profile?.toLowerCase().includes('git') ||
      targetDomain.includes('github.com') ||
      targetDomain.includes('gitlab.com') ||
      targetDomain.includes('bitbucket.org') ||
      targetDomain.endsWith('.git') ||
      targetDomain.startsWith('git@') ||
      Boolean(
        events?.some(
          (e) =>
            e.event_type?.toUpperCase().includes('SECRET') ||
            e.event_type?.toUpperCase().includes('TRUFFLEHOG')
        )
      );

    const targetType: 'web' | 'git' = isGitTarget ? 'git' : 'web';

    return NextResponse.json({
      scan: {
        id: scan.id,
        target: targetDomain,
        base_url:
          scan.targets?.base_url ||
          (targetDomain.startsWith('http') ? targetDomain : `https://${targetDomain}`),
        target_type: targetType,
        status: scan.status || 'QUEUED',
        started_at: scan.started_at,
        completed_at: scan.completed_at,
        profile: scan.profile,
      },
      events: events || [],
      discovered_urls: discoveredUrls || [],
      discovered_technologies: discoveredTechs || [],
      candidate_findings: candidateFindings || [],
      confirmed_findings: confirmedFindings || [],
    });
  } catch (error: any) {
    console.error('Scan detail API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  // TODO: In production, verify scan ownership via authenticated user's operator_id
  try {
    const { scanId } = await params;

    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || body.status;

    if (action === 'cancel' || action === 'CANCELLED') {
      const now = new Date().toISOString();

      const { data: updatedScan, error: updateErr } = await supabaseAdmin
        .from('scans')
        .update({
          status: 'CANCELLED',
          completed_at: now,
        })
        .eq('id', scanId)
        .select()
        .single();

      if (updateErr) {
        throw updateErr;
      }

      await supabaseAdmin.from('events').insert({
        scan_id: scanId,
        event_type: 'SCAN_CANCELLED',
        payload: {
          reason: 'User cancelled scan from console',
          cancelled_at: now,
        },
      });

      return NextResponse.json({
        message: 'Scan cancelled successfully',
        scan: updatedScan,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('Cancel scan error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
