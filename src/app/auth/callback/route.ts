import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server';

/** New profiles younger than this without an invite are rejected if other members already exist. */
const FRESH_PROFILE_MS = 3 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const inviteCode = searchParams.get('invite');

  if (!code) {
    return NextResponse.redirect(`${origin}/unauthorized?error=auth_failed`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/unauthorized?error=auth_failed`);
  }

  const serviceClient = await createServiceClient();
  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData?.user;

  if (!authUser) {
    return NextResponse.redirect(`${origin}/unauthorized?error=no_user`);
  }

  // Invite flow: consume link when joining an existing crew (not needed for the very first account)
  if (inviteCode) {
    const { count: profileCount } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (profileCount && profileCount > 1) {
      const { data: invite } = await serviceClient
        .from('invite_links')
        .select('*')
        .eq('code', inviteCode)
        .is('used_by', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (invite) {
        await serviceClient
          .from('invite_links')
          .update({
            used_by: authUser.id,
            used_at: new Date().toISOString(),
          })
          .eq('id', invite.id);
      }
    }
  } else {
    // No invite: allow (1) first-ever signup, or (2) returning members.
    // BUGFIX: Old logic denied everyone when ANY profile existed (broke sign-out / sign-in for user #1).
    const { data: myProfile } = await serviceClient
      .from('profiles')
      .select('created_at')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!myProfile) {
      return NextResponse.redirect(`${origin}/unauthorized?error=no_profile`);
    }

    const { count: otherMemberCount } = await serviceClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .neq('id', authUser.id);

    const profileAgeMs = Date.now() - new Date(myProfile.created_at).getTime();
    const isFreshProfile = profileAgeMs < FRESH_PROFILE_MS;
    const othersExist = (otherMemberCount ?? 0) > 0;

    if (othersExist && isFreshProfile) {
      // Brand-new account while the arena already has members → invite required
      return NextResponse.redirect(`${origin}/unauthorized`);
    }
  }

  await serviceClient
    .from('performance_goals')
    .upsert({ user_id: authUser.id }, { onConflict: 'user_id' });

  return NextResponse.redirect(`${origin}/dashboard`);
}
