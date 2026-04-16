// @ts-nocheck — This file runs in Supabase's Deno runtime, not Node.js.
// IDE errors about missing Deno types are expected and harmless.
// Deploy: supabase functions deploy whoop-webhook

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import webpush from 'https://esm.sh/web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-whoop-signature',
};

// VAPID keys from environment
const VAPID_PUBLIC_KEY = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@kinetic.app';
const WHOOP_WEBHOOK_SECRET = Deno.env.get('WHOOP_WEBHOOK_SECRET');

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const signature = req.headers.get('x-whoop-signature');

    // 1. Signature Verification — HMAC-SHA256
    if (WHOOP_WEBHOOK_SECRET && signature) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(WHOOP_WEBHOOK_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
      const expectedHex = Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      if (signature !== expectedHex) {
        console.error('Invalid webhook signature');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { event_type, user_id: whoopUserId, workout } = body;

    // Find user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, push_subscription, full_name')
      .eq('whoop_user_id', whoopUserId)
      .single();

    // Store event
    await supabase.from('whoop_events').insert({
      user_id: profile?.id,
      event_type,
      payload: body,
      processed: !!profile,
    });

    if (profile && event_type === 'workout.updated' && workout) {
      const activityType = workout.sport?.name || 'Strength Trainer';
      const durationMins = Math.round((workout.end - workout.start) / 60000);
      const strain = workout.score?.strain?.toFixed(1) || '0.0';

      // Exact notification body as requested
      const notificationBody = `${activityType} • ${durationMins} min • Strain ${strain}. Tap to log push-up reps & plank seconds.`;

      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'whoop_workout',
        title: 'Workout Detected 💪',
        body: notificationBody,
        data: {
          activity: activityType,
          duration: durationMins,
          strain,
          whoop_workout_id: workout.id,
        },
      });

      // Send Real Push Notification (VAPID)
      if (profile.push_subscription && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
        try {
          await webpush.sendNotification(
            profile.push_subscription,
            JSON.stringify({
              title: 'Workout Detected 💪',
              body: notificationBody,
              data: {
                url: `/log?activity=${encodeURIComponent(activityType)}&duration=${durationMins}&strain=${strain}`,
              },
            })
          );
        } catch (pushError) {
          console.error('Push notification failed:', pushError.message);
        }
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook processing error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, // Return 200 so Whoop doesn't keep retrying failed private webhooks during debug
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
