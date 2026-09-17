// MilliBrick – enkel service worker for app-shell-caching (PWA-installasjon)
const CACHE = 'millibrick-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];
 
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});
 
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});
 
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
 
  const url = new URL(req.url);
  // Ikke cache API-kall (Netlify-funksjonen eller andre origins som Brickognize/fonts)
  if (url.origin !== location.origin || url.pathname.startsWith('/.netlify/functions/')) return;
 
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
 
