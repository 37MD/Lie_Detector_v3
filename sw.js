/**
 * sw.js — Service Worker for offline-first caching.
 *
 * Strategy:
 *  - App shell (HTML/CSS/JS) → Cache First, fallback to network
 *  - API requests (mfapi.in / npsnav.in) → Network First, no cache
 *    (NAV data must be fresh)
 */

const CACHE_NAME    = 'mf-lie-detector-v2';
const OFFLINE_URLS  = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/state.js',
  '/js/data.js',
  '/js/math.js',
  '/js/api.js',
  '/js/plugin.js',
  '/js/charts.js',
  '/js/alerts.js',
  '/js/game.js',
  '/js/live.js',
  '/js/ui.js',
  'https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-zoom/2.0.1/chartjs-plugin-zoom.min.js',
];

const API_ORIGINS = ['api.mfapi.in', 'npsnav.in'];

// ── Install: pre-cache app shell ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ─────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first for shell, network-first for APIs ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (API_ORIGINS.includes(url.hostname)) {
    // Network-first: always try to get fresh NAV data
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached ?? fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      })
    )
  );
});
