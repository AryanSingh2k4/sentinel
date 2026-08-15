import { BaseAgent, supabaseAdmin } from './base';
import { runTruffleHogGit, TruffleHogResult } from '../tools/trufflehog';

export class SecretAgent extends BaseAgent {
  async execute(): Promise<{ success: boolean; nextStep?: string; error?: string }> {
    try {
      await this.logEvent('SECRET_SCAN_STARTED', { target: this.context.target });
      await supabaseAdmin.from('scans').update({ status: 'SECRETS' }).eq('id', this.context.scanId);

      let targetUrl = this.context.target.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('git@')) {
        targetUrl = `https://${targetUrl}`;
      }

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
          reasoning: reasoning
        });
      });

      await this.logEvent('TRUFFLEHOG_FINISHED', { secretCount });

      // Advance state machine to VALIDATION
      await supabaseAdmin.from('scans').update({ status: 'VALIDATION' }).eq('id', this.context.scanId);
      return { success: true, nextStep: 'VALIDATE' };

    } catch (error: any) {
      await this.logEvent('SECRET_SCAN_FAILED', { error: error.message });
      await supabaseAdmin.from('scans').update({ status: 'FAILED' }).eq('id', this.context.scanId);
      return { success: false, error: error.message };
    }
  }
}
