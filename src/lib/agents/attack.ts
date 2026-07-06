import { BaseAgent, supabaseAdmin } from './base';
import { runNuclei, NucleiResult } from '../tools/nuclei';

export class AttackAgent extends BaseAgent {
  async execute(): Promise<{ success: boolean; nextStep?: string; error?: string }> {
    try {
      await this.logEvent('ATTACK_STARTED', { target: this.context.target });
      await supabaseAdmin.from('scans').update({ status: 'ATTACK' }).eq('id', this.context.scanId);

      // 1. Fetch live URLs discovered during the recon phase
      const { data: urls, error: fetchError } = await supabaseAdmin
        .from('discovered_urls')
        .select('url')
        .eq('scan_id', this.context.scanId);

      if (fetchError || !urls || urls.length === 0) {
        throw new Error('No discovered URLs found for this scan. Cannot proceed with attack.');
      }

      const urlList = urls.map(u => u.url);
      await this.logEvent('NUCLEI_RUNNING', { targetCount: urlList.length });

      let findingCount = 0;

      // 2. Run Nuclei against the discovered URLs
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
      await this.logEvent('SCAN_COMPLETED', { target: this.context.target });
      
      return { success: true };

    } catch (error: any) {
      await this.logEvent('ATTACK_FAILED', { error: error.message });
      await supabaseAdmin.from('scans').update({ status: 'FAILED' }).eq('id', this.context.scanId);
      return { success: false, error: error.message };
    }
  }
}
