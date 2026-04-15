const CACHE_NAME = 'kinetic-v2';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/log',
  '/arena',
  '/profile',
  '/manifest.json',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network first with timeout, fallback to cache
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Skip non-GET requests entirely
  if (event.request.method !== 'GET') return;

  // Skip all Supabase and internal API URLs entirely
  if (
    url.includes('/api/') || 
    url.includes('/rest/') || 
    url.includes('/realtime/') || 
    url.includes('/auth/') || 
    url.includes('supabase.co')
  ) {
    return;
  }

  event.respondWith(
    new Promise((resolve, reject) => {
      // 5-second timeout for the network request
      const timeoutId = setTimeout(() => {
        reject(new Error('Network timeout'));
      }, 5000);

      fetch(event.request)
        .then((response) => {
          clearTimeout(timeoutId);
          // Cache successful responses
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          resolve(response);
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
    }).catch(() => {
      // Fallback to cache if network fails or times out
      return caches.match(event.request);
    })
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Log Workout' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click — open the log page with prefilled data
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/log';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window or open new
      for (const client of clients) {
        if (client.url.includes('/') && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Background sync for offline drafts
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-drafts') {
    event.waitUntil(syncDrafts());
  }
});

async function syncDrafts() {
  // This will be handled by the app via idb-keyval
  // The service worker just triggers the sync event
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_DRAFTS' });
  });
}
