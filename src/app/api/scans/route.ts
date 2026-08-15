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

    const body = await req.json();
    const target = body.target?.trim();
    const targetType = body.targetType || (
      target.includes('github.com') ||
      target.includes('gitlab.com') ||
      target.includes('bitbucket.org') ||
      target.endsWith('.git') ||
      target.startsWith('git@')
        ? 'git'
        : 'web'
    );

    if (!target) {
      return NextResponse.json({ error: 'Target URL or Repository is required' }, { status: 400 });
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
                    base_url: target.startsWith('http') ? target : `https://${target}`,
                    operator_id: operator.id
                }).select().single();
                if (targetError) throw targetError;
                existingTarget = newTarget;
            }
            targetId = existingTarget.id;
        }
    }

    // Insert the new scan into Supabase database using service role (admin) to bypass RLS
    const initialStatus = targetType === 'git' ? 'QUEUED' : 'QUEUED';
    const { data: scan, error: scanError } = await supabaseAdmin.from('scans').insert({
        target_id: targetId,
        status: initialStatus
    }).select().single();

    if (scanError) throw scanError;

    // Initialize the State Machine based on target type
    const initialStep = targetType === 'git' ? 'secrets' : 'recon';
    await scanQueue.add(initialStep, {
      scanId: scan.id,
      target,
      step: initialStep
    });

    return NextResponse.json({ 
      message: `${targetType === 'git' ? 'Secret' : 'Vulnerability'} scan initiated successfully`,
      scanId: scan.id,
      targetType
    });
  } catch (error) {
    console.error('Scan initiation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
