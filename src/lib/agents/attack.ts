import { BaseAgent, supabaseAdmin } from './base';
import { runNuclei, NucleiResult } from '../tools/nuclei';
import { runTruffleHogFilesystem, TruffleHogResult } from '../tools/trufflehog';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

interface FrontendSecretPattern {
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high';
}

const HIGH_CONFIDENCE_PATTERNS: FrontendSecretPattern[] = [
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
  { name: 'OpenAI API Key', pattern: /sk-(?:proj-)?[a-zA-Z0-9_-]{32,}/g, severity: 'critical' },
  { name: 'Stripe Secret Key', pattern: /(?:sk|rk)_live_[0-9a-zA-Z]{24,}/g, severity: 'critical' },
  { name: 'GitHub Personal Access Token', pattern: /ghp_[0-9a-zA-Z]{36}/g, severity: 'critical' },
  { name: 'Slack Bot Token', pattern: /xoxb-[0-9]{11,13}-[0-9]{11,13}-[a-zA-Z0-9]{24}/g, severity: 'critical' },
  { name: 'Database Connection String', pattern: /(?:postgres|postgresql|mysql|mongodb|mongodb\+srv|redis):\/\/[^\s"':]+:[^\s"'@]+@[^\s"']+/gi, severity: 'critical' },
  { name: 'Google / Firebase API Key', pattern: /AIza[0-9A-Za-z\-_]{35}/g, severity: 'high' },
  { name: 'SendGrid API Key', pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g, severity: 'high' },
];

export class AttackAgent extends BaseAgent {
  async execute(): Promise<{ success: boolean; nextStep?: string; error?: string }> {
    try {
      await this.logEvent('ATTACK_STARTED', { target: this.context.target });
      await supabaseAdmin.from('scans').update({ status: 'ATTACK' }).eq('id', this.context.scanId);

      // 1. Fetch live URLs discovered during the recon phase (or fallback to seed target)
      const { data: urls } = await supabaseAdmin
        .from('discovered_urls')
        .select('url')
        .eq('scan_id', this.context.scanId);

      const urlList = (urls && urls.length > 0)
        ? Array.from(new Set(urls.map(u => u.url)))
        : [this.context.target];

      // 2. Client-Side Frontend Asset & JavaScript Secret Audit
      await this.auditFrontendSecrets(urlList);

      // 3. Run Nuclei against the discovered URLs
      await this.logEvent('NUCLEI_RUNNING', { targetCount: urlList.length });

      let findingCount = 0;

      await runNuclei(urlList, async (result: NucleiResult) => {
        findingCount++;
        
        const reasoning = [
          `Template: ${result.template_id}`,
          `Matched at: ${result.matched_at}`,
          result.ip ? `IP: ${result.ip}` : null,
          result.info.description ? `Description: ${result.info.description}` : null,
          result.extracted_results && result.extracted_results.length > 0 
            ? `Extracted: ${result.extracted_results.join(', ')}` 
            : null
        ].filter(Boolean).join('\n');

        // Store the finding
        await supabaseAdmin.from('candidate_findings').insert({
          scan_id: this.context.scanId,
          title: result.info.name,
          severity: result.info.severity,
          confidence: 100, // Nuclei findings are usually deterministic
          reasoning: reasoning
        });
      });

      await this.logEvent('NUCLEI_FINISHED', { findingsCount: findingCount });

      // Trigger Validation phase
      await supabaseAdmin.from('scans').update({ status: 'VALIDATION' }).eq('id', this.context.scanId);
      
      return { success: true, nextStep: 'VALIDATE' };
    } catch (error: any) {
      await this.logEvent('ATTACK_FAILED', { error: error.message });
      await supabaseAdmin.from('scans').update({ status: 'FAILED' }).eq('id', this.context.scanId);
      return { success: false, error: error.message };
    }
  }

