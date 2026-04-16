import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = await request.text();
    if (!raw.trim()) {
      return NextResponse.json({ status: 'skipped', reason: 'empty body' });
    }

    let subscription: Record<string, unknown>;
    try {
      subscription = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Validate it looks like a real PushSubscription (must have endpoint + keys)
    if (
      !subscription ||
      typeof subscription.endpoint !== 'string' ||
      !subscription.endpoint.startsWith('https://') ||
      !subscription.keys ||
      typeof (subscription.keys as Record<string, unknown>).p256dh !== 'string' ||
      typeof (subscription.keys as Record<string, unknown>).auth !== 'string'
    ) {
      console.error('Push subscribe: invalid subscription object', JSON.stringify(subscription).slice(0, 200));
      return NextResponse.json({ error: 'Invalid push subscription' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ push_subscription: subscription })
      .eq('id', user.id);

    if (updateError) {
      console.error('Push subscribe: DB update failed', updateError);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    return NextResponse.json({ status: 'subscribed' });
  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
