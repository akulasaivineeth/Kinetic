import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Unlink whoop keys from profile
    await supabase
      .from('profiles')
      .update({
        whoop_access_token: null,
        whoop_refresh_token: null,
        whoop_user_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Whoop disconnect error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
