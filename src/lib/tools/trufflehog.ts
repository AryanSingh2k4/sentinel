import { spawn } from 'child_process';
import readline from 'readline';
import path from 'path';

export interface TruffleHogResult {
  detectorName: string;
  verified: boolean;
  raw?: string;
  redacted?: string;
  file?: string;
  commit?: string;
  email?: string;
  repository?: string;
  timestamp?: string;
}

/**
 * Wrapper for TruffleHog secret scanner.
 * Scans remote Git repositories for exposed API keys, credentials, and cryptographic secrets.
 */
export async function runTruffleHogGit(
  repoUrl: string,
  onResult: (result: TruffleHogResult) => Promise<void> | void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const trufflehogPath = path.resolve(process.cwd(), 'bin', 'trufflehog.exe');

    let normalizedUrl = repoUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://') && !normalizedUrl.startsWith('git@')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const trufflehog = spawn(
      trufflehogPath,
      ['git', normalizedUrl, '--json', '--no-update'],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    const rl = readline.createInterface({
      input: trufflehog.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      try {
        if (!line.trim()) return;
        const parsed = JSON.parse(line);

        // Filter out informational progress log lines
        if (parsed.level && !parsed.DetectorName && !parsed.SourceName) {
          return;
        }

        const detectorName = parsed.DetectorName || parsed.DecoderName || 'Exposed Secret';
        const verified = Boolean(parsed.Verified);
        const redacted = parsed.Redacted || parsed.Raw || '';
        const gitData = parsed.SourceMetadata?.Data?.Git;
        const file = gitData?.file || parsed.SourceMetadata?.Data?.Filesystem?.file || 'Repository Codebase';
        const commit = gitData?.commit;
        const email = gitData?.email;
        const repository = gitData?.repository || normalizedUrl;
        const timestamp = gitData?.timestamp;

        await onResult({
          detectorName,
          verified,
          raw: parsed.Raw,
          redacted,
          file,
          commit,
          email,
          repository,
          timestamp
        });
      } catch (e) {
        // Ignore non-JSON line parsing
      }
    });

    trufflehog.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) {
        console.log(`[TruffleHog]: ${msg}`);
      }
    });

    trufflehog.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.warn(`[TruffleHog] Exited with code ${code}`);
      }
      resolve();
    });

    trufflehog.on('error', (err) => {
      console.error(`[TruffleHog] Execution failed:`, err);
      reject(err);
    });
  });
}
