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

    if (!user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const { data: confirmedFindings } = await supabaseAdmin
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
      .in('candidate_finding_id', (candidateFindings || []).map(f => f.id))
      .order('created_at', { ascending: false });

    const targetDomain = scan.targets?.domain || 'Unknown Target';
    const verifiedVulnerabilities = (confirmedFindings || []).filter(f => f.confirmed);
    const falsePositives = (confirmedFindings || []).filter(f => !f.confirmed);

    const severityCounts = {
      critical: verifiedVulnerabilities.filter(f => f.severity === 'critical').length,
      high: verifiedVulnerabilities.filter(f => f.severity === 'high').length,
      medium: verifiedVulnerabilities.filter(f => f.severity === 'medium').length,
      low: verifiedVulnerabilities.filter(f => f.severity === 'low').length,
    };

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
        executiveSummary: report?.summary || 'Assessment completed. Results triaged by Sentinel AI.',
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
