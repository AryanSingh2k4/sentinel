import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/agents/base';
import { createClient } from '@/lib/supabase/server';
import { resolveScanTarget, isPlaceholder, parseGitTarget } from '@/lib/utils/target-resolver';

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

  // Extract detector or vulnerability name: e.g. "SQL Injection (CWE-89)", "OpenAI", etc.
  let detector = 'Code Vulnerability';
  const vulnMatch = reasoning.match(/Vulnerability:\s*([^\r\n]+)/i);
  const detectorMatch = reasoning.match(/Detector:\s*([^\r\n]+)/i);

  if (vulnMatch && vulnMatch[1]) {
    detector = vulnMatch[1].trim();
  } else if (detectorMatch && detectorMatch[1]) {
    detector = detectorMatch[1].trim();
  } else {
    const titleMatch = title.match(/Exposed Secret:\s*([^\s]+)/i);
    if (titleMatch && titleMatch[1]) {
      detector = titleMatch[1].trim();
    } else if (title) {
      detector = title.split(' in ')[0] || 'Vulnerability';
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

  // Extract line number if present
  const lineMatch = reasoning.match(/Line:\s*(\d+)/i);
  if (lineMatch && lineMatch[1] && !fileLocation.includes(':')) {
    fileLocation = `${fileLocation}:${lineMatch[1]}`;
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

  // Extract snippet (Secret Snippet or Vulnerable Code Snippet)
  let secretSnippet: string | null = null;
  const snippetMatch = reasoning.match(/Secret Snippet:\s*([^\r\n]+)/i);
  const codeSnippetMatch = reasoning.match(/Vulnerable Code Snippet:\r?\n([\s\S]*?)(?=(?:\r?\n\r?\nRemediation:|$))/i);
  if (snippetMatch && snippetMatch[1]) {
    secretSnippet = snippetMatch[1].trim();
  } else if (codeSnippetMatch && codeSnippetMatch[1]) {
    secretSnippet = codeSnippetMatch[1].trim();
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

  // Target repo domain / URL cleanly resolved
  const resolved = resolveScanTarget(scan);
  let repoTarget = resolved.display;
  if (!repoTarget || isPlaceholder(repoTarget)) {
    const gitInfo = parseGitTarget(finding.reasoning);
    if (gitInfo.isGit) {
      repoTarget = gitInfo.fullName;
    } else {
      const match = finding.reasoning?.match(/(?:github\.com|gitlab\.com|bitbucket\.org)\/([^\/\s]+)\/([^\/\s#?]+)/i);
      if (match) {
        repoTarget = `${match[1]}/${match[2].replace(/\.git$/, '')}`;
      } else {
        repoTarget = scan?.id ? `Scan #${scan.id.slice(0, 8)}` : 'Audited Codebase';
      }
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

    // 4. Filter for repository findings (Code Vulnerabilities & Secrets)
    const secretFindings = (candidateFindings || []).filter((f: any) => {
      const title = (f.title || '').toLowerCase();
      const reasoning = (f.reasoning || '').toLowerCase();
      return (
        title.startsWith('exposed secret') ||
        reasoning.includes('detector:') ||
        reasoning.includes('vulnerability:') ||
        reasoning.includes('cwe-') ||
        title.includes('secret') ||
        title.includes('injection') ||
        title.includes('xss') ||
        title.includes('traversal') ||
        title.includes('rce') ||
        title.includes('ssrf') ||
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
      const resolved = resolveScanTarget(scan);
      return resolved.targetType === 'git' || isGitTarget(resolved.raw);
    });

    // 7. Calculate metrics
    const uniqueRepoTargets = new Set<string>();
    gitScans.forEach((scan: any) => {
      const resolved = resolveScanTarget(scan);
      if (resolved.display && !isPlaceholder(resolved.display)) {
        uniqueRepoTargets.add(resolved.display);
      }
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
      const d = s.detector || 'Pattern Heuristic';
      detectorBreakdown[d] = (detectorBreakdown[d] || 0) + 1;
    });

    // 8. Build Git Scan History
    const scanHistory = gitScans.map((scan: any) => {
      const resolved = resolveScanTarget(scan);
      const domain = resolved.display;

      const scanSecrets = secretsInventory.filter((s) => s.scanId === scan.id);
      const verifiedCount = scanSecrets.filter((s) => s.verifiedLive && !s.isFalsePositive).length;

      return {
        id: scan.id,
        target: domain,
        target_raw: resolved.raw,
        target_type: 'git',
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
