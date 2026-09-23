import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../supabase/database.types';

// Ensure .env.local is loaded if running in worker / standalone node script
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const envLocal = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envLocal)) {
    try {
      const content = fs.readFileSync(envLocal, 'utf-8');
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const k = trimmed.substring(0, eqIdx).trim();
            const v = trimmed.substring(eqIdx + 1).trim();
            if (!process.env[k]) {
              process.env[k] = v;
            }
          }
        }
      });
    } catch {}
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rielvhomoiyyrodrycsg.supabase.co';
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.warn('[Sentinel] WARNING: SUPABASE_SERVICE_ROLE_KEY not set.');
}

// Use service role key to bypass RLS in background worker (which has no user context)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey || '');

export interface AgentContext {
  scanId: string;
  target: string;
}

export abstract class BaseAgent {
  protected context: AgentContext;

  constructor(context: AgentContext) {
    this.context = context;
  }

  // Every agent must implement the execute method representing its node in the state machine
  abstract execute(): Promise<{ success: boolean; nextStep?: string; error?: string }>;

  // Log events to the Event Store Domain using the Admin client
  protected async logEvent(eventType: string, payload: any) {
    console.log(`[EVENT: ${eventType}] Scan: ${this.context.scanId}`, payload);
    const { error } = await supabaseAdmin.from('events').insert({
      scan_id: this.context.scanId,
      event_type: eventType,
      payload: payload
    });
    
    if (error) {
      console.error(`Failed to log event ${eventType}:`, error);
    }
  }
}
