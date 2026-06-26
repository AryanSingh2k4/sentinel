import { NextResponse } from 'next/server';
import { scanQueue } from '@/lib/queue/bull';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/agents/base';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // In a real environment, enforce authentication. Bypassed if running locally without auth setup.
    if (!user && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { target } = await req.json();

    if (!target) {
      return NextResponse.json({ error: 'Target URL is required' }, { status: 400 });
    }

    let targetId: string | null = null;
    
    if (user) {
        // Find operator to link the target
        const { data: operator } = await supabaseAdmin.from('operators').select('id').eq('auth_user_id', user.id).single();
        if (operator) {
            // Check if target already exists, else create it
            let { data: existingTarget } = await supabaseAdmin.from('targets').select('id').eq('domain', target).single();
            
            if (!existingTarget) {
                const { data: newTarget, error: targetError } = await supabaseAdmin.from('targets').insert({
                    domain: target,
                    base_url: `https://${target}`,
                    operator_id: operator.id
                }).select().single();
                if (targetError) throw targetError;
                existingTarget = newTarget;
            }
            targetId = existingTarget.id;
        }
    }

    // Insert the new scan into Supabase database using service role (admin) to bypass RLS
    const { data: scan, error: scanError } = await supabaseAdmin.from('scans').insert({
        target_id: targetId,
        status: 'queued'
    }).select().single();

    if (scanError) throw scanError;

    // Initialize the State Machine by adding the first step (Recon) to BullMQ
    await scanQueue.add('recon', {
      scanId: scan.id,
      target,
      step: 'recon'
    });

    return NextResponse.json({ 
      message: 'Scan initiated successfully',
      scanId: scan.id 
    });
  } catch (error) {
    console.error('Scan initiation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
