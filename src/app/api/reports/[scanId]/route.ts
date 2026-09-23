import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/agents/base';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const { scanId } = await params;

    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user && process.env.NODE_ENV === 'production' && process.env.ENFORCE_AUTH === 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: In production, verify scan ownership via authenticated user's operator_id
    // 1. Fetch scan
    const { data: scan, error: scanErr } = await supabaseAdmin
      .from('scans')
      .select(`
        id,
        status,
        started_at,
        completed_at,
        targets ( domain, base_url )
      `)
      .eq('id', scanId)
      .single();

    if (scanErr || !scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // 2. Fetch report record (if generated)
    const { data: report } = await supabaseAdmin
      .from('reports')
      .select('*')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 3. Fetch technologies
    const { data: technologies } = await supabaseAdmin
      .from('discovered_technologies')
      .select('id, technology, confidence')
      .eq('scan_id', scanId);

    // 4. Fetch discovered URLs count
    const { count: urlCount } = await supabaseAdmin
      .from('discovered_urls')
      .select('*', { count: 'exact', head: true })
      .eq('scan_id', scanId);

    // 5. Fetch candidate findings
    const { data: candidateFindings } = await supabaseAdmin
      .from('candidate_findings')
      .select('*')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: false });

    // 6. Fetch confirmed findings
    const candidateIds = (candidateFindings || []).map((f: any) => f.id);
    const confirmedFindings = candidateIds.length > 0
      ? (await supabaseAdmin
          .from('confirmed_findings')
          .select(`
            id,
            severity,
            confirmed,
            created_at,
            candidate_findings (
              id,
              title,
              reasoning,
              confidence
            )
          `)
          .in('candidate_finding_id', candidateIds)
          .order('created_at', { ascending: false })).data
      : [];

    const targetDomain = scan.targets?.domain || 'Unknown Target';
    const verifiedVulnerabilities = (confirmedFindings || []).filter(f => f.confirmed);
    const falsePositives = (confirmedFindings || []).filter(f => f.confirmed === false);

    const severityCounts = {
      critical: verifiedVulnerabilities.filter(f => f.severity === 'critical').length,
      high: verifiedVulnerabilities.filter(f => f.severity === 'high').length,
      medium: verifiedVulnerabilities.filter(f => f.severity === 'medium').length,
      low: verifiedVulnerabilities.filter(f => f.severity === 'low').length,
    };

    // 7. Fetch generated patches from events
    const { data: patchEvents } = await supabaseAdmin
      .from('events')
      .select('payload')
      .eq('scan_id', scanId)
      .eq('event_type', 'PATCHES_STORED')
      .order('created_at', { ascending: false })
      .limit(1);

    const patches = patchEvents && patchEvents.length > 0 ? (patchEvents[0].payload as any)?.patches || [] : [];

    const reportPayload = {
      meta: {
        reportId: report?.id || null,
        scanId: scan.id,
        target: targetDomain,
        baseUrl: scan.targets?.base_url || `https://${targetDomain}`,
        status: scan.status,
        startedAt: scan.started_at,
        completedAt: scan.completed_at,
        generatedAt: new Date().toISOString(),
      },
      summary: {
        title: report?.title || `Security Assessment Report - ${targetDomain}`,
        executiveSummary: report?.summary || 'Assessment completed. Results triaged by Sentinel.',
        urlsMapped: urlCount || 0,
        technologiesFound: technologies?.length || 0,
        candidateFindingsCount: candidateFindings?.length || 0,
        confirmedVulnerabilitiesCount: verifiedVulnerabilities.length,
        falsePositivesCount: falsePositives.length,
        severityBreakdown: severityCounts,
      },
      technologies: technologies || [],
      verifiedFindings: verifiedVulnerabilities,
      falsePositives: falsePositives,
      candidateFindings: candidateFindings || [],
      patches: patches,
    };

    const url = new URL(request.url);
    if (url.searchParams.get('download') === 'json') {
      return new NextResponse(JSON.stringify(reportPayload, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="sentinel-report-${targetDomain}-${scanId.slice(0, 8)}.json"`,
        },
      });
    }

    return NextResponse.json(reportPayload);
  } catch (error: any) {
    console.error('Report endpoint error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
