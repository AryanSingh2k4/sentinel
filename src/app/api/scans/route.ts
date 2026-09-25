import { NextResponse } from 'next/server';
import { scanQueue, webQueue, gitQueue } from '@/lib/queue/bull';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/agents/base';
import { parseGitTarget } from '@/lib/utils/target-resolver';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // In production, enforce authentication if needed. Bypassed for local/hackathon testing.
    if (!user && process.env.NODE_ENV === 'production' && process.env.ENFORCE_AUTH === 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const target = body.target?.trim();

    if (!target) {
      return NextResponse.json({ error: 'Target URL or Repository is required' }, { status: 400 });
    }

    const gitInfo = parseGitTarget(target);
    const targetType = body.targetType || (gitInfo.isGit ? 'git' : 'web');
    const baseUrl = gitInfo.isGit
      ? gitInfo.httpUrl
      : (target.startsWith('http') ? target : `https://${target}`);

    // 1. Resolve or create target in `targets` table (guaranteed not null)
    let { data: existingTarget } = await supabaseAdmin
      .from('targets')
      .select('id, domain, base_url')
      .eq('domain', target)
      .limit(1)
      .maybeSingle();

    if (!existingTarget && gitInfo.isGit && gitInfo.fullName) {
      const { data: byFullName } = await supabaseAdmin
        .from('targets')
        .select('id, domain, base_url')
        .eq('domain', gitInfo.fullName)
        .limit(1)
        .maybeSingle();
      if (byFullName) existingTarget = byFullName;
    }

    if (!existingTarget) {
      let operatorId: string | null = null;
      if (user) {
        const { data: operator } = await supabaseAdmin
          .from('operators')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        if (operator) {
          operatorId = operator.id;
        }
      }

      const { data: newTarget, error: targetError } = await supabaseAdmin
        .from('targets')
        .insert({
          domain: target,
          base_url: baseUrl,
          operator_id: operatorId,
          status: 'verified',
        })
        .select()
        .single();

      if (targetError) {
        console.error('Target creation error in Supabase:', targetError);
        throw targetError;
      }
      existingTarget = newTarget;
    }

    const targetId = existingTarget.id;

    // 2. Insert scan record with linked target_id and profile
    const profile = targetType === 'git' ? 'git-repo' : 'standard';
    const { data: scan, error: scanError } = await supabaseAdmin
      .from('scans')
      .insert({
        target_id: targetId,
        status: 'QUEUED',
        profile: profile,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (scanError) {
      console.error('Scan creation error in Supabase:', scanError);
      throw scanError;
    }

    // 3. Initialize the BullMQ State Machine based on target type
    const initialStep = targetType === 'git' ? 'secrets' : 'recon';
    const targetQueue = targetType === 'git' ? gitQueue : webQueue;
    await targetQueue.add(initialStep, {
      scanId: scan.id,
      target,
      step: initialStep,
      targetType,
    });

    return NextResponse.json({ 
      message: `${targetType === 'git' ? 'Repository Code & Secret' : 'Web Vulnerability'} scan initiated successfully`,
      scanId: scan.id,
      targetType,
      target,
    });
  } catch (error: any) {
    console.error('Scan initiation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
