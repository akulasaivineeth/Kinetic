import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import webpush from 'web-push';

// Configure VAPID
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:admin@kinetic.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const webhookSecret = request.headers.get('x-whoop-signature');

    // Verify webhook signature (simplified — production should use HMAC)
    if (process.env.WHOOP_WEBHOOK_SECRET && webhookSecret !== process.env.WHOOP_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceClient();

    // Log the event
    const { event_type, user_id: whoopUserId, workout } = body;

    // Find our user by whoop_user_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, push_subscription')
      .eq('whoop_user_id', whoopUserId)
      .single();

    if (!profile) {
      // Store event anyway for later processing
      await supabase.from('whoop_events').insert({
        event_type,
        payload: body,
      });
      return NextResponse.json({ status: 'user_not_found' });
    }

    // Store event
    await supabase.from('whoop_events').insert({
      user_id: profile.id,
      event_type,
      payload: body,
      processed: true,
    });

    // Handle workout.updated event
    if (event_type === 'workout.updated' && workout) {
      const activityType = workout.sport?.name || 'Strength Trainer';
      const durationMins = Math.round((workout.end - workout.start) / 60000);
      const strain = workout.score?.strain?.toFixed(1) || '0.0';

      // Create notification
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'whoop_workout',
        title: 'Workout Detected',
        body: `${activityType} • ${durationMins} min • Strain ${strain}`,
        data: {
          activity: activityType,
          duration: durationMins,
          strain,
          whoop_workout_id: workout.id,
        },
      });

      // Send push notification
      if (profile.push_subscription) {
        try {
          await webpush.sendNotification(
            profile.push_subscription as webpush.PushSubscription,
            JSON.stringify({
              title: 'Workout Detected 💪',
              body: `${activityType} • ${durationMins} min • Strain ${strain}`,
              data: {
                url: `/log?activity=${encodeURIComponent(activityType)}&duration=${durationMins}&strain=${strain}`,
              },
            })
          );
        } catch (pushError) {
          console.error('Push notification failed:', pushError);
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Whoop webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  if (challenge) {
    return NextResponse.json({ challenge });
  }
  return NextResponse.json({ status: 'ok' });
}
