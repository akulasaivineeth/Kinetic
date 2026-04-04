import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Whoop OAuth — Step 2: Handle callback, exchange code for tokens, store in profile
 * GET /api/whoop/callback?code=XXX
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/whoop/callback`;

  if (!code) {
    return NextResponse.redirect(`${appUrl}/profile?whoop=error`);
  }

  try {
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
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Whoop token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(`${appUrl}/profile?whoop=error`);
    }

    const tokens = await tokenResponse.json();

    // Get Whoop user ID
    const userResponse = await fetch('https://api.prod.whoop.com/developer/v1/user/profile/basic', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const whoopUser = userResponse.ok ? await userResponse.json() : null;

    // Save tokens to user's profile
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from('profiles')
        .update({
          whoop_access_token: tokens.access_token,
          whoop_refresh_token: tokens.refresh_token,
          whoop_user_id: whoopUser?.user_id?.toString() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    return NextResponse.redirect(`${appUrl}/profile?whoop=connected`);
  } catch (error) {
    console.error('Whoop OAuth error:', error);
    return NextResponse.redirect(`${appUrl}/profile?whoop=error`);
  }
}
