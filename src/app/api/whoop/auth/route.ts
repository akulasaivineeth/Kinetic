import { NextRequest, NextResponse } from 'next/server';

/**
 * Whoop OAuth — Step 1: Redirect user to Whoop authorization page
 * GET /api/whoop/auth → redirects to Whoop OAuth consent screen
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/whoop/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'Whoop not configured' }, { status: 500 });
  }

  const scopes = 'read:workout read:recovery read:body_measurement';
  const whoopAuthUrl = new URL('https://api.prod.whoop.com/oauth/oauth2/auth');
  whoopAuthUrl.searchParams.set('client_id', clientId);
  whoopAuthUrl.searchParams.set('redirect_uri', redirectUri);
  whoopAuthUrl.searchParams.set('response_type', 'code');
  whoopAuthUrl.searchParams.set('scope', scopes);
  whoopAuthUrl.searchParams.set('state', 'kinetic');

  return NextResponse.redirect(whoopAuthUrl.toString());
}
