// @ts-nocheck — Deno runtime
// Deploy: supabase functions deploy daily-checkin
// Schedule: call daily at 7pm local time via cron

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import webpush from 'https://esm.sh/web-push@3.6.7';

const VAPID_PUBLIC_KEY = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@kinetic.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const today = new Date().toISOString().split('T')[0];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, push_subscription')
    .not('push_subscription', 'is', null);

  if (!profiles) return new Response(JSON.stringify({ sent: 0 }));

  let sent = 0;

  for (const profile of profiles) {
    const { data: todayLogs } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('user_id', profile.id)
      .not('submitted_at', 'is', null)
      .gte('logged_at', `${today}T00:00:00`)
      .limit(1);

    if (todayLogs && todayLogs.length > 0) continue;

    if (profile.push_subscription && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      try {
        await webpush.sendNotification(
          profile.push_subscription,
          JSON.stringify({
            title: 'Did you train today?',
            body: 'Log your workout to keep your streak alive.',
            data: { url: '/log' },
          })
        );
        sent++;
      } catch (e) {
        console.error('Push failed for', profile.id, e.message);
      }
    }
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
