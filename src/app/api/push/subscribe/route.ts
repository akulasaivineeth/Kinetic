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

    let subscription: unknown;
    try {
      subscription = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    await supabase
      .from('profiles')
      .update({ push_subscription: subscription })
      .eq('id', user.id);

    return NextResponse.json({ status: 'subscribed' });
  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
