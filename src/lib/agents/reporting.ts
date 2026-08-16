import { BaseAgent, supabaseAdmin } from './base';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

export class ReportAgent extends BaseAgent {
  async execute(): Promise<{ success: boolean; nextStep?: string; error?: string }> {
    try {
      await this.logEvent('REPORT_GENERATION_STARTED', { scanId: this.context.scanId });
      await supabaseAdmin.from('scans').update({ status: 'REPORTING' }).eq('id', this.context.scanId);

      // 1. Fetch scan metadata
      const { data: scan } = await supabaseAdmin
        .from('scans')
        .select(`
          id,
          status,
          started_at,
          targets ( domain, base_url )
        `)
        .eq('id', this.context.scanId)
        .single();

      // 2. Fetch technologies
      const { data: technologies } = await supabaseAdmin
        .from('discovered_technologies')
        .select('technology, confidence')
        .eq('scan_id', this.context.scanId);

      // 3. Fetch candidate findings
      const { data: candidateFindings } = await supabaseAdmin
        .from('candidate_findings')
        .select('*')
        .eq('scan_id', this.context.scanId);

      // 4. Fetch confirmed findings
      const candidateIds = (candidateFindings || []).map((f: any) => f.id);
      const confirmedFindings = candidateIds.length > 0
        ? (await supabaseAdmin
            .from('confirmed_findings')
            .select(`
              id,
              severity,
              confirmed,
              created_at,
              candidate_findings (
                title,
                reasoning
              )
            `)
            .in('candidate_finding_id', candidateIds)).data
        : [];

      const targetDomain = scan?.targets?.domain || this.context.target || 'Target';
      const techList = (technologies || []).map(t => t.technology).join(', ') || 'Standard Web Stack';
      const totalCandidates = candidateFindings?.length || 0;
      const verifiedVulns = (confirmedFindings || []).filter(f => f.confirmed);
      const falsePositives = (confirmedFindings || []).filter(f => !f.confirmed);

      // 5. Generate AI Executive Summary
      let summaryText = `Security assessment completed for ${targetDomain}. Discovered ${totalCandidates} potential findings across tech stack (${techList}).`;

      try {
        const prompt = `
You are a senior penetration testing lead.
Write a concise 2-3 paragraph Executive Risk Summary for a security audit report.

Target: ${targetDomain}
Identified Technologies: ${techList}
Candidate Findings Evaluated: ${totalCandidates}
AI Verified Vulnerabilities: ${verifiedVulns.length}
False Positives Filtered Out: ${falsePositives.length}

Verified Findings Details:
${JSON.stringify(verifiedVulns.map(v => ({
  title: v.candidate_findings?.title,
  severity: v.severity,
  reasoning: v.candidate_findings?.reasoning?.substring(0, 300)
})), null, 2)}

Provide a professional, objective summary describing the security posture, key exposure risks, and top priority remediation steps. Do not include markdown headers or bullet points; output clean paragraphs.`;

        const response = await openai.chat.completions.create({
          model: process.env.LLM_MODEL || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        });

        let aiSummary = response.choices[0]?.message?.content?.trim();
        if (aiSummary) {
          // Strip <thought> blocks if returned by thinking models
          aiSummary = aiSummary.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
          if (aiSummary) {
            summaryText = aiSummary;
          }
        }
      } catch (err: any) {
        console.warn('AI Summary generation fallback:', err.message);
      }

      // 6. Save report to database
      const reportTitle = `Security Assessment Report - ${targetDomain}`;
      const { error: reportError } = await supabaseAdmin.from('reports').insert({
        scan_id: this.context.scanId,
        title: reportTitle,
        summary: summaryText,
      });

      if (reportError) {
        console.error('Error saving report record:', reportError);
      }

      // 7. Mark scan as COMPLETED
      await supabaseAdmin.from('scans').update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString()
      }).eq('id', this.context.scanId);

      await this.logEvent('REPORT_GENERATION_COMPLETED', {
        scanId: this.context.scanId,
        verifiedVulnsCount: verifiedVulns.length
      });
      await this.logEvent('SCAN_COMPLETED', { target: this.context.target });

      return { success: true };
    } catch (error: any) {
      await this.logEvent('REPORT_GENERATION_FAILED', { error: error.message });
      await supabaseAdmin.from('scans').update({ status: 'FAILED' }).eq('id', this.context.scanId);
      return { success: false, error: error.message };
    }
  }
}
