'use client';

let subscribeInFlight: Promise<boolean> | null = null;
let pushUnavailableNotified = false;

export async function subscribeToPush(): Promise<boolean> {
  if (subscribeInFlight) return subscribeInFlight;
  subscribeInFlight = subscribeToPushInternal().finally(() => {
    subscribeInFlight = null;
  });
  return subscribeInFlight;
}

async function subscribeToPushInternal(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    if (!pushUnavailableNotified) {
      console.log('Push notifications not supported in this browser.');
      pushUnavailableNotified = true;
    }
    return false;
  }

  if (!window.isSecureContext) {
    if (!pushUnavailableNotified) {
      console.log('Push requires a secure context (https or localhost).');
      pushUnavailableNotified = true;
    }
    return false;
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.log('VAPID public key not configured');
        return false;
      }

      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
      if (convertedKey.length === 0) {
        console.error('Invalid VAPID key - could not decode');
        return false;
      }

      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey as unknown as BufferSource,
        });
      } catch (error) {
        // AbortError is common on unsupported platforms / blocked push services.
        if (
          error instanceof DOMException &&
          (error.name === 'AbortError' || error.name === 'NotSupportedError')
        ) {
          if (!pushUnavailableNotified) {
            console.log('Push service unavailable in this environment.');
            pushUnavailableNotified = true;
          }
          return false;
        }
        throw error;
      }
    }

    if (!subscription || typeof subscription !== 'object') {
      return false;
    }

    // Send subscription to our API
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });
    if (!response.ok) return false;

    return true;
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === 'AbortError' || error.name === 'NotSupportedError')
    ) {
      if (!pushUnavailableNotified) {
        console.log('Push service unavailable in this environment.');
        pushUnavailableNotified = true;
      }
      return false;
    }
    console.error('Push subscription error:', error);
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  try {
    // Add padding
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    // Convert URL-safe Base64 to standard Base64
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Decode using atob
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (e) {
    console.error('Base64 decode failed:', e);
    return new Uint8Array(0);
  }
}
