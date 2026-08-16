import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/agents/base';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return '-';
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diffSec = Math.max(0, Math.floor((end - start) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${mins}m ${secs}s`;
}

function parseSecretFinding(
  finding: any,
  confirmedMap: Map<string, any>,
  scanMap: Map<string, any>
) {
  const reasoning = finding.reasoning || '';
  const title = finding.title || '';
  const scan = finding.scan_id ? scanMap.get(finding.scan_id) : null;
  const confirmedData = confirmedMap.get(finding.id);

  // Extract detector name: e.g. "Detector: OpenAI", "Detector: AWS", etc.
  let detector = 'Generic Secret';
  const detectorMatch = reasoning.match(/Detector:\s*([^\r\n]+)/i);
  if (detectorMatch && detectorMatch[1]) {
    detector = detectorMatch[1].trim();
  } else {
    const titleMatch = title.match(/Exposed Secret:\s*([^\s]+)/i);
    if (titleMatch && titleMatch[1]) {
      detector = titleMatch[1].trim();
    }
  }

  // Extract file location: e.g. "File: src/config/aws.ts"
  let fileLocation = 'Unknown file';
  const fileMatch = reasoning.match(/File:\s*([^\r\n]+)/i);
  if (fileMatch && fileMatch[1]) {
    fileLocation = fileMatch[1].trim();
  } else {
    const titleFileMatch = title.match(/in\s+([^\r\n]+)$/i);
    if (titleFileMatch && titleFileMatch[1]) {
      fileLocation = titleFileMatch[1].trim();
    }
  }

  // Extract commit hash: e.g. "Commit: 9f3c18b..."
  let commit: string | null = null;
  const commitMatch = reasoning.match(/Commit:\s*([^\r\n]+)/i);
  if (commitMatch && commitMatch[1]) {
    commit = commitMatch[1].trim();
  }

  // Extract author / email: e.g. "Author: dev@company.com"
  let author: string | null = null;
  const authorMatch = reasoning.match(/Author:\s*([^\r\n]+)/i);
  if (authorMatch && authorMatch[1]) {
    author = authorMatch[1].trim();
  }

  // Extract secret snippet: e.g. "Secret Snippet: sk-proj-*****"
  let secretSnippet: string | null = null;
  const snippetMatch = reasoning.match(/Secret Snippet:\s*([^\r\n]+)/i);
  if (snippetMatch && snippetMatch[1]) {
    secretSnippet = snippetMatch[1].trim();
  }

  // Verification status: TruffleHog live verification
  const isVerifiedLive =
    reasoning.includes('VERIFIED LIVE') ||
    finding.confidence === 100 ||
    reasoning.toLowerCase().includes('(active secret)');

  // AI Triage status from confirmed_findings:
  // confirmedData.confirmed === true -> Verified Real Issue
  // confirmedData.confirmed === false -> False Positive Filtered
  // confirmedData === undefined -> Pending Triage
  const triageStatus = confirmedData
    ? (confirmedData.confirmed ? 'CONFIRMED' : 'FALSE_POSITIVE')
    : 'PENDING';

  // Target repo domain / URL
  let repoTarget = 'Repository';
  if (scan?.targets) {
    if (Array.isArray(scan.targets) && scan.targets.length > 0) {
      repoTarget = scan.targets[0].domain || scan.targets[0].base_url || 'Repository';
    } else if (scan.targets.domain) {
      repoTarget = scan.targets.domain;
    } else if (scan.targets.base_url) {
      repoTarget = scan.targets.base_url;
    }
  }

  return {
    id: finding.id,
    scanId: finding.scan_id,
    title: finding.title,
    severity: finding.severity || (isVerifiedLive ? 'critical' : 'high'),
    confidence: finding.confidence ?? (isVerifiedLive ? 100 : 85),
    reasoning: finding.reasoning,
    detector,
    fileLocation,
    commit,
    author,
    secretSnippet,
    verifiedLive: isVerifiedLive,
    triageStatus,
    confirmed: confirmedData ? confirmedData.confirmed : null,
    isFalsePositive: confirmedData ? confirmedData.confirmed === false : false,
    repoTarget,
    createdAt: finding.created_at || new Date().toISOString(),
  };
}

export async function GET() {
  // TODO: In production, filter all queries by authenticated user's operator_id to prevent data leakage
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch all scans with target relationships
    const { data: scans, error: scansError } = await supabaseAdmin
      .from('scans')
      .select(`
        id,
        status,
        started_at,
        completed_at,
        targets (
          id,
          domain,
          base_url
        )
      `)
      .order('started_at', { ascending: false });

    if (scansError) throw scansError;

    // 2. Fetch candidate findings
    const { data: candidateFindings, error: candidateError } = await supabaseAdmin
      .from('candidate_findings')
      .select(`
        id,
        scan_id,
        title,
        severity,
        confidence,
        reasoning,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (candidateError) throw candidateError;

    // 3. Fetch confirmed findings
    const { data: confirmedFindings, error: confirmedError } = await supabaseAdmin
      .from('confirmed_findings')
      .select(`
        id,
        candidate_finding_id,
        severity,
        confirmed,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (confirmedError) throw confirmedError;

    // Build scan map for quick lookups
    const scanMap = new Map<string, any>();
    (scans || []).forEach((scan) => {
      scanMap.set(scan.id, scan);
    });

    // Build confirmed findings map by candidate_finding_id
    const confirmedMap = new Map<string, any>();
    (confirmedFindings || []).forEach((cf) => {
      if (cf.candidate_finding_id) {
        confirmedMap.set(cf.candidate_finding_id, cf);
      }
    });

    // 4. Filter for Secret findings
    const secretFindings = (candidateFindings || []).filter((f: any) => {
      const title = (f.title || '').toLowerCase();
      const reasoning = (f.reasoning || '').toLowerCase();
      return (
        title.startsWith('exposed secret') ||
        reasoning.includes('detector:') ||
        title.includes('secret') ||
        reasoning.includes('trufflehog')
      );
    });

    // 5. Parse all secret findings into clean structures
    const secretsInventory = secretFindings.map((f: any) =>
      parseSecretFinding(f, confirmedMap, scanMap)
    );

    // 6. Filter for Git scans
    const scanIdsWithSecrets = new Set(secretsInventory.map((s) => s.scanId).filter(Boolean));

    const isGitTarget = (domainOrUrl: string) => {
      if (!domainOrUrl) return false;
      const d = domainOrUrl.toLowerCase();
      return (
        d.includes('github.com') ||
        d.includes('gitlab.com') ||
        d.includes('bitbucket.org') ||
        d.endsWith('.git') ||
        d.startsWith('git@') ||
        d.startsWith('git://') ||
        /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(domainOrUrl.trim())
      );
    };

    const gitScans = (scans || []).filter((scan: any) => {
      if (scanIdsWithSecrets.has(scan.id)) return true;
      if (scan.status === 'SECRETS' || scan.status === 'SECRET_SCAN') return true;

      let targetDomain = '';
      if (scan.targets) {
        if (Array.isArray(scan.targets) && scan.targets.length > 0) {
          targetDomain = scan.targets[0].domain || scan.targets[0].base_url || '';
        } else if (scan.targets.domain) {
          targetDomain = scan.targets.domain;
        } else if (scan.targets.base_url) {
          targetDomain = scan.targets.base_url;
        }
      }
      return isGitTarget(targetDomain);
    });

    // 7. Calculate metrics
    const uniqueRepoTargets = new Set<string>();
    gitScans.forEach((scan: any) => {
      let domain = '';
      if (scan.targets) {
        if (Array.isArray(scan.targets) && scan.targets.length > 0) {
          domain = scan.targets[0].domain || scan.targets[0].base_url || '';
        } else if (scan.targets.domain) {
          domain = scan.targets.domain;
        }
      }
      if (domain) uniqueRepoTargets.add(domain);
    });
    const totalRepositoriesAudited = uniqueRepoTargets.size > 0 ? uniqueRepoTargets.size : gitScans.length;

    // Verified live active keys
    const verifiedActiveKeysCount = secretsInventory.filter(
      (s) => s.verifiedLive && !s.isFalsePositive
    ).length;

    const totalSecretsCount = secretsInventory.length;

    // False positives filtered by AI triage
    const falsePositivesFilteredCount = secretsInventory.filter(
      (s) => s.isFalsePositive
    ).length;

    // Breakdown by detector
    const detectorBreakdown: Record<string, number> = {};
    secretsInventory.forEach((s) => {
      const d = s.detector || 'Unknown';
      detectorBreakdown[d] = (detectorBreakdown[d] || 0) + 1;
    });

    // 8. Build Git Scan History
    const scanHistory = gitScans.map((scan: any) => {
      let domain = 'Unknown Target';
      if (scan.targets) {
        if (Array.isArray(scan.targets) && scan.targets.length > 0) {
          domain = scan.targets[0].domain || scan.targets[0].base_url || 'Unknown Target';
        } else if (scan.targets.domain) {
          domain = scan.targets.domain;
        } else if (scan.targets.base_url) {
          domain = scan.targets.base_url;
        }
      }

      const scanSecrets = secretsInventory.filter((s) => s.scanId === scan.id);
      const verifiedCount = scanSecrets.filter((s) => s.verifiedLive && !s.isFalsePositive).length;

      return {
        id: scan.id,
        target: domain,
        status: scan.status || 'QUEUED',
        started_at: scan.started_at,
        completed_at: scan.completed_at,
        duration: formatDuration(scan.started_at, scan.completed_at),
        secretsCount: scanSecrets.length,
        verifiedCount,
      };
    });

    return NextResponse.json({
      metrics: {
        totalRepositoriesAudited,
        verifiedActiveKeysCount,
        totalSecretsCount,
        falsePositivesFilteredCount,
        detectorBreakdown,
      },
      secrets: secretsInventory,
      scans: scanHistory,
    });
  } catch (error: any) {
    console.error('Secret Scanner API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
