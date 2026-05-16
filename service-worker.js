// Smash Hub Service Worker — v3 (cache-bust)
const CACHE_NAME = 'smashhub-v3';
const STATIC_FILES = ['/'];

// On install: cache the shell, skip waiting so new SW activates immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES))
  );
  self.skipWaiting();
});

// On activate: delete ALL old caches so stale content is never served
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy: Network first, fall back to cache
// IMPORTANT: Never intercept Supabase API calls — let those go straight to network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Pass through ALL external API calls (Supabase, QR API, etc.)
  if (url.hostname !== self.location.hostname) {
    return; // don't intercept — let browser handle normally
  }

  // For same-origin requests: network first, cache as fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful same-origin responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