  /**
   * Discovers, downloads, and analyzes client-side frontend assets (JS bundles, HTML)
   * for leaked secrets, tokens, and credentials using TruffleHog and specialized patterns.
   */
  private async auditFrontendSecrets(discoveredUrls: string[]): Promise<void> {
    const tempDir = path.join(os.tmpdir(), `sentinel-frontend-${randomUUID()}`);
    const assetUrlMap = new Map<string, string>(); // localPath -> originalUrl
    const downloadedAssets: { localPath: string; url: string; content: string }[] = [];
    const seenSecretKeys = new Set<string>();

    try {
      await fs.promises.mkdir(tempDir, { recursive: true });

      // Identify candidates for frontend inspection: JS files, HTML, and base URLs
      const targetBase = this.context.target.startsWith('http')
        ? this.context.target
        : `http://${this.context.target}`;

      const candidateUrls = new Set<string>();
      candidateUrls.add(targetBase);

      for (const u of discoveredUrls) {
        if (!u || typeof u !== 'string') continue;
        const lower = u.toLowerCase();
        if (
          lower.endsWith('.js') ||
          lower.endsWith('.mjs') ||
          lower.endsWith('.map') ||
          lower.endsWith('.html') ||
          lower.endsWith('.htm') ||
          lower.includes('/chunks/') ||
          lower.includes('/bundle') ||
          lower.includes('/static/js/') ||
          lower.includes('/_next/static/') ||
          lower.includes('/assets/')
        ) {
          candidateUrls.add(u);
        }
      }

      // Also inspect the root/seed page HTML to extract any additional <script src="..."> tags
      try {
        const rootRes = await fetch(targetBase, { signal: AbortSignal.timeout(5000) });
        if (rootRes.ok) {
          const html = await rootRes.text();
          const scriptSrcRegex = /<script[^>]+src=["']([^"']+)["']/gi;
          let match;
          while ((match = scriptSrcRegex.exec(html)) !== null) {
            try {
              const absoluteScriptUrl = new URL(match[1], targetBase).toString();
              candidateUrls.add(absoluteScriptUrl);
            } catch {
              // Ignore malformed script URL
            }
          }
        }
      } catch {
        // Root page fetch fallback
      }

      const assetList = Array.from(candidateUrls).slice(0, 50); // limit to top 50 assets
      await this.logEvent('FRONTEND_SECRETS_SCANNING', { assetCount: assetList.length });

      // Download assets into temp directory
      let assetIndex = 0;
      for (const assetUrl of assetList) {
        try {
          const res = await fetch(assetUrl, { signal: AbortSignal.timeout(5000) });
          if (!res.ok) continue;

          const content = await res.text();
          if (!content || content.length < 10) continue;

          // Determine clean filename
          const urlObj = new URL(assetUrl);
          const baseName = path.basename(urlObj.pathname) || (assetIndex === 0 ? 'index.html' : `asset_${assetIndex}.js`);
          const safeName = `${assetIndex}_${baseName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const localPath = path.join(tempDir, safeName);

          await fs.promises.writeFile(localPath, content, 'utf-8');
          assetUrlMap.set(localPath, assetUrl);
          downloadedAssets.push({ localPath, url: assetUrl, content });
          assetIndex++;
        } catch {
          // Ignore individual asset fetch failures
        }
      }

      let secretCount = 0;

      // A. Run TruffleHog filesystem on the downloaded frontend assets
      try {
        await runTruffleHogFilesystem(tempDir, async (result: TruffleHogResult) => {
          const matchedFile = result.file || '';
          const originalUrl = assetUrlMap.get(matchedFile) || matchedFile;
          const displayFile = path.basename(matchedFile) || 'Frontend Bundle';
          const snippet = result.redacted || (result.raw ? result.raw.substring(0, 40) + '...' : '');

          const uniqueKey = `${result.detectorName}:${originalUrl}:${snippet}`;
          if (seenSecretKeys.has(uniqueKey)) return;
          seenSecretKeys.add(uniqueKey);

          secretCount++;
          const isVerified = result.verified;
          const severity = isVerified ? 'critical' : 'high';
          const title = `Exposed Secret: ${result.detectorName} Key in Frontend Asset (${displayFile})`;

          const reasoning = [
            `Detector: ${result.detectorName}`,
            `Verification Status: ${isVerified ? 'VERIFIED LIVE (Active Secret)' : 'PATTERN MATCH'}`,
            `Asset URL: ${originalUrl}`,
            `File: ${displayFile}`,
            snippet ? `Secret Snippet: ${snippet}` : null,
            `Exposure Type: Client-Side Frontend Asset / Public Bundle (Exposed without repository access)`
          ].filter(Boolean).join('\n');

          await supabaseAdmin.from('candidate_findings').insert({
            scan_id: this.context.scanId,
            title: title,
            severity: severity,
            confidence: isVerified ? 100 : 85,
            reasoning: reasoning
          });
        });
      } catch (thErr: any) {
        console.warn(`[AttackAgent] TruffleHog filesystem check error:`, thErr.message);
      }

      // B. High-Confidence Pattern Matching on Downloaded Frontend Contents
      for (const asset of downloadedAssets) {
        for (const rule of HIGH_CONFIDENCE_PATTERNS) {
          rule.pattern.lastIndex = 0;
          let match;
          while ((match = rule.pattern.exec(asset.content)) !== null) {
            const secretValue = match[0];
            const snippet = secretValue.length > 20
              ? `${secretValue.substring(0, 6)}...${secretValue.substring(secretValue.length - 4)}`
              : secretValue;

            const uniqueKey = `${rule.name}:${asset.url}:${secretValue}`;
            if (seenSecretKeys.has(uniqueKey)) continue;
            seenSecretKeys.add(uniqueKey);

            secretCount++;
            const displayFile = path.basename(new URL(asset.url).pathname) || 'bundle.js';
            const title = `Exposed Secret: ${rule.name} in Frontend Asset (${displayFile})`;

            const reasoning = [
              `Detector: ${rule.name}`,
              `Verification Status: PATTERN MATCH (High Confidence)`,
              `Asset URL: ${asset.url}`,
              `File: ${displayFile}`,
              `Secret Snippet: ${snippet}`,
              `Exposure Type: Client-Side Frontend Bundle / Public HTML (Leaked in client bundle)`
            ].join('\n');

            await supabaseAdmin.from('candidate_findings').insert({
              scan_id: this.context.scanId,
              title: title,
              severity: rule.severity,
              confidence: 90,
              reasoning: reasoning
            });
          }
        }
      }

      await this.logEvent('FRONTEND_SECRETS_FINISHED', {
        assetsAnalyzed: downloadedAssets.length,
        secretsFound: secretCount
      });
    } catch (err: any) {
      console.error(`[AttackAgent] Frontend secret audit error:`, err);
    } finally {
      // Clean up temp directory
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup error
      }
    }
  }
}

