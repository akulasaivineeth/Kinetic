import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import webpush from 'web-push';

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:admin@kinetic.app',
      publicKey,
      privateKey
    );
    vapidConfigured = true;
  }
}

/**
 * POST /api/push/send — Send a push notification to a specific user.
 * Called by client when creating notifications (sharing requests, milestones, etc.)
 * Body: { userId, title, body, data? }
 */
export async function POST(request: NextRequest) {
  ensureVapid();

  try {
    const { userId, title, body, data } = await request.json();

    if (!userId || !title) {
      return NextResponse.json({ error: 'Missing userId or title' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Fetch the user's push subscription
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('push_subscription')
      .eq('id', userId)
      .single();

    if (error || !profile?.push_subscription) {
      return NextResponse.json({ status: 'no_subscription' });
    }

    if (!vapidConfigured) {
      return NextResponse.json({ status: 'vapid_not_configured' });
    }

    try {
      await webpush.sendNotification(
        profile.push_subscription as webpush.PushSubscription,
        JSON.stringify({
          title,
          body: body || '',
          data: data || {},
        })
      );
      return NextResponse.json({ status: 'sent' });
    } catch (pushError) {
      console.error('Push send failed:', pushError);
      return NextResponse.json({ status: 'push_failed' });
    }
  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
