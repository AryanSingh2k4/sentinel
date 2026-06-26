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
    
    // '-j' for JSON output, '-jc' to include request/response data if needed, '-silent' for no banner
    const katana = spawn(katanaPath, ['-u', target, '-j', '-silent']);

    const rl = readline.createInterface({
      input: katana.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      try {
        if (!line.trim()) return;
        const parsed = JSON.parse(line);
        
        const url = parsed.request?.endpoint || parsed.url;
        if (!url) return;

        await onResult({
          url,
          method: parsed.request?.method || 'GET',
          status_code: parsed.response?.status_code,
        });
      } catch (e) {
        // Ignore JSON parse errors for non-conforming lines
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
