import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/teams/join
 * Body: { invite_code: string }
 *
 * Uses the service role to look up the team by invite_code (bypasses RLS)
 * and then inserts the user as a member.
 *
 * This is necessary because the teams SELECT policy only allows users
 * who are already team_members to see the team — catch-22 for joining.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let body: { invite_code?: string };
    try {
      body = (await request.json()) as { invite_code?: string };
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const code = typeof body.invite_code === 'string' ? body.invite_code.trim().toUpperCase() : '';
    if (!code) {
      return NextResponse.json({ error: 'Invite code is required.' }, { status: 400 });
    }

    const admin = await createServiceClient();

    // Look up team by invite code (service role bypasses RLS)
    const { data: team, error: findErr } = await admin
      .from('teams')
      .select('id, name')
      .eq('invite_code', code)
      .single();

    if (findErr || !team) {
      return NextResponse.json({ error: 'Team not found. Check the invite code.' }, { status: 404 });
    }

    // Check if already a member
    const { data: existing } = await admin
      .from('team_members')
      .select('team_id')
      .eq('team_id', team.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'You are already a member of this squad.' }, { status: 409 });
    }

    // Insert membership
    const { error: joinErr } = await admin
      .from('team_members')
      .insert({ team_id: team.id, user_id: user.id, role: 'member' });

    if (joinErr) {
      console.error('[api/teams/join] insert error:', joinErr);
      return NextResponse.json({ error: 'Could not join squad.' }, { status: 400 });
    }

    return NextResponse.json({ team_id: team.id, team_name: team.name });
  } catch (e) {
    console.error('[api/teams/join]', e);
    return NextResponse.json({ error: 'Could not join squad.' }, { status: 500 });
  }
}
