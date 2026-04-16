import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Whoop OAuth — Step 1: Redirect user to Whoop authorization page
 * GET /api/whoop/auth → redirects to Whoop OAuth consent screen
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/whoop/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Whoop not configured' }, { status: 500 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/profile?whoop=error&reason=no_session_start`);
  }

  // read:profile required for GET /v2/user/profile/basic (Whoop OAuth docs)
  const scopes = 'offline read:profile read:workout read:recovery read:body_measurement';
  const whoopAuthUrl = new URL('https://api.prod.whoop.com/oauth/oauth2/auth');
  whoopAuthUrl.searchParams.set('client_id', clientId);
  whoopAuthUrl.searchParams.set('redirect_uri', redirectUri);
  whoopAuthUrl.searchParams.set('response_type', 'code');
  whoopAuthUrl.searchParams.set('scope', scopes);
  const statePayload = Buffer.from(
    JSON.stringify({ uid: user.id, ts: Date.now() })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', clientSecret).update(statePayload).digest('base64url');
  whoopAuthUrl.searchParams.set('state', `${statePayload}.${sig}`);

  return NextResponse.redirect(whoopAuthUrl.toString());
}
