import { createClient } from '@supabase/supabase-js';
import { Database } from '../supabase/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Use service role key to bypass RLS in background worker (which has no user context)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseKey);

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
