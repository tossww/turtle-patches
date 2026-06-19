/* Turtle Patches service worker — offline support + PWA installability. */
const CACHE = 'turtle-patches-v1';
const CORE = [
  './', './index.html', './styles.css', './game.js', './levels.json',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;

  // HTML navigations: network-first (fresh content), fall back to cache offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        if (sameOrigin && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); }
        return res;
      }).catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Everything else: cache-first, then network (and cache same-origin responses).
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (sameOrigin && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => cached))
  );
});
