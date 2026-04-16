import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import crypto from 'crypto';

/**
 * Whoop OAuth — Step 2: Handle callback, exchange code for tokens, store in profile
 * GET /api/whoop/callback?code=XXX
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/whoop/callback`;
  const appUrl = origin;

  if (!code) {
    return NextResponse.redirect(`${appUrl}/profile?whoop=error&reason=missing_code`);
  }

  try {
    let stateUserId: string | null = null;
    if (state && process.env.WHOOP_CLIENT_SECRET) {
      const [payload, signature] = state.split('.');
      if (payload && signature) {
        const expected = crypto
          .createHmac('sha256', process.env.WHOOP_CLIENT_SECRET)
          .update(payload)
          .digest('base64url');
        const given = Buffer.from(signature);
        const exp = Buffer.from(expected);
        if (given.length === exp.length && crypto.timingSafeEqual(given, exp)) {
          try {
            const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { uid?: string };
            stateUserId = parsed.uid ?? null;
          } catch {
            stateUserId = null;
          }
        }
      }
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.WHOOP_CLIENT_ID || '',
        client_secret: process.env.WHOOP_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        scope: 'offline read:profile read:workout read:recovery read:body_measurement',
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Whoop token exchange failed:', errText);
      return NextResponse.redirect(
        `${appUrl}/profile?whoop=error&reason=token`
      );
    }

    const tokens = await tokenResponse.json();

    // Current Whoop API: v2 basic profile (requires read:profile scope)
    const userResponse = await fetch(
      'https://api.prod.whoop.com/developer/v2/user/profile/basic',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    const whoopUser = userResponse.ok ? await userResponse.json() : null;
    if (!userResponse.ok) {
      console.error('Whoop profile fetch failed:', await userResponse.text());
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = user?.id ?? stateUserId;
    if (!targetUserId) {
      return NextResponse.redirect(`${appUrl}/profile?whoop=error&reason=no_session`);
    }

    const dbClient = user ? supabase : await createServiceClient();

    const { error: updateError } = await dbClient
      .from('profiles')
      .update({
        whoop_access_token: tokens.access_token,
        whoop_refresh_token: tokens.refresh_token ?? null,
        whoop_user_id: whoopUser?.user_id != null ? String(whoopUser.user_id) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId);

    if (updateError) {
      console.error('Whoop profile save failed:', updateError);
      return NextResponse.redirect(`${appUrl}/profile?whoop=error&reason=save`);
    }

    return NextResponse.redirect(`${appUrl}/profile?whoop=connected`);
  } catch (error) {
    console.error('Whoop OAuth error:', error);
    return NextResponse.redirect(`${appUrl}/profile?whoop=error&reason=exception`);
  }
}
