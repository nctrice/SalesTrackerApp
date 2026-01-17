
// Service Worker for SalesTrackerApp (project pages friendly)
const CACHE = 'st-cache-v7'; // bump to force fresh install

// Use RELATIVE paths so this works under /SalesTrackerApp/ (project pages)
const ASSETS = [
  'index.html',
  'styles.css',
  'app.v7.js',
  'manifest.webmanifest',
  'assets/icon-192.png',
  'assets/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first fallback; still fetch network when available
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('index.html')))
  );
});

