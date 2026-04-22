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
      const messageToSign = timestamp + rawBody;
      
      const hmac = crypto.createHmac('sha256', process.env.WHOOP_WEBHOOK_SECRET).update(messageToSign);
      const expectedBase64 = hmac.copy().digest('base64');
      const expectedHex = hmac.copy().digest('hex');

      const sigBuffer = Buffer.from(signature);
      const b64Buffer = Buffer.from(expectedBase64);
      const hexBuffer = Buffer.from(expectedHex);
      
      let verified = false;
      if (sigBuffer.length === b64Buffer.length && crypto.timingSafeEqual(sigBuffer, b64Buffer)) {
        verified = true;
        console.log('[WHOOP WEBHOOK] Verified via Base64 signature.');
      } else if (sigBuffer.length === hexBuffer.length && crypto.timingSafeEqual(sigBuffer, hexBuffer)) {
        verified = true;
        console.log('[WHOOP WEBHOOK] Verified via Hex signature.');
      }

      if (!verified) {
        console.error(`[WHOOP WEBHOOK] Signature validation failed. Header: ${signature.substring(0, 10)}... Expected (B64): ${expectedBase64.substring(0, 10)}... or (Hex): ${expectedHex.substring(0, 10)}...`);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (!signature) {
      console.warn('[WHOOP WEBHOOK] Missing x-whoop-signature header.');
      // Optional: return 401 if security is strict
    }

    const payload = JSON.parse(rawBody);
    console.log('[WHOOP WEBHOOK] Payload received:', JSON.stringify(payload));

    // Run processing in the background within the 1-second Whoop requirement
    after(async () => {
      try {
        ensureVapid();
        const supabase = await createServiceClient();
        const { type, user_id, id: eventId } = payload;

        console.log(`[WHOOP WEBHOOK] Processing event. Type: ${type}, WhoopUID: ${user_id}, EventID: ${eventId}`);

        // Find our user and their WHOOP token
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, push_subscription, whoop_access_token')
          .eq('whoop_user_id', String(user_id))
          .single();

        if (profileError || !profile) {
          console.warn(`[WHOOP WEBHOOK] No matching Kinetic profile found for Whoop user ${user_id}. Error:`, profileError?.message);
          await supabase.from('whoop_events').insert({
            event_type: type,
            payload: payload,
            processed: false,
          });
          return;
        }

        console.log(`[WHOOP WEBHOOK] Found Kinetic user: ${profile.id}. Token exists: ${!!profile.whoop_access_token}`);

        // Store mapped event immediately 
        await supabase.from('whoop_events').insert({
          user_id: profile.id,
          event_type: type,
          payload: payload,
          processed: true,
        });

        // Enrich workout.updated event
        if (type === 'workout.updated' && profile.whoop_access_token) {
          console.log(`[WHOOP WEBHOOK] Fetching workout details for ${eventId}...`);
          
          let accessToken = profile.whoop_access_token;
          let res = await fetch(`https://api.prod.whoop.com/developer/v2/activity/workout/${eventId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          // If token is expired, try to refresh it
          if (res.status === 401 && profile.id) {
             console.log('[WHOOP WEBHOOK] Token expired. Attempting refresh...');
             // Get current refresh token
             const { data: latestProfile } = await supabase
               .from('profiles')
               .select('whoop_refresh_token')
               .eq('id', profile.id)
               .single();
               
             const refreshToken = latestProfile?.whoop_refresh_token;
             
             if (refreshToken) {
               try {
                 const refreshRes = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                   body: new URLSearchParams({
                     grant_type: 'refresh_token',
                     refresh_token: refreshToken,
                     client_id: process.env.WHOOP_CLIENT_ID || '',
                     client_secret: process.env.WHOOP_CLIENT_SECRET || '',
                   }),
                 });
                 
                 if (refreshRes.ok) {
                   const newTokens = await refreshRes.json();
                   accessToken = newTokens.access_token;
                   console.log('[WHOOP WEBHOOK] Token refreshed successfully.');
                   
                   // Save new tokens
                   await supabase
                     .from('profiles')
                     .update({
                       whoop_access_token: newTokens.access_token,
                       whoop_refresh_token: newTokens.refresh_token,
                       updated_at: new Date().toISOString(),
                     })
                     .eq('id', profile.id);
                     
                   // Retry the original fetch with new token
                   res = await fetch(`https://api.prod.whoop.com/developer/v2/activity/workout/${eventId}`, {
                     headers: { Authorization: `Bearer ${accessToken}` },
                   });
                 } else {
                   console.error('[WHOOP WEBHOOK] Token refresh failed:', await refreshRes.text());
                 }
               } catch (refreshErr) {
                 console.error('[WHOOP WEBHOOK] Error during refresh process:', refreshErr);
               }
             }
          }

          if (!res.ok) {
            const errBody = await res.text();
            console.error('[WHOOP WEBHOOK] API Fetch Failed final attempt:', res.status, errBody);
            return;
          }

          const workout = await res.json();
          console.log('[WHOOP WEBHOOK] Workout data fetched successfully.');

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

          const notifTitle = 'Workout Detected';
          const notifBody = `${activityType} • ${durationMins} min${distanceLabel} • Strain ${strain}`;

          console.log(`[WHOOP WEBHOOK] Dispatching notification: "${notifBody}"`);

          // Save timeline notification
          await supabase.from('notifications').insert({
            user_id: profile.id,
            type: 'whoop_workout',
            title: notifTitle,
            body: notifBody,
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
            try {
              await webpush.sendNotification(
                profile.push_subscription as webpush.PushSubscription,
                JSON.stringify({
                  title: notifTitle,
                  body: notifBody,
                  data: {
                    url: `/log?activity=${encodeURIComponent(activityType)}&duration=${durationMins}&strain=${strain}${distParam}`,
                  },
                })
              );
              console.log('[WHOOP WEBHOOK] Web Push sent successfully.');
            } catch (pError) {
              console.error('[WHOOP WEBHOOK] Web Push failed:', pError);
            }
          } else {
            console.log('[WHOOP WEBHOOK] User has no push_subscription stored.');
          }
        }
      } catch (bgError) {
        console.error('[WHOOP WEBHOOK] Critical background error:', bgError);
      }
    });

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[WHOOP WEBHOOK] Main handler error:', error);
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
