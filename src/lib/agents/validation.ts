import { BaseAgent, supabaseAdmin } from './base';
import OpenAI from 'openai';

// This allows using Groq, Together, Ollama, or OpenAI just by changing the URL and Key in .env.local
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

export class ValidationAgent extends BaseAgent {
  async execute(): Promise<{ success: boolean; nextStep?: string; error?: string }> {
    try {
      await this.logEvent('VALIDATION_STARTED', { target: this.context.target });
      await supabaseAdmin.from('scans').update({ status: 'VALIDATION' }).eq('id', this.context.scanId);

      // 1. Fetch all candidate findings for this scan that haven't been validated yet
      const { data: findings, error: fetchError } = await supabaseAdmin
        .from('candidate_findings')
        .select('*')
        .eq('scan_id', this.context.scanId);

      if (fetchError) throw fetchError;

      if (!findings || findings.length === 0) {
        await this.logEvent('VALIDATION_SKIPPED', { message: 'No candidate findings to validate' });
        await supabaseAdmin.from('scans').update({ status: 'COMPLETED' }).eq('id', this.context.scanId);
        return { success: true };
      }

      await this.logEvent('LLM_TRIAGE_STARTED', { findingsCount: findings.length });
      
      let falsePositives = 0;
      let confirmedIssues = 0;

      // 2. Loop through each finding and ask the LLM to triage it
      for (const finding of findings) {
        const prompt = `
You are an expert cybersecurity triage agent.
Your job is to read a raw vulnerability finding from an automated scanner (Nuclei) and determine if it is a REAL vulnerability or a FALSE POSITIVE.

Finding Title: ${finding.title}
Severity: ${finding.severity}
Raw Output / Reasoning:
${finding.reasoning}

Analyze the URL, the vulnerability type, and the extracted data. 
For example, if the finding is "Default Login" but the URL is a public social media page like Instagram or Twitter, it is a FALSE POSITIVE.

Respond with ONLY a JSON object in this exact format:
{
  "is_false_positive": boolean,
  "reason": "1 sentence explanation"
}`;

        try {
          const response = await openai.chat.completions.create({
            model: process.env.LLM_MODEL || 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.1,
          });

          let content = response.choices[0].message.content;
          if (!content) continue;

          // Extract JSON block using regex to bypass <thought> blocks or markdown
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            console.error(`Failed to find JSON block in finding ${finding.id}: ${content.substring(0, 50)}...`);
            continue;
          }
          
          let isFalsePositive = false;
          try {
            const result = JSON.parse(jsonMatch[0]);
            isFalsePositive = result.is_false_positive;
          } catch(e) {
            console.error(`Failed to parse JSON for finding ${finding.id}: ${jsonMatch[0].substring(0, 50)}...`);
            continue;
          }

          // 3. Store the result in confirmed_findings
          await supabaseAdmin.from('confirmed_findings').insert({
            candidate_finding_id: finding.id,
            severity: finding.severity,
            confirmed: !isFalsePositive
          });

          if (isFalsePositive) {
            falsePositives++;
            // Optionally, you could also delete it from candidate_findings to clean up the DB
            // await supabaseAdmin.from('candidate_findings').delete().eq('id', finding.id);
          } else {
            confirmedIssues++;
          }

        } catch (llmError: any) {
          console.error(`LLM Error on finding ${finding.id}:`, llmError.message);
        }
      }

      await this.logEvent('LLM_TRIAGE_FINISHED', { falsePositives, confirmedIssues });
      await supabaseAdmin.from('scans').update({ status: 'COMPLETED', completed_at: new Date().toISOString() }).eq('id', this.context.scanId);
      await this.logEvent('SCAN_COMPLETED', { target: this.context.target });

      return { success: true };

    } catch (error: any) {
      await this.logEvent('VALIDATION_FAILED', { error: error.message });
      await supabaseAdmin.from('scans').update({ status: 'FAILED' }).eq('id', this.context.scanId);
      return { success: false, error: error.message };
    }
  }
}
