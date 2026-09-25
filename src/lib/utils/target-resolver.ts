/**
 * Target Resolution Utility for Sentinel AI
 * Resolves, cleans, and formats scan and target identifiers without ever hiding names under placeholders
 */

export interface ScanTargetInput {
  id?: string;
  target?: string | null | { domain?: string | null; base_url?: string | null };
  profile?: string | null;
  target_type?: 'web' | 'git' | null;
  targets?:
    | { domain?: string | null; base_url?: string | null }
    | Array<{ domain?: string | null; base_url?: string | null }>
    | null;
  target_id?: string | null;
  title?: string | null;
  summary?: string | null;
  events?: Array<{ payload?: any }> | null;
}

export interface GitTargetInfo {
  isGit: boolean;
  host: string;
  owner: string;
  repo: string;
  shortName: string;
  fullName: string;
  httpUrl: string;
}

const KNOWN_GIT_HOSTS = ['github.com', 'gitlab.com', 'bitbucket.org'];

export function parseGitTarget(raw?: string | null): GitTargetInfo {
  if (!raw || typeof raw !== 'string') {
    return {
      isGit: false,
      host: '',
      owner: '',
      repo: '',
      shortName: '',
      fullName: '',
      httpUrl: '',
    };
  }

  let cleaned = raw.trim();

  // Pattern 1: SSH / SCP style: git@github.com:owner/repo(.git) or ssh://git@github.com/owner/repo(.git)
  const sshMatch = cleaned.match(/^(?:ssh:\/\/)?git@([^:]+):([^\/]+(?:\/[^\/]+)*)\/([^\/\s#?]+?)(?:\.git)?$/i);
  if (sshMatch) {
    const host = sshMatch[1].toLowerCase();
    const owner = sshMatch[2];
    const repo = sshMatch[3].replace(/\.git$/i, '');
    const shortName = `${owner}/${repo}`;
    const fullName = `${host}/${shortName}`;
    return {
      isGit: true,
      host,
      owner,
      repo,
      shortName,
      fullName,
      httpUrl: `https://${host}/${owner}/${repo}`,
    };
  }

  // Pattern 2: HTTP(S) URL with known git hosts or ending in .git
  const urlMatch = cleaned.match(/^(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9_.-]+)\/([^\/]+(?:\/[^\/]+)*)\/([^\/\s#?]+?)(?:\.git)?(?:\/.*)?$/i);
  if (urlMatch) {
    const host = urlMatch[1].toLowerCase();
    const owner = urlMatch[2];
    const repo = urlMatch[3].replace(/\.git$/i, '');
    const isKnownGitHost = KNOWN_GIT_HOSTS.includes(host);
    const endsWithGit = cleaned.toLowerCase().includes('.git');

    if (isKnownGitHost || endsWithGit) {
      const shortName = `${owner}/${repo}`;
      const fullName = `${host}/${shortName}`;
      return {
        isGit: true,
        host,
        owner,
        repo,
        shortName,
        fullName,
        httpUrl: `https://${host}/${owner}/${repo}`,
      };
    }
  }

  // Pattern 3: Shorthand owner/repo (e.g. "octocat/Hello-World" or "AryanSingh2k4/PhishAware")
  const shorthandMatch = cleaned.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?$/i);
  if (shorthandMatch) {
    const firstPart = shorthandMatch[1];
    const secondPart = shorthandMatch[2].replace(/\.git$/i, '');
    // If firstPart contains a dot and port or looks like domain (e.g. localhost:3000/path or example.com/page), it's web
    if (!firstPart.includes('.') && !firstPart.includes(':')) {
      const host = 'github.com';
      const owner = firstPart;
      const repo = secondPart;
      const shortName = `${owner}/${repo}`;
      const fullName = `${host}/${shortName}`;
      return {
        isGit: true,
        host,
        owner,
        repo,
        shortName,
        fullName,
        httpUrl: `https://${host}/${owner}/${repo}`,
      };
    }
  }

  return {
    isGit: false,
    host: '',
    owner: '',
    repo: '',
    shortName: '',
    fullName: '',
    httpUrl: '',
  };
}

export function isPlaceholder(val?: string | null): boolean {
  if (!val) return true;
  if (typeof val !== 'string') return true;
  const lower = val.toLowerCase().trim();
  return (
    lower === 'unknown target' ||
    lower === 'target application' ||
    lower === 'unknown' ||
    lower === 'target' ||
    lower === 'repository' ||
    lower === 'repository codebase' ||
    lower === 'active target' ||
    lower === 'local target' ||
    lower === 'undefined' ||
    lower === 'null' ||
    lower === '' ||
    lower === 'unspecified' ||
    lower === 'n/a' ||
    lower === 'none' ||
    lower === 'no target' ||
    lower.startsWith('scan #')
  );
}

export function extractTargetString(scan: ScanTargetInput | any, fallbackTitle?: string): string {
  // 1. Direct target property
  if (scan && typeof scan.target === 'string' && scan.target.trim() && !isPlaceholder(scan.target)) {
    return scan.target.trim();
  }

  // 1b. If target is an object with domain or base_url
  if (scan && typeof scan.target === 'object' && scan.target !== null) {
    if (scan.target.domain && !isPlaceholder(scan.target.domain)) return scan.target.domain.trim();
    if (scan.target.base_url && !isPlaceholder(scan.target.base_url)) return scan.target.base_url.trim();
  }

  // 2. Scan targets relation (handling both object and array from Supabase PostgREST)
  if (scan?.targets) {
    if (Array.isArray(scan.targets) && scan.targets.length > 0) {
      const first = scan.targets[0];
      if (first?.domain && !isPlaceholder(first.domain)) return first.domain.trim();
      if (first?.base_url && !isPlaceholder(first.base_url)) return first.base_url.trim();
    } else if (typeof scan.targets === 'object') {
      if (scan.targets.domain && !isPlaceholder(scan.targets.domain)) return scan.targets.domain.trim();
      if (scan.targets.base_url && !isPlaceholder(scan.targets.base_url)) return scan.targets.base_url.trim();
    }
  }

  // 3. Fallback from report title (e.g., "Security Assessment Report - https://github.com/..." or fallbackTitle)
  const titleToCheck = scan?.title || fallbackTitle;
  if (typeof titleToCheck === 'string' && titleToCheck.trim()) {
    const match =
      titleToCheck.match(/(?:Security\s+Assessment|Security|Audit|Scan|Assessment)?\s*(?:Report)?\s*[-–:]\s*(.+)/i) ||
      titleToCheck.match(/(?:Report|Audit|Assessment)\s+for\s+(.+)/i);
    if (match && match[1] && !isPlaceholder(match[1])) {
      return match[1].trim();
    }
    // If title itself looks like a domain, URL, or repository
    if (
      !isPlaceholder(titleToCheck) &&
      (titleToCheck.includes('.') || titleToCheck.includes('/')) &&
      !titleToCheck.toLowerCase().includes('report')
    ) {
      return titleToCheck.trim();
    }
  }

  // 4. Fallback from events payload
  if (scan && Array.isArray(scan.events) && scan.events.length > 0) {
    for (const evt of scan.events) {
      let p = evt?.payload;
      if (typeof p === 'string') {
        try {
          p = JSON.parse(p);
        } catch {}
      }
      if (p && typeof p === 'object') {
        const candidate = p.target || p.repoUrl || p.repo || p.domain || p.url || p.targetUrl;
        if (typeof candidate === 'string' && candidate.trim() && !isPlaceholder(candidate)) {
          return candidate.trim();
        }
      }
    }
  }

  // 5. Fallback from report summary
  if (scan && typeof scan.summary === 'string') {
    const cleanSummary = scan.summary.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
    const match = cleanSummary.match(/(?:completed for|target|auditing|assessment for)\s+([^\s,;]+)/i);
    if (match && match[1]) {
      const candidate = match[1].replace(/[\.\,\;\:\)]+$/, '').trim();
      if (!isPlaceholder(candidate)) {
        return candidate;
      }
    }
  }

  // 6. Last resort: scan identifier or profile
  if (scan?.id) {
    return `Scan #${scan.id.slice(0, 8)}`;
  }

  return 'Local Target';
}

export function formatTargetDisplay(
  rawTarget: string,
  options?: { shortGit?: boolean; stripScheme?: boolean }
): string {
  if (!rawTarget || isPlaceholder(rawTarget)) return 'Active Target';

  let cleaned = rawTarget.trim();

  // Handle Git targets (GitHub / GitLab / Bitbucket / shorthand)
  const gitInfo = parseGitTarget(cleaned);
  if (gitInfo.isGit) {
    if (options?.shortGit) {
      return gitInfo.shortName;
    }
    return gitInfo.fullName;
  }

  // Web URL: optionally strip scheme and trailing slash for cleaner UI
  if (options?.stripScheme) {
    cleaned = cleaned.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }

  return cleaned;
}

export function resolveScanTarget(scan: ScanTargetInput | any, fallbackTitle?: string) {
  const raw = extractTargetString(scan, fallbackTitle);
  const gitInfo = parseGitTarget(raw);

  const isProfileGit = Boolean(scan?.profile && scan.profile.toLowerCase().includes('git'));
  const isGit = gitInfo.isGit || isProfileGit;

  const display = formatTargetDisplay(raw);
  const shortDisplay = formatTargetDisplay(raw, { shortGit: true });

  let baseUrl = raw;
  if (gitInfo.isGit) {
    baseUrl = gitInfo.httpUrl;
  } else if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }

  return {
    raw,
    display,
    shortDisplay,
    baseUrl,
    targetType: isGit ? ('git' as const) : ('web' as const),
    gitInfo,
  };
}
