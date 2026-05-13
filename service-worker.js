// ─────────────────────────────────────────────
//  Smash Hub — Service Worker
//  Change CACHE_VERSION whenever you deploy a
//  new build. Using a timestamp means you never
//  have to remember to bump it manually.
// ─────────────────────────────────────────────

const CACHE_VERSION = 'smash-hub-20260513';   // ← update this on every deploy
const CACHE_NAME    = `smash-hub-${CACHE_VERSION}`;

// Files to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  // add your other assets here (icons, fonts, etc.)
];

// ── Install: cache core files ──────────────────
self.addEventListener('install', event => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

// ── Activate: delete ALL old caches ───────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)   // keep only current version
          .map(key => caches.delete(key))       // nuke everything else
      )
    ).then(() => self.clients.claim())          // take control of open tabs immediately
  );
});

// ── Fetch: network-first for HTML, cache-first for assets ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go network-first for the main HTML document
  // so users always get the latest version
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update the cache with the fresh response
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          // Offline fallback — serve cached HTML if network is down
          caches.match(event.request).then(r => r || caches.match('/index.html'))
        )
    );
    return;
  }

  // Cache-first for everything else (icons, fonts, JS, CSS)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
