import { spawn } from 'child_process';
import readline from 'readline';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export interface NucleiResult {
  template_id: string;
  info: {
    name: string;
    severity: string;
    description?: string;
    tags?: string[];
  };
  type: string;
  host: string;
  matched_at: string;
  ip?: string;
  timestamp: string;
  extracted_results?: string[];
}

/**
 * Wrapper for ProjectDiscovery's Nuclei
 * Used to run vulnerability templates against live targets.
 */
export async function runNuclei(urls: string[], onResult: (result: NucleiResult) => Promise<void> | void): Promise<void> {
  if (urls.length === 0) return;

  const tempFilePath = path.join(os.tmpdir(), `nuclei-${Date.now()}.txt`);
  await fs.writeFile(tempFilePath, urls.join('\n'));

  return new Promise((resolve, reject) => {
    // Resolve absolute path to the local binary
    const nucleiPath = path.resolve(process.cwd(), 'bin', 'nuclei.exe');
    
    // -l: file list
    // -jsonl: output JSON per line
    // -silent: no banner/logs in stdout
    // We are running default templates which include vulnerabilities, misconfigurations, default credentials, etc.
    const nuclei = spawn(nucleiPath, ['-l', tempFilePath, '-jsonl', '-silent'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const rl = readline.createInterface({
      input: nuclei.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      try {
        if (!line.trim()) return;
        const parsed = JSON.parse(line);
        
        const template_id = parsed['template-id'];
        const host = parsed.host;
        const matched_at = parsed['matched-at'];
        
        if (!template_id || !host) return;

        await onResult({
          template_id,
          info: {
            name: parsed.info?.name || 'Unknown Finding',
            severity: parsed.info?.severity || 'info',
            description: parsed.info?.description,
            tags: parsed.info?.tags,
          },
          type: parsed.type,
          host,
          matched_at,
          ip: parsed.ip,
          timestamp: parsed.timestamp,
          extracted_results: parsed['extracted-results']
        });
      } catch (e) {
        // Ignore JSON parse errors for non-conforming lines
      }
    });

    nuclei.stderr.on('data', (data) => {
      console.log(`[nuclei]: ${data.toString().trim()}`);
    });

    nuclei.on('close', async (code) => {
      await fs.unlink(tempFilePath).catch(() => {});
      if (code !== 0 && code !== null) {
        console.warn(`[nuclei] Exited with code ${code}`);
      }
      resolve();
    });

    nuclei.on('error', async (err) => {
      await fs.unlink(tempFilePath).catch(() => {});
      console.error(`[nuclei] Execution failed.`, err);
      reject(err);
    });
  });
}
