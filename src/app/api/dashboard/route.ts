import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/agents/base';
import { createClient } from '@/lib/supabase/server';
import { resolveScanTarget, isPlaceholder } from '@/lib/utils/target-resolver';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Bypass RLS to fetch scans and targets
    const { data: rawScans } = await supabaseAdmin
      .from('scans')
      .select(`
        id,
        status,
        started_at,
        completed_at,
        profile,
        target_id,
        targets ( id, domain, base_url )
      `)
      .order('started_at', { ascending: false });

    // Identify any scans lacking target data to batch-fetch events/reports fallback
    const missingTargetScanIds = (rawScans || [])
      .filter((s) => {
        const dom = Array.isArray(s.targets) ? s.targets[0]?.domain : (s.targets as any)?.domain;
        return !dom || isPlaceholder(dom);
      })
      .map((s) => s.id);

    const eventsByScanId: Record<string, any[]> = {};
    const reportsByScanId: Record<string, any> = {};

    if (missingTargetScanIds.length > 0) {
      const [eventsRes, reportsRes] = await Promise.all([
        supabaseAdmin
          .from('events')
          .select('scan_id, payload')
          .in('scan_id', missingTargetScanIds),
        supabaseAdmin
          .from('reports')
          .select('scan_id, title, summary')
          .in('scan_id', missingTargetScanIds),
      ]);

      if (eventsRes.data) {
        eventsRes.data.forEach((evt) => {
          if (evt.scan_id) {
            if (!eventsByScanId[evt.scan_id]) eventsByScanId[evt.scan_id] = [];
            eventsByScanId[evt.scan_id].push(evt);
          }
        });
      }

      if (reportsRes.data) {
        reportsRes.data.forEach((rep) => {
          if (rep.scan_id) {
            reportsByScanId[rep.scan_id] = rep;
          }
        });
      }
    }

    const scans = (rawScans || []).map((scan) => {
      const scanEvents = eventsByScanId[scan.id];
      const scanReport = reportsByScanId[scan.id];
      const resolved = resolveScanTarget({
        ...scan,
        title: scanReport?.title,
        summary: scanReport?.summary,
        events: scanEvents,
      });

      return {
        ...scan,
        target: resolved.display,
        target_raw: resolved.raw,
        target_type: resolved.targetType,
        targets: {
          domain: resolved.display,
          base_url: resolved.baseUrl,
        },
      };
    });

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
