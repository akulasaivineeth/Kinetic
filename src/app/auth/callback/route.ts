import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const inviteCode = searchParams.get('invite');

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If invite code provided, validate and consume it
      if (inviteCode) {
        const serviceClient = await createServiceClient();
        const { data: user } = await supabase.auth.getUser();

        if (user?.user) {
          // Check if this is NOT the first user (first user = admin, no invite needed)
          const { count } = await serviceClient
            .from('profiles')
            .select('*', { count: 'exact', head: true });

          if (count && count > 1) {
            // Validate invite
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
                  used_by: user.user.id,
                  used_at: new Date().toISOString(),
                })
                .eq('id', invite.id);
            }
          }

          // Ensure default goals exist
          await serviceClient
            .from('performance_goals')
            .upsert(
              { user_id: user.user.id },
              { onConflict: 'user_id' }
            );
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_failed`);
}
