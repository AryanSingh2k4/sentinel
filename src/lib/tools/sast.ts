import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

export interface SASTFinding {
  title: string;
  vulnerabilityType: string;
  cwe: string;
  severity: 'critical' | 'high' | 'medium';
  confidence: number;
  file: string;
  line: number;
  codeSnippet: string;
  reasoning: string;
}

interface SASTRule {
  id: string;
  name: string;
  cwe: string;
  severity: 'critical' | 'high' | 'medium';
  pattern: RegExp;
  description: string;
  remediation: string;
}

const SAST_RULES: SASTRule[] = [
  // 1. SQL Injection (CWE-89)
  {
    id: 'SQLI_CONCAT',
    name: 'SQL Injection via String Concatenation/Interpolation',
    cwe: 'CWE-89',
    severity: 'critical',
    pattern: /(?:(?:query|execute|raw|select|find|where)\s*\(\s*(?:`[^`]*\$\{[^}]+\}[^`]*`|(["'])(?:(?!\1)[\s\S])*\b(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b(?:(?!\1)[\s\S])*\1\s*\+\s*[a-zA-Z0-9_.]+|\b[a-zA-Z0-9_.]+\s*\+\s*(["'])(?:(?!\2)[\s\S])*\b(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b))|(?:const|let|var)\s+\w*\s*=\s*(["'])(?:(?!\3)[\s\S])*\b(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b(?:(?!\3)[\s\S])*\3\s*\+\s*[a-zA-Z0-9_.]+/i,
    description: 'Dynamic SQL query constructed using raw string concatenation or template literal interpolation without parameterized bindings.',
    remediation: 'Use parameterized queries, prepared statements, or ORM parameterized methods (e.g. `db.query("SELECT * FROM users WHERE id = ?", [userId])`).',
  },
  {
    id: 'SQLI_PYTHON_FSTRING',
    name: 'SQL Injection in Python via Format/f-string',
    cwe: 'CWE-89',
    severity: 'critical',
    pattern: /(?:cursor|db|conn|connection)\.execute\s*\(\s*f["'][^"']*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)[^"']*\{/i,
    description: 'Python SQL query constructed using an f-string or % formatting, allowing direct SQL injection.',
    remediation: 'Pass arguments as a parameterized tuple/list to `cursor.execute(sql, (param,))`.',
  },

  // 2. Cross-Site Scripting (CWE-79)
  {
    id: 'XSS_REACT_DANGEROUSLY_SET',
    name: 'DOM XSS via dangerouslySetInnerHTML',
    cwe: 'CWE-79',
    severity: 'high',
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*(?!['"][^'"]*['"])[^}]+/i,
    description: 'Direct insertion of unescaped HTML via `dangerouslySetInnerHTML` allows arbitrary JavaScript execution in the user browser.',
    remediation: 'Sanitize input using a library like DOMPurify or render standard JSX elements instead of raw HTML.',
  },
  {
    id: 'XSS_INNER_HTML',
    name: 'DOM XSS via innerHTML Assignment',
    cwe: 'CWE-79',
    severity: 'high',
    pattern: /\b(?:innerHTML|outerHTML)\s*=\s*(?!['"]\s*['"])(?!['"][^'"]*['"])[a-zA-Z0-9_.]+/i,
    description: 'Direct assignment of dynamic values to `innerHTML` without sanitization permits stored or reflected Cross-Site Scripting.',
    remediation: 'Use `textContent`, `innerText`, or sanitize using DOMPurify before assignment.',
  },

  // 3. Command Injection & Arbitrary Code Execution (CWE-78 / CWE-94)
  {
    id: 'CMD_INJECTION_NODE',
    name: 'Command Injection via child_process',
    cwe: 'CWE-78',
    severity: 'critical',
    pattern: /(?:child_process\.)?(?:exec|execSync)\s*\(\s*(?:`[^`]*\$\{[^}]+\}[^`]*`|["'][^"']*["']\s*\+\s*[a-zA-Z0-9_.]+|[a-zA-Z0-9_.]+\s*\+)|(?:const|let|var)\s+\w*\s*=\s*["'][^"']*(?:ping|curl|wget|sh|bash|cat|rm|kill|ls)[^"']*["']\s*\+\s*[a-zA-Z0-9_.]+/i,
    description: 'Direct concatenation of dynamic input into a shell command allows arbitrary OS command injection.',
    remediation: 'Use `execFile` or `spawn` with an array of arguments, avoiding shell interpretation (`shell: false`).',
  },
  {
    id: 'EVAL_CODE_EXEC',
    name: 'Arbitrary Code Execution via eval()',
    cwe: 'CWE-94',
    severity: 'critical',
    pattern: /\beval\s*\(\s*(?!['"][^'"]*['"])[^)\n]+/i,
    description: 'Use of `eval()` on dynamic strings can allow arbitrary code execution.',
    remediation: 'Avoid `eval()`. Use `JSON.parse()` for data or safe parser abstractions.',
  },
  {
    id: 'CMD_INJECTION_PYTHON',
    name: 'Command Injection in Python via os.system / subprocess shell=True',
    cwe: 'CWE-78',
    severity: 'critical',
    pattern: /(?:os\.system\s*\(\s*f?["']|subprocess\.(?:call|Popen|run|check_output)\s*\([^)]*shell\s*=\s*True)/i,
    description: 'Spawning shell processes with `shell=True` or `os.system` exposes the host to command chaining attacks.',
    remediation: 'Use `subprocess.run(["cmd", "arg1", "arg2"], shell=False)`.',
  },

  // 4. Path Traversal (CWE-22)
  {
    id: 'PATH_TRAVERSAL',
    name: 'Path Traversal / Arbitrary File Read',
    cwe: 'CWE-22',
    severity: 'high',
    pattern: /(?:fs\.(?:readFile|readFileSync|createReadStream)|path\.(?:join|resolve))\s*\([^)]*(?:req\.|params|query|body|fileName|userInput|filePath)\b/i,
    description: 'Constructing filesystem paths directly from user input allows traversal sequences (e.g. `../../etc/passwd`).',
    remediation: 'Verify resolved path stays within an allowed base directory using `path.resolve` and `startsWith()`, or use an allowlist.',
  },

  // 5. Server-Side Request Forgery / SSRF (CWE-918)
  {
    id: 'SSRF_DYNAMIC_REQUEST',
    name: 'Server-Side Request Forgery (SSRF)',
    cwe: 'CWE-918',
    severity: 'high',
    pattern: /(?:axios|fetch|http\.get|https\.get|requests\.get|urllib\.request\.urlopen)\s*\(\s*(?:req\.(?:query|body|params)|userUrl|targetUrl|inputUrl)\b/i,
    description: 'Sending HTTP requests to user-controlled URLs allows internal network port scanning and metadata service credential theft.',
    remediation: 'Validate destination URLs against a strict domain/IP allowlist and block private IP ranges (127.0.0.1, 169.254.169.254, RFC1918).',
  },

  // 6. Insecure CORS Configuration (CWE-942)
  {
    id: 'CORS_WILDCARD_CREDENTIALS',
    name: 'Insecure CORS Wildcard with Credentials',
    cwe: 'CWE-942',
    severity: 'medium',
    pattern: /['"]Access-Control-Allow-Origin['"]\s*,\s*['"]\*['"]\s*[\s\S]{0,80}['"]Access-Control-Allow-Credentials['"]\s*,\s*['"]true['"]/i,
    description: 'Allowing all origins (`*`) while also enabling credentials permits cross-origin session hijacking.',
    remediation: 'Specify explicit trusted origins in CORS headers instead of wildcards when credentials are required.',
  },

  // 7. Hardcoded High-Entropy Secrets (CWE-798)
  {
    id: 'HARDCODED_SECRET_CODE',
    name: 'Hardcoded Secret / API Token in Source Code',
    cwe: 'CWE-798',
    severity: 'critical',
    pattern: /(?:const|let|var|val|final|String|\$)?\s*(?:api[_-]?key|secret[_-]?key|auth[_-]?token|jwt[_-]?secret|private[_-]?key)\s*=\s*['"][A-Za-z0-9_\-.~+/=]{20,}['"]/i,
    description: 'High-entropy cryptographic secret or API token hardcoded directly in active source code.',
    remediation: 'Move sensitive credentials to environment variables (e.g. `process.env.API_KEY`) and load them from a secrets vault.',
  },
];

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'vendor',
  '.vscode',
  'coverage',
  '.yarn',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.php',
  '.go',
  '.java',
  '.rb',
  '.sql',
  '.env',
  '.json',
  '.yml',
  '.yaml',
]);

/**
 * Shallow clone a Git repository to a local directory for deep SAST code analysis
 */
export async function cloneRepository(repoUrl: string, targetDir: string): Promise<boolean> {
  return new Promise((resolve) => {
    let cleanUrl = repoUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('git@')) {
      if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(cleanUrl)) {
        cleanUrl = `https://github.com/${cleanUrl}`;
      } else {
        cleanUrl = `https://${cleanUrl}`;
      }
    }

    // Embed GITHUB_TOKEN if available and it's a GitHub URL
    if (process.env.GITHUB_TOKEN && cleanUrl.includes('github.com') && !cleanUrl.includes('@')) {
      cleanUrl = cleanUrl.replace('https://github.com', `https://${process.env.GITHUB_TOKEN}@github.com`);
    }

    const gitProc = spawn('git', ['clone', '--depth', '1', cleanUrl, targetDir], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60000, // 60s timeout
    });

    gitProc.on('close', (code) => {
      resolve(code === 0);
    });

    gitProc.on('error', (err) => {
      console.warn('[SAST] Git clone error:', err.message);
      resolve(false);
    });
  });
}

/**
 * Recursively find all source code files in a directory
 */
function findSourceFiles(dir: string, baseDir: string = dir): string[] {
  let results: string[] = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (IGNORED_DIRS.has(file)) continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(findSourceFiles(fullPath, baseDir));
      } else {
        const ext = path.extname(file).toLowerCase();
        if (ALLOWED_EXTENSIONS.has(ext)) {
          // Keep relative path
          results.push(path.relative(baseDir, fullPath));
        }
      }
    }
  } catch (err: any) {
    console.warn(`[SAST] Error reading directory ${dir}:`, err.message);
  }
  return results;
}

/**
 * Analyze a source code repository for vulnerabilities (SQLi, XSS, RCE, Path Traversal, etc.)
 */
export async function runSASTScan(
  baseDir: string,
  onFinding: (finding: SASTFinding) => Promise<void> | void
): Promise<number> {
  const files = findSourceFiles(baseDir);
  let findingCount = 0;
  const seenFindings = new Set<string>();

  for (const relFile of files) {
    const fullPath = path.join(baseDir, relFile);
    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      continue;
    }

    // Skip minified or bundle files
    if (content.length > 500000 || (content.length > 10000 && !content.includes('\n'))) {
      continue;
    }

    const lines = content.split('\n');

    for (const rule of SAST_RULES) {
      // Test regex across file content
      const match = rule.pattern.exec(content);
      if (match) {
        // Calculate line number
        const matchIndex = match.index;
        const lineNum = content.substring(0, matchIndex).split('\n').length;
        const startLine = Math.max(0, lineNum - 2);
        const endLine = Math.min(lines.length, lineNum + 2);
        const codeSnippet = lines.slice(startLine, endLine).join('\n');

        const dedupKey = `${rule.id}:${relFile}:${lineNum}`;
        if (seenFindings.has(dedupKey)) continue;
        seenFindings.add(dedupKey);

        findingCount++;

        const finding: SASTFinding = {
          title: `${rule.name} in ${relFile}`,
          vulnerabilityType: rule.name,
          cwe: rule.cwe,
          severity: rule.severity,
          confidence: 90,
          file: relFile.replace(/\\/g, '/'),
          line: lineNum,
          codeSnippet: codeSnippet.trim(),
          reasoning: [
            `Vulnerability: ${rule.name} (${rule.cwe})`,
            `File: ${relFile.replace(/\\/g, '/')}`,
            `Line: ${lineNum}`,
            `Severity: ${rule.severity.toUpperCase()}`,
            `Description: ${rule.description}`,
            `Vulnerable Code Snippet:`,
            codeSnippet.trim(),
            `Remediation: ${rule.remediation}`,
          ].join('\n'),
        };

        await onFinding(finding);
      }
    }
  }

  return findingCount;
}
