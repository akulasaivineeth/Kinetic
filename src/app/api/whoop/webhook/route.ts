import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import webpush from 'web-push';

// VAPID credentials are configured lazily (not at build time)
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

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-whoop-signature');
    const timestamp = request.headers.get('x-whoop-signature-timestamp') || '';

    // Verify signature
    if (process.env.WHOOP_WEBHOOK_SECRET && signature) {
      const crypto = await import('crypto');
      // WHOOP requires timestamp prepended to rawBody 
      const messageToSign = timestamp + rawBody;
      const expectedSig = crypto
        .createHmac('sha256', process.env.WHOOP_WEBHOOK_SECRET)
        .update(messageToSign)
        .digest('base64'); 

      // WHOOP typically sends base64, but we provide hex fallback for safety
      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSig);
      
      let verified = false;
      if (sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        verified = true;
      } else {
        const hexSig = crypto
          .createHmac('sha256', process.env.WHOOP_WEBHOOK_SECRET)
          .update(messageToSign)
          .digest('hex');
        const hexExpectedBuffer = Buffer.from(hexSig);
        if (sigBuffer.length === hexExpectedBuffer.length && crypto.timingSafeEqual(sigBuffer, hexExpectedBuffer)) {
          verified = true;
        }
      }

      if (!verified) {
        console.error('Whoop webhook: invalid signature');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);

    // Run processing in the background within the 1-second Whoop requirement
    after(async () => {
      ensureVapid();
      const supabase = await createServiceClient();
      const { type, user_id, id: eventId } = payload;

      // Find our user and their WHOOP token
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, push_subscription, whoop_access_token')
        .eq('whoop_user_id', String(user_id))
        .single();

      if (!profile) {
        // Store unmapped event
        await supabase.from('whoop_events').insert({
          event_type: type,
          payload: payload,
          processed: false,
        });
        return;
      }

      // Store mapped event immediately 
      await supabase.from('whoop_events').insert({
        user_id: profile.id,
        event_type: type,
        payload: payload,
        processed: true,
      });

      // Enrich workout.updated event
      if (type === 'workout.updated' && profile.whoop_access_token) {
        try {
          const res = await fetch(`https://api.prod.whoop.com/developer/v2/activity/workout/${eventId}`, {
            headers: { Authorization: `Bearer ${profile.whoop_access_token}` },
          });

          if (!res.ok) {
            console.error('Failed to fetch WHOOP workout detail:', await res.text());
            return;
          }

          const workout = await res.json();

          // Extract metrics
          const activityType = workout?.sport?.name || 'Strength Trainer';
          let durationMins = 0;
          if (workout.start && workout.end) {
             durationMins = Math.round((new Date(workout.end).getTime() - new Date(workout.start).getTime()) / 60000);
          }
          const strain = workout.score?.strain?.toFixed(1) || '0.0';
          const distanceMeters = workout.score?.distance_meter ?? null;
          const distanceKm = distanceMeters ? Math.round((distanceMeters / 1000) * 100) / 100 : null;
          const distanceLabel = distanceKm ? ` • ${distanceKm} km` : '';

          // Save timeline notification
          await supabase.from('notifications').insert({
            user_id: profile.id,
            type: 'whoop_workout',
            title: 'Workout Detected',
            body: `${activityType} • ${durationMins} min${distanceLabel} • Strain ${strain}`,
            data: {
              activity: activityType,
              duration: durationMins,
              strain,
              distance_km: distanceKm,
              whoop_workout_id: eventId,
            },
          });

          // Dispatch Web Push notification
          if (profile.push_subscription) {
            const distParam = distanceKm ? `&distance_km=${distanceKm}` : '';
            await webpush.sendNotification(
              profile.push_subscription as webpush.PushSubscription,
              JSON.stringify({
                title: 'Workout Detected',
                body: `${activityType} • ${durationMins} min${distanceLabel} • Strain ${strain}`,
                data: {
                  url: `/log?activity=${encodeURIComponent(activityType)}&duration=${durationMins}&strain=${strain}${distParam}`,
                },
              })
            );
          }

        } catch (fetchErr) {
          console.error('Failed to enrich whoop workout data:', fetchErr);
        }
      }
    });

    // Immediately resolve to satisfy Whoop's 1-second timeout
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook payload error:', error);
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
