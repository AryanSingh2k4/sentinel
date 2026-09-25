import {
  extractTargetString,
  formatTargetDisplay,
  resolveScanTarget,
  isPlaceholder,
  parseGitTarget,
} from '@/lib/utils/target-resolver';

describe('Target Resolver Utility', () => {
  describe('isPlaceholder', () => {
    it('identifies placeholder values correctly', () => {
      expect(isPlaceholder('Unknown Target')).toBe(true);
      expect(isPlaceholder('unknown target')).toBe(true);
      expect(isPlaceholder('Target Application')).toBe(true);
      expect(isPlaceholder('unknown')).toBe(true);
      expect(isPlaceholder('Target')).toBe(true);
      expect(isPlaceholder('Repository')).toBe(true);
      expect(isPlaceholder('Repository Codebase')).toBe(true);
      expect(isPlaceholder('Active Target')).toBe(true);
      expect(isPlaceholder('Local Target')).toBe(true);
      expect(isPlaceholder('unspecified')).toBe(true);
      expect(isPlaceholder('n/a')).toBe(true);
      expect(isPlaceholder('none')).toBe(true);
      expect(isPlaceholder('Scan #12345678')).toBe(true);
      expect(isPlaceholder('')).toBe(true);
      expect(isPlaceholder(null)).toBe(true);
      expect(isPlaceholder(undefined)).toBe(true);

      expect(isPlaceholder('example.com')).toBe(false);
      expect(isPlaceholder('https://github.com/org/repo')).toBe(false);
      expect(isPlaceholder('localhost:3000')).toBe(false);
      expect(isPlaceholder('octocat/Hello-World')).toBe(false);
    });
  });

  describe('parseGitTarget', () => {
    it('parses HTTPS GitHub URLs', () => {
      const parsed = parseGitTarget('https://github.com/octocat/Hello-World.git');
      expect(parsed.isGit).toBe(true);
      expect(parsed.host).toBe('github.com');
      expect(parsed.owner).toBe('octocat');
      expect(parsed.repo).toBe('Hello-World');
      expect(parsed.shortName).toBe('octocat/Hello-World');
      expect(parsed.fullName).toBe('github.com/octocat/Hello-World');
      expect(parsed.httpUrl).toBe('https://github.com/octocat/Hello-World');
    });

    it('parses SSH Git URLs', () => {
      const parsed = parseGitTarget('git@github.com:AryanSingh2k4/sentinel.git');
      expect(parsed.isGit).toBe(true);
      expect(parsed.host).toBe('github.com');
      expect(parsed.owner).toBe('AryanSingh2k4');
      expect(parsed.repo).toBe('sentinel');
      expect(parsed.shortName).toBe('AryanSingh2k4/sentinel');
      expect(parsed.httpUrl).toBe('https://github.com/AryanSingh2k4/sentinel');
    });

    it('parses shorthand owner/repo', () => {
      const parsed = parseGitTarget('octocat/Hello-World');
      expect(parsed.isGit).toBe(true);
      expect(parsed.host).toBe('github.com');
      expect(parsed.owner).toBe('octocat');
      expect(parsed.repo).toBe('Hello-World');
      expect(parsed.shortName).toBe('octocat/Hello-World');
      expect(parsed.httpUrl).toBe('https://github.com/octocat/Hello-World');
    });

    it('parses GitLab nested subgroup URLs without truncating project name', () => {
      const parsed = parseGitTarget('https://gitlab.com/group/subgroup/project.git');
      expect(parsed.isGit).toBe(true);
      expect(parsed.host).toBe('gitlab.com');
      expect(parsed.owner).toBe('group/subgroup');
      expect(parsed.repo).toBe('project');
      expect(parsed.shortName).toBe('group/subgroup/project');
      expect(parsed.fullName).toBe('gitlab.com/group/subgroup/project');
    });

    it('does not treat standard web domains with paths as git', () => {
      const parsed = parseGitTarget('example.com/about/team');
      expect(parsed.isGit).toBe(false);
    });
  });

  describe('extractTargetString', () => {
    it('resolves from direct scan.target property', () => {
      const scan = { id: '123', target: 'https://github.com/owner/repo' };
      expect(extractTargetString(scan)).toBe('https://github.com/owner/repo');
    });

    it('resolves when target is an object with domain', () => {
      const scan = { id: '123', target: { domain: 'app.example.com' } };
      expect(extractTargetString(scan)).toBe('app.example.com');
    });

    it('resolves from fallbackTitle when scan is null or undefined', () => {
      expect(
        extractTargetString(null, 'Security Assessment Report - https://github.com/octocat/Hello-World')
      ).toBe('https://github.com/octocat/Hello-World');
    });

    it('resolves from scan.targets object', () => {
      const scan = {
        id: '123',
        targets: { domain: 'example.com', base_url: 'https://example.com' },
      };
      expect(extractTargetString(scan)).toBe('example.com');
    });

    it('resolves from scan.targets array (PostgREST one-to-many shape)', () => {
      const scan = {
        id: '123',
        targets: [{ domain: 'github.com/org/repo', base_url: 'https://github.com/org/repo' }],
      };
      expect(extractTargetString(scan)).toBe('github.com/org/repo');
    });

    it('ignores placeholder inside targets and falls back to report title or events', () => {
      const scan = {
        id: '123',
        targets: { domain: 'Unknown Target' },
        title: 'Security Assessment Report - https://github.com/org/test-repo',
      };
      expect(extractTargetString(scan)).toBe('https://github.com/org/test-repo');
    });

    it('extracts target from events payload when targets is null', () => {
      const scan = {
        id: 'abc-12345678',
        targets: null,
        events: [
          { payload: { target: 'unknown' } },
          { payload: JSON.stringify({ target: 'http://testphp.vulnweb.com' }) },
        ],
      };
      expect(extractTargetString(scan)).toBe('http://testphp.vulnweb.com');
    });

    it('extracts target from report summary when no other target is found', () => {
      const scan = {
        id: '123',
        summary: 'Security assessment completed for https://myapp.internal. Found 5 issues.',
      };
      expect(extractTargetString(scan)).toBe('https://myapp.internal');
    });

    it('falls back to scan ID if no target data is available at all', () => {
      const scan = { id: 'c3231dfa-b2ef-4a25-93cc-7fe6e62bde01' };
      expect(extractTargetString(scan)).toBe('Scan #c3231dfa');
    });
  });

  describe('formatTargetDisplay', () => {
    it('formats GitHub URLs cleanly with owner and repo', () => {
      expect(formatTargetDisplay('https://github.com/AryanSingh2k4/PhishAware.git')).toBe(
        'github.com/AryanSingh2k4/PhishAware'
      );
      expect(
        formatTargetDisplay('https://github.com/AryanSingh2k4/PhishAware.git', {
          shortGit: true,
        })
      ).toBe('AryanSingh2k4/PhishAware');
    });

    it('formats SSH git URLs cleanly', () => {
      expect(formatTargetDisplay('git@github.com:octocat/Hello-World.git')).toBe(
        'github.com/octocat/Hello-World'
      );
      expect(
        formatTargetDisplay('git@github.com:octocat/Hello-World.git', {
          shortGit: true,
        })
      ).toBe('octocat/Hello-World');
    });

    it('formats shorthand repo targets cleanly', () => {
      expect(formatTargetDisplay('octocat/Hello-World')).toBe('github.com/octocat/Hello-World');
      expect(formatTargetDisplay('octocat/Hello-World', { shortGit: true })).toBe(
        'octocat/Hello-World'
      );
    });

    it('formats GitLab URLs cleanly with full project path', () => {
      expect(formatTargetDisplay('https://gitlab.com/group/subgroup/project.git')).toBe(
        'gitlab.com/group/subgroup/project'
      );
    });

    it('formats web URLs cleanly with stripScheme option', () => {
      expect(formatTargetDisplay('https://example.com/', { stripScheme: true })).toBe(
        'example.com'
      );
      expect(formatTargetDisplay('http://127.0.0.1:8080/', { stripScheme: true })).toBe(
        '127.0.0.1:8080'
      );
      expect(
        formatTargetDisplay('http://sub.domain.co.uk:8080/path?param=1', { stripScheme: true })
      ).toBe('sub.domain.co.uk:8080/path?param=1');
    });
  });

  describe('resolveScanTarget', () => {
    it('determines git type correctly for repository targets', () => {
      const res = resolveScanTarget({
        target: 'https://github.com/octocat/Hello-World',
      });
      expect(res.targetType).toBe('git');
      expect(res.display).toBe('github.com/octocat/Hello-World');
      expect(res.shortDisplay).toBe('octocat/Hello-World');
      expect(res.baseUrl).toBe('https://github.com/octocat/Hello-World');
    });

    it('determines git type and proper HTTP baseUrl for SSH targets', () => {
      const res = resolveScanTarget({
        target: 'git@github.com:octocat/Hello-World.git',
      });
      expect(res.targetType).toBe('git');
      expect(res.display).toBe('github.com/octocat/Hello-World');
      expect(res.shortDisplay).toBe('octocat/Hello-World');
      expect(res.baseUrl).toBe('https://github.com/octocat/Hello-World');
    });

    it('determines git type and proper HTTP baseUrl for shorthand targets', () => {
      const res = resolveScanTarget({
        target: 'octocat/Hello-World',
      });
      expect(res.targetType).toBe('git');
      expect(res.display).toBe('github.com/octocat/Hello-World');
      expect(res.baseUrl).toBe('https://github.com/octocat/Hello-World');
    });

    it('determines web type correctly for standard web targets', () => {
      const res = resolveScanTarget({
        targets: { domain: 'http://testphp.vulnweb.com' },
      });
      expect(res.targetType).toBe('web');
      expect(res.display).toBe('http://testphp.vulnweb.com');
      expect(res.baseUrl).toBe('http://testphp.vulnweb.com');
    });

    it('handles web target with ports and complex query parameters', () => {
      const res = resolveScanTarget({
        target: 'http://sub.domain.co.uk:8080/path?param=1',
      });
      expect(res.targetType).toBe('web');
      expect(res.display).toBe('http://sub.domain.co.uk:8080/path?param=1');
      expect(res.baseUrl).toBe('http://sub.domain.co.uk:8080/path?param=1');
    });
  });
});
