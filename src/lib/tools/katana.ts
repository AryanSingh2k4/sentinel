import { spawn } from 'child_process';
import readline from 'readline';

export interface KatanaResult {
  url: string;
  method?: string;
  status_code?: number;
}

import path from 'path';

/**
 * Wrapper for ProjectDiscovery's Katana crawler
 * Ensure Katana is installed and accessible in the system PATH.
 */
export async function runKatana(target: string, onResult: (result: KatanaResult) => Promise<void> | void): Promise<void> {
  return new Promise((resolve, reject) => {
    // Resolve absolute path to the local binary
    const katanaPath = path.resolve(process.cwd(), 'bin', 'katana.exe');
    
    // -d 2: crawl depth 2, -ct 2: max crawl time 2 minutes, -silent: no banner
    const katana = spawn(katanaPath, ['-u', target, '-j', '-silent', '-d', '2', '-ct', '2'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const rl = readline.createInterface({
      input: katana.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      try {
        if (!line.trim()) return;
        
        let url = '';
        let method = 'GET';
        let status_code: number | undefined;

        try {
          const parsed = JSON.parse(line);
          url = parsed.request?.endpoint || parsed.url || parsed.endpoint;
          method = parsed.request?.method || parsed.method || 'GET';
          status_code = parsed.response?.status_code || parsed.status_code;
        } catch (e) {
          // If JSON parsing fails, but we have a non-empty string, it might be a raw URL from Katana
          if (line.startsWith('http')) {
            url = line.trim();
          }
        }

        if (!url) return;

        await onResult({ url, method, status_code });
      } catch (e) {
        // Safe catch for any unexpected errors during line processing
      }
    });

    katana.stderr.on('data', (data) => {
      console.log(`[Katana]: ${data.toString().trim()}`);
    });

    katana.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.warn(`[Katana] Exited with code ${code}`);
      }
      resolve();
    });

    katana.on('error', (err) => {
      console.error(`[Katana] Execution failed. Is it installed?`, err);
      reject(err);
    });
  });
}
