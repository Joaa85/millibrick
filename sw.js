// MilliBrick – service worker for app-shell-caching (PWA-installasjon)
//
// v2: HTML-siden hentes alltid fra nettverket først (network-first), slik
// at nye utrullinger vises med en gang i stedet for å bli sittende fast på
// en gammel, cachet versjon (dette var årsaken til at tidligere endringer
// ikke dukket opp på telefoner som hadde installert appen). Ikoner og
// manifest cache-først siden de sjelden endrer seg. Cache-navnet bumpes
// ved hver funksjonell endring for å tvinge gamle cacher til å ryddes bort.
const CACHE = 'millibrick-v2';
const APP_SHELL = ['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];
 
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
  // Ikke cache API-kall (Netlify-funksjonen) eller andre origins (Brickognize, jsQR-CDN, fonter)
  if (url.origin !== location.origin || url.pathname.startsWith('/.netlify/functions/')) return;
 
  // HTML-siden (navigasjon / index.html): alltid nettverk først, slik at
  // nye deploys vises umiddelbart. Faller kun tilbake til cache når
  // enheten er offline.
  const isHTML = req.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html';
  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }
 
  // Alt annet (ikoner, manifest): cache først, nettverk som fallback/oppdatering.
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
