import { BaseAgent, AgentContext, supabaseAdmin } from './base';
import { runKatana } from '../tools/katana';
import { runHttpx, HttpxResult } from '../tools/httpx';

export class ReconAgent extends BaseAgent {
  async execute(): Promise<{ success: boolean; nextStep?: string; error?: string }> {
    try {
      await this.logEvent('RECON_STARTED', { target: this.context.target });
      await supabaseAdmin.from('scans').update({ status: 'RECON' }).eq('id', this.context.scanId);

      const crawledUrls = new Set<string>();

      // 1. Crawl with Katana
      await this.logEvent('KATANA_RUNNING', { target: this.context.target });
      await runKatana(this.context.target, async (result) => {
        crawledUrls.add(result.url);
      });

      const urlList = Array.from(crawledUrls);
      await this.logEvent('KATANA_FINISHED', { count: urlList.length });

      if (urlList.length === 0) {
        throw new Error('No URLs found during recon phase.');
      }

      // 2. Filter and fingerprint with httpx
      await this.logEvent('HTTPX_RUNNING', { targetCount: urlList.length });
      
      const liveHosts: HttpxResult[] = [];
      await runHttpx(urlList, async (result) => {
        liveHosts.push(result);
        
        // Log discovered URLs
        await supabaseAdmin.from('discovered_urls').insert({
          scan_id: this.context.scanId,
          url: result.url,
          status_code: result.status_code || null,
          discovered_by: 'httpx'
        });

        // Log technologies if found
        if (result.tech && result.tech.length > 0) {
          const techInserts = result.tech.map(t => ({
            scan_id: this.context.scanId,
            technology: t,
            confidence: 100
          }));
          await supabaseAdmin.from('discovered_technologies').insert(techInserts);
        }
      });

      await this.logEvent('HTTPX_FINISHED', { liveCount: liveHosts.length });

      // Update scan status and proceed to attack phase
      await supabaseAdmin.from('scans').update({ status: 'ATTACK' }).eq('id', this.context.scanId);
      
      return { success: true, nextStep: 'ATTACK' };

    } catch (error: any) {
      await this.logEvent('RECON_FAILED', { error: error.message });
      await supabaseAdmin.from('scans').update({ status: 'FAILED' }).eq('id', this.context.scanId);
      return { success: false, error: error.message };
    }
  }
}
