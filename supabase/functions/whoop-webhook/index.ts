// Supabase Edge Function for Whoop Webhook
// Deploy: supabase functions deploy whoop-webhook

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-whoop-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Webhook verification
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const challenge = url.searchParams.get('challenge');
      if (challenge) {
        return new Response(JSON.stringify({ challenge }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const body = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { event_type, user_id: whoopUserId, workout } = body;

    // Find user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, push_subscription')
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

      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'whoop_workout',
        title: 'Workout Detected',
        body: `${activityType} • ${durationMins} min • Strain ${strain}`,
        data: { activity: activityType, duration: durationMins, strain },
      });
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
