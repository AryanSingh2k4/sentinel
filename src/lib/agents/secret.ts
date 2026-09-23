import path from 'path';
import os from 'os';
import fs from 'fs';
import { BaseAgent, supabaseAdmin } from './base';
import { runTruffleHogGit, TruffleHogResult } from '../tools/trufflehog';
import { cloneRepository, runSASTScan, SASTFinding } from '../tools/sast';

export class SecretAgent extends BaseAgent {
  async execute(): Promise<{ success: boolean; nextStep?: string; error?: string }> {
    try {
      await this.logEvent('GIT_AUDIT_STARTED', { target: this.context.target });
      await supabaseAdmin.from('scans').update({ status: 'SECRETS' }).eq('id', this.context.scanId);

      let targetUrl = this.context.target.trim();
      if (!targetUrl.startsWith('http') && !targetUrl.startsWith('git@')) {
        targetUrl = `https://${targetUrl}`;
      }

      const tempDir = path.join(os.tmpdir(), `sentinel-audit-${this.context.scanId}`);

      // 1. Shallow clone the target repository for SAST code analysis
      await this.logEvent('GIT_CLONING', { repo: targetUrl, tempDir });
      const cloned = await cloneRepository(targetUrl, tempDir);

      let sastCount = 0;
      if (cloned && fs.existsSync(tempDir)) {
        await this.logEvent('GIT_CLONED', { status: 'Repository codebase ingested successfully' });
        await this.logEvent('SAST_SCAN_STARTED', { engine: 'Sentinel Semantic SAST & AST Engine' });

        // 2. Perform deep static code analysis (SQLi, XSS, RCE, Path Traversal, SSRF, etc.)
        sastCount = await runSASTScan(tempDir, async (finding: SASTFinding) => {
          await this.logEvent('SAST_VULNERABILITY_FOUND', {
            type: finding.vulnerabilityType,
            cwe: finding.cwe,
            file: finding.file,
            line: finding.line,
            severity: finding.severity,
          });

          await supabaseAdmin.from('candidate_findings').insert({
            scan_id: this.context.scanId,
            title: finding.title,
            severity: finding.severity,
            confidence: finding.confidence,
            reasoning: finding.reasoning,
          });
        });

        await this.logEvent('SAST_SCAN_FINISHED', { vulnerabilitiesDetected: sastCount });
      } else {
        await this.logEvent('GIT_CLONE_WARNING', { 
          message: 'Could not shallow clone repository locally. Proceeding with remote history audit.' 
        });
      }

      // 3. Run TruffleHog for deep commit history secret hunting
      let secretCount = 0;
      const seenKeys = new Set<string>();

      await this.logEvent('TRUFFLEHOG_RUNNING', { repo: targetUrl });

      await runTruffleHogGit(targetUrl, async (result: TruffleHogResult) => {
        const uniqueKey = `${result.detectorName}:${result.file}:${result.commit || ''}:${result.redacted || ''}`;
        if (seenKeys.has(uniqueKey)) return;
        seenKeys.add(uniqueKey);

        secretCount++;

        const severity = result.verified ? 'critical' : 'high';
        const title = `Exposed Secret: ${result.detectorName} Key in ${result.file}`;

        const reasoning = [
          `Detector: ${result.detectorName}`,
          `Verification Status: ${result.verified ? 'VERIFIED LIVE (Active Secret)' : 'UNVERIFIED PATTERN MATCH'}`,
          `File: ${result.file}`,
          result.commit ? `Commit: ${result.commit}` : null,
          result.email ? `Author: ${result.email}` : null,
          result.redacted ? `Secret Snippet: ${result.redacted}` : null,
        ].filter(Boolean).join('\n');

        // Store candidate finding
        await supabaseAdmin.from('candidate_findings').insert({
          scan_id: this.context.scanId,
          title: title,
          severity: severity,
          confidence: result.verified ? 100 : 85,
          reasoning: reasoning,
        });
      });

      await this.logEvent('TRUFFLEHOG_FINISHED', { secretCount });

      await this.logEvent('GIT_AUDIT_COMPLETED', {
        sastVulnerabilities: sastCount,
        leakedSecrets: secretCount,
        totalIssues: sastCount + secretCount,
      });

      // Advance state machine to VALIDATION
      await supabaseAdmin.from('scans').update({ status: 'VALIDATION' }).eq('id', this.context.scanId);
      return { success: true, nextStep: 'VALIDATE' };

    } catch (error: any) {
      await this.logEvent('GIT_AUDIT_FAILED', { error: error.message });
      await supabaseAdmin.from('scans').update({ status: 'FAILED' }).eq('id', this.context.scanId);
      return { success: false, error: error.message };
    }
  }
}
