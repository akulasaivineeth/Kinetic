// @ts-nocheck — Deno runtime
// Deploy: supabase functions deploy weekly-digest
// Schedule: call every Monday morning via cron

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

  const now = new Date();
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - 7 - ((now.getDay() + 6) % 7));
  lastMonday.setHours(0, 0, 0, 0);
  const thisSunday = new Date(lastMonday);
  thisSunday.setDate(lastMonday.getDate() + 6);
  thisSunday.setHours(23, 59, 59, 999);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, push_subscription')
    .not('push_subscription', 'is', null);

  if (!profiles) return new Response(JSON.stringify({ sent: 0 }));

  let sent = 0;

  for (const profile of profiles) {
    const { data: weekLogs } = await supabase
      .from('workout_logs')
      .select('pushup_reps, plank_seconds, run_distance')
      .eq('user_id', profile.id)
      .not('submitted_at', 'is', null)
      .gte('logged_at', lastMonday.toISOString())
      .lte('logged_at', thisSunday.toISOString());

    if (!weekLogs || weekLogs.length === 0) continue;

    const pushups = weekLogs.reduce((s, l) => s + (l.pushup_reps || 0), 0);
    const plankMin = Math.round(weekLogs.reduce((s, l) => s + (l.plank_seconds || 0), 0) / 60);
    const runKm = weekLogs.reduce((s, l) => s + (Number(l.run_distance) || 0), 0).toFixed(1);

    const body = `Last week: ${pushups} push-ups, ${plankMin}min plank, ${runKm}km run across ${weekLogs.length} sessions.`;

    if (profile.push_subscription && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      try {
        await webpush.sendNotification(
          profile.push_subscription,
          JSON.stringify({
            title: `Weekly Recap — ${profile.full_name?.split(' ')[0] || 'Athlete'}`,
            body,
            data: { url: '/dashboard' },
          })
        );
        sent++;
      } catch (e) {
        console.error('Push failed for', profile.id, e.message);
      }
    }

    await supabase.from('notifications').insert({
      user_id: profile.id,
      type: 'weekly_digest',
      title: 'Weekly Recap',
      body,
      data: { pushups, plank_min: plankMin, run_km: runKm, sessions: weekLogs.length },
    });
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
