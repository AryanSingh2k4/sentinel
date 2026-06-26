import { spawn } from 'child_process';
import readline from 'readline';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export interface HttpxResult {
  url: string;
  status_code?: number;
  title?: string;
  webserver?: string;
  tech?: string[];
  content_length?: number;
}

/**
 * Wrapper for ProjectDiscovery's httpx
 * Used to filter live hosts and fingerprint technology stacks.
 */
export async function runHttpx(urls: string[], onResult: (result: HttpxResult) => Promise<void> | void): Promise<void> {
  if (urls.length === 0) return;

  const tempFilePath = path.join(os.tmpdir(), `httpx-${Date.now()}.txt`);
  await fs.writeFile(tempFilePath, urls.join('\n'));

  return new Promise((resolve, reject) => {
    // Resolve absolute path to the local binary
    const httpxPath = path.resolve(process.cwd(), 'bin', 'httpx.exe');
    
    // -l: file list
    // -json: output JSON
    // -silent: no banner
    // -sc: status code
    // -title: page title
    // -td: tech detect
    const httpx = spawn(httpxPath, ['-l', tempFilePath, '-json', '-silent', '-sc', '-title', '-td'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const rl = readline.createInterface({
      input: httpx.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      try {
        if (!line.trim()) return;
        const parsed = JSON.parse(line);
        
        const url = parsed.url;
        if (!url) return;

        await onResult({
          url,
          status_code: parsed.status_code,
          title: parsed.title,
          webserver: parsed.webserver,
          tech: parsed.tech,
          content_length: parsed.content_length
        });
      } catch (e) {
        // Ignore JSON parse errors for non-conforming lines
      }
    });

    httpx.stderr.on('data', (data) => {
      console.log(`[httpx]: ${data.toString().trim()}`);
    });

    httpx.on('close', async (code) => {
      await fs.unlink(tempFilePath).catch(() => {});
      if (code !== 0 && code !== null) {
        console.warn(`[httpx] Exited with code ${code}`);
      }
      resolve();
    });

    httpx.on('error', async (err) => {
      await fs.unlink(tempFilePath).catch(() => {});
      console.error(`[httpx] Execution failed.`, err);
      reject(err);
    });
  });
}
