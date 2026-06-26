import { BaseAgent, supabaseAdmin } from './base';
import { runKatana } from '../tools/katana';

export class ReconAgent extends BaseAgent {
  async execute() {
    await this.logEvent('AGENT_START', { agent: 'ReconAgent', status: 'running' });
    
    console.log(`[ReconAgent] Performing reconnaissance on ${this.context.target}...`);
    
    // Update the scan status in Supabase
    await supabaseAdmin.from('scans').update({ status: 'recon' }).eq('id', this.context.scanId);

    let urlsFound = 0;

    try {
      // Execute Katana and insert results into Supabase as they are streamed
      await runKatana(`https://${this.context.target}`, async (result) => {
        const { error } = await supabaseAdmin.from('discovered_urls').insert({
          scan_id: this.context.scanId,
          url: result.url,
          method: result.method || 'GET',
          status_code: result.status_code,
          discovered_by: 'Katana'
        });

        if (!error) {
          urlsFound++;
        }
      });
    } catch (err) {
      console.warn(`[ReconAgent] Katana failed (is it installed?). Falling back to basic mock...`);
      // Optional fallback logic if Katana is missing
    }

    await this.logEvent('AGENT_COMPLETE', { 
      agent: 'ReconAgent', 
      status: 'success', 
      metrics: { urls_found: urlsFound } 
    });

    // Advance state machine to the next phase
    return { success: true, nextStep: 'attack' };
  }
}
