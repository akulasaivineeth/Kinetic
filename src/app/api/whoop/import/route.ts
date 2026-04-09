import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Import recent Whoop workouts — fallback when webhook doesn't fire
 * GET /api/whoop/import → fetches last 7 days of workouts from Whoop API
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Whoop access token
    const { data: profile } = await supabase
      .from('profiles')
      .select('whoop_access_token, whoop_refresh_token')
      .eq('id', user.id)
      .single();

    if (!profile?.whoop_access_token) {
      return NextResponse.json({ error: 'Whoop not connected' }, { status: 400 });
    }

    // Fetch recent workouts from Whoop API
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const response = await fetch(
      `https://api.prod.whoop.com/developer/v2/activity/workout?start=${encodeURIComponent(sevenDaysAgo)}&limit=25`,
      {
        headers: { Authorization: `Bearer ${profile.whoop_access_token}` },
      }
    );

    if (!response.ok) {
      // If 401, token may be expired — user needs to re-authorize
      if (response.status === 401) {
        return NextResponse.json({ error: 'Whoop token expired. Please reconnect.' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Failed to fetch from Whoop' }, { status: 502 });
    }

    const data = await response.json();
    const workouts = data.records || [];

    // Store each workout as a whoop_event (if not already stored)
    const imported: Array<{ activity: string; duration: number; strain: string }> = [];

    for (const workout of workouts) {
      const activityType =
        workout.sport_name || workout.sport?.name || 'Strength Trainer';
      const durationMins = Math.round(
        (new Date(workout.end).getTime() - new Date(workout.start).getTime()) / 60000
      );
      const strain = workout.score?.strain?.toFixed(1) || '0.0';
      const workoutId = workout.id != null ? String(workout.id) : '';

      // Check if we already have this workout
      const { data: existing } = await supabase
        .from('whoop_events')
        .select('id')
        .eq('user_id', user.id)
        .eq('payload->>id', workoutId)
        .limit(1)
        .maybeSingle();

      if (!existing && workoutId) {
        await supabase.from('whoop_events').insert({
          user_id: user.id,
          event_type: 'workout.updated',
          payload: workout,
          processed: true,
        });

        const { error: notifErr } = await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'whoop_workout',
          title: 'Imported Workout',
          body: `${activityType} • ${durationMins} min • Strain ${strain}`,
          data: { activity: activityType, duration: durationMins, strain },
        });
        if (notifErr) console.error('Whoop import notification insert:', notifErr);

        imported.push({ activity: activityType, duration: durationMins, strain });
      }
    }

    return NextResponse.json({
      status: 'ok',
      imported: imported.length,
      workouts: imported,
    });
  } catch (error) {
    console.error('Whoop import error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
